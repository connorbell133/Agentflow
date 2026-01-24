import { test as base } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { getUserIdByEmail, getOrgIdByUserId } from '../utils/db-utils';
import {
  createTestOrganization,
  createTestGroup,
  addUserToOrganization,
  addUserToGroup,
} from '../utils/test-factories';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 🛠 HELPER: Extract Project ID accurately
 * Your cookie dump proves your local project ID is '127'
 */
const getSupabaseProjectId = (url: string) => {
  // 1. Priority: Check env var
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;

  // 2. Check for Localhost / 127.0.0.1
  // ⚠️ CRITICAL: Supabase local CLI defaults project ref to '127', not 'localhost'
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return '127';
  }

  // 3. Fallback: Extract from standard Supabase URL (e.g., https://abcdef.supabase.co)
  const match = url.match(/https:\/\/([^.]+)\./);
  return match ? match[1] : 'your-project-id';
};

export type TestUser = {
  email: string;
  password: string;
  fullName: string;
  profile: {
    id: string;
    email: string;
    fullName: string | null;
    signupComplete: boolean;
  } | null;
};

/**
 * Custom test fixtures for e2e tests
 */
type TestFixtures = {
  /** Admin user who is already authenticated with an organization (lazy provisioning) */
  authenticatedUserWithOrg: TestUser;
  /** Generate fresh test user credentials without signing up */
  testUserCredentials: Omit<TestUser, 'profile'>;
};

export const test = base.extend<TestFixtures>({
  authenticatedUserWithOrg: async ({ page, context }, use) => {
    const email = process.env.TEST_ADMIN_EMAIL || 'admin.test@example.com';
    const password = process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!';
    const fullName = 'Admin Test User';
    const orgName = 'E2E Test Organization';

    // ---------------------------------------------------------
    // 🏗️ STEP 1: LAZY PROVISIONING (The "Self-Healing" Logic)
    // ---------------------------------------------------------

    // A. Check if user exists in Auth
    let userId: string | null = null;
    try {
      userId = await getUserIdByEmail(email);
    } catch (error) {
      // User doesn't exist in profiles table
    }

    let authUser: any = null;

    // B. If user missing in profiles, check Auth and create if needed
    if (!userId) {
      // Try to get user from Auth by email
      const {
        data: { users },
        error: listError,
      } = await supabaseAdmin.auth.admin.listUsers();

      if (listError) {
        throw new Error(`Failed to list users: ${listError.message}`);
      }

      authUser = users?.find((u: { email?: string }) => u.email === email);

      if (!authUser) {
        console.log(`[Fixture] Creating missing admin user: ${email}`);
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

        if (createError || !newUser.user) {
          // If creation fails (e.g., user already exists from parallel test),
          // retry getting the user (might have been created by another worker)
          console.log(
            `[Fixture] User creation failed, retrying to get user: ${createError?.message}`
          );
          const {
            data: { users: retryUsers },
            error: retryError,
          } = await supabaseAdmin.auth.admin.listUsers();

          if (retryError) {
            throw new Error(`Failed to list users on retry: ${retryError.message}`);
          }

          authUser = retryUsers?.find((u: { email?: string }) => u.email === email);

          if (!authUser) {
            throw new Error(
              `Failed to create admin and user not found on retry: ${createError?.message || 'Unknown error'}`
            );
          }
        } else {
          authUser = newUser.user;
        }
      }

      userId = authUser.id;

      // Create profile if it doesn't exist (use upsert to handle race conditions)
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
        {
          id: userId,
          email,
          full_name: fullName,
          signup_complete: true,
          avatar_url: null,
        },
        {
          onConflict: 'id',
        }
      );

      if (profileError) {
        throw new Error(`Failed to create/update profile: ${profileError.message}`);
      }
    }

    // Ensure userId is not null before proceeding
    if (!userId) {
      throw new Error('Failed to get or create user ID');
    }

    // C. Check if Org exists for this user
    let orgId: string | null = null;
    try {
      orgId = await getOrgIdByUserId(userId);
    } catch (error) {
      // User has no organization
    }

    // D. If Org missing, CREATE it
    if (!orgId) {
      console.log(`[Fixture] Creating missing organization for: ${email}`);
      const org = await createTestOrganization({
        name: orgName,
        ownerId: userId,
      });
      orgId = org.id;

      // Link User to Org
      await addUserToOrganization(orgId, userId);
      const group = await createTestGroup({ orgId, role: 'admin' });
      await addUserToGroup(group.id, userId, orgId);
    }

    // ---------------------------------------------------------
    // ⚡️ STEP 2: FAST LOGIN & INJECTION (The "Gold Standard")
    // ---------------------------------------------------------

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session) {
      throw new Error(`Fixture Login Failed: ${authError?.message}`);
    }

    const projectId = getSupabaseProjectId(supabaseUrl);
    const tokenKey = `sb-${projectId}-auth-token`;
    const sessionValue = JSON.stringify(authData.session);

    // Inject Cookie (Server)
    await context.addCookies([
      {
        name: tokenKey,
        value: sessionValue,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    // Inject LocalStorage (Client)
    await page.goto('/404');
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: tokenKey,
      value: sessionValue,
    });

    // ---------------------------------------------------------
    // 📦 STEP 3: RETURN USER OBJECT
    // ---------------------------------------------------------

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    await use({
      email,
      password,
      fullName,
      profile: profile || {
        id: authData.user.id,
        email,
        fullName,
        signupComplete: true,
      },
    });
  },

  testUserCredentials: async ({}, use) => {
    await use({
      email: `test.user.${Date.now()}@example.com`,
      password: 'Password123',
      fullName: 'Test User',
    });
  },
});

export { expect } from '@playwright/test';

/**
 * Auth Factory Functions
 *
 * Utilities for creating authenticated users programmatically using Supabase Auth Admin API.
 * These functions create REAL authenticated users that can sign in, unlike the basic
 * test-factories.ts which only creates profiles without auth.
 *
 * Usage:
 * ```typescript
 * // Create an auth user + profile
 * const user = await createAuthenticatedUser({
 *   email: 'test@example.com',
 *   password: 'password123',
 *   fullName: 'Test User'
 * });
 *
 * // Create a complete setup: auth user + profile + org + group
 * const setup = await createUserWithOrg({
 *   email: 'admin@example.com',
 *   password: 'securePass',
 *   fullName: 'Admin User',
 *   orgName: 'Test Org'
 * });
 *
 * // Save Playwright auth state for test reuse
 * await savePlaywrightAuthState(user.session, './playwright/.auth/user.json');
 * ```
 */

import { createSupabaseTestClient, createAuthenticatedClient } from './supabase-test-client';
import {
  createTestOrganization,
  createTestGroup,
  addUserToOrganization,
  addUserToGroup,
  generateTestEmail,
  generateOrgName,
  createWorkerScopedOrganization,
  createWorkerScopedGroup,
  addUserToOrganizationTracked,
  addUserToGroupTracked,
} from './test-factories';
import type { Session } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { WorkerContext } from './worker-context';
import type { ResourceTracker } from './resource-tracker';

/**
 * Options for creating an authenticated user
 */
export interface CreateAuthUserOptions {
  email?: string;
  password?: string;
  fullName?: string;
  emailConfirm?: boolean; // Auto-confirm email (default true for tests)
  signupComplete?: boolean; // Whether onboarding is complete (default true)
}

/**
 * Options for creating a user with organization
 */
export interface CreateUserWithOrgOptions extends CreateAuthUserOptions {
  orgName?: string;
  orgDescription?: string;
  groupRole?: string;
}

/**
 * Authenticated user data returned by auth factories
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  password: string; // Included for test login convenience
  fullName: string;
  session: Session;
}

/**
 * Complete user setup with org and group
 */
export interface AuthenticatedUserWithOrg extends AuthenticatedUser {
  orgId: string;
  orgName: string;
  groupId: string;
  groupRole: string;
}

/**
 * Deletes an existing user by email if it exists.
 * This ensures a clean slate before creating a new user.
 *
 * @param email User email to delete
 * @returns true if user was deleted, false if user didn't exist
 */
async function deleteUserByEmailIfExists(email: string): Promise<boolean> {
  const supabase = await createSupabaseTestClient();

  try {
    // List users to find by email
    const {
      data: { users },
      error: listError,
    } = await supabase.auth.admin.listUsers();

    if (listError) {
      // If we can't list users, continue anyway - might not exist
      return false;
    }

    // Find user with matching email
    const existingUser = users?.find(u => u.email === email);

    if (!existingUser) {
      return false; // User doesn't exist
    }

    // Delete the auth user (this should cascade, but we'll also clean up profile)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);

    if (deleteError) {
      // Log but don't throw - we'll try to create anyway
      console.warn(
        `Failed to delete existing auth user ${existingUser.id}: ${deleteError.message}`
      );
    }

    // Also delete profile if it exists (in case auth deletion didn't cascade)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', existingUser.id);

    if (profileError) {
      console.warn(`Failed to delete existing profile ${existingUser.id}: ${profileError.message}`);
    }

    return true;
  } catch (error) {
    // If anything fails, log and continue - we'll try to create anyway
    console.warn(`Error checking/deleting existing user ${email}: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Creates a Supabase Auth user using the Admin API.
 * This creates a real auth.users entry that can sign in.
 * If a user with the same email already exists, it will be deleted first.
 *
 * @param email User email
 * @param password User password
 * @param metadata Optional user metadata (e.g., full_name)
 * @param emailConfirm Whether to auto-confirm email (default true for tests)
 * @returns The created auth user data
 */
export async function createSupabaseAuthUser(
  email: string,
  password: string,
  metadata: { full_name?: string } = {},
  emailConfirm: boolean = true
): Promise<{ id: string; email: string }> {
  const supabase = await createSupabaseTestClient();

  // First, ensure no existing user with this email
  await deleteUserByEmailIfExists(email);

  // Use the Admin API to create a user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: emailConfirm,
    user_metadata: metadata,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create Supabase Auth user: ${error?.message || 'No user returned'}`);
  }

  return {
    id: data.user.id,
    email: data.user.email!,
  };
}

/**
 * Signs in a user and returns their session.
 * Uses signInWithPassword which is appropriate for testing.
 *
 * @param email User email
 * @param password User password
 * @returns Session data
 */
export async function signInUser(email: string, password: string): Promise<Session> {
  const supabase = await createSupabaseTestClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    throw new Error(`Failed to sign in user: ${error?.message || 'No session returned'}`);
  }

  return data.session;
}

/**
 * Creates or updates a profile entry in the profiles table.
 * This should be called after creating the Supabase Auth user.
 * Uses upsert to handle cases where profile might already exist.
 *
 * @param userId User ID from auth.users
 * @param email User email
 * @param fullName User full name
 * @param signupComplete Whether onboarding is complete (default true)
 */
async function createProfile(
  userId: string,
  email: string,
  fullName: string,
  signupComplete: boolean = true
): Promise<void> {
  const supabase = await createSupabaseTestClient();

  // Use upsert to replace if exists, insert if not
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      signup_complete: signupComplete,
      avatar_url: null,
    },
    {
      onConflict: 'id',
    }
  );

  if (error) {
    throw new Error(`Failed to create/update profile: ${error.message}`);
  }
}

/**
 * Creates a fully authenticated user with both Supabase Auth user and profile.
 * This creates a user that can actually sign in and use the application.
 *
 * **Collision Handling:** If a user with the same email already exists,
 * it will be fully deleted (auth user + profile) and replaced with the new user.
 * This ensures idempotent test setup and prevents database conflicts.
 *
 * @param options User creation options
 * @returns Authenticated user data with session
 */
export async function createAuthenticatedUser(
  options: CreateAuthUserOptions = {}
): Promise<AuthenticatedUser> {
  const email = options.email || generateTestEmail(null);
  const password = options.password || 'TestPassword123!';
  const fullName = options.fullName || 'Test User';
  const emailConfirm = options.emailConfirm ?? true;
  const signupComplete = options.signupComplete ?? true;

  // 1. Create Supabase Auth user
  const authUser = await createSupabaseAuthUser(
    email,
    password,
    { full_name: fullName },
    emailConfirm
  );

  // 2. Create profile
  await createProfile(authUser.id, email, fullName, signupComplete);

  // 3. Sign in to get session
  const session = await signInUser(email, password);

  return {
    id: authUser.id,
    email,
    password, // Include password for test convenience
    fullName,
    session,
  };
}

/**
 * Creates a complete authenticated user setup with organization and group.
 * This is the most common pattern for E2E tests.
 *
 * **Updated for RLS**: Now uses the authenticated user's session to create
 * the organization, ensuring RLS policies are properly tested.
 *
 * @param options User and org creation options
 * @returns Complete authenticated setup
 */
export async function createUserWithOrg(
  options: CreateUserWithOrgOptions = {}
): Promise<AuthenticatedUserWithOrg> {
  // Create authenticated user
  const user = await createAuthenticatedUser(options);

  // Create organization using service role client (bypasses RLS for test setup)
  const orgName = options.orgName || generateOrgName();
  const org = await createTestOrganization({
    name: orgName,
    ownerId: user.id,
    // authenticatedClient not needed - service role bypass policies handle this
  });

  // Add user to organization
  await addUserToOrganization(org.id, user.id);

  // Create default group
  const groupRole = options.groupRole || 'member';
  const group = await createTestGroup({
    orgId: org.id,
    role: groupRole,
  });

  // Add user to group
  await addUserToGroup(group.id, user.id, org.id);

  return {
    ...user,
    orgId: org.id,
    orgName: org.name,
    groupId: group.id,
    groupRole: group.role,
  };
}

/**
 * Saves a Supabase session as Playwright storage state.
 * This allows tests to reuse authenticated sessions without re-authenticating.
 *
 * The storage state includes the session cookies that Playwright can inject
 * into the browser context.
 *
 * @param session Supabase session
 * @param filepath Path to save the storage state file
 */
export async function savePlaywrightAuthState(session: Session, filepath: string): Promise<void> {
  // Ensure directory exists
  const dir = dirname(filepath);
  mkdirSync(dir, { recursive: true });

  // Get the Supabase URL from env
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL not set');
  }

  // Extract project ID using the same logic as test fixtures
  // This handles local Supabase correctly (returns '127' for localhost/127.0.0.1)
  const getSupabaseProjectId = (url: string): string => {
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

  const projectRef = getSupabaseProjectId(supabaseUrl);

  // Cookie domain should be the app domain (localhost for tests), not Supabase domain
  // This is because cookies are set by the Next.js app, not by Supabase directly
  // The app runs on localhost:3000, so cookies should be for localhost
  const cookieDomain = 'localhost';

  // Create Playwright storage state with Supabase session cookies
  // Supabase uses two cookies for session management:
  // 1. sb-{project-ref}-auth-token - Contains the session data
  // 2. sb-{project-ref}-auth-token-code-verifier - PKCE verifier (if used)

  const storageState = {
    cookies: [
      {
        name: `sb-${projectRef}-auth-token`,
        value: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_in,
          token_type: session.token_type,
          user: session.user,
        }),
        domain: cookieDomain,
        path: '/',
        expires: session.expires_at || -1,
        httpOnly: false,
        secure: false, // Always false for localhost
        sameSite: 'Lax' as const,
      },
    ],
    origins: [],
  };

  writeFileSync(filepath, JSON.stringify(storageState, null, 2));
}

/**
 * Creates an authenticated user and saves the session for Playwright.
 * Convenience function that combines user creation and state saving.
 *
 * @param filepath Path to save the storage state
 * @param options User creation options
 * @returns Authenticated user data
 */
export async function createAuthenticatedUserWithState(
  filepath: string,
  options: CreateAuthUserOptions = {}
): Promise<AuthenticatedUser> {
  const user = await createAuthenticatedUser(options);
  await savePlaywrightAuthState(user.session, filepath);
  return user;
}

/**
 * Creates a user with org and saves the session for Playwright.
 * Convenience function for the most common E2E test setup.
 *
 * @param filepath Path to save the storage state
 * @param options User and org creation options
 * @returns Complete authenticated setup
 */
export async function createUserWithOrgAndState(
  filepath: string,
  options: CreateUserWithOrgOptions = {}
): Promise<AuthenticatedUserWithOrg> {
  const setup = await createUserWithOrg(options);
  await savePlaywrightAuthState(setup.session, filepath);
  return setup;
}

/**
 * Creates an authenticated user ready for onboarding (signup_complete: false).
 * This is useful for testing the onboarding flow.
 *
 * The user will have:
 * - A valid auth.users entry (can sign in)
 * - A profiles entry with signup_complete: false
 * - A valid session saved to the storage state
 * - NO organization or group yet (created during onboarding)
 *
 * After creating this user, tests should navigate to /onboarding where the
 * user will complete their profile and organization setup.
 *
 * @param filepath Path to save the storage state
 * @param options User creation options (signupComplete will be set to false)
 * @returns Authenticated user data
 *
 * @example
 * ```typescript
 * // In your test setup
 * const user = await createUserForOnboarding('./playwright/.auth/onboarding-user.json', {
 *   email: 'newuser@example.com',
 *   password: 'TestPass123!',
 *   fullName: 'New User'
 * });
 *
 * // In your test
 * test('complete onboarding', async ({ page }) => {
 *   // User is already signed in but hasn't completed onboarding
 *   await page.goto('/onboarding');
 *   // ... test the onboarding flow
 * });
 * ```
 */
export async function createUserForOnboarding(
  filepath: string,
  options: CreateAuthUserOptions = {}
): Promise<AuthenticatedUser> {
  const user = await createAuthenticatedUser({
    ...options,
    signupComplete: false, // Force signup_complete to false
  });

  await savePlaywrightAuthState(user.session, filepath);

  return user;
}

// ============================================================================
// WORKER-SCOPED AUTH FACTORIES (Parallel-Safe)
// ============================================================================

/**
 * Worker-scoped auth user options
 */
export interface WorkerScopedAuthUserOptions extends Omit<CreateAuthUserOptions, 'email'> {
  emailSuffix?: string; // Optional suffix after worker prefix
}

/**
 * Worker-scoped user with org options
 */
export interface WorkerScopedUserWithOrgOptions extends Omit<
  CreateUserWithOrgOptions,
  'email' | 'orgName'
> {
  emailSuffix?: string;
  orgNameSuffix?: string;
  orgDescription?: string;
  groupRole?: string;
}

/**
 * Creates a worker-scoped authenticated user (parallel-safe)
 * Generates worker-specific email and tracks all resources
 */
export async function createWorkerScopedAuthenticatedUser(
  ctx: WorkerContext,
  tracker: ResourceTracker,
  options: WorkerScopedAuthUserOptions = {}
): Promise<AuthenticatedUser> {
  const emailBase = options.emailSuffix || 'test';
  const email = ctx.generateEmail(emailBase);
  const password = options.password || 'TestPassword123!';
  const fullName = options.fullName || `Test User (Worker ${ctx.getWorkerId()})`;
  const emailConfirm = options.emailConfirm ?? true;
  const signupComplete = options.signupComplete ?? true;

  // 1. Create Supabase Auth user
  const authUser = await createSupabaseAuthUser(
    email,
    password,
    { full_name: fullName },
    emailConfirm
  );

  // Track auth user for cleanup
  tracker.trackAuthUser(authUser.id, email, {
    workerId: ctx.getWorkerId(),
    testIndex: ctx.getTestIndex(),
  });

  // 2. Create profile
  const supabase = await createSupabaseTestClient();
  const { error } = await supabase.from('profiles').insert({
    id: authUser.id,
    email,
    full_name: fullName,
    signup_complete: signupComplete,
    avatar_url: null,
  });

  if (error) {
    throw new Error(`Failed to create profile: ${error.message}`);
  }

  // Track profile for cleanup
  tracker.trackProfile(authUser.id, email, {
    workerId: ctx.getWorkerId(),
    testIndex: ctx.getTestIndex(),
  });

  // 3. Sign in to get session
  const session = await signInUser(email, password);

  return {
    id: authUser.id,
    email,
    password, // Include password for test convenience
    fullName,
    session,
  };
}

/**
 * Creates a worker-scoped user with organization (parallel-safe)
 * Complete setup with auth, profile, org, and group
 */
export async function createWorkerScopedUserWithOrg(
  ctx: WorkerContext,
  tracker: ResourceTracker,
  options: WorkerScopedUserWithOrgOptions = {}
): Promise<AuthenticatedUserWithOrg> {
  // Create authenticated user
  const user = await createWorkerScopedAuthenticatedUser(ctx, tracker, options);

  // Create organization
  const org = await createWorkerScopedOrganization(ctx, tracker, {
    nameSuffix: options.orgNameSuffix || 'Test Org',
    ownerId: user.id,
  });

  // Add user to organization
  await addUserToOrganizationTracked(org.id, user.id, tracker, ctx);

  // Create default group
  const groupRole = options.groupRole || 'member';
  const group = await createWorkerScopedGroup(ctx, tracker, {
    orgId: org.id,
    roleSuffix: groupRole,
  });

  // Add user to group
  await addUserToGroupTracked(group.id, user.id, org.id, tracker, ctx);

  return {
    ...user,
    orgId: org.id,
    orgName: org.name,
    groupId: group.id,
    groupRole: group.role,
  };
}

/**
 * Creates a worker-scoped user for onboarding (parallel-safe)
 * User has signup_complete: false, no org/group yet
 */
export async function createWorkerScopedUserForOnboarding(
  ctx: WorkerContext,
  tracker: ResourceTracker,
  options: WorkerScopedAuthUserOptions = {}
): Promise<AuthenticatedUser> {
  return await createWorkerScopedAuthenticatedUser(ctx, tracker, {
    ...options,
    signupComplete: false, // Force signup_complete to false
  });
}

/**
 * Creates worker-scoped user and saves Playwright state
 */
export async function createWorkerScopedAuthenticatedUserWithState(
  ctx: WorkerContext,
  tracker: ResourceTracker,
  filepath: string,
  options: WorkerScopedAuthUserOptions = {}
): Promise<AuthenticatedUser> {
  const user = await createWorkerScopedAuthenticatedUser(ctx, tracker, options);
  await savePlaywrightAuthState(user.session, filepath);
  return user;
}

/**
 * Creates worker-scoped user with org and saves Playwright state
 */
export async function createWorkerScopedUserWithOrgAndState(
  ctx: WorkerContext,
  tracker: ResourceTracker,
  filepath: string,
  options: WorkerScopedUserWithOrgOptions = {}
): Promise<AuthenticatedUserWithOrg> {
  const setup = await createWorkerScopedUserWithOrg(ctx, tracker, options);
  await savePlaywrightAuthState(setup.session, filepath);
  return setup;
}

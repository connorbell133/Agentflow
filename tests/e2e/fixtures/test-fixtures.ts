import { test as base } from '@playwright/test';
import { createSupabaseServerClient } from '../utils/supabase-test-client';

/**
 * Represents a test user with credentials and profile data
 */
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
    /** Admin user who is already authenticated with an organization (via global setup) */
    authenticatedUserWithOrg: TestUser;
    /** Generate fresh test user credentials without signing up */
    testUserCredentials: Omit<TestUser, 'profile'>;
};

/**
 * Extended Playwright test with custom fixtures for authentication and organization setup.
 *
 * NOTE: The admin user is authenticated via global.setup.ts and storage state.
 * All tests automatically have access to the authenticated admin session.
 *
 * Usage:
 * ```typescript
 * import { test, expect } from '../fixtures/test-fixtures';
 *
 * test('my test', async ({ page, authenticatedUserWithOrg }) => {
 *   // User is already signed in with an org via storage state
 *   await page.goto('/admin'); // Just navigate where you need
 *   console.log(authenticatedUserWithOrg.email);
 * });
 * ```
 */
export const test = base.extend<TestFixtures>({
    /**
     * Provides the admin user who is already authenticated with an organization.
     * Authentication happens in global.setup.ts and state is loaded via storage state.
     * This fixture just provides the user information from environment variables.
     */
    authenticatedUserWithOrg: async ({ page }, use) => {
        const email = process.env.TEST_ADMIN_EMAIL || 'admin.test@example.com';
        const password = process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!';
        const fullName = 'Admin Test User';

        // Fetch profile from database to provide in fixture
        const supabase = await createSupabaseServerClient();
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !profile) {
            throw new Error(
                `Admin user profile not found. Make sure global.setup.ts ran successfully. Error: ${error?.message}`
            );
        }

        const user: TestUser = {
            email,
            password,
            fullName,
            profile: {
                id: profile.id,
                email: profile.email,
                fullName: profile.full_name,
                signupComplete: profile.signup_complete || false,
            },
        };

        await use(user);
    },

    /**
     * Provides fresh test user credentials without performing any signup.
     * Useful for invite flows where you need a new user's email.
     */
    testUserCredentials: async ({ }, use) => {
        const credentials = {
            email: process.env.TEST_INVITED_USER_EMAIL || 'test.user2@example.com',
            password: process.env.TEST_INVITED_USER_PASSWORD || 'Password123',
            fullName: process.env.TEST_INVITED_USER_FULL_NAME || 'Test User',
        };

        await use(credentials);
    },
});

export { expect } from '@playwright/test';

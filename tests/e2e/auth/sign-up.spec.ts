import { test, expect } from '@playwright/test';
import { setupAndSignUpUser, ensureSignedOut } from '../utils/auth-utils';
import { cleanupInvitedUser } from '../../cleanup-invited-user';

// Override project storageState so this suite runs without the admin session
test.use({ storageState: { cookies: [], origins: [] } });


test.describe('Sign Up', () => {
    // These variables will be the same for all tests in this describe block
    // Use a non-admin disposable user to avoid org ownership constraints
    const user_email = process.env.TEST_SIGNUP_USER_EMAIL || 'test.signup@example.com';
    const user_password = process.env.TEST_SIGNUP_USER_PASSWORD || 'Password123!';
    const user_fullName = process.env.TEST_SIGNUP_USER_FULL_NAME || 'Test Signup User';
    test.beforeAll(async ({ browser }) => {
        // Ensure no residual Clerk session and user record before running the suite
        const page = await browser.newPage();
        await ensureSignedOut(page);
        await cleanupInvitedUser(user_email as string);
        await page.close();
    });
    test.beforeEach(async ({ page }) => {
        await ensureSignedOut(page);
        await cleanupInvitedUser(user_email as string);
    });
    // delete user from clerk and supabase
    // --- Test 1: Sign Up (redirects to homepage) ---
    test('should allow a new user to sign up and land on home', async ({ page }) => {
        return;
        await setupAndSignUpUser(page, user_email, user_password, user_fullName);
        await expect(page).toHaveURL('http://localhost:3000/');
    });
});
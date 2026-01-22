import { test, expect } from '@playwright/test';
import { setupAndSignInUser } from '../utils/auth-utils';

/**
 * Sign In Tests
 * NOTE: These tests run SEQUENTIALLY and test authentication flows
 * They use the admin user from storage state
 */
test.describe.serial('Sign In', () => {
    // Use admin credentials that are set up in global.setup.ts
    const user_email = process.env.TEST_ADMIN_EMAIL || 'admin.test@example.com';
    const user_password = process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!';

    // --- Test 1: Sign Out (Uses the authenticated admin from storage state) ---
    test('should allow a user to sign out', async ({ page }) => {
        // Admin is already signed in via storage state
        await page.goto('/');

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // ACTION: sign out
        // Click the user menu trigger by finding the button that contains the Avatar image
        const userMenuButton = page.getByRole('button').filter({ has: page.getByTestId('avatar') }).first();
        await expect(userMenuButton).toBeVisible({ timeout: 10000 });
        await userMenuButton.click();
        await expect(page.getByRole('menuitem', { name: 'Log out' })).toBeVisible({ timeout: 10000 });
        await page.getByRole('menuitem', { name: 'Log out' }).click();

        // ASSERTION: get taken to /sign-in
        await page.waitForURL('/sign-in');
    });

    // --- Test 2: Sign In (Signs in the admin user again) ---
    test('should allow a user to sign in', async ({ page }) => {
        // User should be signed out from previous test
        await page.goto('/sign-in');

        // ACTION: Sign in
        await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible({ timeout: 10000 });
        await page.getByRole('textbox', { name: 'Email address' }).fill(user_email);
        await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: 'Continue', exact: true }).click(); // The first continue after email
        await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible({ timeout: 10000 });
        await page.getByRole('textbox', { name: 'Password' }).fill(user_password);
        await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: 'Continue' }).click(); // The final continue after password

        // ASSERTION: get taken to /
        await page.waitForURL('/');

        // ASSERTION: check if user is logged in
        await expect(page.getByTestId('avatar').first()).toBeVisible();
    });
});
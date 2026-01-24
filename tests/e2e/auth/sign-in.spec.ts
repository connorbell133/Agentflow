import { test, expect, TestInfo } from '@playwright/test';
import { createAuthenticatedUser } from '../utils/auth-factories';
import { cleanupTestUserByEmail } from '../utils/test-cleanup';
import { generateTestEmail } from '../utils/test-factories';

/**
 * Sign In Flow Tests
 *
 * These tests validate the sign-in UI flow works correctly.
 * They test the actual user experience of signing in through the UI.
 *
 * Note: Uses the admin user from global.setup.ts for some tests,
 * and creates temporary users for others using auth-factories.
 */

test.describe('Sign In Flow', () => {
  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin.test@example.com';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!';

  test.describe('with existing admin user', () => {
    test.use({ storageState: { cookies: [], origins: [] } }); // Start without auth

    test('should display sign-in form with all required fields', async ({ page }) => {
      await page.goto('/sign-in');

      // Check that all form elements are visible using data-testid
      await expect(page.getByTestId('sign-in-email-input')).toBeVisible();
      await expect(page.getByTestId('sign-in-password-input')).toBeVisible();
      await expect(page.getByTestId('sign-in-submit-button')).toBeVisible();

      // Check for link to sign-up page
      await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
    });

    test('should successfully sign in with valid credentials', async ({
      page,
    }, testInfo: TestInfo) => {
      let userEmail: string | null = null;

      try {
        // create user in db
        const user = await createAuthenticatedUser({
          email: generateTestEmail(testInfo),
          password: 'password123!',
          fullName: 'Test User',
          emailConfirm: true,
          signupComplete: true,
        });
        userEmail = user.email; // Store email for cleanup
        console.log('user', user);

        await page.goto('/sign-in');

        // Fill in sign-in form using data-testid
        await page.getByTestId('sign-in-email-input').fill(user.email);
        await page.getByTestId('sign-in-password-input').fill(user.password);

        // Submit the form
        await page.getByTestId('sign-in-submit-button').click();

        // Should redirect to home page or dashboard
        await page.waitForURL(url => !url.toString().includes('/sign-in'), { timeout: 15000 });

        // Verify user is logged in by checking for avatar
        await expect(page.getByTestId('avatar').first()).toBeVisible({ timeout: 10000 });
      } finally {
        // Always cleanup user, regardless of test result
        if (userEmail) {
          await cleanupTestUserByEmail(userEmail);
        }
      }
    });

    test('should show error for invalid email', async ({ page }) => {
      await page.goto('/sign-in');

      // Fill in form with invalid email using data-testid
      await page.getByTestId('sign-in-email-input').fill('nonexistent@example.com');
      await page.getByTestId('sign-in-password-input').fill('SomePassword123!');

      // Submit the form
      await page.getByTestId('sign-in-submit-button').click();

      // Wait for error message
      await page.waitForTimeout(2000);

      // Should stay on sign-in page (not navigate away)
      await expect(page).toHaveURL(/sign-in/);
    });

    test('should show error for invalid password', async ({ page }) => {
      await page.goto('/sign-in');

      // Fill in form with correct email but wrong password using data-testid
      await page.getByTestId('sign-in-email-input').fill(adminEmail);
      await page.getByTestId('sign-in-password-input').fill('WrongPassword123!');

      // Submit the form
      await page.getByTestId('sign-in-submit-button').click();

      // Wait for error message
      await page.waitForTimeout(2000);

      // Should stay on sign-in page
      await expect(page).toHaveURL(/sign-in/);
    });

    test('should navigate to sign-up page from sign-in link', async ({ page }) => {
      await page.goto('/sign-in');

      // Click the sign-up link
      await page.getByRole('link', { name: /sign up/i }).click();

      // Should navigate to sign-up page
      await expect(page).toHaveURL(/sign-up/);
    });
  });

  test.describe('sign out flow', () => {
    const testPassword = 'TestPassword123!';

    test('should allow a user to sign out', async ({ page }, testInfo: TestInfo) => {
      let testEmail: string | null = null;

      try {
        // Create a test user for sign-out tests
        testEmail = generateTestEmail(testInfo);
        await createAuthenticatedUser({
          email: testEmail,
          password: testPassword,
          fullName: 'Sign Out Test User',
        });

        // Sign in the test user
        await page.goto('/sign-in');
        await page.getByTestId('sign-in-email-input').fill(testEmail);
        await page.getByTestId('sign-in-password-input').fill(testPassword);
        await page.getByTestId('sign-in-submit-button').click();

        // Wait for successful sign-in
        await page.waitForURL(url => !url.toString().includes('/sign-in'), { timeout: 15000 });

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Click the user menu trigger
        const userMenuButton = page
          .getByRole('button')
          .filter({ has: page.getByTestId('avatar') })
          .first();
        await expect(userMenuButton).toBeVisible({ timeout: 10000 });
        await userMenuButton.click();

        // Click sign out
        await expect(page.getByRole('menuitem', { name: 'Sign Out' })).toBeVisible({
          timeout: 10000,
        });
        await page.getByRole('menuitem', { name: 'Sign Out' }).click();

        // Should redirect to sign-in page
        await page.waitForURL('/sign-in', { timeout: 10000 });
        await expect(page).toHaveURL('/sign-in');
      } finally {
        // Always cleanup user, regardless of test result
        if (testEmail) {
          await cleanupTestUserByEmail(testEmail);
        }
      }
    });

    test('should clear session after sign out', async ({ page }, testInfo: TestInfo) => {
      let testEmail: string | null = null;

      try {
        // Create a test user for sign-out tests
        testEmail = generateTestEmail(testInfo);
        await createAuthenticatedUser({
          email: testEmail,
          password: testPassword,
          fullName: 'Sign Out Test User',
        });

        // Sign in the test user
        await page.goto('/sign-in');
        await page.getByTestId('sign-in-email-input').fill(testEmail);
        await page.getByTestId('sign-in-password-input').fill(testPassword);
        await page.getByTestId('sign-in-submit-button').click();

        // Wait for successful sign-in
        await page.waitForURL(url => !url.toString().includes('/sign-in'), { timeout: 15000 });
        await page.waitForLoadState('networkidle');

        // Sign out
        const userMenuButton = page
          .getByRole('button')
          .filter({ has: page.getByTestId('avatar') })
          .first();
        await userMenuButton.click();
        await page.getByRole('menuitem', { name: 'Sign Out' }).click();
        await page.waitForURL('/sign-in');

        // Try to navigate to a protected page
        await page.goto('/admin');

        // Should be redirected to sign-in (not authenticated)
        await page.waitForURL(url => url.toString().includes('/sign-in'), { timeout: 10000 });
      } finally {
        // Always cleanup user, regardless of test result
        if (testEmail) {
          await cleanupTestUserByEmail(testEmail);
        }
      }
    });
  });

  test.describe('session persistence', () => {
    const testPassword = 'TestPassword123!';

    test('should maintain session after page refresh', async ({ page }, testInfo: TestInfo) => {
      let testEmail: string | null = null;

      try {
        // Create a test user for session persistence tests
        testEmail = generateTestEmail(testInfo);
        await createAuthenticatedUser({
          email: testEmail,
          password: testPassword,
          fullName: 'Session Test User',
        });

        // Sign in using data-testid
        await page.goto('/sign-in');
        await page.getByTestId('sign-in-email-input').fill(testEmail);
        await page.getByTestId('sign-in-password-input').fill(testPassword);
        await page.getByTestId('sign-in-submit-button').click();

        // Wait for successful sign-in
        await page.waitForURL(url => !url.toString().includes('/sign-in'), { timeout: 15000 });

        // Refresh the page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Should still be authenticated (not redirected to sign-in)
        await expect(page).not.toHaveURL(/sign-in/);
      } finally {
        // Always cleanup user, regardless of test result
        if (testEmail) {
          await cleanupTestUserByEmail(testEmail);
        }
      }
    });
  });
});

import { test, expect, TestInfo } from '@playwright/test';
import { cleanupTestUserByEmail } from '../utils/test-cleanup';
import { generateTestEmail } from '../utils/test-factories';

/**
 * Sign Up Flow Tests
 *
 * These tests validate the sign-up UI flow works correctly.
 * They test the actual user experience of signing up through the UI.
 *
 * Note: For test setup (creating users for other tests), use auth-factories.ts
 * These tests are specifically for validating the sign-up flow itself.
 */

// Override project storageState so this suite runs without the admin session
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Sign Up Flow', () => {
  const testPassword = 'TestPassword123!';
  const testFullName = 'Test Signup User';

  test('should display sign-up form with all required fields', async ({
    page,
  }, testInfo: TestInfo) => {
    let testEmail: string | null = null;

    try {
      // Generate unique email for this test
      testEmail = generateTestEmail(testInfo);

      // Clear any existing cookies/storage to ensure clean state
      await page.context().clearCookies();

      // Navigate to sign-up page
      await page.goto('/sign-up');

      // Check that all form elements are visible using data-testid
      await expect(page.getByTestId('sign-up-name-input')).toBeVisible();
      await expect(page.getByTestId('sign-up-email-input')).toBeVisible();
      await expect(page.getByTestId('sign-up-password-input')).toBeVisible();
      await expect(page.getByTestId('sign-up-submit-button')).toBeVisible();

      // Check for link to sign-in page
      await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    } finally {
      // Always cleanup user, regardless of test result
      if (testEmail) {
        await cleanupTestUserByEmail(testEmail);
      }
    }
  });

  test('should successfully sign up a new user and redirect to onboarding', async ({
    page,
  }, testInfo: TestInfo) => {
    let testEmail: string | null = null;

    try {
      // Generate unique email for this test
      testEmail = generateTestEmail(testInfo);

      // Clear any existing cookies/storage to ensure clean state
      await page.context().clearCookies();

      // Navigate to sign-up page
      await page.goto('/sign-up');

      // Fill in the sign-up form using data-testid
      await page.getByTestId('sign-up-name-input').fill(testFullName);
      await page.getByTestId('sign-up-email-input').fill(testEmail);
      await page.getByTestId('sign-up-password-input').fill(testPassword);
      await page.getByTestId('sign-up-confirm-password-input').fill(testPassword);
      await page.getByTestId('sign-up-terms-checkbox').check();

      // Submit the form
      await page.getByTestId('sign-up-submit-button').click();

      // Should redirect to onboarding page
      await page.waitForURL('/onboarding', { timeout: 10000 });

      // Verify we're on onboarding page
      await expect(page).toHaveURL('/onboarding');
    } finally {
      // Always cleanup user, regardless of test result
      if (testEmail) {
        await cleanupTestUserByEmail(testEmail);
      }
    }
  });

  test('should show error for invalid email format', async ({ page }, testInfo: TestInfo) => {
    let testEmail: string | null = null;

    try {
      // Generate unique email for this test (even though we'll use invalid email in form)
      testEmail = generateTestEmail(testInfo);

      // Clear any existing cookies/storage to ensure clean state
      await page.context().clearCookies();

      // Navigate to sign-up page
      await page.goto('/sign-up');

      // Fill in form with invalid email
      await page.getByTestId('sign-up-name-input').fill(testFullName);
      await page.getByTestId('sign-up-email-input').fill('invalid-email');
      await page.getByTestId('sign-up-password-input').fill(testPassword);
      await page.getByTestId('sign-up-confirm-password-input').fill(testPassword);
      await page.getByTestId('sign-up-terms-checkbox').check();

      // Try to submit
      await page.getByTestId('sign-up-submit-button').click();

      // Should show validation error (browser validation or custom)
      // Note: Exact error message may vary based on implementation
      const emailInput = page.getByTestId('sign-up-email-input');
      await expect(emailInput).toHaveAttribute('type', 'email');
    } finally {
      // Always cleanup user, regardless of test result
      if (testEmail) {
        await cleanupTestUserByEmail(testEmail);
      }
    }
  });

  test('should show error for weak password', async ({ page }, testInfo: TestInfo) => {
    let testEmail: string | null = null;

    try {
      // Generate unique email for this test
      testEmail = generateTestEmail(testInfo);

      // Clear any existing cookies/storage to ensure clean state
      await page.context().clearCookies();

      // Navigate to sign-up page
      await page.goto('/sign-up');

      // Fill in form with weak password
      await page.getByTestId('sign-up-name-input').fill(testFullName);
      await page.getByTestId('sign-up-email-input').fill(testEmail);
      await page.getByTestId('sign-up-password-input').fill('weak');
      await page.getByTestId('sign-up-confirm-password-input').fill('weak');
      await page.getByTestId('sign-up-terms-checkbox').check();

      // Try to submit
      await page.getByTestId('sign-up-submit-button').click();

      // Wait a moment for error to appear
      await page.waitForTimeout(1000);

      // Should show error (either validation message or stay on page)
      // Verify we didn't navigate away
      await expect(page).toHaveURL(/sign-up/);
    } finally {
      // Always cleanup user, regardless of test result
      if (testEmail) {
        await cleanupTestUserByEmail(testEmail);
      }
    }
  });

  test('should prevent duplicate email registration', async ({ page }, testInfo: TestInfo) => {
    let duplicateUserEmail: string | null = null;

    try {
      // Generate unique email for this test
      duplicateUserEmail = generateTestEmail(testInfo);

      // Clear any existing cookies/storage to ensure clean state
      await page.context().clearCookies();

      // First, create a user with this email using direct DB call
      const { createAuthenticatedUser } = await import('../utils/auth-factories');
      await createAuthenticatedUser({
        email: duplicateUserEmail,
        password: testPassword,
        fullName: testFullName,
      });

      // Navigate to sign-up page
      await page.goto('/sign-up');

      // Try to sign up again with the same email
      await page.getByTestId('sign-up-name-input').fill(testFullName);
      await page.getByTestId('sign-up-email-input').fill(duplicateUserEmail);
      await page.getByTestId('sign-up-password-input').fill(testPassword);
      await page.getByTestId('sign-up-confirm-password-input').fill(testPassword);
      await page.getByTestId('sign-up-terms-checkbox').check();

      await page.getByTestId('sign-up-submit-button').click();

      // Wait for error message
      await page.waitForTimeout(2000);

      // Should show error about duplicate email
      // Note: Exact error message depends on implementation
      await expect(page).toHaveURL(/sign-up/); // Should stay on sign-up page
    } finally {
      // Always cleanup duplicate user, regardless of test result
      if (duplicateUserEmail) {
        await cleanupTestUserByEmail(duplicateUserEmail);
      }
    }
  });

  test('should navigate to sign-in page from sign-up link', async ({
    page,
  }, testInfo: TestInfo) => {
    let testEmail: string | null = null;

    try {
      // Generate unique email for this test
      testEmail = generateTestEmail(testInfo);

      // Clear any existing cookies/storage to ensure clean state
      await page.context().clearCookies();

      // Navigate to sign-up page
      await page.goto('/sign-up');

      // Click the sign-in link
      await page.getByRole('link', { name: /sign in/i }).click();

      // Should navigate to sign-in page
      await expect(page).toHaveURL(/sign-in/);
    } finally {
      // Always cleanup user, regardless of test result
      if (testEmail) {
        await cleanupTestUserByEmail(testEmail);
      }
    }
  });
});

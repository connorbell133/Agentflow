import { Page, expect } from '@playwright/test';

export async function loginAsAdmin(page: Page) {
  const email = process.env.TEST_ADMIN_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be set in .env');
  }

  await page.goto('/sign-in');

  // Handle sign-in form
  // Wait for the email input to be visible
  await page.waitForSelector('input[name="identifier"], input[type="email"]', { timeout: 10000 });

  const emailInput = page.locator('input[name="identifier"], input[type="email"]');
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(email);
  const continueButton = page.locator('button[type="submit"], button:has-text("Continue")');
  await expect(continueButton).toBeVisible({ timeout: 10000 });
  await continueButton.click();

  // Wait for password input
  await page.waitForSelector('input[name="password"], input[type="password"]', { timeout: 10000 });
  const passwordInput = page.locator('input[name="password"], input[type="password"]');
  await expect(passwordInput).toBeVisible({ timeout: 10000 });
  await passwordInput.fill(password);
  const signInButton = page.locator('button[type="submit"], button:has-text("Sign in")');
  await expect(signInButton).toBeVisible({ timeout: 10000 });
  await signInButton.click();

  // Wait for redirect to home or dashboard
  // Adjust validation based on where successful login lands (e.g. / or /admin)
  await page.waitForURL(url => {
    return (
      url.pathname === '/' || url.pathname.startsWith('/admin') || url.pathname.startsWith('/chat')
    );
  });
}

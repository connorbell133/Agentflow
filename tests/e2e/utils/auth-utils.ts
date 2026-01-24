import { Page, expect } from '@playwright/test';
import { createSupabaseServerClient } from './supabase-test-client';

/**
 * @deprecated This file contains LEGACY UI-based authentication utilities.
 *
 * **DO NOT USE THESE FUNCTIONS IN NEW TESTS!**
 *
 * These functions use UI automation to sign in users, which is:
 * - Slow (2-5 seconds vs 200ms for API-based auth)
 * - Flaky (depends on UI elements and timing)
 * - Hard to maintain (UI changes break tests)
 *
 * **Use `auth-factories.ts` instead:**
 * ```typescript
 * import { createAuthenticatedUser, createUserWithOrg } from './auth-factories';
 *
 * // Create user with auth + profile
 * const user = await createAuthenticatedUser({
 *   email: 'test@example.com',
 *   password: 'password123',
 *   fullName: 'Test User'
 * });
 *
 * // Create complete setup with org and group
 * const setup = await createUserWithOrg({
 *   email: 'admin@example.com',
 *   password: 'password123',
 *   fullName: 'Admin User',
 *   orgName: 'Test Org'
 * });
 *
 * // Save session for Playwright test reuse
 * await savePlaywrightAuthState(user.session, './playwright/.auth/user.json');
 * ```
 *
 * This file will be removed in a future release.
 */

/**
 * @deprecated Use `createAuthenticatedUser()` and `savePlaywrightAuthState()` from `auth-factories.ts` instead.
 *
 * Performs the full sign-up and onboarding flow for a new user via UI.
 * This is SLOW and FLAKY. Use programmatic auth creation instead.
 *
 * @param page The Playwright page object.
 * @param user_email The email for the new user.
 * @param user_password The password for the new user.
 * @param user_fullName The full name for the new user.
 */
export async function setupAndSignInUser(
  page: Page,
  user_email: string,
  user_password: string,
  user_fullName: string
): Promise<void> {
  // 1. Navigate to sign-in page
  await page.goto('http://localhost:3000/sign-in');

  // 2. Check if user is already authenticated (redirected away from sign-in)
  // If so, sign out first to ensure clean state
  if (!page.url().includes('/sign-in')) {
    await signOutUser(page);
  }

  // 3. Wait for the sign-in form to be ready and ensure we're on sign-in (not sign-up)
  await page.waitForURL('**/sign-in**', { timeout: 10000 });

  // 4. Wait for the auth form to load and ensure we're on the sign-in form
  // If we somehow ended up on sign-up, click the "Sign in" link
  const signInLink = page.getByRole('link', { name: 'Sign in' });
  if (await signInLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signInLink.click();
    await page.waitForURL('**/sign-in**', { timeout: 5000 });
  }

  // 5. Fill sign-in form
  const emailInput = page.getByRole('textbox', { name: 'Email address' });
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.click();
  await emailInput.fill(user_email);
  const continueButton1 = page.getByRole('button', { name: 'Continue', exact: true });
  await expect(continueButton1).toBeVisible({ timeout: 10000 });
  await continueButton1.click();
  const passwordInput = page.getByRole('textbox', { name: 'Password' });
  await expect(passwordInput).toBeVisible({ timeout: 10000 });
  await passwordInput.fill(user_password);
  const continueButton2 = page.getByRole('button', { name: 'Continue', exact: true });
  await expect(continueButton2).toBeVisible({ timeout: 10000 });
  await continueButton2.click();

  await page.waitForTimeout(2000);
  if (page.url().includes('/onboarding')) {
    // 3. Complete Onboarding
    const fullNameInput = page.getByTestId('onboarding-full-name-input');
    await expect(fullNameInput).toBeVisible({ timeout: 10000 });
    await fullNameInput.fill(user_fullName);
    const continueButton = page.getByTestId('onboarding-continue-to-org-setup-button');
    await expect(continueButton).toBeVisible({ timeout: 10000 });
    await continueButton.click();

    // 4. Skip Organization Setup
    const skipButton = page.getByTestId('organization-setup-skip-button');
    await expect(skipButton).toBeVisible({ timeout: 10000 });
    await skipButton.click();

    // Wait for redirect to home page (has 1-second delay in code)
    await page.waitForURL('/', { timeout: 15000 });
  }
}

/**
 * @deprecated Use `createAuthenticatedUser()` and `savePlaywrightAuthState()` from `auth-factories.ts` instead.
 *
 * Performs the full sign-up and onboarding flow for a new user via UI.
 * This is SLOW and FLAKY. Use programmatic auth creation instead.
 *
 * @param page The Playwright page object.
 * @param user_email The email for the new user.
 * @param user_password The password for the new user.
 * @param user_fullName The full name for the new user.
 */
export async function setupAndSignUpUser(
  page: Page,
  user_email: string,
  user_password: string,
  user_fullName: string
): Promise<void> {
  // 1. Ensure we start signed out and on sign-in
  console.log('   📍 Step 1: Navigate to sign-up page...');
  await ensureSignedOut(page);
  await page.goto('http://localhost:3000/sign-in');
  await page.waitForURL('**/sign-in**', { timeout: 10000 });
  console.log('   ✅ On sign-in page');

  const signUpLink = page.getByRole('link', { name: 'Sign up' });
  await expect(signUpLink).toBeVisible({ timeout: 10000 });
  await signUpLink.click();
  await page.waitForURL('/sign-up');
  console.log('   ✅ On sign-up page');

  // 2. Fill Sign-Up Form
  console.log('   📝 Step 2: Filling sign-up form...');
  const nameInput = page.getByTestId('sign-up-name-input');
  await expect(nameInput).toBeVisible({ timeout: 10000 });
  await nameInput.fill(user_fullName);
  console.log(`   ✅ Filled name: ${user_fullName}`);

  const emailInput = page.getByTestId('sign-up-email-input');
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(user_email);
  console.log(`   ✅ Filled email: ${user_email}`);

  const passwordInput = page.getByTestId('sign-up-password-input');
  await expect(passwordInput).toBeVisible({ timeout: 10000 });
  await passwordInput.fill(user_password);
  console.log('   ✅ Filled password');

  const confirmPasswordInput = page.getByTestId('sign-up-confirm-password-input');
  await expect(confirmPasswordInput).toBeVisible({ timeout: 10000 });
  await confirmPasswordInput.fill(user_password);
  console.log('   ✅ Filled confirm password');

  const termsCheckbox = page.getByTestId('sign-up-terms-checkbox');
  await expect(termsCheckbox).toBeVisible({ timeout: 10000 });
  await termsCheckbox.check();
  console.log('   ✅ Checked terms checkbox');

  // Submit the form by pressing Enter in the last input field
  console.log('   🚀 Submitting sign-up form...');
  await confirmPasswordInput.press('Enter');

  // Wait for navigation away from sign-up page
  console.log('   ⏳ Waiting for navigation away from sign-up...');
  const currentUrlBeforeWait = page.url();
  console.log(`   Current URL before wait: ${currentUrlBeforeWait}`);

  try {
    // Increased timeout for parallel execution (can take longer under load)
    await page.waitForURL(url => !url.toString().includes('/sign-up'), { timeout: 45000 });
    console.log('   ✅ Navigated away from sign-up page');
  } catch (error) {
    const currentUrlAfterTimeout = page.url();
    console.error(`   ❌ Timeout waiting for navigation. Still on: ${currentUrlAfterTimeout}`);

    // Check for error messages on the page
    const errorText = await page
      .locator('[role="alert"]')
      .textContent()
      .catch(() => 'No error found');
    console.error(`   Error message on page: ${errorText}`);

    // Take screenshot
    await page.screenshot({
      path: `test-results/signup-timeout-${Date.now()}.png`,
      fullPage: true,
    });
    throw error;
  }

  const currentUrl = page.url();

  if (currentUrl.includes('/onboarding')) {
    // 3. Complete Onboarding - fill profile if needed
    // Try to find profile setup step
    const fullNameInput = page.getByTestId('onboarding-full-name-input');
    const isProfileStepVisible = await fullNameInput.isVisible().catch(() => false);

    if (isProfileStepVisible) {
      await fullNameInput.fill(user_fullName);
      const continueButton = page.getByTestId('onboarding-continue-to-org-setup-button');
      await expect(continueButton).toBeVisible({ timeout: 10000 });
      await continueButton.click();
    }

    // 4. Skip Organization Setup
    const skipButton = page.getByTestId('organization-setup-skip-button');
    await expect(skipButton).toBeVisible({ timeout: 10000 });
    await skipButton.click();

    // Wait for redirect to home page (has 1-second delay in code, plus some buffer)
    // Accept any URL that's not /onboarding
    // Increased timeout for parallel execution (can take longer under load)
    await page.waitForURL(url => !url.toString().includes('/onboarding'), { timeout: 60000 });
  }
  // If already on '/' or '/flow', no need to wait

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', user_email)
    .single();
  if (error) {
    throw new Error(`Error fetching profile: ${error.message}`);
  }
  expect(data).toBeDefined();
  expect(data?.email).toBe(user_email);
  expect(data?.full_name).toBe(user_fullName);
  expect(data?.signup_complete).toBe(true);
}

/**
 * @deprecated This function uses UI automation which is slow and flaky.
 *
 * For onboarding flow tests, use `createAuthenticatedUser()` to create the user programmatically,
 * then use the UI only for the specific onboarding steps you want to test.
 *
 * @param page The Playwright page object.
 * @param user_email The email for the new user.
 * @param user_password The password for the new user.
 * @param user_fullName The full name for the new user.
 */
export async function setupAndSignUpUserToOrganizationSetup(
  page: Page,
  user_email: string,
  user_password: string,
  user_fullName: string
): Promise<void> {
  // 1. Start Sign-up
  await page.goto('http://localhost:3000/sign-in');
  const signUpLink = page.getByRole('link', { name: 'Sign up' });
  await expect(signUpLink).toBeVisible({ timeout: 10000 });
  await signUpLink.click();
  await page.waitForURL('/sign-up');

  // 2. Fill Sign-Up Form
  const nameInput = page.getByTestId('sign-up-name-input');
  await expect(nameInput).toBeVisible({ timeout: 10000 });
  await nameInput.fill(user_fullName);

  const emailInput = page.getByTestId('sign-up-email-input');
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(user_email);

  const passwordInput = page.getByTestId('sign-up-password-input');
  await expect(passwordInput).toBeVisible({ timeout: 10000 });
  await passwordInput.fill(user_password);

  const confirmPasswordInput = page.getByTestId('sign-up-confirm-password-input');
  await expect(confirmPasswordInput).toBeVisible({ timeout: 10000 });
  await confirmPasswordInput.fill(user_password);

  const termsCheckbox = page.getByTestId('sign-up-terms-checkbox');
  await expect(termsCheckbox).toBeVisible({ timeout: 10000 });
  await termsCheckbox.check();

  // Wait a moment for form validation to complete
  await page.waitForTimeout(500);

  const submitButton = page.getByTestId('sign-up-submit-button');
  await expect(submitButton).toBeVisible({ timeout: 10000 });
  await expect(submitButton).toBeEnabled({ timeout: 5000 });
  await submitButton.click();

  // 3. After sign-up, user is redirected to /onboarding
  // The OnboardingFlow component automatically skips profile setup and goes to organization setup
  // Wait for the /onboarding URL
  // Increased timeout for parallel execution (can take longer under load)
  await page.waitForURL('/onboarding', { timeout: 45000 });

  // 4. Wait for organization setup page to be ready
  // The OnboardingFlow component skips profile and goes directly to organization setup
  // Wait for the "Organization Setup" heading to appear
  await expect(page.getByText('Organization Setup')).toBeVisible({ timeout: 10000 });

  // 5. IMPORTANT: Wait for the page to fully load and session to be established
  // The OrganizationSetup component needs a valid session with userId to accept invites
  // Wait for network to be idle to ensure all API calls are complete
  await page.waitForLoadState('networkidle');

  // Add a small buffer to ensure session is fully established
  await page.waitForTimeout(1000);
}

/**
 * @deprecated For most tests, use isolated browser contexts with storage state instead of signing in/out.
 *
 * This function uses UI automation to sign out. Consider using separate test contexts instead.
 *
 * @param page The Playwright page object.
 */
export async function signOutUser(page: Page): Promise<void> {
  // If already at sign-in/up, nothing to do
  if (page.url().includes('/sign-in') || page.url().includes('/sign-up')) {
    return;
  }

  const userMenuButton = page.getByRole('button').filter({ has: page.getByAltText('Avatar') });
  const menuVisible = await userMenuButton.isVisible({ timeout: 5000 }).catch(() => false);

  if (menuVisible) {
    await userMenuButton.click();
    const logoutMenuItem = page.getByRole('menuitem', { name: 'Log out' });
    await expect(logoutMenuItem).toBeVisible({ timeout: 10000 });
    await logoutMenuItem.click();
    await page.waitForURL('**/sign-in**', { timeout: 10000 });
    return;
  }

  // Fallback: navigate directly to sign-in; if session persists, the caller should retry sign-out
  await page.goto('http://localhost:3000/sign-in');
  await page.waitForURL('**/sign-in**', { timeout: 10000 }).catch(() => {});
}

/**
 * @deprecated For most tests, use isolated browser contexts with storage state instead of signing in/out.
 *
 * Ensures the user is signed out. Safe to call even if already signed out.
 */
export async function ensureSignedOut(page: Page): Promise<void> {
  // Go to home; if it redirects to sign-in we're already signed out
  await page.goto('http://localhost:3000/');
  await page.waitForLoadState('domcontentloaded');

  if (page.url().includes('/sign-in') || page.url().includes('/sign-up')) {
    return;
  }

  // Try a normal sign out via user menu
  const userMenuButton = page.getByRole('button').filter({ has: page.getByAltText('Avatar') });
  const menuVisible = await userMenuButton.isVisible({ timeout: 5000 }).catch(() => false);
  if (menuVisible) {
    await signOutUser(page);
    return;
  }

  // Fallback: navigate to sign-in
  await page.goto('http://localhost:3000/sign-in');
  await page.waitForURL('**/sign-in**', { timeout: 10000 }).catch(() => {});
}

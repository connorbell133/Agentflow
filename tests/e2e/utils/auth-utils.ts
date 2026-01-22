import { Page, expect } from '@playwright/test';
import { createSupabaseServerClient } from './supabase-test-client';

/**
 * Performs the full sign-up and onboarding flow for a new user.
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

    // 4. Wait for Clerk to load and ensure we're on the sign-in form
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
        const fullNameInput = page.getByRole('textbox', { name: 'Full Name *' });
        await expect(fullNameInput).toBeVisible({ timeout: 10000 });
        await fullNameInput.fill(user_fullName);
        const continueButton = page.getByRole('button', { name: 'Continue to Organization Setup' });
        await expect(continueButton).toBeVisible({ timeout: 10000 });
        await continueButton.click();

        // 4. Skip Organization Setup
        // Note: The click sequence 'Create' -> 'Join' -> 'Skip' seems redundant,
        // but we'll keep it to match your original test logic if it's required to activate 'Skip'.
        const createTab = page.getByRole('tab', { name: 'Create Organization' });
        await expect(createTab).toBeVisible({ timeout: 10000 });
        await createTab.click();
        const joinTab = page.getByRole('tab', { name: 'Join Organization' });
        await expect(joinTab).toBeVisible({ timeout: 10000 });
        await joinTab.click();
        const skipButton = page.getByRole('button', { name: 'Skip for now' });
        await expect(skipButton).toBeVisible({ timeout: 10000 });
        await skipButton.click();
        await page.waitForURL('/');
    }
}

/**
 * Performs the full sign-up and onboarding flow for a new user.
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
    await ensureSignedOut(page);
    await page.goto('http://localhost:3000/sign-in');
    await page.waitForURL('**/sign-in**', { timeout: 10000 });
    const signUpLink = page.getByRole('link', { name: 'Sign up' });
    await expect(signUpLink).toBeVisible({ timeout: 10000 });
    await signUpLink.click();
    await page.waitForURL('/sign-up');

    // 2. Fill Auth Credentials
    const emailInput = page.getByRole('textbox', { name: 'Email address' });
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill(user_email);
    const passwordInput = page.getByRole('textbox', { name: 'Password' });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await passwordInput.fill(user_password);
    const continueButton = page.getByRole('button', { name: 'Continue', exact: true });
    await expect(continueButton).toBeVisible({ timeout: 10000 });
    await continueButton.click();

    await page.waitForTimeout(2000);

    if (page.url().includes('/onboarding')) {
        // 3. Complete Onboarding
        const fullNameInput = page.getByRole('textbox', { name: 'Full Name *' });
        await expect(fullNameInput).toBeVisible({ timeout: 10000 });
        await fullNameInput.fill(user_fullName);
        const continueButton = page.getByRole('button', { name: 'Continue to Organization Setup' });
        await expect(continueButton).toBeVisible({ timeout: 10000 });
        await continueButton.click();
        // 4. Skip Organization Setup
        // Note: The click sequence 'Create' -> 'Join' -> 'Skip' seems redundant,
        // but we'll keep it to match your original test logic if it's required to activate 'Skip'.
        const createTab = page.getByRole('tab', { name: 'Create Organization' });
        await expect(createTab).toBeVisible({ timeout: 10000 });
        await createTab.click();
        const joinTab = page.getByRole('tab', { name: 'Join Organization' });
        await expect(joinTab).toBeVisible({ timeout: 10000 });
        await joinTab.click();
        const skipButton = page.getByRole('button', { name: 'Skip for now' });
        await expect(skipButton).toBeVisible({ timeout: 10000 });
        await skipButton.click();
        await page.waitForURL('/');
    } else {
        await page.waitForURL('/');
    }


    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('profiles').select('*').eq('email', user_email).single();
    if (error) {
        throw new Error(`Error fetching profile: ${error.message}`);
    }
    expect(data).toBeDefined();
    expect(data?.email).toBe(user_email);
    expect(data?.full_name).toBe(user_fullName);
    expect(data?.signup_complete).toBe(true);
}

/**
 * Performs sign-up and completes profile step, stopping at organization setup.
 * This is useful for tests that need to accept invites during onboarding.
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

    // 2. Fill Auth Credentials
    const emailInput = page.getByRole('textbox', { name: 'Email address' });
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill(user_email);
    const passwordInput = page.getByRole('textbox', { name: 'Password' });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await passwordInput.fill(user_password);
    const continueButton = page.getByRole('button', { name: 'Continue', exact: true });
    await expect(continueButton).toBeVisible({ timeout: 10000 });
    await continueButton.click();

    await page.waitForTimeout(2000);

    if (page.url().includes('/onboarding')) {
        // 3. Complete Profile Step
        const fullNameInput = page.getByRole('textbox', { name: 'Full Name *' });
        await expect(fullNameInput).toBeVisible({ timeout: 10000 });
        await fullNameInput.fill(user_fullName);
        const continueToOrgButton = page.getByRole('button', { name: 'Continue to Organization Setup' });
        await expect(continueToOrgButton).toBeVisible({ timeout: 10000 });
        await continueToOrgButton.click();

        // 4. Wait for organization setup page to be ready
        // Stop here - don't skip, so the test can accept invites
        await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 10000 });
        await expect(page.getByText('Organization Setup')).toBeVisible({ timeout: 10000 });
    } else {
        await page.waitForURL('/');
    }
}

/**
 * Signs out the current user.
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
    await page.waitForURL('**/sign-in**', { timeout: 10000 }).catch(() => { });
}

/**
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
    await page.waitForURL('**/sign-in**', { timeout: 10000 }).catch(() => { });
}
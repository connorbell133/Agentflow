import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { setupAndSignInUser, setupAndSignUpUser } from './utils/auth-utils';
import { createOrganizationForUser } from './utils/org-utils';
import { getUserIdByEmail, getOrgIdByUserId } from './utils/db-utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFile = path.join(__dirname, '../../playwright/.auth/admin.json');

/**
 * Simple sign-in function that doesn't go through onboarding.
 * Use this when the user already exists in the database.
 */
async function simpleSignIn(page: any, email: string, password: string): Promise<void> {
  await page.goto('http://localhost:3000/sign-in');

  // Check if already authenticated
  if (!page.url().includes('/sign-in')) {
    return;
  }

  // Fill sign-in form
  const emailInput = page.getByRole('textbox', { name: 'Email address' });
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(email);

  const continueButton1 = page.getByRole('button', { name: 'Continue', exact: true });
  await expect(continueButton1).toBeVisible({ timeout: 10000 });
  await continueButton1.click();

  const passwordInput = page.getByRole('textbox', { name: 'Password' });
  await expect(passwordInput).toBeVisible({ timeout: 10000 });
  await passwordInput.fill(password);

  const continueButton2 = page.getByRole('button', { name: 'Continue', exact: true });
  await expect(continueButton2).toBeVisible({ timeout: 10000 });
  await continueButton2.click();

  // Wait for redirect (should go to / or /admin, not /onboarding)
  await page.waitForTimeout(2000);

  // If we're on onboarding, something is wrong - the user should already have completed it
  if (page.url().includes('/onboarding')) {
    throw new Error('User was redirected to onboarding but should already exist in database');
  }
}

/**
 * Global setup that runs once before all tests.
 * Authenticates the admin user and creates an organization if needed.
 * Saves the auth state to a file that all tests can reuse.
 * 
 * This setup checks the database first to avoid unnecessary UI interactions:
 * - If user exists and has an org: just authenticate and save state
 * - If user exists but no org: authenticate and create org
 * - If user doesn't exist: sign up, complete onboarding, and create org
 */
setup('authenticate admin user and create org', async ({ page }) => {
  const email = process.env.TEST_ADMIN_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD;
  const fullName = 'Admin Test User';

  if (!email || !password) {
    throw new Error('TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be set in .env.test');
  }

  console.log(`\n🔐 Setting up authentication for admin user: ${email}`);

  // Check database first to see what we need to do
  let userExists = false;
  let orgExists = false;

  try {
    const userId = await getUserIdByEmail(email);
    userExists = true;
    console.log(`✅ User exists in database (ID: ${userId})`);

    try {
      const orgId = await getOrgIdByUserId(userId);
      orgExists = true;
      console.log(`✅ User already has an organization (ID: ${orgId})`);
    } catch (error) {
      console.log('ℹ️ User exists but has no organization yet');
      orgExists = false;
    }
  } catch (error) {
    console.log('ℹ️ User does not exist in database yet');
    userExists = false;
    orgExists = false;
  }

  // Check if auth state file already exists
  const authStateExists = existsSync(authFile);

  // If user exists and has org, and auth state exists, try to use it
  if (userExists && orgExists && authStateExists) {
    console.log('✅ User and org exist, auth state file found - attempting to use existing auth state...');
    try {
      // Try to load the existing auth state
      await page.context().storageState({ path: authFile });
      // Navigate to a protected page to verify auth still works
      await page.goto('http://localhost:3000/admin');
      await page.waitForLoadState('networkidle');

      // Check if we're actually authenticated (not redirected to sign-in)
      if (!page.url().includes('/sign-in')) {
        console.log('✅ Existing auth state is valid, skipping authentication');
        // Save state again to update timestamp
        await page.context().storageState({ path: authFile });
        return;
      }
    } catch (error) {
      console.log('⚠️ Existing auth state invalid, will re-authenticate');
    }
  }

  // Only run through sign-in/sign-up flow if user doesn't exist
  if (!userExists) {
    console.log('📝 User not found in database, creating new account...');
    await page.goto('http://localhost:3000/sign-in');

    try {
      // Try to sign in first (in case user exists in Clerk but not in DB yet)
      await setupAndSignInUser(page, email, password, fullName);
      const currentUrl = page.url();
      console.log(`📍 After login, redirected to: ${currentUrl}`);

      // If redirected to onboarding, complete it
      if (currentUrl.includes('/onboarding')) {
        console.log('📝 User needs to complete onboarding...');

        // Wait for the form to be ready
        await page.waitForSelector('[data-testid="onboarding-full-name-input"]', { timeout: 5000 });

        // Fill in the profile form - this will create/update the profile
        await page.getByTestId('onboarding-full-name-input').fill(fullName);
        console.log(`✅ Filled full name: ${fullName}`);

        // Wait for button to be enabled
        await page.waitForSelector('[data-testid="onboarding-continue-to-org-setup-button"]:not([disabled])', { timeout: 5000 });

        // Click the button - this triggers profile creation/update and moves to organization setup step
        console.log('💾 Submitting profile form (this creates the profile)...');
        await page.getByTestId('onboarding-continue-to-org-setup-button').click();

        // Wait for the organization setup UI to appear (the step changes internally, URL stays /onboarding)
        // Look for the "Skip for now" button or "Create Organization" tab which indicates we're on the organization setup step
        console.log('⏳ Waiting for organization setup step to appear...');
        try {
          // Wait for either the skip button or the create organization tab to appear
          await Promise.race([
            page.getByRole('button', { name: 'Skip for now' }).waitFor({ timeout: 10000 }).catch(() => null),
            page.getByRole('tab', { name: 'Create Organization' }).waitFor({ timeout: 10000 }).catch(() => null)
          ]);
          console.log('✅ Organization setup step is now visible');
        } catch (e) {
          console.warn('⚠️ Organization setup UI not found, but continuing...');
        }

        // Wait a bit for the profile to be saved to the database
        await page.waitForTimeout(2000);

        // Skip organization setup for now (we'll create it later)
        console.log('⏭️ Skipping organization setup...');
        try {
          // Wait for the tabs to be visible
          const createTab = page.getByRole('tab', { name: 'Create Organization' });
          const joinTab = page.getByRole('tab', { name: 'Join Organization' });
          const skipButton = page.getByRole('button', { name: 'Skip for now' });

          // Click through tabs to activate skip button (if needed)
          if (await createTab.isVisible({ timeout: 2000 }).catch(() => false)) {
            await createTab.click();
          }
          if (await joinTab.isVisible({ timeout: 2000 }).catch(() => false)) {
            await joinTab.click();
          }

          // Click skip
          await skipButton.click({ timeout: 5000 });
          console.log('✅ Clicked skip button');

          // Wait for redirect to home page
          await page.waitForURL('/', { timeout: 10000 });
          console.log('✅ Completed onboarding, redirected to home');
        } catch (e) {
          console.warn(`⚠️ Could not skip organization setup: ${e instanceof Error ? e.message : String(e)}`);
          // Try to navigate to home manually if we're stuck
          if (page.url().includes('/onboarding')) {
            console.log('🔄 Attempting to navigate to home page...');
            await page.goto('http://localhost:3000/');
          }
        }
      } else {
        // User is already logged in and at / or another page (onboarding already completed)
        console.log('✅ User is already logged in (onboarding already completed)');
      }

      console.log('✅ Signed in existing admin user');
    } catch (error) {
      // User doesn't exist in Clerk either, sign up
      console.log('📝 Admin user not found in Clerk, creating new account...');
      await setupAndSignUpUser(page, email, password, fullName);
      console.log('✅ Created and signed in new admin user');
    }
  } else {
    // User exists in DB, use simple sign-in that doesn't go through onboarding
    console.log('✅ User exists in database, authenticating (skipping onboarding)...');
    await simpleSignIn(page, email, password);
    console.log('✅ Authenticated existing user');
  }

  // Only create organization if one doesn't exist
  if (!orgExists) {
    console.log('🏢 Setting up organization for admin user...');
    await createOrganizationForUser(page, email, 'Test Organization', 'E2E Testing', 'Automated test organization');
    console.log('✅ Organization created and dashboard ready');
  } else {
    console.log('✅ Organization already exists, skipping creation');
    // Navigate to dashboard to ensure we're in the right state
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');
  }

  // Save authenticated state (always save to update timestamp)
  await page.context().storageState({ path: authFile });
  console.log(`✅ Saved auth state to ${authFile}\n`);
});

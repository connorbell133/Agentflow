/**
 * Invite Management E2E Tests (Parallel-Safe)
 *
 * This file tests MANAGING invites (CRUD operations):
 * - Creating invites
 * - Revoking invites
 * - Listing invites
 * - Viewing invite details
 *
 * For ACCEPTING invites, see invite-accept.spec.ts
 *
 * ✅ MIGRATION STATUS: Fully migrated to parallel-safe system
 */

import { test, expect, TestInfo } from '@playwright/test';
import { inviteUserToOrg, revokeInvite } from '../utils/org-utils';
import { generateTestEmail } from '../utils/test-factories';
import { createUserWithOrg } from '../utils/auth-factories';
import { cleanupTestUserByEmail } from '../utils/test-cleanup';
import { createSupabaseServerClient } from '../utils/supabase-test-client';

/**
 * Helper function to inject Supabase session into Playwright page context
 * Similar to what the authenticatedUserWithOrg fixture does
 */
async function injectSessionIntoPage(page: any, session: any): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL not set');
  }

  // Extract project ID using the same logic as test fixtures
  const getSupabaseProjectId = (url: string): string => {
    if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return '127';
    }
    const match = url.match(/https:\/\/([^.]+)\./);
    return match ? match[1] : 'your-project-id';
  };

  const projectId = getSupabaseProjectId(supabaseUrl);
  const tokenKey = `sb-${projectId}-auth-token`;
  const sessionValue = JSON.stringify(session);

  // Inject Cookie (Server)
  await page.context().addCookies([
    {
      name: tokenKey,
      value: sessionValue,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    },
  ]);

  // Inject LocalStorage (Client)
  await page.goto('/404');
  await page.evaluate(
    ({ key, value }: { key: string; value: string }) => localStorage.setItem(key, value),
    { key: tokenKey, value: sessionValue }
  );
}

/**
 * Invite Management - Creating and Revoking Invites
 *
 * These tests focus on the admin/owner operations for managing invites.
 * For testing invite acceptance, see invite-accept.spec.ts
 */
test.describe('Invite Management - Create and Revoke', () => {
  test('should create a new invite', async ({ page }, testInfo: TestInfo) => {
    let userEmail: string | null = null;
    let testInviteEmail: string | null = null;

    console.log('\n🧪 TEST: Create Invite');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      // Create authenticated user with org
      console.log('\n🔍 Setup: Creating authenticated admin user...');
      userEmail = generateTestEmail(testInfo);
      const setup = await createUserWithOrg({
        email: userEmail,
        password: 'TestPassword123!',
        fullName: 'Admin User',
      });
      console.log(`   ✅ Admin user created: ${setup.email}`);

      // Inject session into page
      await injectSessionIntoPage(page, setup.session);

      console.log('\n🔍 Step 1: Navigating to admin page...');
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      console.log('   ✅ Admin page loaded');

      // Generate unique invite email using testInfo
      testInviteEmail = generateTestEmail(testInfo);
      console.log(`   📧 Using unique email: ${testInviteEmail}`);

      // Invite a new user
      console.log('\n🔍 Step 2: Creating invite...');
      await inviteUserToOrg(page, testInviteEmail, process.env.TEST_GROUP_NAME || 'member');
      console.log('   ✅ Invite created successfully');

      // Verify invite exists in database
      console.log('\n🔍 Step 3: Verifying invite in database...');
      const supabase = await createSupabaseServerClient();

      const { data: invite, error } = await supabase
        .from('invites')
        .select('*')
        .eq('invitee', testInviteEmail)
        .single();

      expect(error).toBeNull();
      expect(invite).toBeDefined();
      expect(invite?.invitee).toBe(testInviteEmail);
      console.log(`   ✅ Invite verified in database: ${invite?.id}`);

      console.log('\n✅ TEST PASSED\n');
    } catch (error) {
      console.error('\n❌ TEST FAILED:', error);
      await page.screenshot({
        path: `test-results/invite-create-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    } finally {
      // Always cleanup, regardless of test result
      if (userEmail) {
        try {
          await cleanupTestUserByEmail(userEmail);
        } catch (error) {
          console.error('Failed to cleanup user:', error);
        }
      }
    }
  });

  test('should revoke a pending invite', async ({ page }, testInfo: TestInfo) => {
    let userEmail: string | null = null;
    let testInviteEmail: string | null = null;

    console.log('\n🧪 TEST: Revoke Invite');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      console.log('\n🔍 Setup: Creating authenticated admin user...');
      userEmail = generateTestEmail(testInfo);
      const setup = await createUserWithOrg({
        email: userEmail,
        password: 'TestPassword123!',
        fullName: 'Admin User',
      });
      console.log(`   ✅ Admin user created: ${setup.email}`);

      // Inject session into page
      await injectSessionIntoPage(page, setup.session);

      console.log('\n🔍 Step 1: Navigating to admin page...');
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      console.log('   ✅ Admin page loaded');

      // Generate unique invite email using testInfo
      testInviteEmail = generateTestEmail(testInfo);
      console.log(`   📧 Using unique email: ${testInviteEmail}`);

      // First, create an invite
      console.log('\n🔍 Step 2: Creating invite...');
      await inviteUserToOrg(page, testInviteEmail, process.env.TEST_GROUP_NAME || 'member');
      console.log('   ✅ Invite created');

      // Verify invite exists
      const supabase = await createSupabaseServerClient();

      const { data: inviteBefore } = await supabase
        .from('invites')
        .select('*')
        .eq('invitee', testInviteEmail)
        .single();

      expect(inviteBefore).toBeDefined();
      console.log(`   ✅ Invite exists: ${inviteBefore?.id}`);

      // Then revoke it
      console.log('\n🔍 Step 3: Revoking invite...');
      await revokeInvite(page, testInviteEmail);
      console.log('   ✅ Invite revoked via UI');

      // Verify invite was revoked in database
      console.log('\n🔍 Step 4: Verifying revocation in database...');
      const { data: inviteAfter } = await supabase
        .from('invites')
        .select('*')
        .eq('invitee', testInviteEmail)
        .maybeSingle();

      expect(inviteAfter).toBeNull();
      console.log('   ✅ Invite deleted from database');

      console.log('\n✅ TEST PASSED\n');
    } catch (error) {
      console.error('\n❌ TEST FAILED:', error);
      await page.screenshot({
        path: `test-results/invite-revoke-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    } finally {
      // Always cleanup, regardless of test result
      if (userEmail) {
        try {
          await cleanupTestUserByEmail(userEmail);
        } catch (error) {
          console.error('Failed to cleanup user:', error);
        }
      }
    }
  });

  test('should display pending invites list', async ({ page }, testInfo: TestInfo) => {
    let userEmail: string | null = null;
    let testInviteEmail: string | null = null;

    console.log('\n🧪 TEST: List Pending Invites');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      console.log('\n🔍 Setup: Creating authenticated admin user...');
      userEmail = generateTestEmail(testInfo);
      const setup = await createUserWithOrg({
        email: userEmail,
        password: 'TestPassword123!',
        fullName: 'Admin User',
      });

      // Inject session into page
      await injectSessionIntoPage(page, setup.session);

      console.log('\n🔍 Step 1: Navigating to admin page...');
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      console.log('   ✅ Admin page loaded');

      // Generate unique invite email using testInfo
      testInviteEmail = generateTestEmail(testInfo);

      // Create an invite
      console.log('\n🔍 Step 2: Creating invite...');
      await inviteUserToOrg(page, testInviteEmail, process.env.TEST_GROUP_NAME || 'member');
      console.log('   ✅ Invite created');

      // Navigate to invites section - look for "Pending Invites" heading
      console.log('\n🔍 Step 3: Checking for Pending Invites section...');
      const invitesHeading = page.getByRole('heading', { name: 'Pending Invites' });
      await expect(invitesHeading).toBeVisible({ timeout: 10000 });
      console.log('   ✅ Pending Invites section visible');

      // Verify invite appears in list
      console.log('\n🔍 Step 4: Verifying invite in list...');
      const inviteRow = page.getByText(testInviteEmail);
      await expect(inviteRow).toBeVisible({ timeout: 5000 });
      console.log(`   ✅ Invite displayed: ${testInviteEmail}`);

      console.log('\n✅ TEST PASSED\n');
    } catch (error) {
      console.error('\n❌ TEST FAILED:', error);
      await page.screenshot({
        path: `test-results/invite-list-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    } finally {
      // Always cleanup, regardless of test result
      if (userEmail) {
        try {
          await cleanupTestUserByEmail(userEmail);
        } catch (error) {
          console.error('Failed to cleanup user:', error);
        }
      }
    }
  });

  test('should prevent duplicate invites for same email', async ({ page }, testInfo: TestInfo) => {
    let userEmail: string | null = null;
    let testInviteEmail: string | null = null;

    console.log('\n🧪 TEST: Prevent Duplicate Invites');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      console.log('\n🔍 Setup: Creating authenticated admin user...');
      userEmail = generateTestEmail(testInfo);
      const setup = await createUserWithOrg({
        email: userEmail,
        password: 'TestPassword123!',
        fullName: 'Admin User',
      });

      // Inject session into page
      await injectSessionIntoPage(page, setup.session);

      console.log('\n🔍 Step 1: Navigating to admin page...');
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      console.log('   ✅ Admin page loaded');

      // Generate unique invite email using testInfo
      testInviteEmail = generateTestEmail(testInfo);

      // Create first invite
      console.log('\n🔍 Step 2: Creating first invite...');
      await inviteUserToOrg(page, testInviteEmail, process.env.TEST_GROUP_NAME || 'member');
      console.log('   ✅ First invite created');

      // Wait for form to reset and be ready again
      await page.waitForTimeout(2000);

      // Try to create duplicate invite
      console.log('\n🔍 Step 3: Attempting to create duplicate invite...');

      const emailInput = page.getByTestId('invite-user-email-input');
      await expect(emailInput).toBeVisible({ timeout: 5000 });

      await emailInput.clear();
      await emailInput.fill(testInviteEmail);
      console.log(`   ✅ Entered duplicate email: ${testInviteEmail}`);

      // Select group again
      const groupSelect = page.getByTestId('invite-user-group-select');
      await expect(groupSelect).toBeVisible({ timeout: 5000 });
      await groupSelect.click();
      await page.waitForTimeout(500);

      const groupOption = page.getByRole('option', {
        name: new RegExp(process.env.TEST_GROUP_NAME || 'member', 'i'),
      });
      await expect(groupOption).toBeVisible({ timeout: 5000 });
      await groupOption.click();
      await page.waitForTimeout(500);
      console.log('   ✅ Selected group');

      // Try to submit the duplicate
      const sendButton = page.getByTestId('invite-user-submit-button');
      await expect(sendButton).toBeVisible({ timeout: 5000 });
      await expect(sendButton).toBeEnabled({ timeout: 5000 });
      await sendButton.click();
      console.log('   ✅ Submit button clicked');

      // Should show error message
      console.log('\n🔍 Step 4: Checking for error message...');
      const errorDiv = page.getByTestId('invite-user-error');
      await expect(errorDiv).toBeVisible({ timeout: 10000 });

      const errorText = await errorDiv.textContent();
      console.log(`   ✅ Error shown: ${errorText}`);

      expect(errorText?.toLowerCase()).toMatch(/already|duplicate|pending|23505/);
      console.log('   ✅ Duplicate prevention working (constraint violation detected)');

      console.log('\n✅ TEST PASSED\n');
    } catch (error) {
      console.error('\n❌ TEST FAILED:', error);
      await page.screenshot({
        path: `test-results/invite-duplicate-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    } finally {
      // Always cleanup, regardless of test result
      if (userEmail) {
        try {
          await cleanupTestUserByEmail(userEmail);
        } catch (error) {
          console.error('Failed to cleanup user:', error);
        }
      }
    }
  });
});

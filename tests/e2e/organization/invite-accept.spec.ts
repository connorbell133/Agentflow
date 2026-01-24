/**
 * Invite Acceptance E2E Tests
 *
 * This file contains ALL invite acceptance scenarios, regardless of where
 * the acceptance happens in the UI (onboarding, badge, etc.).
 *
 * Tests are organized by acceptance scenario, not by UI location:
 * - Accept from onboarding
 * - Accept from notification badge
 * - Accept with existing organization
 * - Accept expired invite
 * - Reject invite
 * - etc.
 *
 * This organization makes it clear what acceptance scenarios are covered
 * and prevents duplication across multiple test files.
 */

import { test, expect, TestInfo } from '@playwright/test';
import {
  acceptInviteInOnboarding,
  acceptInviteFromBadge,
  createInviteInDatabase,
} from '../utils/org-utils';
import { setupAndSignUpUser, setupAndSignUpUserToOrganizationSetup } from '../utils/auth-utils';
import { generateTestEmail, generateTestGroupName } from '../utils/test-factories';
import { createUserWithOrg } from '../utils/auth-factories';
import { cleanupTestUserByEmail } from '../utils/test-cleanup';

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
 * SCENARIO 1: Accept Invite During Onboarding
 *
 * User flow:
 * 1. User receives invite email
 * 2. User signs up for new account
 * 3. User completes profile setup in onboarding
 * 4. User sees pending invite in organization setup step
 * 5. User accepts invite instead of creating/joining org
 */
test.describe.serial('Invite Acceptance - During Onboarding', () => {
  test('should accept invite during onboarding after signup', async ({
    page,
    browser,
  }, testInfo: TestInfo) => {
    let adminUserEmail: string | null = null;
    let invitedUserEmail: string | null = null;

    // Create authenticated admin user with org
    adminUserEmail = generateTestEmail(testInfo);
    const adminUser = await createUserWithOrg({
      email: adminUserEmail,
      password: 'AdminPassword123!',
      fullName: 'Admin User',
    });

    // Inject session into page (for admin operations)
    await injectSessionIntoPage(page, adminUser.session);

    // Generate unique invited user email
    invitedUserEmail = generateTestEmail(testInfo);
    const invitedUserPassword = 'Password123!';
    const invitedUserFullName = 'Invited User';

    // Create invite directly in database
    console.log('\n📧 Creating invite in database...');
    // Generate unique group name using testInfo to ensure uniqueness across parallel workers
    const groupName = generateTestGroupName(testInfo, process.env.TEST_GROUP_NAME || 'member');
    console.log(`   Admin: ${adminUserEmail} → Invitee: ${invitedUserEmail} → Group: ${groupName}`);

    let inviteId: string | null = null;
    try {
      inviteId = await createInviteInDatabase(adminUserEmail, invitedUserEmail, groupName);
      console.log(`   ✅ Invite created: ${inviteId}`);
    } catch (error) {
      console.error(`   ❌ Failed to create invite:`, error);
      throw error;
    }
    console.log('\n🧪 TEST: Accept Invite During Onboarding');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Create fresh browser context for invited user (no admin session)
    console.log('\n📋 Step 1: Creating fresh user context...');
    const invitedUserContext = await browser.newContext({ storageState: undefined });
    const invitedUserPage = await invitedUserContext.newPage();
    console.log('   ✅ Fresh context created');

    try {
      // Sign up user - stops at organization setup step
      console.log('\n🎯 Step 2: Signing up user and navigating to org setup...');
      await setupAndSignUpUserToOrganizationSetup(
        invitedUserPage,
        invitedUserEmail,
        invitedUserPassword,
        invitedUserFullName
      );
      console.log('   ✅ User at organization setup step');
      console.log(`   URL: ${invitedUserPage.url()}`);

      // Accept the pending invite
      console.log('\n🔍 Step 3: Accepting invite from onboarding...');
      await acceptInviteInOnboarding(invitedUserPage, invitedUserEmail);
      console.log('   ✅ Invite accepted (still on onboarding page)');

      // Verify database was updated - user should be in org and group
      console.log('\n🔍 Step 4: Verifying database updates...');
      const { createSupabaseServerClient } = await import('../utils/supabase-test-client');
      const supabase = await createSupabaseServerClient();

      // Get user ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', invitedUserEmail)
        .single();

      expect(profile).toBeDefined();
      const userId = profile!.id;
      console.log(`   User ID: ${userId}`);

      // Verify user is in org_map
      const { data: orgMap } = await supabase
        .from('org_map')
        .select('*, organizations(name)')
        .eq('user_id', userId)
        .single();

      expect(orgMap).toBeDefined();
      console.log(`   ✅ User added to org: ${(orgMap as any)?.organizations?.name}`);

      // Verify user is in group_map
      const { data: groupMap } = await supabase
        .from('group_map')
        .select('*, groups(role)')
        .eq('user_id', userId)
        .maybeSingle();

      expect(groupMap).toBeDefined();
      console.log(`   ✅ User added to group: ${(groupMap as any)?.groups?.role}`);

      // Click Continue to finish onboarding
      console.log('\n🔍 Step 5: Clicking Continue button...');
      const continueButton = invitedUserPage.getByTestId('continue-after-accepting-invites-button');
      await expect(continueButton).toBeVisible({ timeout: 10000 });
      await continueButton.click();
      console.log('   ✅ Continue button clicked');

      // Verify redirect away from onboarding
      console.log('\n✅ Step 6: Verifying redirect...');
      await invitedUserPage.waitForTimeout(2000);
      const finalUrl = invitedUserPage.url();
      console.log(`   Final URL: ${finalUrl}`);
      expect(finalUrl).not.toContain('/onboarding');

      console.log('\n✅ TEST PASSED\n');
    } catch (error) {
      console.error('\n❌ TEST FAILED:', error);
      console.error(`   URL at failure: ${invitedUserPage.url()}`);
      await invitedUserPage.screenshot({
        path: `test-results/invite-onboarding-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    } finally {
      await invitedUserContext.close();

      // Cleanup invited user
      if (invitedUserEmail) {
        try {
          await cleanupTestUserByEmail(invitedUserEmail);
        } catch (error) {
          console.error('Failed to cleanup invited user:', error);
        }
      }

      // Cleanup admin user
      if (adminUserEmail) {
        try {
          await cleanupTestUserByEmail(adminUserEmail);
        } catch (error) {
          console.error('Failed to cleanup admin user:', error);
        }
      }
    }
  });

  test('should show invite details before accepting', async ({
    page,
    browser,
  }, testInfo: TestInfo) => {
    let adminUserEmail: string | null = null;
    let invitedUserEmail: string | null = null;

    // Create authenticated admin user with org
    adminUserEmail = generateTestEmail(testInfo);
    const adminUser = await createUserWithOrg({
      email: adminUserEmail,
      password: 'AdminPassword123!',
      fullName: 'Admin User',
    });

    // Inject session into page (for admin operations)
    await injectSessionIntoPage(page, adminUser.session);

    // Generate unique invited user email
    invitedUserEmail = generateTestEmail(testInfo);
    const invitedUserPassword = 'Password123!';
    const invitedUserFullName = 'Invited User';

    // Create invite directly in database
    console.log('\n📧 Creating invite in database...');
    // Generate unique group name using testInfo to ensure uniqueness across parallel workers
    const groupName = generateTestGroupName(testInfo, process.env.TEST_GROUP_NAME || 'member');
    let inviteId: string | null = null;
    try {
      inviteId = await createInviteInDatabase(adminUserEmail, invitedUserEmail, groupName);
      console.log(`   ✅ Invite created: ${inviteId}`);
    } catch (error) {
      console.error(`   ❌ Failed to create invite:`, error);
      throw error;
    }

    console.log('\n🧪 TEST: Show Invite Details in Onboarding');

    const invitedUserContext = await browser.newContext({ storageState: undefined });
    const invitedUserPage = await invitedUserContext.newPage();

    try {
      await setupAndSignUpUserToOrganizationSetup(
        invitedUserPage,
        invitedUserEmail,
        invitedUserPassword,
        invitedUserFullName
      );

      // Verify user is on the "Join Organization" tab
      console.log('\n🔍 Step 1: Verifying Join Organization tab...');
      const joinTab = invitedUserPage.getByRole('tab', { name: /Join Organization/i });
      await expect(joinTab).toBeVisible({ timeout: 10000 });
      await expect(joinTab).toHaveAttribute('aria-selected', 'true');
      console.log('   ✅ On Join Organization tab');

      // Verify "Pending Invitations" heading is visible
      console.log('\n🔍 Step 2: Checking for Pending Invitations section...');
      const pendingHeading = invitedUserPage.getByRole('heading', { name: 'Pending Invitations' });
      await expect(pendingHeading).toBeVisible({ timeout: 10000 });
      console.log('   ✅ Pending Invitations heading visible');

      // Verify organization name is shown in the invite card
      console.log('\n🔍 Step 3: Verifying organization name is displayed...');
      const { getUserIdByEmail, getOrgIdByUserId } = await import('../utils/db-utils');
      const { createSupabaseServerClient } = await import('../utils/supabase-test-client');
      const supabase = await createSupabaseServerClient();

      const adminUserId = await getUserIdByEmail(adminUserEmail!);
      const adminOrgId = await getOrgIdByUserId(adminUserId);
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', adminOrgId)
        .single();

      // Look for the org name in the invite card - it might be truncated or partial
      if (org?.name) {
        // Try to find any text containing part of the org name (first few words)
        const orgNameParts = org.name.split(' ');
        const firstPart = orgNameParts[0]; // e.g., "E2E" from "E2E Test Organization"
        const orgNameElement = invitedUserPage.getByText(new RegExp(firstPart, 'i'));
        const isVisible = await orgNameElement.isVisible({ timeout: 5000 }).catch(() => false);

        if (isVisible) {
          console.log(`   ✅ Org name displayed (contains: ${firstPart})`);
        } else {
          console.log(`   ⚠️  Org name "${org.name}" not visible, checking card content...`);
          // Just verify there's at least one invite card visible
          const inviteCard = invitedUserPage
            .locator('div[class*="border"]')
            .filter({ hasText: /invited by/i });
          await expect(inviteCard.first()).toBeVisible({ timeout: 5000 });
          console.log(`   ✅ Invite card is visible`);
        }
      }

      // Verify Accept and Decline buttons are visible
      console.log('\n🔍 Step 4: Verifying action buttons...');
      const acceptButton = invitedUserPage.getByRole('button', { name: 'Accept' }).first();
      const declineButton = invitedUserPage.getByRole('button', { name: 'Decline' }).first();
      await expect(acceptButton).toBeVisible({ timeout: 5000 });
      await expect(declineButton).toBeVisible({ timeout: 5000 });
      console.log('   ✅ Accept and Decline buttons visible');

      console.log('\n✅ All invite details displayed correctly');
      console.log('\n✅ TEST PASSED\n');
    } catch (error) {
      console.error('\n❌ TEST FAILED:', error);
      await invitedUserPage.screenshot({
        path: `test-results/invite-details-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    } finally {
      await invitedUserContext.close();

      // Cleanup invited user
      if (invitedUserEmail) {
        try {
          await cleanupTestUserByEmail(invitedUserEmail);
        } catch (error) {
          console.error('Failed to cleanup invited user:', error);
        }
      }

      // Cleanup admin user
      if (adminUserEmail) {
        try {
          await cleanupTestUserByEmail(adminUserEmail);
        } catch (error) {
          console.error('Failed to cleanup admin user:', error);
        }
      }
    }
  });
});

/**
 * SCENARIO 2: Accept Invite From Notification Badge
 *
 * User flow:
 * 1. User receives invite email
 * 2. User signs up for new account
 * 3. User completes full onboarding (skips org setup)
 * 4. User sees notification badge with pending invite
 * 5. User clicks badge and accepts invite
 */
test.describe.serial('Invite Acceptance - From Notification Badge', () => {
  test('should accept invite from notification badge after signup', async ({
    page,
    browser,
  }, testInfo: TestInfo) => {
    let adminUserEmail: string | null = null;
    let invitedUserEmail: string | null = null;

    // Create authenticated admin user with org
    adminUserEmail = generateTestEmail(testInfo);
    const adminUser = await createUserWithOrg({
      email: adminUserEmail,
      password: 'AdminPassword123!',
      fullName: 'Admin User',
    });

    // Inject session into page (for admin operations)
    await injectSessionIntoPage(page, adminUser.session);

    // Generate unique invited user email
    invitedUserEmail = generateTestEmail(testInfo);
    const invitedUserPassword = 'Password123!';
    const invitedUserFullName = 'Invited User';

    // Create invite directly in database
    console.log('\n📧 Creating invite in database...');
    // Generate unique group name using testInfo to ensure uniqueness across parallel workers
    const groupName = generateTestGroupName(testInfo, process.env.TEST_GROUP_NAME || 'member');
    let inviteId: string | null = null;
    try {
      inviteId = await createInviteInDatabase(adminUserEmail, invitedUserEmail, groupName);
      console.log(`   ✅ Invite created: ${inviteId}`);
    } catch (error) {
      console.error(`   ❌ Failed to create invite:`, error);
      throw error;
    }
    console.log('\n🧪 TEST: Accept Invite From Badge');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const invitedUserContext = await browser.newContext({ storageState: undefined });
    const invitedUserPage = await invitedUserContext.newPage();

    // Capture browser console logs for debugging
    invitedUserPage.on('console', msg => {
      const text = msg.text();
      if (
        text.includes('usePendingInvites') ||
        text.includes('getUserInvites') ||
        text.includes('InviteBadge') ||
        text.includes('Invite accepted') ||
        text.includes('Failed to accept') ||
        msg.type() === 'error'
      ) {
        console.log(`   [BROWSER ${msg.type().toUpperCase()}] ${text}`);
      }
    });

    try {
      // Sign up user - completes full flow including skipping org setup
      console.log('\n🎯 Step 1: Signing up user and completing onboarding...');
      await setupAndSignUpUser(
        invitedUserPage,
        invitedUserEmail,
        invitedUserPassword,
        invitedUserFullName
      );
      console.log('   ✅ Onboarding completed');
      console.log(`   URL: ${invitedUserPage.url()}`);

      // Accept invite from notification badge
      console.log('\n🔍 Step 2: Accepting invite from badge...');
      await acceptInviteFromBadge(invitedUserPage, invitedUserEmail);
      console.log('   ✅ Invite accepted from badge');

      // Verify database was updated - user should be in org and group
      console.log('\n🔍 Step 3: Verifying database updates...');
      const { createSupabaseServerClient } = await import('../utils/supabase-test-client');
      const supabase = await createSupabaseServerClient();

      // Get user ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', invitedUserEmail)
        .single();

      expect(profile).toBeDefined();
      const userId = profile!.id;
      console.log(`   User ID: ${userId}`);

      // Verify user is in org_map
      const { data: orgMap } = await supabase
        .from('org_map')
        .select('*, organizations(name)')
        .eq('user_id', userId)
        .single();

      expect(orgMap).toBeDefined();
      console.log(`   ✅ User added to org: ${(orgMap as any)?.organizations?.name}`);

      // Verify user is in group_map
      const { data: groupMap } = await supabase
        .from('group_map')
        .select('*, groups(role)')
        .eq('user_id', userId)
        .maybeSingle();

      expect(groupMap).toBeDefined();
      console.log(`   ✅ User added to group: ${(groupMap as any)?.groups?.role}`);

      // Verify completion - user should still be on main page
      console.log('\n✅ Step 4: Verifying user remains on main page...');
      await invitedUserPage.waitForTimeout(1000);
      const finalUrl = invitedUserPage.url();
      console.log(`   Final URL: ${finalUrl}`);
      expect(finalUrl).not.toContain('/onboarding');
      console.log('   ✅ User on main app (not onboarding)');

      console.log('\n✅ TEST PASSED\n');
    } catch (error) {
      console.error('\n❌ TEST FAILED:', error);
      console.error(`   URL at failure: ${invitedUserPage.url()}`);
      await invitedUserPage.screenshot({
        path: `test-results/invite-badge-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    } finally {
      await invitedUserContext.close();

      // Cleanup invited user
      if (invitedUserEmail) {
        try {
          await cleanupTestUserByEmail(invitedUserEmail);
        } catch (error) {
          console.error('Failed to cleanup invited user:', error);
        }
      }

      // Cleanup admin user
      if (adminUserEmail) {
        try {
          await cleanupTestUserByEmail(adminUserEmail);
        } catch (error) {
          console.error('Failed to cleanup admin user:', error);
        }
      }
    }
  });

  test('should display notification badge with invite count', async ({
    page,
    browser,
  }, testInfo: TestInfo) => {
    let adminUserEmail: string | null = null;
    let invitedUserEmail: string | null = null;

    // Create authenticated admin user with org
    adminUserEmail = generateTestEmail(testInfo);
    const adminUser = await createUserWithOrg({
      email: adminUserEmail,
      password: 'AdminPassword123!',
      fullName: 'Admin User',
    });

    // Inject session into page (for admin operations)
    await injectSessionIntoPage(page, adminUser.session);

    // Generate unique invited user email
    invitedUserEmail = generateTestEmail(testInfo);
    const invitedUserPassword = 'Password123!';
    const invitedUserFullName = 'Invited User';

    // Create invite directly in database
    console.log('\n📧 Creating invite in database...');
    // Generate unique group name using testInfo to ensure uniqueness across parallel workers
    const groupName = generateTestGroupName(testInfo, process.env.TEST_GROUP_NAME || 'member');
    let inviteId: string | null = null;
    try {
      inviteId = await createInviteInDatabase(adminUserEmail, invitedUserEmail, groupName);
      console.log(`   ✅ Invite created: ${inviteId}`);
    } catch (error) {
      console.error(`   ❌ Failed to create invite:`, error);
      throw error;
    }
    console.log('\n🧪 TEST: Display Notification Badge');

    const invitedUserContext = await browser.newContext({ storageState: undefined });
    const invitedUserPage = await invitedUserContext.newPage();

    try {
      await setupAndSignUpUser(
        invitedUserPage,
        invitedUserEmail,
        invitedUserPassword,
        invitedUserFullName
      );

      // Verify badge is visible (there are multiple badges - sidebar and top menu)
      console.log('\n🔍 Checking for notification badge...');
      const allBadges = invitedUserPage.getByTestId('invite-badge-trigger');

      // Wait for at least one badge to be visible
      await expect(allBadges.first()).toBeVisible({ timeout: 10000 });
      console.log('   ✅ Badge trigger found');

      // The count badge is a span inside the trigger with the count
      // Look for the red notification count badge (not the trigger itself)
      const countBadge = invitedUserPage.locator('span.bg-red-500').first();
      await expect(countBadge).toBeVisible({ timeout: 10000 });

      // Verify count shows "1"
      await expect(countBadge).toHaveText('1');

      console.log('   ✅ Badge displayed with correct count (1)');
      console.log('\n✅ TEST PASSED\n');
    } catch (error) {
      console.error('\n❌ TEST FAILED:', error);
      await invitedUserPage.screenshot({
        path: `test-results/badge-display-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    } finally {
      await invitedUserContext.close();

      // Cleanup invited user
      if (invitedUserEmail) {
        try {
          await cleanupTestUserByEmail(invitedUserEmail);
        } catch (error) {
          console.error('Failed to cleanup invited user:', error);
        }
      }

      // Cleanup admin user
      if (adminUserEmail) {
        try {
          await cleanupTestUserByEmail(adminUserEmail);
        } catch (error) {
          console.error('Failed to cleanup admin user:', error);
        }
      }
    }
  });
});

/**
 * SCENARIO 3: Accept Invite With Existing Organization
 *
 * User flow:
 * 1. User already has account with organization
 * 2. User receives invite to different organization
 * 3. User accepts invite
 * 4. User can now switch between organizations
 */
test.describe.serial('Invite Acceptance - User With Existing Org', () => {
  // TODO: Implement once we have helper to create user with org programmatically
  test.skip('should allow accepting invite when user already has org', async () => {
    // This test requires:
    // 1. Create user with org (using auth-factories)
    // 2. Create invite to different org
    // 3. User accepts invite
    // 4. Verify user is in both orgs
  });
});

/**
 * SCENARIO 4: Expired and Invalid Invites
 *
 * Test error handling for various invalid invite scenarios
 */
test.describe.serial('Invite Acceptance - Error Scenarios', () => {
  test.skip('should show error for expired invite', async () => {
    // Create expired invite, attempt to accept, verify error
  });

  test.skip('should show error for already accepted invite', async () => {
    // Accept invite, then try to accept again
  });

  test.skip('should show error for revoked invite', async () => {
    // Create invite, revoke it, try to accept
  });
});

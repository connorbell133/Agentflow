import { test, expect, TestInfo } from '@playwright/test';
import {
  createGroup,
  deleteGroup,
  addUserToGroup,
  removeUserFromGroup,
  addModelToGroup,
  removeModelFromGroup,
} from '../utils/org-utils';
import {
  getOrgIdByEmail,
  getOrCreateGroupId,
  deleteGroupFromDatabase,
  addUserToGroupInDatabase,
  removeUserFromGroupInDatabase,
  addModelToGroupInDatabase,
  removeModelFromGroupInDatabase,
  createTestUserInOrg,
  deleteTestUserProfile,
  createTestModel,
  deleteTestModel,
} from '../utils/db-utils';
import {
  generateTestEmail,
  generateTestGroupName,
  generateTestModelName,
} from '../utils/test-factories';
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

test.describe('Group Management', () => {
  test.describe('Group CRUD', () => {
    test('should create a new group', async ({ page }, testInfo: TestInfo) => {
      let userEmail: string | null = null;
      let groupName: string | null = null;
      let orgId: string | null = null;

      try {
        // Create authenticated user with org
        userEmail = generateTestEmail(testInfo);
        const userWithOrg = await createUserWithOrg({
          email: userEmail,
          password: 'TestPassword123!',
          fullName: 'Group Test User',
        });

        // Inject session into page
        await injectSessionIntoPage(page, userWithOrg.session);
        orgId = userWithOrg.orgId;

        // Generate group name using testInfo
        groupName = generateTestGroupName(testInfo, 'Engineering');

        // Navigate to admin
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');

        // Action
        await createGroup(page, groupName, 'Team for engineers');

        // Verification (UI Check) - ensuring the list updates
        // Using getByRole to find the row or item in the list
        await expect(page.getByRole('cell', { name: groupName })).toBeVisible();
      } finally {
        // Always cleanup, regardless of test result
        if (orgId && groupName) {
          try {
            await deleteGroupFromDatabase(orgId, groupName);
          } catch (error) {
            console.error('Failed to delete group:', error);
          }
        }

        if (userEmail) {
          try {
            await cleanupTestUserByEmail(userEmail);
          } catch (error) {
            console.error('Failed to cleanup user:', error);
          }
        }
      }
    });

    test('should delete a group', async ({ page }, testInfo: TestInfo) => {
      let userEmail: string | null = null;
      let groupName: string | null = null;
      let orgId: string | null = null;

      try {
        // Create authenticated user with org
        userEmail = generateTestEmail(testInfo);
        const userWithOrg = await createUserWithOrg({
          email: userEmail,
          password: 'TestPassword123!',
          fullName: 'Group Test User',
        });

        // Inject session into page
        await injectSessionIntoPage(page, userWithOrg.session);
        orgId = userWithOrg.orgId;

        // Generate group name using testInfo
        groupName = generateTestGroupName(testInfo, 'Temporary');
        await getOrCreateGroupId(orgId, groupName);

        // Navigate to admin to ensure the new DB entry is visible in UI before we try to delete it
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');

        await deleteGroup(page, groupName);
      } finally {
        // Always cleanup, regardless of test result
        if (orgId && groupName) {
          try {
            await deleteGroupFromDatabase(orgId, groupName);
          } catch (error) {
            console.error('Failed to delete group:', error);
          }
        }

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

  test.describe('User Management in Groups', () => {
    test('should add a user to a group', async ({ page }, testInfo: TestInfo) => {
      let userEmail: string | null = null;
      let testUserEmail: string | null = null;
      let testUserId: string | null = null;
      let groupName: string | null = null;
      let orgId: string | null = null;

      try {
        console.log('\n🧪 TEST: Add User to Group');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Step 1: Setup - Create authenticated user with org
        console.log('\n📋 Step 1: Setting up test data...');
        userEmail = generateTestEmail(testInfo);
        const userWithOrg = await createUserWithOrg({
          email: userEmail,
          password: 'TestPassword123!',
          fullName: 'Group Test User',
        });

        // Inject session into page
        await injectSessionIntoPage(page, userWithOrg.session);
        orgId = userWithOrg.orgId;

        // Create test user to add to group
        testUserEmail = generateTestEmail(testInfo);
        testUserId = await createTestUserInOrg(orgId, testUserEmail, 'Test User');
        groupName = generateTestGroupName(testInfo, 'Test');
        const groupId = await getOrCreateGroupId(orgId, groupName);

        console.log(`   ✅ Org ID: ${orgId}`);
        console.log(`   ✅ Test user: ${testUserEmail} (${testUserId})`);
        console.log(`   ✅ Test group: ${groupName} (${groupId})`);

        // Step 2: ACTION - Add user to group via database
        console.log('\n🎯 Step 2: Adding user to group (via database)...');
        await addUserToGroupInDatabase(orgId, testUserEmail, groupName);
        console.log('   ✅ User added to group in database');

        // Step 3: VERIFY - Check UI shows the user in the group
        console.log('\n🔍 Step 3: Verifying user appears in UI...');

        // Navigate to admin page and navigate to groups
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');
        console.log('   ✅ Navigated to admin page');

        const groupsTab = page.getByRole('tab', { name: /groups/i });
        if (await groupsTab.isVisible().catch(() => false)) {
          await groupsTab.click();
          await page.waitForTimeout(1000);
          console.log('   ✅ Navigated to Groups tab');
        }

        // Click refresh to fetch latest data (now that we fixed the AdminDataContext bug)
        const refreshButton = page.getByTestId('refresh-data-button');
        if (await refreshButton.isVisible().catch(() => false)) {
          await refreshButton.click();
          console.log('   🔄 Clicked refresh button');
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000); // Wait for React state to update
          console.log('   ✅ Data refreshed');
        }

        // Find the group row
        console.log(`   🔍 Looking for group row: "${groupName}"`);
        const groupRow = page
          .getByRole('row', {
            name: new RegExp(`^${groupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
          })
          .first();

        await expect(groupRow).toBeVisible({ timeout: 10000 });
        console.log('   ✅ Group row found');

        // Verify user chip/badge appears in the row
        console.log(`   🔍 Looking for user in group row: "${testUserEmail}"`);

        // Get all table cells in the row
        const cells = groupRow.locator('td');
        const cellCount = await cells.count();
        console.log(`   📊 Table cells in row: ${cellCount}`);

        // Log content of each cell
        for (let i = 0; i < cellCount; i++) {
          const cellContent = await cells.nth(i).textContent();
          console.log(`   Cell ${i}: "${cellContent}"`);
        }

        // The users should be in the second cell (index 1)
        const usersCell = cells.nth(1);
        const usersCellHTML = await usersCell.innerHTML();
        console.log(`   🔍 Users cell HTML (first 500 chars): ${usersCellHTML.substring(0, 500)}`);

        // Check for the specific user chip with the user ID
        console.log(`   🔍 Looking for chip with data-testid="selected-user-${testUserId}"`);
        const userChipByTestId = groupRow.locator(`[data-testid="selected-user-${testUserId}"]`);

        // First check if it exists
        const chipExists = (await userChipByTestId.count()) > 0;
        console.log(`   🔍 Chip exists: ${chipExists}`);

        if (!chipExists) {
          console.error('   ❌ User chip not found in row');
          console.error(`   Expected testid: selected-user-${testUserId}`);

          // Take screenshot for debugging
          await page.screenshot({
            path: `test-results/user-not-in-group-${Date.now()}.png`,
            fullPage: true,
          });

          throw new Error(
            `User chip with testid "selected-user-${testUserId}" not found in group row`
          );
        }

        // Check if it's visible
        const isVisible = await userChipByTestId.isVisible();
        console.log(`   🔍 Chip visible: ${isVisible}`);

        if (!isVisible) {
          console.error('   ❌ User chip exists but is not visible');
          await page.screenshot({
            path: `test-results/user-chip-hidden-${Date.now()}.png`,
            fullPage: true,
          });
          throw new Error(`User chip exists but is not visible`);
        }

        // Check if it contains the email text (may be truncated)
        const chipText = await userChipByTestId.textContent();
        console.log(`   🔍 Chip text: "${chipText}"`);
        console.log(`   ✅ User chip visible and rendered in group row`);

        console.log('\n✅ TEST PASSED: Add User to Group');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      } finally {
        // Always cleanup test data, regardless of test result
        if (orgId && testUserEmail && groupName) {
          try {
            await removeUserFromGroupInDatabase(orgId, testUserEmail, groupName);
            console.log('   ✅ User removed from group');
          } catch (error) {
            console.error('   ⚠️ Failed to remove user from group:', error);
          }
        }

        if (testUserId) {
          try {
            await deleteTestUserProfile(testUserId);
            console.log('   ✅ Test user deleted');
          } catch (error) {
            console.error('   ⚠️ Failed to delete test user:', error);
          }
        }

        if (orgId && groupName) {
          try {
            await deleteGroupFromDatabase(orgId, groupName);
            console.log('   ✅ Test group deleted');
          } catch (error) {
            console.error('   ⚠️ Failed to delete test group:', error);
          }
        }

        if (userEmail) {
          try {
            await cleanupTestUserByEmail(userEmail);
          } catch (error) {
            console.error('   ⚠️ Failed to cleanup authenticated user:', error);
          }
        }
      }
    });

    test('should remove a user from a group', async ({ page }, testInfo: TestInfo) => {
      let userEmail: string | null = null;
      let testUserEmail: string | null = null;
      let testUserId: string | null = null;
      let groupName: string | null = null;
      let orgId: string | null = null;

      try {
        console.log('\n🧪 TEST: Remove User from Group');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Step 1: Setup - Create authenticated user with org
        console.log('\n📋 Step 1: Setting up test data...');
        userEmail = generateTestEmail(testInfo);
        const userWithOrg = await createUserWithOrg({
          email: userEmail,
          password: 'TestPassword123!',
          fullName: 'Group Test User',
        });

        // Inject session into page
        await injectSessionIntoPage(page, userWithOrg.session);
        orgId = userWithOrg.orgId;

        // Create test user to add to group
        testUserEmail = generateTestEmail(testInfo);
        testUserId = await createTestUserInOrg(orgId, testUserEmail, 'Test User');
        groupName = generateTestGroupName(testInfo, 'Test');
        const groupId = await getOrCreateGroupId(orgId, groupName);
        await addUserToGroupInDatabase(orgId, testUserEmail, groupName);

        console.log(`   ✅ Org ID: ${orgId}`);
        console.log(`   ✅ Test user: ${testUserEmail} (${testUserId})`);
        console.log(`   ✅ Test group: ${groupName} (${groupId})`);
        console.log(`   ✅ User added to group in database`);

        // Step 2: Navigate to admin and verify user is in group
        console.log('\n🔍 Step 2: Verifying user appears in UI before removal...');
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');

        const groupsTab = page.getByRole('tab', { name: /groups/i });
        if (await groupsTab.isVisible().catch(() => false)) {
          await groupsTab.click();
          await page.waitForTimeout(1000);
          console.log('   ✅ Navigated to Groups tab');
        }

        // Click refresh button
        const refreshButton = page.getByTestId('refresh-data-button');
        if (await refreshButton.isVisible().catch(() => false)) {
          await refreshButton.click();
          console.log('   🔄 Clicked refresh button');
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
          console.log('   ✅ Data refreshed');
        }

        // Find the group row
        console.log(`   🔍 Looking for group row: "${groupName}"`);
        const groupRow = page
          .getByRole('row', {
            name: new RegExp(`^${groupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
          })
          .first();

        await expect(groupRow).toBeVisible({ timeout: 10000 });
        console.log('   ✅ Group row found');

        // Verify user chip exists before removal
        const userChipBefore = groupRow.locator(`[data-testid="selected-user-${testUserId}"]`);
        const chipExistsBefore = (await userChipBefore.count()) > 0;
        console.log(`   🔍 User chip exists before removal: ${chipExistsBefore}`);

        if (!chipExistsBefore) {
          console.error('   ❌ User chip not found before removal - test setup failed');
          throw new Error('User chip not found in group before attempting removal');
        }

        // Step 3: ACTION - Remove user from group
        console.log('\n🎯 Step 3: Removing user from group via UI...');
        await removeUserFromGroup(page, testUserEmail, groupName);
        console.log('   ✅ Remove action completed');

        // Step 4: VERIFY - Check user chip is gone
        console.log('\n🔍 Step 4: Verifying user is removed from UI...');
        await page.waitForTimeout(1000); // Wait for UI update

        const userChipAfter = groupRow.locator(`[data-testid="selected-user-${testUserId}"]`);
        const chipExistsAfter = (await userChipAfter.count()) > 0;
        console.log(`   🔍 User chip exists after removal: ${chipExistsAfter}`);

        if (chipExistsAfter) {
          console.error('   ❌ User chip still exists after removal');
          await page.screenshot({
            path: `test-results/user-still-in-group-${Date.now()}.png`,
            fullPage: true,
          });
          throw new Error('User chip still visible after removal');
        }

        console.log('   ✅ User chip successfully removed from group row');

        console.log('\n✅ TEST PASSED: Remove User from Group');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      } finally {
        // Always cleanup test data, regardless of test result
        if (testUserId) {
          try {
            await deleteTestUserProfile(testUserId);
            console.log('   ✅ Test user deleted');
          } catch (error) {
            console.error('   ⚠️ Failed to delete test user:', error);
          }
        }

        if (orgId && groupName) {
          try {
            await deleteGroupFromDatabase(orgId, groupName);
            console.log('   ✅ Test group deleted');
          } catch (error) {
            console.error('   ⚠️ Failed to delete test group:', error);
          }
        }

        if (userEmail) {
          try {
            await cleanupTestUserByEmail(userEmail);
          } catch (error) {
            console.error('   ⚠️ Failed to cleanup authenticated user:', error);
          }
        }
      }
    });
  });

  test.describe('Model Management in Groups', () => {
    test('should add a model to a group', async ({ page }, testInfo: TestInfo) => {
      let userEmail: string | null = null;
      let modelNiceName: string | null = null;
      let groupName: string | null = null;
      let orgId: string | null = null;
      let testModelId: string | null = null;

      try {
        // Create authenticated user with org
        userEmail = generateTestEmail(testInfo);
        const userWithOrg = await createUserWithOrg({
          email: userEmail,
          password: 'TestPassword123!',
          fullName: 'Model Test User',
        });

        // Inject session into page
        await injectSessionIntoPage(page, userWithOrg.session);
        orgId = userWithOrg.orgId;

        // Generate model and group names using testInfo
        const modelId = `test-model-${Date.now()}`;
        modelNiceName = generateTestModelName(testInfo, 'Test');
        testModelId = await createTestModel(orgId, modelId, modelNiceName, 'Test model');
        groupName = generateTestGroupName(testInfo, 'Model');
        await getOrCreateGroupId(orgId, groupName);

        // Navigate to admin to ensure the new DB entry is visible in UI
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');

        await addModelToGroup(page, modelNiceName, groupName);
      } finally {
        // Always cleanup, regardless of test result
        if (orgId && modelNiceName && groupName) {
          try {
            await removeModelFromGroupInDatabase(orgId, modelNiceName, groupName);
          } catch (error) {
            console.error('Failed to remove model from group:', error);
          }
        }

        if (testModelId && orgId) {
          try {
            await deleteTestModel(testModelId, orgId);
          } catch (error) {
            console.error('Failed to delete test model:', error);
          }
        }

        if (orgId && groupName) {
          try {
            await deleteGroupFromDatabase(orgId, groupName);
          } catch (error) {
            console.error('Failed to delete test group:', error);
          }
        }

        if (userEmail) {
          try {
            await cleanupTestUserByEmail(userEmail);
          } catch (error) {
            console.error('Failed to cleanup authenticated user:', error);
          }
        }
      }
    });

    test('should remove a model from a group', async ({ page }, testInfo: TestInfo) => {
      let userEmail: string | null = null;
      let modelNiceName: string | null = null;
      let groupName: string | null = null;
      let orgId: string | null = null;
      let testModelId: string | null = null;

      try {
        // Create authenticated user with org
        userEmail = generateTestEmail(testInfo);
        const userWithOrg = await createUserWithOrg({
          email: userEmail,
          password: 'TestPassword123!',
          fullName: 'Model Test User',
        });

        // Inject session into page
        await injectSessionIntoPage(page, userWithOrg.session);
        orgId = userWithOrg.orgId;

        // Generate model and group names using testInfo
        const modelId = `test-model-${Date.now()}`;
        modelNiceName = generateTestModelName(testInfo, 'Test');
        testModelId = await createTestModel(orgId, modelId, modelNiceName, 'Test model');
        groupName = generateTestGroupName(testInfo, 'Model');
        await getOrCreateGroupId(orgId, groupName);
        await addModelToGroupInDatabase(orgId, modelNiceName, groupName);

        // Navigate to admin to ensure the new DB entry is visible in UI
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');

        await removeModelFromGroup(page, modelNiceName, groupName);
      } finally {
        // Always cleanup, regardless of test result
        if (testModelId && orgId) {
          try {
            await deleteTestModel(testModelId, orgId);
          } catch (error) {
            console.error('Failed to delete test model:', error);
          }
        }

        if (orgId && groupName) {
          try {
            await deleteGroupFromDatabase(orgId, groupName);
          } catch (error) {
            console.error('Failed to delete test group:', error);
          }
        }

        if (userEmail) {
          try {
            await cleanupTestUserByEmail(userEmail);
          } catch (error) {
            console.error('Failed to cleanup authenticated user:', error);
          }
        }
      }
    });
  });
});

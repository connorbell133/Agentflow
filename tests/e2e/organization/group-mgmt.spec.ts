import { test } from '../fixtures/test-fixtures';
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

// Helper function to generate unique group names
const generateUniqueGroupName = (baseName: string): string => {
    return `${baseName}-${Date.now()}`;
};

// Helper function to generate unique model names
const generateUniqueModelName = (baseName: string): string => {
    return `${baseName}-${Date.now()}`;
};

/**
 * Group Management Tests
 * NOTE: These tests run SEQUENTIALLY using test.describe.serial()
 * They all share the same authenticated admin user session (via storage state)
 * Each test navigates to /admin at the start
 */
test.describe.serial('Group Management', () => {


    test.describe.serial('Group CRUD', () => {
        test('should create a new group', async ({ page, authenticatedUserWithOrg }) => {
            await page.goto('/admin');
            const groupName = generateUniqueGroupName('Engineering Team');

            // Test: Create a group via UI
            await createGroup(page, groupName, 'Team for engineers');

            // Cleanup: Remove the group programmatically
            const orgId = await getOrgIdByEmail(authenticatedUserWithOrg.email);
            await deleteGroupFromDatabase(orgId, groupName);
        });

        test('should delete a group', async ({ page, authenticatedUserWithOrg }) => {
            // Setup: Create a group programmatically in the database
            const groupName = generateUniqueGroupName('Temporary Group');
            const orgId = await getOrgIdByEmail(authenticatedUserWithOrg.email);
            await getOrCreateGroupId(orgId, groupName);

            // Test: Delete the group via UI
            await page.goto('/admin');
            await deleteGroup(page, groupName);
        });
    });

    test.describe.serial('User Management in Groups', () => {
        test('should add a user to a group', async ({ page, authenticatedUserWithOrg }) => {
            // Setup: Create a test user in the org and a group programmatically
            const orgId = await getOrgIdByEmail(authenticatedUserWithOrg.email);
            const testUserEmail = `test-user-${Date.now()}@example.com`;
            const testUserId = await createTestUserInOrg(orgId, testUserEmail, 'Test User');

            const groupName = generateUniqueGroupName('Test Group');
            await getOrCreateGroupId(orgId, groupName);

            // Test: Add the test user to the group via UI
            await page.goto('/admin');
            await addUserToGroup(page, testUserEmail, groupName);

            // Cleanup: Remove user from group, delete user, and delete group programmatically
            await removeUserFromGroupInDatabase(orgId, testUserEmail, groupName);
            await deleteTestUserProfile(testUserId);
            await deleteGroupFromDatabase(orgId, groupName);
        });

        test('should remove a user from a group', async ({ page, authenticatedUserWithOrg }) => {
            // Setup: Create a test user in the org, create a group, and add user to group programmatically
            const orgId = await getOrgIdByEmail(authenticatedUserWithOrg.email);
            const testUserEmail = `test-user-${Date.now()}@example.com`;
            const testUserId = await createTestUserInOrg(orgId, testUserEmail, 'Test User');

            const groupName = generateUniqueGroupName('Test Group');
            await getOrCreateGroupId(orgId, groupName);
            await addUserToGroupInDatabase(orgId, testUserEmail, groupName);

            // Test: Remove the user from the group via UI
            await page.goto('/admin');
            await removeUserFromGroup(page, testUserEmail, groupName);

            // Cleanup: Delete user and group programmatically
            await deleteTestUserProfile(testUserId);
            await deleteGroupFromDatabase(orgId, groupName);
        });
    });

    test.describe.serial('Model Management in Groups', () => {
        test('should add a model to a group', async ({ page, authenticatedUserWithOrg }) => {
            // Setup: Create a test model and a group programmatically
            const orgId = await getOrgIdByEmail(authenticatedUserWithOrg.email);
            const modelId = `test-model-${Date.now()}`;
            const modelNiceName = generateUniqueModelName('Test Model');
            const testModelId = await createTestModel(orgId, modelId, modelNiceName, 'Test model for group management');

            const groupName = generateUniqueGroupName('Model Test Group');
            await getOrCreateGroupId(orgId, groupName);

            // Test: Add the model to the group via UI
            await page.goto('/admin');
            await addModelToGroup(page, modelNiceName, groupName);

            // Cleanup: Remove model from group, delete model, and delete group programmatically
            await removeModelFromGroupInDatabase(orgId, modelNiceName, groupName);
            await deleteTestModel(testModelId, orgId);
            await deleteGroupFromDatabase(orgId, groupName);
        });

        test('should remove a model from a group', async ({ page, authenticatedUserWithOrg }) => {
            // Setup: Create a test model, create a group, and add model to group programmatically
            const orgId = await getOrgIdByEmail(authenticatedUserWithOrg.email);
            const modelId = `test-model-${Date.now()}`;
            const modelNiceName = generateUniqueModelName('Test Model');
            const testModelId = await createTestModel(orgId, modelId, modelNiceName, 'Test model for group removal');

            const groupName = generateUniqueGroupName('Model Removal Group');
            await getOrCreateGroupId(orgId, groupName);
            await addModelToGroupInDatabase(orgId, modelNiceName, groupName);

            // Test: Remove the model from the group via UI
            await page.goto('/admin');
            await removeModelFromGroup(page, modelNiceName, groupName);

            // Cleanup: Delete model and group programmatically
            await deleteTestModel(testModelId, orgId);
            await deleteGroupFromDatabase(orgId, groupName);
        });
    });
});

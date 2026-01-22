import { test, expect } from '../fixtures/test-fixtures';
import { inviteUserToOrg, revokeInvite, acceptInviteInOnboarding, acceptInviteFromBadge, createInviteInDatabase } from '../utils/org-utils';
import { setupAndSignUpUser, setupAndSignUpUserToOrganizationSetup, setupAndSignInUser, signOutUser } from '../utils/auth-utils';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Shared test user credentials
const invitedUserEmail = process.env.TEST_INVITED_USER_EMAIL || 'test.user2@example.com';
const invitedUserPassword = process.env.TEST_INVITED_USER_PASSWORD || 'Password123';
const invitedUserFullName = process.env.TEST_INVITED_USER_FULL_NAME || 'Test User';

/**
 * Helper function to clean up the invited user
 */
function cleanupInvitedUser() {
    console.log('🧹 Running cleanup for invited user...');
    const cleanupScript = path.resolve(__dirname, '../../cleanup-invited-user.ts');
    try {
        execSync(`npx tsx ${cleanupScript} "${invitedUserEmail}"`, {
            stdio: 'inherit',
            cwd: path.resolve(__dirname, '../../..'),
        });
    } catch (error) {
        console.warn('Cleanup script had issues, but continuing with tests:', error);
    }
}

/**
 * Organization Invite Tests - Basic Operations
 * Tests for inviting and revoking invites (no user signup needed)
 */
test.describe.serial('Organization Invites - Basic Operations', () => {
    test('should invite a user to the organization', async ({ page, authenticatedUserWithOrg }) => {
        // Admin user is already signed in via storage state
        await page.goto('/admin');

        // Invite a new user using credentials from environment variables
        await inviteUserToOrg(page, invitedUserEmail, process.env.TEST_GROUP_NAME);
    });

    test('should revoke a pending invite', async ({ page, authenticatedUserWithOrg }) => {
        // Admin user is already signed in via storage state
        await page.goto('/admin');

        // First invite a user
        await inviteUserToOrg(page, invitedUserEmail, process.env.TEST_GROUP_NAME);

        // Then revoke the invite
        await revokeInvite(page, invitedUserEmail);
    });
});

/**
 * Organization Invites - Accept During Onboarding
 * Requires fresh user signup, so cleanup runs before this test
 * 
 * NOTE: These tests focus on invite acceptance flows, not invite creation.
 * The invite is created directly in the database via beforeEach to keep tests focused.
 */
test.describe.serial('Organization Invites - Accept During Onboarding', () => {
    test.beforeAll(async () => {
        cleanupInvitedUser();
    });

    test.beforeEach(async () => {
        // Create invite directly in database (bypassing UI)
        // This keeps the test focused on acceptance flow, not creation
        // Uses admin email from env to get user ID, org ID, and group dynamically
        const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin.test@example.com';
        const groupName = process.env.TEST_GROUP_NAME || 'member';
        await createInviteInDatabase(
            adminEmail,
            invitedUserEmail,
            groupName
        );
    });

    test('should accept an invite during onboarding after signup', async ({ page, browser, authenticatedUserWithOrg }) => {
        // Invite is already created in beforeEach, so we can skip invite creation
        // Create a fresh browser context for the invited user (no storage state)
        const invitedUserContext = await browser.newContext({ storageState: undefined });
        const invitedUserPage = await invitedUserContext.newPage();

        try {
            // Sign up the invited user (cleanup ran in beforeAll so user doesn't exist)
            // setupAndSignUpUserToOrganizationSetup handles sign-up and completes profile step,
            // stopping at organization setup (doesn't skip like setupAndSignUpUser)
            await setupAndSignUpUserToOrganizationSetup(invitedUserPage, invitedUserEmail, invitedUserPassword, invitedUserFullName);

            // Now we're on the organization setup page - accept the invite
            await acceptInviteInOnboarding(invitedUserPage, invitedUserEmail);

            // Verify we're redirected to main page or see success
            await invitedUserPage.waitForTimeout(2000);
            // The onboarding should complete after accepting invite
        } finally {
            // Clean up the new context
            await invitedUserContext.close();
        }
    });
});

/**
 * Organization Invites - Accept From Badge
 * Requires fresh user signup, so cleanup runs before this test
 * 
 * NOTE: These tests focus on invite acceptance flows, not invite creation.
 * The invite is created directly in the database via beforeEach to keep tests focused.
 */
test.describe.serial('Organization Invites - Accept From Badge', () => {
    test.beforeAll(async () => {
        cleanupInvitedUser();
    });

    test.beforeEach(async () => {
        // Create invite directly in database (bypassing UI)
        // This keeps the test focused on acceptance flow, not creation
        // Uses admin email from env to get user ID, org ID, and group dynamically
        const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin.test@example.com';
        const groupName = process.env.TEST_GROUP_NAME || 'member';
        await createInviteInDatabase(
            adminEmail,
            invitedUserEmail,
            groupName
        );
    });

    test('should accept an invite from notification badge after sign up', async ({ page, browser, authenticatedUserWithOrg }) => {
        // Invite is already created in beforeEach, so we can skip invite creation
        // Create a fresh browser context for the invited user (no storage state)
        const invitedUserContext = await browser.newContext({ storageState: undefined });
        const invitedUserPage = await invitedUserContext.newPage();

        try {
            // Sign up the invited user (cleanup ran in beforeAll so user doesn't exist)
            await setupAndSignUpUser(invitedUserPage, invitedUserEmail, invitedUserPassword, invitedUserFullName);

            // Accept the invite from the badge
            await acceptInviteFromBadge(invitedUserPage, invitedUserEmail);
        } finally {
            // Clean up the new context
            await invitedUserContext.close();
        }
    });
});

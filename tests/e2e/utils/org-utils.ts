import { Page, expect } from '@playwright/test';
import { createSupabaseServerClient } from './supabase-test-client';

/**
 * Creates an organization for a logged-in user who hasn't created one yet.
 * This includes submitting the request, manually approving it in the DB,
 * and completing the creation flow in the UI.
 *
 * @param page The Playwright page object.
 * @param user_email The email of the currently logged-in user.
 * @param orgName The name of the organization to create.
 * @param requestDesc Description for "Why do you need this".
 * @param additionalInfo content for "Additional Information".
 * @returns The user profile object from the database.
 */
export async function createOrganizationForUser(
    page: Page,
    user_email: string,
    orgName: string = 'My Organization',
    requestDesc: string = 'This is a Test',
    additionalInfo: string = 'New Test'
) {
    // 1. Navigate to Admin creation page
    await page.goto('http://localhost:3000/admin');

    // Check if we are already on the dashboard (Org exists)
    // The dashboard heading might be "organization Dashboard" or similar variations
    try {
        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Check for any dashboard heading indicating org already exists
        const dashboardHeading = page.getByTestId('admin-dashboard-heading');
        if (await dashboardHeading.isVisible({ timeout: 3000 })) {
            // Also verify we have admin tabs visible (indicates we're on the org dashboard)
            const modelsTab = page.getByRole('tab', { name: 'Models' });
            if (await modelsTab.isVisible({ timeout: 1000 })) {
                const supabase = await createSupabaseServerClient();
                const { data, error } = await supabase.from('profiles').select('*').eq('email', user_email).single();
                if (error) {
                    throw new Error(`Error fetching profile: ${error.message}`);
                }
                expect(data).toBeDefined();
                expect(data?.email).toBe(user_email);
                expect(data?.signup_complete).toBe(true);
                return data;
            }
        }
    } catch (e) {
        // Continue to creation if dashboard is not visible
    }

    // Check if the user is already part of an organization (even if not owner, they might land on dashboard)
    // Or if they have a pending request that needs to be approved.
    const supabase = await createSupabaseServerClient();

    // Retry logic to wait for profile to be created (in case webhook is slow)
    let profile = null;
    let profileRetries = 5;

    while (profileRetries > 0 && !profile) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', user_email)
            .maybeSingle();

        if (data) {
            profile = data;
            break;
        }

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            throw new Error(`Error fetching profile: ${error.message}`);
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        profileRetries--;
    }

    if (!profile) {
        throw new Error(
            `Profile not found for user ${user_email}. ` +
            `The Clerk webhook may not have created the profile yet.`
        );
    }

    expect(profile).toBeDefined();
    expect(profile?.email).toBe(user_email);
    expect(profile?.signup_complete).toBe(true);

    // 2. Fill Organization Request Form
    // Ensure we're on the admin page and wait for it to load
    await page.waitForLoadState('networkidle');

    // Wait for the form to be visible - it should show "Request Organization Access"
    await expect(page.getByText(/Request Organization Access/i)).toBeVisible({ timeout: 10000 });

    // Wait for the form fields to be visible via test IDs
    const orgNameInput = page.getByTestId('org-request-name-input');
    await expect(orgNameInput).toBeVisible({ timeout: 10000 });

    // Fill organization name using test ID
    await orgNameInput.fill(orgName);

    // Fill request reason - use data-testid for robustness
    const requestReasonInput = page.getByTestId('org-request-reason-input');
    await requestReasonInput.fill(requestDesc);

    // Fill additional info - use data-testid
    const additionalInfoInput = page.getByTestId('org-request-additional-input');
    await additionalInfoInput.fill(additionalInfo);

    // Submit the form
    const submitButton = page.getByTestId('org-request-submit-button');
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // 3. (User already fetched above)

    // 4. Wait for the form submission to complete and UI to update
    // Wait for either success state or error state
    try {
        await expect(
            page.getByTestId('org-request-submitted-message')
        ).toBeVisible({ timeout: 10000 });
    } catch (error) {
        // Check if there's an error message
        const errorMessage = page.locator('.text-destructive, [class*="text-red"], [class*="error"]');
        const errorCount = await errorMessage.count();
        if (errorCount > 0) {
            const errorText = await errorMessage.first().textContent();
            throw new Error(`Form submission failed with error: ${errorText}`);
        }
        // If no error message, the form might still be submitting
        // Wait a bit more and check again
        await new Promise(resolve => setTimeout(resolve, 2000));
        const successMessage = page.getByTestId('org-request-submitted-message');
        const isVisible = await successMessage.isVisible().catch(() => false);
        if (!isVisible) {
            throw new Error('Form submission did not complete - neither success nor error message appeared');
        }
    }

    // Additional wait for database to be updated
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. Validate & Approve Request in DB
    // Retry query a few times in case of timing issues
    let tempOrgRequestData = null;
    let retries = 5;
    while (retries > 0 && !tempOrgRequestData) {
        const {
            data: requestData,
            error: tempOrgRequestError,
        } = await supabase
            .from('temp_org_requests')
            .select('*')
            .eq('requester_id', profile.id)
            .eq('approved', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (tempOrgRequestError) {
            throw new Error(`Error fetching temp org request: ${tempOrgRequestError.message}`);
        }

        if (requestData) {
            tempOrgRequestData = requestData;
            break;
        }

        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries--;
    }

    if (!tempOrgRequestData) {
        // Check if there are any requests at all for this user (for debugging)
        const { data: allRequests } = await supabase
            .from('temp_org_requests')
            .select('*')
            .eq('requester_id', profile.id);

        throw new Error(
            `No pending temp org request found for user ${user_email} (profile ID: ${profile.id}). ` +
            `The request may not have been created yet. ` +
            `Total requests for user: ${allRequests?.length || 0}`
        );
    }
    expect(tempOrgRequestData).toBeDefined();
    expect(tempOrgRequestData?.requester_id).toBe(profile.id);
    expect(tempOrgRequestData?.approved).toBe(false);
    expect(tempOrgRequestData?.org_name).toBe(orgName);

    // UI Validation: Verify submitted state
    // The form shows "Request Submitted" or "Organization Request Sent!" after submission
    await expect(
        page.getByTestId('org-request-submitted-message')
    ).toBeVisible({ timeout: 10000 });

    // The "Check Status" button is an icon button with aria-label
    // It might not be immediately visible, so we'll check for it but not fail if it's not found
    const checkStatusButton = page.getByTestId('org-request-check-status').first();
    try {
        await expect(checkStatusButton).toBeVisible({ timeout: 3000 });
    } catch {
        // Button might not be visible yet, that's okay - we'll proceed
    }

    // Approve in DB
    const { data: approvedOrgRequest, error: approveOrgRequestError } = await supabase
        .from('temp_org_requests')
        .update({ approved: true })
        .eq('id', tempOrgRequestData.id)
        .select('*')
        .single();
    if (approveOrgRequestError) {
        throw new Error(`Error approving temp org request: ${approveOrgRequestError.message}`);
    }
    expect(approvedOrgRequest).toBeDefined();
    expect(approvedOrgRequest?.approved).toBe(true);

    // 6. Complete Creation Flow
    // Wait for DB update to propagate/be ready for check
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Click Check Status - the button has aria-label="Check Status"
    // It's an icon button in the top right of the card
    const checkStatusBtn = page.getByTestId('org-request-check-status').first();
    await expect(checkStatusBtn).toBeVisible({ timeout: 5000 });
    await checkStatusBtn.click();

    // Verify Approved State
    await expect(page.getByText('Request Approved')).toBeVisible();

    // Create Organization
    await page.getByRole('button', { name: 'Create My Organization' }).click();

    // Verify Creating/Success States
    await expect(page.getByText('Creating Your Organization')).toBeVisible();
    await expect(page.getByText('Organization Created!')).toBeVisible({ timeout: 10000 });

    // 7. Go to Dashboard
    await page.getByRole('button', { name: 'Go to Admin Dashboard' }).click();

    // 8. Verify Dashboard Access
    await expect(page).toHaveURL(/.*\/admin.*/, { timeout: 10000 });
    await expect(page.getByTestId('admin-dashboard-heading')).toBeVisible({ timeout: 10000 });

    return profile;
}

// ============================================================================
// INVITE UTILITIES
// ============================================================================

// Re-export db-utils functions for convenience
export {
    createInviteInDatabase,
    getUserIdByEmail,
    getOrgIdByUserId,
    getOrCreateGroupId,
    getOrgIdByEmail,
    deleteInviteFromDatabase,
    deleteInvitesByEmail,
} from './db-utils';

/**
 * Invites a user to the current organization.
 * If the specified group doesn't exist, it will be created first.
 *
 * @param page The Playwright page object.
 * @param email The email address to invite.
 * @param groupName The group name/role to assign (e.g., 'AI Engineer Group', 'member', 'admin').
 * @param createGroupIfMissing If true, creates the group if it doesn't exist (default: true).
 */
export async function inviteUserToOrg(
    page: Page,
    email: string,
    groupName: string = 'member',
    createGroupIfMissing: boolean = true
) {
    // Ensure the group exists before inviting
    if (createGroupIfMissing) {
        await ensureGroupExists(page, groupName);
    }

    // Navigate to admin dashboard
    await page.goto('http://localhost:3000/admin');

    // Navigate to Users tab
    const usersTab = page.getByRole('tab', { name: 'Users' });
    await expect(usersTab).toBeVisible({ timeout: 10000 });
    await usersTab.click();

    // Wait for the invite form to be visible
    await expect(page.getByTestId('invite-user-email-input')).toBeVisible({ timeout: 5000 });

    // Fill email input using test ID
    await page.getByTestId('invite-user-email-input').fill(email);

    // Select role/group using Radix UI Select component
    const selectTrigger = page.getByTestId('invite-user-group-select');

    // Wait for select trigger to be ready
    await expect(selectTrigger).toBeVisible({ timeout: 5000 });

    // Click the trigger to open the dropdown
    await expect(selectTrigger).toBeEnabled({ timeout: 10000 });
    await selectTrigger.click();

    // Wait for the select content to appear
    const selectContent = page.getByTestId('invite-user-group-select-content');
    await expect(selectContent).toBeVisible({ timeout: 5000 });

    // Find the option by its text content (group.role)
    // Radix Select items are rendered as SelectItem components
    const allOptions = await selectContent.locator('[data-testid^="invite-user-group-option-"]').all();
    let foundOption = null;
    const availableGroups: string[] = [];

    for (const option of allOptions) {
        const optionText = await option.textContent();
        const testId = await option.getAttribute('data-testid');
        const optionId = testId?.replace('invite-user-group-option-', '') || '';

        if (optionId) {
            availableGroups.push(optionText?.trim() || '');

            // Match by exact text or case-insensitive
            if (optionText?.trim() === groupName.trim() ||
                optionText?.toLowerCase().trim() === groupName.toLowerCase().trim()) {
                foundOption = option;
                break;
            }
        }
    }

    if (!foundOption) {
        throw new Error(`Group "${groupName}" not found. Available groups: ${availableGroups.filter(Boolean).join(', ')}`);
    }

    // Click the option
    await expect(foundOption).toBeVisible({ timeout: 10000 });
    await foundOption.click();

    // Wait for the dropdown to close
    await expect(selectContent).not.toBeVisible({ timeout: 3000 });

    // Click submit button using test ID
    const submitButton = page.getByTestId('invite-user-submit-button');
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    await expect(submitButton).toBeEnabled({ timeout: 10000 });
    await submitButton.click();

    // Wait for invite to be processed (check for error or success)
    // If there's an error, it will be visible in the error div
    const errorDiv = page.getByTestId('invite-user-error');
    if (await errorDiv.isVisible({ timeout: 2000 }).catch(() => false)) {
        const errorText = await errorDiv.textContent();
        throw new Error(`Failed to invite user: ${errorText}`);
    }

    // Wait a bit for the invite to be processed and form to reset
    await page.waitForTimeout(1000);

    // Verify the email input is cleared (indicates successful submission)
    await expect(page.getByTestId('invite-user-email-input')).toHaveValue('');
}

/**
 * Checks if a pending invite exists for the given email.
 *
 * @param page The Playwright page object.
 * @param email The email to check for.
 * @returns The invite ID if found, null otherwise.
 */
async function findInviteByEmail(page: Page, email: string): Promise<string | null> {
    // Navigate to Users tab in admin dashboard
    await page.goto('http://localhost:3000/admin');
    const usersTab = page.getByRole('tab', { name: 'Users' });
    await expect(usersTab).toBeVisible({ timeout: 10000 });
    await usersTab.click();

    // Wait for pending invites section to be visible
    await expect(page.getByText('Pending Invites')).toBeVisible({ timeout: 5000 });

    // Find the invite row by email using test ID
    const inviteRows = page.locator('[data-testid^="invite-row-"]');
    const rowCount = await inviteRows.count();

    for (let i = 0; i < rowCount; i++) {
        const row = inviteRows.nth(i);
        const emailCell = row.locator('[data-testid^="invite-email-"]');
        const emailText = await emailCell.textContent();
        if (emailText?.trim() === email.trim()) {
            // Extract invite ID from the test ID
            const testId = await emailCell.getAttribute('data-testid');
            return testId?.replace('invite-email-', '') || null;
        }
    }

    return null;
}

/**
 * Revokes/cancels a pending invite.
 * If the invite doesn't exist, it will be created first.
 *
 * @param page The Playwright page object.
 * @param email The email of the invite to revoke.
 * @param groupName Optional group name to use if invite needs to be created (default: 'member').
 * @param createInviteIfMissing If true, creates the invite if it doesn't exist (default: true).
 */
export async function revokeInvite(
    page: Page,
    email: string,
    groupName: string = 'member',
    createInviteIfMissing: boolean = true
) {
    // Check if invite exists
    let inviteId = await findInviteByEmail(page, email);

    // If invite doesn't exist and createInviteIfMissing is true, create it first
    if (!inviteId && createInviteIfMissing) {
        await inviteUserToOrg(page, email, groupName);
        // Wait a bit for the invite to be processed
        await page.waitForTimeout(1000);
        // Check again for the invite
        inviteId = await findInviteByEmail(page, email);
    }

    if (!inviteId) {
        throw new Error(`Invite for email "${email}" not found`);
    }

    // Revoke the invite using the utility function
    await revokeInviteById(page, inviteId);
}

/**
 * Revokes/cancels a pending invite by its ID.
 * This is a utility function that handles the actual revoke operation.
 *
 * @param page The Playwright page object.
 * @param inviteId The ID of the invite to revoke.
 */
async function revokeInviteById(page: Page, inviteId: string): Promise<void> {
    // Navigate to Users tab in admin dashboard (in case we're not already there)
    await page.goto('http://localhost:3000/admin');
    await page.getByRole('tab', { name: 'Users' }).click();

    // Wait for pending invites section to be visible
    await expect(page.getByText('Pending Invites')).toBeVisible({ timeout: 5000 });

    // Click the revoke/delete button using test ID
    const revokeButton = page.getByTestId(`revoke-invite-button-${inviteId}`);
    await expect(revokeButton).toBeVisible({ timeout: 10000 });
    await revokeButton.click();

    // Confirm if there's a confirmation dialog
    const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
    }

    // Verify removal - the row should no longer be visible
    await expect(page.getByTestId(`invite-row-${inviteId}`)).not.toBeVisible({ timeout: 5000 });
}

/**
 * Accepts an invite during the onboarding flow.
 *
 * @param page The Playwright page object.
 * @param inviteeEmail The email of the user being invited (to find the invite).
 */
export async function acceptInviteInOnboarding(page: Page, inviteeEmail: string) {
    // Wait for onboarding page to load
    await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 10000 });

    // Wait for the organization setup to be visible
    await expect(page.getByText('Organization Setup')).toBeVisible({ timeout: 10000 });

    // Click on the "Join Organization" tab if not already selected
    const joinTab = page.getByRole('tab', { name: /Join Organization/i });
    await expect(joinTab).toBeVisible({ timeout: 5000 });

    // Check if tab is already selected, if not click it
    const isSelected = await joinTab.getAttribute('aria-selected');
    if (isSelected !== 'true') {
        await expect(joinTab).toBeEnabled({ timeout: 10000 });
        await joinTab.click();
    }

    // Wait for "Pending Invitations" heading to be visible
    await expect(page.getByRole('heading', { name: 'Pending Invitations' })).toBeVisible({ timeout: 5000 });

    // Find Accept buttons - there should be at least one invite
    const acceptButtons = page.getByRole('button', { name: 'Accept' });
    const buttonCount = await acceptButtons.count();

    if (buttonCount === 0) {
        throw new Error(`No invites found for ${inviteeEmail} in onboarding`);
    }

    // Click the first Accept button
    const firstAcceptButton = acceptButtons.first();
    await expect(firstAcceptButton).toBeVisible({ timeout: 10000 });
    await expect(firstAcceptButton).toBeEnabled({ timeout: 10000 });
    await firstAcceptButton.click();

    // Wait for the success state or redirect
    await page.waitForTimeout(2000);

    // Verify we're either redirected to main page or see success
    const currentUrl = page.url();
    if (currentUrl.includes('/onboarding')) {
        // Check for success message or continue button
        await expect(page.getByText(/success|welcome|continue/i)).toBeVisible({ timeout: 5000 });
    }
}

/**
 * Accepts an invite from the invite badge notification on the main page.
 *
 * @param page The Playwright page object.
 * @param inviteeEmail The email of the user being invited (to find the invite).
 */
export async function acceptInviteFromBadge(page: Page, inviteeEmail: string) {
    // Assumes user is already signed in (via setupAndSignInUser or similar)
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Wait for the invite badge trigger to be visible
    // There are multiple InviteBadge components (sidebar and top menu)

    // Get all invite badge triggers - there should be at least one visible
    const allBadges = page.getByTestId('invite-badge-trigger');

    // Wait for at least one badge to be visible (component finished loading)
    await expect(allBadges.first()).toBeVisible({ timeout: 15000 });

    // Try to find the badge in the main content section (not sidebar)
    // The main content section is typically a direct child section
    let inviteBadgeTrigger;

    // Try finding badge in section elements first (main content area)
    const mainSection = page.locator('section').first();
    const badgeInSection = mainSection.getByTestId('invite-badge-trigger');
    const sectionBadgeCount = await badgeInSection.count();

    if (sectionBadgeCount > 0) {
        inviteBadgeTrigger = badgeInSection.first();
        // Verify it's actually visible
        const isVisible = await inviteBadgeTrigger.isVisible().catch(() => false);
        if (!isVisible) {
            inviteBadgeTrigger = allBadges.first();
        }
    } else {
        // Fallback to first badge if not found in section
        inviteBadgeTrigger = allBadges.first();
    }

    // Wait for the badge to be visible and enabled
    await expect(inviteBadgeTrigger).toBeVisible({ timeout: 10000 });
    await expect(inviteBadgeTrigger).toBeEnabled({ timeout: 5000 });

    // Click the invite badge to open the dropdown
    // Use force: false to ensure it's a real user interaction
    await inviteBadgeTrigger.click({ force: false, timeout: 5000 });

    // Wait a moment for the dropdown animation
    await page.waitForTimeout(500);

    // Wait for the dropdown to appear
    const dropdown = page.getByTestId('invite-badge-dropdown');

    // Try to wait for dropdown, if it doesn't appear, try clicking other badges
    try {
        await expect(dropdown).toBeVisible({ timeout: 3000 });
    } catch {
        // If dropdown didn't appear, try clicking other badges
        const badgeCount = await allBadges.count();
        for (let i = 1; i < badgeCount; i++) {
            const otherBadge = allBadges.nth(i);
            const isVisible = await otherBadge.isVisible().catch(() => false);
            if (isVisible) {
                await otherBadge.scrollIntoViewIfNeeded();
                await otherBadge.click({ force: false, timeout: 5000 });
                await page.waitForTimeout(500);
                try {
                    await expect(dropdown).toBeVisible({ timeout: 3000 });
                    break; // Success, dropdown opened
                } catch {
                    // Continue to next badge
                }
            }
        }
        // Final check - if still not visible, throw error
        await expect(dropdown).toBeVisible({ timeout: 2000 });
    }

    // Find the invite item - we'll accept the first one available
    // In a real scenario, you might want to match by org name
    // Wait for invites to load (max 10 seconds)
    const inviteItems = page.locator('[data-testid^="invite-badge-item-"]');
    await expect(inviteItems.first()).toBeVisible({ timeout: 10000 });
    const itemCount = await inviteItems.count();

    if (itemCount === 0) {
        throw new Error(`No invites found for ${inviteeEmail} in badge`);
    }

    // Get the first invite item and extract its ID
    const firstItem = inviteItems.first();
    const itemTestId = await firstItem.getAttribute('data-testid');
    const inviteId = itemTestId?.replace('invite-badge-item-', '') || '';

    if (!inviteId) {
        throw new Error('Could not extract invite ID from badge item');
    }

    // Click the Accept button for this invite
    const acceptButton = page.getByTestId(`invite-badge-accept-${inviteId}`);
    await expect(acceptButton).toBeVisible({ timeout: 10000 });
    await expect(acceptButton).toBeEnabled({ timeout: 10000 });
    await acceptButton.click();

    // Wait for the dropdown to close (invite accepted)
    await expect(dropdown).not.toBeVisible({ timeout: 5000 });

    // Wait a bit for the UI to update
    await page.waitForTimeout(1000);
}

// ============================================================================
// GROUP UTILITIES
// ============================================================================

/**
 * Checks if a group exists by looking in the invite user group select dropdown.
 * This is a helper function to check group existence without navigating away.
 *
 * @param page The Playwright page object.
 * @param groupName The name of the group to check.
 * @returns true if the group exists, false otherwise.
 */
async function groupExistsInDropdown(page: Page, groupName: string): Promise<boolean> {
    const selectTrigger = page.getByTestId('invite-user-group-select');
    await expect(selectTrigger).toBeVisible({ timeout: 5000 });
    await expect(selectTrigger).toBeEnabled({ timeout: 10000 });
    await selectTrigger.click();

    const selectContent = page.getByTestId('invite-user-group-select-content');
    await expect(selectContent).toBeVisible({ timeout: 5000 });

    const allOptions = await selectContent.locator('[data-testid^="invite-user-group-option-"]').all();

    for (const option of allOptions) {
        const optionText = await option.textContent();
        if (optionText?.trim() === groupName.trim() ||
            optionText?.toLowerCase().trim() === groupName.toLowerCase().trim()) {
            // Close dropdown before returning
            await page.keyboard.press('Escape');
            await expect(selectContent).not.toBeVisible({ timeout: 3000 });
            return true;
        }
    }

    // Close dropdown before returning
    await page.keyboard.press('Escape');
    await expect(selectContent).not.toBeVisible({ timeout: 3000 });
    return false;
}

/**
 * Ensures a group exists in the organization. If it doesn't exist, creates it.
 * This is a utility function that can be used before inviting users or other operations.
 *
 * @param page The Playwright page object.
 * @param groupName The name of the group to ensure exists.
 * @param description Optional description for the group (only used if group needs to be created).
 * @returns The group name (for consistency).
 */
export async function ensureGroupExists(
    page: Page,
    groupName: string,
    description?: string
): Promise<string> {
    // Navigate to admin dashboard and Users tab to check if group exists
    await page.goto('http://localhost:3000/admin');
    // wait for the users tab to be visible
    await expect(page.getByRole('tab', { name: 'Users' })).toBeVisible({ timeout: 5000 });
    // click the users tab
    await page.getByRole('tab', { name: 'Users' }).click();
    await expect(page.getByTestId('invite-user-email-input')).toBeVisible({ timeout: 5000 });

    // Check if group exists in the dropdown
    const exists = await groupExistsInDropdown(page, groupName);

    if (!exists) {
        // Group doesn't exist, create it
        await createGroup(page, groupName, description);
    }

    return groupName;
}

/**
 * Creates a new group in the organization.
 *
 * @param page The Playwright page object.
 * @param groupName The name of the group to create.
 * @param description Optional description for the group.
 * @throws Error if group creation fails or shows an error
 */
export async function createGroup(
    page: Page,
    groupName: string,
    description?: string
) {
    // Navigate to groups tab
    await navigateToGroupsTab(page);

    // Click add group button using test ID
    const addButton = page.getByTestId('group-add-button');
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await expect(addButton).toBeEnabled({ timeout: 10000 });
    await addButton.click();

    // Wait for dialog to appear
    await expect(page.getByTestId('create-group-dialog')).toBeVisible({ timeout: 10000 });

    // Fill in group name using test ID
    await page.getByTestId('group-name-input').fill(groupName);

    // Fill in description if provided
    if (description) {
        await page.getByTestId('group-description-input').fill(description);
    }

    // Click create button using test ID
    const createButton = page.getByTestId('create-group-button');
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await expect(createButton).toBeEnabled({ timeout: 10000 });
    await createButton.click();

    // Wait for either dialog to close (success) or error message to appear
    const dialog = page.getByTestId('create-group-dialog');
    const errorMessage = page.getByTestId('group-name-error');

    try {
        // Wait a moment for the creation request to complete
        await page.waitForTimeout(500);

        // Check if there's an error message
        const hasError = await errorMessage.isVisible().catch(() => false);
        if (hasError) {
            const errorText = await errorMessage.textContent();
            throw new Error(`Group creation failed with error: ${errorText}`);
        }

        // Wait for dialog to close (success case)
        await expect(dialog).not.toBeVisible({ timeout: 10000 });
    } catch (error) {
        // If dialog didn't close, check for error message
        const hasError = await errorMessage.isVisible().catch(() => false);
        if (hasError) {
            const errorText = await errorMessage.textContent();
            throw new Error(`Group creation failed with error: ${errorText}`);
        }
        // Re-throw the original error if no error message found
        throw error;
    }

    // Wait for groups table to refresh and the new group to appear
    await page.waitForTimeout(1000);

    // Wait for the groups table to be ready
    const groupsTable = page.getByTestId('groups-table');
    try {
        await expect(groupsTable).toBeAttached({ timeout: 5000 });
        await expect(groupsTable).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(1000);
    } catch {
        await page.waitForTimeout(1000);
    }

    // Verify the group appears in the table by finding the row with the group name
    // We find by role='row' with the group name text, then verify it has the test ID pattern
    const newGroupRow = page.getByRole('row', { name: new RegExp(`^${groupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') });
    await expect(newGroupRow).toBeAttached({ timeout: 10000 });
}


/**
 * Deletes a group from the organization.
 *
 * @param page The Playwright page object.
 * @param groupName The name of the group to delete.
 */
export async function deleteGroup(page: Page, groupName: string) {
    // Navigate to groups tab
    await navigateToGroupsTab(page);

    // Wait for the groups table to be ready
    const groupsTable = page.getByTestId('groups-table');
    try {
        await expect(groupsTable).toBeAttached({ timeout: 5000 });
        await expect(groupsTable).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(1000);
    } catch {
        await page.waitForTimeout(1000);
    }

    // Find the row by the group name text content (first column)
    const row = page.getByRole('row', { name: new RegExp(`^${groupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') });
    await expect(row).toBeAttached({ timeout: 15000 });

    // Get the group ID from the row's test ID attribute
    const rowTestId = await row.getAttribute('data-testid');
    const groupId = rowTestId?.replace('group-row-', '') || '';
    if (!groupId) {
        throw new Error(`Could not extract group ID from row test ID: ${rowTestId}`);
    }

    // Click Edit button using test ID with group ID - Playwright will auto-scroll if needed
    const editButton = row.getByTestId(`group-edit-button-${groupId}`);
    await expect(editButton).toBeVisible({ timeout: 10000 });
    await expect(editButton).toBeEnabled({ timeout: 10000 });
    await editButton.click({ timeout: 10000 });

    // Wait for settings popup to appear and click Delete Group button
    const deleteButton = page.getByTestId('group-settings-delete-button');
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await expect(deleteButton).toBeEnabled({ timeout: 10000 });
    await deleteButton.click();

    // Wait for popup to close
    await expect(deleteButton).not.toBeVisible({ timeout: 10000 });

    // Wait for groups grid to refresh
    await page.waitForTimeout(1000);

    // verify group was deleted - row should no longer be visible
    await expect(row).not.toBeVisible({ timeout: 10000 });
}

/**
 * Adds a user to a group.
 *
 * @param page The Playwright page object.
 * @param userEmail The email of the user to add.
 * @param groupName The name of the group.
 */
export async function addUserToGroup(
    page: Page,
    userEmail: string,
    groupName: string
) {
    // Navigate to groups tab
    await navigateToGroupsTab(page);

    // Wait for the groups table to be ready
    const groupsTable = page.getByTestId('groups-table');
    try {
        await expect(groupsTable).toBeAttached({ timeout: 5000 });
        await expect(groupsTable).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(1000);
    } catch {
        await page.waitForTimeout(1000);
    }

    // Find the row by the group name text content (first column)
    const row = page.getByRole('row', { name: new RegExp(`^${groupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') }).first();
    await expect(row).toBeAttached({ timeout: 15000 });

    // Get the group ID from the row's test ID attribute
    const rowTestId = await row.getAttribute('data-testid');
    const groupId = rowTestId?.replace('group-row-', '') || '';
    if (!groupId) {
        throw new Error(`Could not extract group ID from row test ID: ${rowTestId}`);
    }

    const workingRow = row;

    // Scope subsequent actions to this row
    const searchInput = workingRow.getByTestId('user-search-input');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await expect(searchInput).toBeEnabled({ timeout: 10000 });
    await searchInput.click();
    await searchInput.fill(userEmail);

    // Wait for debounced search to trigger (most search inputs debounce 200-500ms)
    await page.waitForTimeout(600);

    // Wait for dropdown to appear and verify the user is in the list
    // Look for dropdown at PAGE level (not scoped to row) because dropdowns are rendered as portals
    // Use the group-specific dropdown ID to avoid conflicts with other groups
    const dropdown = page.getByTestId(`user-dropdown-list-${groupId}`);
    await expect(dropdown).toBeVisible({ timeout: 5000 });
    await expect(dropdown.getByText(userEmail)).toBeVisible();

    // Press Enter to add the top result
    await searchInput.press('Enter');

    // Verify user was added by checking for the selected user chip (contains the email text and has the remove button)
    const userChip = workingRow.locator('[data-testid^="selected-user-"]').filter({ hasText: userEmail });
    await expect(userChip).toBeVisible({ timeout: 5000 });

    // Verify search input is cleared
    await expect(searchInput).toHaveValue('');
}

/**
 * Removes a user from a group.
 *
 * @param page The Playwright page object.
 * @param userEmail The email of the user to remove.
 * @param groupName The name of the group.
 */
export async function removeUserFromGroup(
    page: Page,
    userEmail: string,
    groupName: string
) {
    // Navigate to groups tab
    await navigateToGroupsTab(page);

    // Wait for the groups table to be ready
    const groupsTable = page.getByTestId('groups-table');
    try {
        await expect(groupsTable).toBeAttached({ timeout: 5000 });
        await expect(groupsTable).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(1000);
    } catch {
        await page.waitForTimeout(1000);
    }

    // Find the row by the group name text content (first column)
    const row = page.getByRole('row', { name: new RegExp(`^${groupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') }).first();
    await expect(row).toBeAttached({ timeout: 15000 });

    const workingRow = row;

    // Find the user chip with the email and click the remove button
    // The chip structure: <div data-testid="selected-user-{userId}"> <span>{userEmail}</span> <button data-testid="remove-user-{userId}">...</button> </div>
    const userChip = workingRow.locator('[data-testid^="selected-user-"]').filter({ hasText: userEmail });
    await expect(userChip).toBeVisible({ timeout: 5000 });

    // Click the remove button (X button) inside the chip
    const removeButton = userChip.getByTestId(/remove-user-/);
    await expect(removeButton).toBeVisible({ timeout: 10000 });
    await expect(removeButton).toBeEnabled({ timeout: 10000 });
    await removeButton.click();

    // Verify user was removed - the chip should no longer be visible
    await expect(userChip).not.toBeVisible({ timeout: 5000 });
}

// ============================================================================
// MODEL UTILITIES
// ============================================================================

/**
 * Adds a model/AI connection to a group.
 *
 * @param page The Playwright page object.
 * @param modelName The name of the model to add.
 * @param groupName The name of the group.
 */
export async function addModelToGroup(
    page: Page,
    modelName: string,
    groupName: string
) {
    // Navigate to groups tab
    await navigateToGroupsTab(page);

    // Wait for the groups table to be ready
    const groupsTable = page.getByTestId('groups-table');
    try {
        await expect(groupsTable).toBeAttached({ timeout: 5000 });
        await expect(groupsTable).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(1000);
    } catch {
        await page.waitForTimeout(1000);
    }

    // Find the row by the group name text content (first column)
    const row = page.getByRole('row', { name: new RegExp(`^${groupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') }).first();
    await expect(row).toBeAttached({ timeout: 15000 });

    // Get the group ID from the row's test ID attribute
    const rowTestId = await row.getAttribute('data-testid');
    const groupId = rowTestId?.replace('group-row-', '') || '';
    if (!groupId) {
        throw new Error(`Could not extract group ID from row test ID: ${rowTestId}`);
    }

    const workingRow = row;

    // Scope subsequent actions to this row
    const searchInput = workingRow.getByTestId('model-search-input');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await expect(searchInput).toBeEnabled({ timeout: 10000 });
    await searchInput.click();
    await searchInput.fill(modelName);

    // Wait for debounced search to trigger (most search inputs debounce 200-500ms)
    await page.waitForTimeout(600);

    // Wait for dropdown to appear and verify the model is in the list
    // Look for dropdown at PAGE level (not scoped to row) because dropdowns are rendered as portals
    // Use the group-specific dropdown ID to avoid conflicts with other groups
    const dropdown = page.getByTestId(`model-dropdown-list-${groupId}`);
    await expect(dropdown).toBeVisible({ timeout: 5000 });
    await expect(dropdown.getByText(modelName).first()).toBeVisible();

    // Press Enter to add the top result
    await searchInput.press('Enter');

    // Verify model was added by checking for the selected model chip (contains the model name text)
    const modelChip = workingRow.locator('[data-testid^="selected-model-"]').filter({ hasText: modelName });
    await expect(modelChip).toBeVisible({ timeout: 5000 });

    // Verify search input is cleared
    await expect(searchInput).toHaveValue('');
}

/**
 * Removes a model/AI connection from a group.
 *
 * @param page The Playwright page object.
 * @param modelName The name of the model to remove.
 * @param groupName The name of the group.
 */
export async function removeModelFromGroup(
    page: Page,
    modelName: string,
    groupName: string
) {
    // Navigate to groups tab
    await navigateToGroupsTab(page);

    // Wait for the groups table to be ready
    const groupsTable = page.getByTestId('groups-table');
    try {
        await expect(groupsTable).toBeAttached({ timeout: 5000 });
        await expect(groupsTable).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(1000);
    } catch {
        await page.waitForTimeout(1000);
    }

    // Find the row by the group name text content (first column)
    const row = page.getByRole('row', { name: new RegExp(`^${groupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') }).first();
    await expect(row).toBeAttached({ timeout: 15000 });

    const workingRow = row;

    // Find the model chip with the model name and click the remove button
    // The chip structure: <div data-testid="selected-model-{modelId}"> <span>{modelName}</span> <button data-testid="remove-model-{modelId}">...</button> </div>
    const modelChip = workingRow.locator('[data-testid^="selected-model-"]').filter({ hasText: modelName });
    await expect(modelChip).toBeVisible({ timeout: 5000 });

    // Click the remove button (X button) inside the chip
    const removeButton = modelChip.getByTestId(/remove-model-/);
    await expect(removeButton).toBeVisible({ timeout: 10000 });
    await expect(removeButton).toBeEnabled({ timeout: 10000 });
    await removeButton.click();

    // Verify model was removed - the chip should no longer be visible
    await expect(modelChip).not.toBeVisible({ timeout: 5000 });
}

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

/**
 * Navigates to the admin dashboard.
 *
 * @param page The Playwright page object.
 */
export async function navigateToAdminDashboard(page: Page) {
    await page.goto('http://localhost:3000/admin');
    await expect(page).toHaveURL(/.*\/admin.*/);
}

/**
 * Navigates to a specific admin section.
 *
 * @param page The Playwright page object.
 * @param section The section to navigate to (e.g., 'groups', 'invites', 'models').
 */
export async function navigateToAdminSection(page: Page, section: string) {
    await navigateToAdminDashboard(page);
    await page.getByRole('link', { name: new RegExp(section, 'i') }).click();
}

// ============================================================================
// MODEL MANAGEMENT UTILITIES
// ============================================================================

/**
 * Configuration for creating a model manually.
 */
export interface ModelConfig {
    name: string;
    modelId?: string;
    endpoint: string;
    description?: string;
    headers?: Record<string, string>;
    suggestionPrompts?: string[];
}

/**
 * Navigates to the Models tab in the admin dashboard.
 *
 * @param page The Playwright page object.
 */
/**
 * Navigates to the Groups tab in the admin dashboard.
 *
 * @param page The Playwright page object.
 */
export async function navigateToGroupsTab(page: Page) {
    await page.goto('http://localhost:3000/admin');
    // Wait for the page to load and tabs to be visible
    await page.waitForLoadState('networkidle');
    // Use test ID for more reliable clicking
    const groupsTab = page.getByTestId('tab-groups');
    await expect(groupsTab).toBeVisible({ timeout: 10000 });
    await expect(groupsTab).toBeEnabled({ timeout: 10000 });
    await groupsTab.scrollIntoViewIfNeeded();
    await groupsTab.click();

    // Wait for tab to become active - check for the add button which is always present
    const addButton = page.getByTestId('group-add-button');
    await expect(addButton).toBeVisible({ timeout: 10000 });

    // Wait a bit more for content to fully render
    await page.waitForTimeout(500);
}

export async function navigateToModelsTab(page: Page) {
    // Only navigate if we're not already on the admin page
    const currentUrl = page.url();
    if (!currentUrl.includes('/admin')) {
        await page.goto('http://localhost:3000/admin');
        // Wait for the page to load and tabs to be visible
        await page.waitForLoadState('networkidle');
    }

    // Check if we're already on the models tab
    const heading = page.getByRole('heading', { name: 'AI Connections' });
    const isAlreadyOnModelsTab = await heading.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isAlreadyOnModelsTab) {
        // Use test ID for more reliable clicking
        const modelsTab = page.getByTestId('tab-models');
        await expect(modelsTab).toBeVisible({ timeout: 10000 });
        await expect(modelsTab).toBeEnabled({ timeout: 10000 });
        await modelsTab.scrollIntoViewIfNeeded();
        await modelsTab.click();
        // Wait for tab to become active (indicates tab switch completed)
        await page.waitForTimeout(500);
    }

    // Wait for models content to load - check for either heading or grid
    // The heading confirms the tab content is visible
    const modelsGrid = page.getByTestId('models-grid');
    const loadingGrid = page.getByTestId('models-loading-grid');

    // Wait for any of these to appear (check each individually to avoid strict mode violation)
    try {
        await expect(heading).toBeVisible({ timeout: 5000 });
    } catch {
        // If heading not found, check for grid
        await expect(modelsGrid.or(loadingGrid).first()).toBeVisible({ timeout: 5000 });
    }

    // Check if loading grid appears first (it will be visible if loading)
    const loadingGridCount = await loadingGrid.count();
    if (loadingGridCount > 0) {
        // Wait for loading grid to be visible, then wait for it to disappear
        await expect(loadingGrid).toBeVisible({ timeout: 5000 });
        await expect(loadingGrid).not.toBeVisible({ timeout: 10000 });
    }
}

/**
 * Imports a model from a YAML file.
 *
 * @param page The Playwright page object.
 * @param yamlFilePath The absolute path to the YAML file.
 * @param options Import options.
 */
export async function importModelFromYAML(
    page: Page,
    yamlFilePath: string,
    options?: {
        replaceIfExists?: boolean;
        importApiKey?: boolean;
        nameOverride?: string;
    }
) {
    let fileToImport = yamlFilePath;

    // If nameOverride is provided, create a temporary YAML file with the new name
    if (options?.nameOverride) {
        const fs = await import('fs/promises');
        const path = await import('path');
        const os = await import('os');

        // Read the original YAML file
        const yamlContent = await fs.readFile(yamlFilePath, 'utf-8');

        // Replace the name line (first line: name: "...")
        const modifiedYaml = yamlContent.replace(
            /^name:\s*"[^"]*"/m,
            `name: "${options.nameOverride}"`
        );

        // Write to temp file
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-model-'));
        fileToImport = path.join(tempDir, 'model.yaml');
        await fs.writeFile(fileToImport, modifiedYaml, 'utf-8');
    }
    // Navigate to models tab
    await navigateToModelsTab(page);

    // Wait for Import button to be visible and click it
    const importButton = page.getByTestId('model-import-button');
    await expect(importButton).toBeVisible({ timeout: 10000 });
    await expect(importButton).toBeEnabled({ timeout: 10000 });
    await importButton.click();

    // Wait for import modal
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Import AI Connection Configuration')).toBeVisible();

    // Upload the file using the file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(fileToImport);

    // Wait for file to be loaded - wait for the file name to appear in the upload area
    await expect(page.getByText(/\.yaml|\.yml/)).toBeVisible({ timeout: 10000 });

    // Wait for the options section to appear (checkboxes only show after file is uploaded)
    // Wait for at least one of the checkboxes to be visible to ensure the options section has rendered
    const replaceLabel = page.getByTestId('import-replace-if-exists-label');
    const apiKeyLabel = page.getByTestId('import-api-key-label');
    // Wait for either label to be visible (they both appear when file is uploaded)
    try {
        await expect(replaceLabel).toBeVisible({ timeout: 5000 });
    } catch {
        await expect(apiKeyLabel).toBeVisible({ timeout: 5000 });
    }

    // Set options if provided - checkboxes appear when file is uploaded
    // Click the label instead of checkbox for better reliability
    if (options?.replaceIfExists) {
        const replaceLabel = page.getByTestId('import-replace-if-exists-label');
        await expect(replaceLabel).toBeVisible({ timeout: 10000 });
        await replaceLabel.click();

        // Verify the checkbox is now checked
        const replaceCheckbox = page.getByTestId('import-replace-if-exists-checkbox');
        await expect(replaceCheckbox).toBeChecked({ timeout: 5000 });
    }
    if (options?.importApiKey) {
        const apiKeyLabel = page.getByTestId('import-api-key-label');
        await expect(apiKeyLabel).toBeVisible({ timeout: 10000 });
        await apiKeyLabel.click();

        const apiKeyCheckbox = page.getByTestId('import-api-key-checkbox');
        await expect(apiKeyCheckbox).toBeChecked({ timeout: 5000 });
    }

    // Wait for Validate button to appear and click it
    const validateButton = page.getByTestId('import-validate-button');
    await expect(validateButton).toBeVisible({ timeout: 10000 });
    await expect(validateButton).toBeEnabled({ timeout: 10000 });
    await validateButton.click();

    // Wait for validation to complete
    await expect(page.getByText('Configuration is valid')).toBeVisible({ timeout: 10000 });

    // Click Import button
    const importSubmitButton = page.getByTestId('import-submit-button');
    await expect(importSubmitButton).toBeVisible({ timeout: 10000 });
    await expect(importSubmitButton).toBeEnabled({ timeout: 10000 });
    await importSubmitButton.click();

    // Wait for import to complete
    // On success: modal closes automatically after 1500ms
    // On error: modal stays open with error message
    const dialog = page.getByRole('dialog');

    // Wait a bit to see if success message appears (it shows briefly before modal closes)
    try {
        await expect(page.getByText('AI connection imported successfully!')).toBeVisible({ timeout: 2000 });
    } catch {
        // Success message might not appear if modal closes quickly, that's okay
    }

    // Wait for modal to close (indicates success) or check for error
    try {
        await expect(dialog).not.toBeVisible({ timeout: 10000 });
    } catch {
        // If modal didn't close, check for error message
        const errorTitle = page.getByText('Import failed');
        if (await errorTitle.isVisible().catch(() => false)) {
            // Get the detailed error message - look for text in red error container
            // The error detail is in a <p> tag with classes containing "text-red"
            const errorDetailElement = page.locator('.text-red-800, .text-red-200').filter({ hasNotText: 'Import failed' });
            let errorDetail = 'Unknown error';
            if (await errorDetailElement.count() > 0) {
                errorDetail = (await errorDetailElement.first().textContent().catch(() => null)) || 'Unknown error';
            } else {
                // Fallback: get all text from error container and extract detail
                const errorContainer = errorTitle.locator('..').locator('..');
                const allErrorText = await errorContainer.textContent().catch(() => null) || '';
                errorDetail = allErrorText.replace(/Import failed\s*/i, '').trim() || 'Unknown error';
            }
            throw new Error(`Import failed: ${errorDetail}`);
        }
        // If no error message and modal still open, something unexpected happened
        throw new Error('Import did not complete - modal did not close and no error message found');
    }

    // Wait for models grid to refresh after import
    // The modal closes after 1500ms, then refreshModels() is called
    // Wait for the modal to close first
    await page.waitForTimeout(2000); // Wait for modal close + refresh to start

    // Wait for loading grid to disappear (if it appears) or for models grid to be ready
    const loadingGrid = page.getByTestId('models-loading-grid');
    const modelsGrid = page.getByTestId('models-grid');

    // Check if loading grid appears (models are refreshing)
    const loadingCount = await loadingGrid.count();
    if (loadingCount > 0) {
        // Wait for loading to finish
        await expect(loadingGrid).not.toBeVisible({ timeout: 10000 });
    }

    // Ensure models grid is visible/attached
    await expect(modelsGrid).toBeAttached({ timeout: 10000 });
}

/**
 * Creates a model manually using the wizard.
 * This is a simplified version that only fills basic info and skips through remaining steps.
 *
 * @param page The Playwright page object.
 * @param config The model configuration.
 */
export async function createModelManually(page: Page, config: ModelConfig) {
    // Navigate to models tab
    await navigateToModelsTab(page);

    // Click the + button to add a new model using test ID
    const addButton = page.getByTestId('model-add-button');
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await expect(addButton).toBeEnabled({ timeout: 10000 });
    await addButton.click();

    // Wait for wizard to open
    await expect(page.getByTestId('wizard-step-title-basic')).toBeVisible();

    // Step 1: Basic Info
    await page.getByLabel('Name *').fill(config.name);

    if (config.modelId) {
        await page.getByLabel('Model ID (optional)').fill(config.modelId);
    }

    await page.getByLabel('Endpoint *').fill(config.endpoint);

    if (config.description) {
        await page.getByLabel('Description').fill(config.description);
    }

    // Add headers if provided
    if (config.headers) {
        for (const [key, value] of Object.entries(config.headers)) {
            await page.getByRole('button', { name: 'Add Header' }).click();
            const headerRows = page.locator('.grid.grid-cols-12.gap-2');
            const lastRow = headerRows.last();
            await lastRow.locator('input').first().fill(key);
            await lastRow.locator('input').nth(1).fill(value);
        }
    }

    // Add suggestion prompts if provided
    if (config.suggestionPrompts) {
        for (const prompt of config.suggestionPrompts) {
            await page.getByRole('button', { name: 'Add Suggestion Prompt' }).click();
            const promptInputs = page.locator('input[placeholder*="Example"]');
            const lastInput = promptInputs.last();
            await lastInput.fill(prompt);
        }
    }

    // Click Next to go to Field Mapping
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Field Mapping', level: 3 })).toBeVisible();

    // Step 2: Field Mapping - use defaults, click Next
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Request Template', level: 3 })).toBeVisible();

    // Step 3: Request Template - click Next (validation should pass with defaults)
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Test Endpoint', level: 3 })).toBeVisible();

    // Step 4: Test Endpoint - we need to test the endpoint
    // Click the Test button
    await page.getByTestId('wizard-button-test-endpoint').click();

    // Wait for response (might fail for fake endpoint but that's okay for test)
    // For a real test, we'd need a working endpoint
    await page.waitForTimeout(2000);

    // Try to proceed - if test passed, go to next step
    // If test failed, we'll try to continue anyway for testing purposes
    const nextButton = page.getByRole('button', { name: 'Next' });
    if (await nextButton.isEnabled()) {
        await nextButton.click();
    } else {
        // For testing purposes, we might need to handle failed tests differently
        // This is a simplified version - in real tests you'd use a working endpoint
        throw new Error('Endpoint test failed - cannot proceed with model creation');
    }

    // Step 5: Define Output - configure response path
    await expect(page.getByRole('heading', { name: 'Define Output', level: 3 })).toBeVisible();

    // Click Save/Create button
    await page.getByRole('button', { name: /save|create/i }).click();

    // Wait for wizard to close (indicates success)
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
}

/**
 * Updates an existing model.
 *
 * @param page The Playwright page object.
 * @param modelName The name of the model to update.
 * @param modelId The ID of the model (for test ID selectors).
 * @param updates The fields to update.
 */
export async function updateModel(
    page: Page,
    modelName: string,
    modelId: string,
    updates: {
        name?: string;
        description?: string;
        endpoint?: string;
    }
) {
    // Navigate to models tab
    await navigateToModelsTab(page);

    // Find the model card using test ID and hover to reveal buttons
    const modelCard = page.getByTestId(`model-card-${modelId}`);
    await expect(modelCard).toBeVisible({ timeout: 10000 });
    await modelCard.hover();

    // Click the edit button using test ID
    const editButton = page.getByTestId(`model-edit-${modelId}`);
    await expect(editButton).toBeVisible({ timeout: 10000 });
    await expect(editButton).toBeEnabled({ timeout: 10000 });
    await editButton.click();

    // Wait for wizard to open
    await expect(page.getByText('Basic Info')).toBeVisible({ timeout: 5000 });

    // Update fields
    if (updates.name) {
        const nameInput = page.getByLabel('Name *');
        await nameInput.clear();
        await nameInput.fill(updates.name);
    }

    if (updates.description) {
        const descInput = page.getByLabel('Description');
        await descInput.clear();
        await descInput.fill(updates.description);
    }

    if (updates.endpoint) {
        const endpointInput = page.getByLabel('Endpoint *');
        await endpointInput.clear();
        await endpointInput.fill(updates.endpoint);
    }

    // Navigate through wizard steps to save
    // Click through all steps
    for (let i = 0; i < 4; i++) {
        const nextButton = page.getByRole('button', { name: 'Next' });
        if (await nextButton.isVisible() && await nextButton.isEnabled()) {
            await nextButton.click();
            await page.waitForTimeout(500);
        }
    }

    // Click Save button
    await page.getByRole('button', { name: /save/i }).click();

    // Wait for wizard to close
    await expect(page.getByText('Basic Info')).not.toBeVisible({ timeout: 10000 });
}

/**
 * Gets a model card by name and returns its ID.
 * Useful when you only know the model name but need the ID for other operations.
 *
 * @param page The Playwright page object.
 * @param modelName The name of the model.
 * @returns The model ID extracted from the test ID attribute.
 */
export async function getModelIdByName(page: Page, modelName: string): Promise<string> {
    // Navigate to models tab if not already there
    await navigateToModelsTab(page);

    // Find the model name element with the given text
    const modelNameElement = page.locator('[data-testid^="model-name-"]').filter({ hasText: modelName }).first();

    // Wait for element to exist with explicit timeout and better error handling
    try {
        await modelNameElement.waitFor({ state: 'attached', timeout: 10000 });
    } catch (error) {
        // Get all available model names for debugging
        const allModelNames = await page.locator('[data-testid^="model-name-"]').allTextContents();
        throw new Error(
            `Model with name "${modelName}" not found. ` +
            `Available models: ${allModelNames.join(', ') || 'none'}`
        );
    }

    const testId = await modelNameElement.getAttribute('data-testid');

    if (!testId) {
        throw new Error(`Model element found but missing data-testid attribute for "${modelName}"`);
    }

    // Extract the ID from the test ID (format: model-name-{id})
    return testId.replace('model-name-', '');
}

/**
 * Deletes a model from the organization.
 *
 * @param page The Playwright page object.
 * @param modelName The name of the model to delete.
 */
export async function deleteModel(page: Page, modelName: string) {
    // Navigate to models tab
    await navigateToModelsTab(page);

    // Get the model ID by name first
    const modelId = await getModelIdByName(page, modelName);

    // Get the actual displayed model name from the page (this is what needs to be entered)
    const modelNameElement = page.getByTestId(`model-name-${modelId}`);
    const actualModelName = await modelNameElement.textContent();
    if (!actualModelName) {
        throw new Error(`Could not get model name for model ID ${modelId}`);
    }
    const trimmedModelName = actualModelName.trim();

    // Find the model card using test ID and hover to reveal buttons
    const modelCard = page.getByTestId(`model-card-${modelId}`);
    await expect(modelCard).toBeVisible({ timeout: 10000 });
    await modelCard.hover();

    // Click the delete button using test ID
    const deleteButton = page.getByTestId(`model-delete-${modelId}`);
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await expect(deleteButton).toBeEnabled({ timeout: 10000 });
    await deleteButton.click();

    // Wait for confirmation dialog using test ID
    await expect(page.getByTestId('delete-model-dialog')).toBeVisible();
    await expect(page.getByText('Confirm Delete AI Connection')).toBeVisible();

    // Get the confirmation input and fill it with the exact model name
    const confirmInput = page.getByTestId('delete-model-confirm-input');
    await confirmInput.fill(trimmedModelName);

    // Wait for the delete button to be enabled (it's disabled until the name matches)
    const confirmDeleteButton = page.getByTestId('delete-model-confirm-button');
    await expect(confirmDeleteButton).toBeEnabled({ timeout: 10000 });

    // Click Delete button using test ID
    await confirmDeleteButton.click();

    // Wait for "Deleting..." text to appear (confirms the deletion process started)
    await expect(confirmDeleteButton).toHaveText('Deleting...', { timeout: 5000 });

    // Wait for dialog to close after deletion completes
    // The dialog closing is the actual indicator of success, not the button text
    // (button text might stay "Deleting..." if refreshModels() is slow, but dialog closes on success)
    await expect(page.getByTestId('delete-model-dialog')).not.toBeVisible({ timeout: 15000 });

    // Wait for models grid to refresh after deletion
    // deleteModel calls refreshModels() automatically, so wait for refresh to complete
    await page.waitForTimeout(1000); // Wait for refresh to start

    // Wait for loading grid to disappear (if it appears) or for models grid to be ready
    const loadingGrid = page.getByTestId('models-loading-grid');
    const modelsGrid = page.getByTestId('models-grid');

    // Check if loading grid appears (models are refreshing)
    const loadingCount = await loadingGrid.count();
    if (loadingCount > 0) {
        // Wait for loading to finish
        await expect(loadingGrid).not.toBeVisible({ timeout: 10000 });
    }

    // Ensure models grid is visible/attached
    await expect(modelsGrid).toBeAttached({ timeout: 10000 });

    // Verify model is no longer visible
    await expect(page.getByTestId(`model-card-${modelId}`)).not.toBeVisible({ timeout: 10000 });
}

/**
 * Verifies that a model exists in the models list.
 *
 * @param page The Playwright page object.
 * @param modelName The name of the model to verify.
 */
export async function verifyModelExists(page: Page, modelName: string) {
    await navigateToModelsTab(page);

    // Wait for models grid to be ready
    const modelsGrid = page.getByTestId('models-grid');
    await expect(modelsGrid).toBeAttached({ timeout: 10000 });

    // Models are displayed with their name in an element with data-testid="model-name-{id}"
    // Find the element with exact text match to avoid partial matches
    const allModelNames = page.locator('[data-testid^="model-name-"]');

    // Wait for at least one model name to be visible (indicates grid has loaded)
    await expect(allModelNames.first()).toBeVisible({ timeout: 10000 }).catch(() => {
        // If no models are visible, that's okay - we'll check the count
    });

    const count = await allModelNames.count();

    // If count is 0, wait a bit more for models to load
    if (count === 0) {
        await page.waitForTimeout(2000);
    }

    let found = false;
    const foundNames: string[] = [];
    for (let i = 0; i < count; i++) {
        const element = allModelNames.nth(i);
        const text = await element.textContent();
        if (text) {
            foundNames.push(text.trim());
            if (text.trim() === modelName.trim()) {
                await expect(element).toBeVisible({ timeout: 10000 });
                found = true;
                break;
            }
        }
    }

    if (!found) {
        throw new Error(
            `Model with name "${modelName}" not found in the models list. ` +
            `Found ${count} model(s). Available names: ${foundNames.join(', ') || 'none'}`
        );
    }
}

/**
 * Verifies that a model does not exist in the models list.
 *
 * @param page The Playwright page object.
 * @param modelName The name of the model to verify is absent.
 */
export async function verifyModelNotExists(page: Page, modelName: string) {
    await navigateToModelsTab(page);

    // Wait for models grid to be ready
    const modelsGrid = page.getByTestId('models-grid');
    const loadingGrid = page.getByTestId('models-loading-grid');

    // Wait for loading to finish if it's happening
    const loadingCount = await loadingGrid.count();
    if (loadingCount > 0) {
        await expect(loadingGrid).not.toBeVisible({ timeout: 10000 });
    }

    // Ensure models grid is attached
    await expect(modelsGrid).toBeAttached({ timeout: 10000 });

    // Wait a bit for any final updates
    await page.waitForTimeout(500);

    // Models are displayed with their name in an element with data-testid="model-name-{id}"
    // Check that no element with exact text match exists
    const allModelNames = page.locator('[data-testid^="model-name-"]');
    const count = await allModelNames.count();

    for (let i = 0; i < count; i++) {
        const element = allModelNames.nth(i);
        const text = await element.textContent();
        if (text?.trim() === modelName.trim()) {
            throw new Error(`Model with name "${modelName}" was found but should not exist`);
        }
    }

    // If we get here, the model doesn't exist (which is what we want)
}

/**
 * Subscription module - Open Source Edition
 *
 * AgentFlow is open source and provides full access to all features.
 * All subscription checks always return true to ensure unrestricted access.
 */

/**
 * Check if the current user can invite users
 * Always returns true for open source - no limits
 */
export async function canInviteUsers(): Promise<boolean> {
  return true;
}

/**
 * Check if a specific user can invite members
 * Always returns true for open source - no limits
 */
export async function canUserInviteMembers(_userId: string): Promise<boolean> {
  return true;
}

/**
 * Get subscription status details
 * Always returns full access for open source
 */
export async function getSubscriptionStatus(): Promise<{
  hasOrgUsersFeature: boolean;
  planName: string;
  canInvite: boolean;
}> {
  return {
    hasOrgUsersFeature: true,
    planName: 'Open Source',
    canInvite: true,
  };
}

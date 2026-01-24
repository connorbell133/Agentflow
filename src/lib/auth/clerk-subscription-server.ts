/**
 * DEPRECATED - Clerk Subscription Server
 *
 * This file is kept for reference only during migration.
 * We have migrated to Supabase Auth.
 * DO NOT USE THIS FILE.
 */

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface ClerkSubscriptionInfo {
  tier: SubscriptionTier;
  planName: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing' | 'paused' | null;
  canInviteUsers: boolean;
  subscriptionId?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

// All Clerk-specific functions have been removed.
// This file is kept only for type reference during migration.
export async function getUserSubscriptionInfo(): Promise<ClerkSubscriptionInfo> {
  return {
    tier: 'free',
    planName: 'Free',
    status: null,
    canInviteUsers: false,
  };
}

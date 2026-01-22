import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';

export type SubscriptionTier = 'free' | 'pro' | 'enterprise'

export interface ClerkSubscriptionInfo {
  tier: SubscriptionTier
  planName: string
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing' | 'paused' | null
  canInviteUsers: boolean
  subscriptionId?: string
}

/**
 * Get subscription information from Clerk (server-side)
 * This checks multiple sources to ensure we get the correct subscription status
 */
export async function getClerkSubscription(): Promise<ClerkSubscriptionInfo> {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        tier: 'free',
        planName: 'Free',
        status: null,
        canInviteUsers: false
      }
    }

    // Check various metadata sources for subscription info
    const publicMetadata = user.publicMetadata as any
    const privateMetadata = user.privateMetadata as any

    // 1. Check if user has plan in public metadata (most common)
    if (publicMetadata?.plan === 'pro' || publicMetadata?.tier === 'pro') {
      return {
        tier: 'pro',
        planName: 'Pro',
        status: 'active',
        canInviteUsers: true,
        subscriptionId: publicMetadata.subscriptionId
      }
    }

    // 2. Check subscription status in metadata
    if (publicMetadata?.subscriptionStatus === 'active' || publicMetadata?.billingStatus === 'active') {
      return {
        tier: 'pro',
        planName: 'Pro',
        status: 'active',
        canInviteUsers: true,
        subscriptionId: publicMetadata.subscriptionId
      }
    }

    // 3. Try to get more detailed info from Clerk client
    try {
      const client = await clerkClient()
      const userDetails = await client.users.getUser(user.id)

      // Check if subscription info is directly on user object (Clerk Billing)
      const subscription = (userDetails as any).subscription

      if (subscription) {
        const isActive = subscription.status === 'active' || subscription.status === 'trialing'
        const isPastDue = subscription.status === 'past_due'

        if (isActive) {
          return {
            tier: 'pro',
            planName: 'Pro',
            status: subscription.status,
            canInviteUsers: true,
            subscriptionId: subscription.id
          }
        } else if (isPastDue) {
          return {
            tier: 'pro',
            planName: 'Pro (Past Due)',
            status: subscription.status,
            canInviteUsers: false, // Disable features when past due
            subscriptionId: subscription.id
          }
        }
      }

      // Check for billing entitlements (Clerk's feature-based subscriptions)
      const billingEntitlements = (userDetails as any).billingEntitlements
      if (billingEntitlements) {
        // Check if user has a pro plan through billing entitlements
        const hasProPlan = billingEntitlements.some((entitlement: any) => 
          entitlement.plan?.name?.toLowerCase() === 'pro' || 
          entitlement.plan?.key?.toLowerCase() === 'pro'
        )
        
        if (hasProPlan) {
          const proEntitlement = billingEntitlements.find((entitlement: any) => 
            entitlement.plan?.name?.toLowerCase() === 'pro' || 
            entitlement.plan?.key?.toLowerCase() === 'pro'
          )
          
          return {
            tier: 'pro',
            planName: 'Pro',
            status: proEntitlement?.status === 'active' ? 'active' : null,
            canInviteUsers: true,
            subscriptionId: proEntitlement?.subscriptionId
          }
        }
      }

      // Check organization subscription
      const { orgId } = await auth()
      if (orgId) {
        const org = await client.organizations.getOrganization({ organizationId: orgId })
        const orgMetadata = org.publicMetadata as any

        if (orgMetadata?.plan === 'pro' || orgMetadata?.tier === 'pro') {
          return {
            tier: 'pro',
            planName: 'Pro',
            status: 'active',
            canInviteUsers: true,
            subscriptionId: orgMetadata.subscriptionId
          }
        }
      }
    } catch (err) {
      console.error('Error fetching detailed subscription info:', err)
    }

    // 4. Check for Stripe subscription in private metadata
    if (privateMetadata?.stripe?.subscriptions?.length > 0) {
      const activeSubscription = privateMetadata.stripe.subscriptions.find(
        (sub: any) => sub.status === 'active' || sub.status === 'trialing'
      )

      if (activeSubscription) {
        return {
          tier: 'pro',
          planName: 'Pro',
          status: activeSubscription.status,
          canInviteUsers: true,
          subscriptionId: activeSubscription.id
        }
      }
    }

    // Default to free plan if no subscription found
    return {
      tier: 'free',
      planName: 'Free',
      status: null,
      canInviteUsers: false
    }
  } catch (error) {
    console.error('Error getting Clerk subscription:', error)
    return {
      tier: 'free',
      planName: 'Free',
      status: null,
      canInviteUsers: false
    }
  }
}

/**
 * Check if the current user can invite team members
 * This is a more reliable version that checks Clerk subscription
 */
export async function canInviteTeamMembers(): Promise<boolean> {
  const subscription = await getClerkSubscription()
  return subscription.canInviteUsers
}
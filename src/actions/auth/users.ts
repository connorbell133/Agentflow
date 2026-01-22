"use server";

import { auth, clerkClient } from '@clerk/nextjs/server';
import { v4 as uuidv4 } from 'uuid';
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Profile, ProfileUpdate } from "@/lib/supabase/types";
import { createLogger } from "@/lib/infrastructure/logger";
import { canUserInviteMembers, canInviteUsers } from '@/lib/auth/subscription';

const logger = createLogger("users-actions");

export async function getUserProfile(userId: string) {
    logger.debug("Getting user profile for user: ", userId);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return [];
        logger.error("Error fetching user profile:", error);
        return [];
    }

    return data ? [data] : [];
}

export async function getUserGroups(userId: string) {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from('group_map')
        .select(`
            group_id,
            user_id,
            groups!inner (*)
        `)
        .eq('user_id', userId);

    if (error) {
        logger.error("Error fetching user groups:", error);
        return [];
    }

    // Transform to expected format
    return (data ?? []).map(item => ({
        groupId: item.group_id,
        userId: item.user_id,
        group: item.groups
    }));
}


export async function getOrgUsers(org_id: string, options?: { page?: number; limit?: number }) {
    try {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const offset = (page - 1) * limit;

        logger.info(`getOrgUsers called for org ${org_id} with page=${page}, limit=${limit}`);

        const supabase = await createSupabaseServerClient();

        // First verify the organization exists
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('id', org_id)
            .single();

        if (orgError || !org) {
            logger.error(`Organization ${org_id} not found or access denied`);
            throw new Error('Organization not found or access denied');
        }

        // Get all user IDs from org_map
        const { data: allRows, error: orgMapError } = await supabase
            .from('org_map')
            .select('user_id')
            .eq('org_id', org_id);

        if (orgMapError) {
            logger.error("Error fetching org_map:", orgMapError);
            throw orgMapError;
        }

        logger.info(`Total rows in org_map for org ${org_id}: ${allRows?.length ?? 0}`);

        if (!allRows || allRows.length === 0) {
            return [];
        }

        // Manually deduplicate user IDs
        const uniqueUserIds = Array.from(new Set(allRows.map(row => row.user_id).filter(Boolean)));
        const sortedUserIds = uniqueUserIds.sort(); // Sort for consistent pagination

        logger.info(`Total UNIQUE users after manual deduplication: ${uniqueUserIds.length}`);

        // Apply pagination to the distinct user IDs if options are provided
        const userIds = options
            ? sortedUserIds.slice(offset, offset + limit)
            : sortedUserIds;

        logger.info(`Returning ${userIds.length} user IDs (page ${page}, limit ${limit})`);

        if (userIds.length === 0) {
            return [];
        }

        // Now fetch the profiles for these distinct user IDs
        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);

        if (profilesError) {
            logger.error("Error fetching profiles:", profilesError);
            throw profilesError;
        }

        logger.info(`Found ${profilesData?.length ?? 0} profiles out of ${userIds.length} user IDs`);

        // Log missing users
        const foundUserIds = (profilesData ?? []).map(p => p.id);
        const missingUserIds = userIds.filter(id => !foundUserIds.includes(id));
        if (missingUserIds.length > 0) {
            logger.warn(`Missing profiles for user IDs: ${missingUserIds.join(', ')}`);
        }

        // Enrich with Clerk image URLs by email (fallback to existing avatarUrl)
        try {
            const emails = (profilesData ?? []).map(p => p.email).filter(Boolean) as string[];
            if (emails.length > 0) {
                const client = await clerkClient();
                const clerkUsers = await client.users.getUserList({ emailAddress: emails, limit: emails.length });
                const emailToImageUrl = new Map<string, string>();
                const list = Array.isArray((clerkUsers as any)) ? (clerkUsers as any) : (clerkUsers as any)?.data || [];
                for (const cu of list as any[]) {
                    const primary = cu.emailAddresses?.find((e: any) => e.id === cu.primaryEmailAddressId)?.emailAddress
                        || cu.primaryEmailAddress?.emailAddress
                        || cu.emailAddresses?.[0]?.emailAddress;
                    if (primary) {
                        emailToImageUrl.set(primary.toLowerCase(), cu.imageUrl);
                    }
                }
                const enriched = (profilesData ?? []).map(p => {
                    const img = emailToImageUrl.get(p.email.toLowerCase());
                    return img ? { ...p, avatar_url: img } : p;
                });
                return enriched;
            }
        } catch (e) {
            logger.warn('Failed to enrich profiles with Clerk image URLs:', e);
        }

        return profilesData ?? [];
    } catch (error) {
        logger.error(`Error in getOrgUsers for org ${org_id}:`, error);
        throw error;
    }
}

export async function checkUserOrgStatus(org_id: string, userId: string) {
    const supabase = await createSupabaseServerClient();

    // First verify the organization exists
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', org_id)
        .single();

    if (orgError || !org) {
        throw new Error('Organization not found or access denied');
    }

    const { data, error } = await supabase
        .from('org_map')
        .select('*')
        .eq('org_id', org_id)
        .eq('user_id', userId);

    if (error) {
        logger.error("Error checking user org status:", error);
        throw error;
    }

    return data ?? [];
}

import { revalidatePath } from "next/cache";

export async function addUserToOrg(org_id: string, userId: string) {
    const { userId: authUserId } = await auth();
    if (!authUserId || authUserId !== userId) {
        throw new Error('Unauthorized org add attempt');
    }

    const adminSupabase = getSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();

    // First check if user is the organization owner (admin client avoids RLS on fresh orgs)
    const { data: org, error: orgError } = await adminSupabase
        .from('organizations')
        .select('id, owner')
        .eq('id', org_id)
        .single();

    if (orgError || !org) {
        throw new Error('Organization not found');
    }

    // If user is NOT the owner, check if the owner has Tier 1 subscription
    if (org.owner !== userId) {
        // Check if the organization owner has Tier 1 subscription for team members
        if (org.owner) {
            const ownerCanInvite = await canUserInviteMembers(org.owner);
            if (!ownerCanInvite) {
                const currentUserCanInvite = await canInviteUsers();
                if (!currentUserCanInvite) {
                    throw new Error(
                        'This organization requires a Tier 1 subscription ($5/month) for team members. ' +
                        'The organization owner needs to upgrade to enable team collaboration.'
                    );
                }
            }
        } else {
            // Organization has no owner - check current user's permission
            const currentUserCanInvite = await canInviteUsers();
            if (!currentUserCanInvite) {
                throw new Error(
                    'This organization requires a Tier 1 subscription ($5/month) for team members.'
                );
            }
        }
    }

    const insertClient = org.owner === userId ? adminSupabase : supabase;

    const { data, error } = await insertClient
        .from('org_map')
        .insert({
            id: uuidv4(),
            org_id: org_id,
            user_id: userId
        })
        .select();

    if (error) {
        logger.error("Error adding user to org:", error);
        throw error;
    }

    return data ?? [];
}

export async function checkUserGroupStatus(group_id: string, user_id: string) {
    const supabase = await createSupabaseServerClient();

    // First verify the group exists
    const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id')
        .eq('id', group_id)
        .single();

    if (groupError || !group) {
        throw new Error('Group not found or access denied');
    }

    const { data, error } = await supabase
        .from('group_map')
        .select('*')
        .eq('group_id', group_id)
        .eq('user_id', user_id);

    if (error) {
        logger.error("Error checking user group status:", error);
        throw error;
    }

    return data ?? [];
}

export async function updateUserProfile(user_id: string, profile: Partial<ProfileUpdate>) {
    const supabase = await createSupabaseServerClient();

    // Convert camelCase to snake_case for Supabase
    const updateData: Record<string, any> = {};
    if (profile.full_name !== undefined) updateData.full_name = profile.full_name;
    if (profile.email !== undefined) updateData.email = profile.email;
    if (profile.avatar_url !== undefined) updateData.avatar_url = profile.avatar_url;
    if (profile.signup_complete !== undefined) updateData.signup_complete = profile.signup_complete;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user_id)
        .select()
        .single();

    if (error) {
        logger.error("Error updating user profile:", error);
        throw error;
    }

    return [data];
}

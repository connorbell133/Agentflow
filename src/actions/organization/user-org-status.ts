"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getUserOrgStatus(userId: string) {

    console.log(`[getUserOrgStatus] Checking org status for user: ${userId}`);

    try {
        const supabase = await createSupabaseServerClient();

        // Get user's organization memberships with organization details
        const { data: userOrgsData, error } = await supabase
            .from('org_map')
            .select(`
                org_id,
                organizations!inner (
                    id,
                    name,
                    owner
                )
            `)
            .eq('user_id', userId);

        if (error) {
            console.error("Error fetching user org status:", error);
            return {
                success: false,
                error: "Failed to check organization status"
            };
        }

        if (!userOrgsData || userOrgsData.length === 0) {
            return {
                success: true,
                data: {
                    hasOrganization: false,
                    organizations: [],
                    isOwner: false
                }
            };
        }

        // Transform the data to match expected format
        // Type the nested organization data from Supabase join
        type OrgData = { id: string; name: string; owner: string | null };
        const organizations = userOrgsData.map(item => {
            const org = item.organizations as OrgData | null;
            return {
                org_id: item.org_id,
                orgName: org?.name ?? null,
                isOwner: org?.owner ?? null
            };
        });

        console.log(`[getUserOrgStatus] Found ${userOrgsData.length} org(s) for user ${userId}:`, userOrgsData);

        return {
            success: true,
            data: {
                hasOrganization: organizations.length > 0,
                organizations,
                isOwner: organizations.some(org => org.isOwner === userId)
            }
        };
    } catch (error) {
        console.error("[getUserOrgStatus] Error checking user org status:", error);
        return { success: false, error: "Failed to check organization status" };
    }
}

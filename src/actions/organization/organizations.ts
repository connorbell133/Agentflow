"use server";

import { auth } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Organization } from "@/lib/supabase/types";


export async function fetchOrg(userId: string | null): Promise<{ data: Organization | null, error: Error | null }> {
    if (!userId) return { data: null, error: new Error("User not found") };

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner', userId)
        .limit(1);

    if (error) {
        console.error("Error fetching org:", error);
        return { data: null, error: new Error(error.message) };
    }

    if (!data || data.length === 0) {
        return { data: null, error: new Error("User not found") };
    }

    return { data: data[0], error: null };
}


export async function isUserOrgOwner(userId: string): Promise<boolean> {
    try {
        const supabase = await createSupabaseServerClient();

        const { data, error } = await supabase
            .from('organizations')
            .select('id')
            .eq('owner', userId)
            .limit(1);

        if (error) {
            console.error("Error checking if user is org owner:", error);
            return false;
        }

        return data !== null && data.length > 0;
    } catch (error) {
        console.error("Error checking if user is org owner:", error);
        return false;
    }
}


export async function requestOrgAdmin(org_id: string, userId: string, requestDesc: string) {
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
        .from('temp_org_requests')
        .insert({
            org_name: org_id,
            requester_id: userId,
            request_desc: requestDesc
        })
        .select();

    if (error) {
        console.error("Error creating org request:", error);
        throw error;
    }

    return data;
}


export async function isOpenRequest(userId: string) {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from('temp_org_requests')
        .select('*')
        .eq('requester_id', userId)
        .limit(1);

    if (error) {
        console.error("Error checking open request:", error);
        return { data: false, request: null };
    }

    return { data: data !== null && data.length > 0, request: data?.[0] };
}

export async function createOrg(orgName: string, userId: string) {
    // Validate that the caller is the same authenticated user.
    const { userId: authUserId } = await auth();
    if (!authUserId || authUserId !== userId) {
        throw new Error("Unauthorized org creation attempt");
    }

    // Use service role to avoid RLS failures while still enforcing owner match above.
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
        .from('organizations')
        .insert({ name: orgName, owner: userId })
        .select();

    if (error) {
        console.error("Error creating org:", error);
        throw error;
    }

    return data;
}









export async function updateOrg(orgName: string, org: Organization) {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from('organizations')
        .update({ name: orgName })
        .eq('id', org.id)
        .select();

    if (error) {
        console.error("Error updating org:", error);
        throw error;
    }

    return data;
}












export async function removeUserFromOrg(userId: string, org_id: string) {
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
        .delete()
        .eq('user_id', userId)
        .eq('org_id', org_id)
        .select();

    if (error) {
        console.error("Error removing user from org:", error);
        throw error;
    }

    return data;
}




// Remove from org_map


export async function getOrgsForUser(userId: string | null): Promise<Array<Organization>> {
    if (!userId) return [];

    const supabase = await createSupabaseServerClient();

    // Get org_map entries for user
    const { data: orgMapData, error: orgMapError } = await supabase
        .from('org_map')
        .select('org_id')
        .eq('user_id', userId);

    if (orgMapError) {
        console.error("Error fetching user org map:", orgMapError);
        return [];
    }

    if (!orgMapData || orgMapData.length === 0) {
        return [];
    }

    const org_ids = orgMapData.map(om => om.org_id);

    // Get organizations
    const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', org_ids);

    if (orgsError) {
        console.error("Error fetching organizations:", orgsError);
        return [];
    }

    return orgs ?? [];
}



export async function getOrgName(org_id: string) {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', org_id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return [];
        }
        console.error("Error fetching org name:", error);
        return [];
    }

    return data ? [data] : [];
}

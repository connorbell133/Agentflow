"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantDb } from "@/lib/db/tenant-db";
import type { Group, GroupMap, ModelMap } from "@/lib/supabase/types";

export async function addGroup(role: string, description: string, org_id: string) {
    console.debug("Adding group:", { role, description, org_id });

    const tenantDb = await getTenantDb();

    const data = await tenantDb.groups.create({
        role,
        description
    });

    console.debug("Added group:", data);
    return data;
}

export async function deleteGroup(groupId: string) {
    const tenantDb = await getTenantDb();
    const supabase = await createSupabaseServerClient();

    // First, get the group to verify it exists and get org_id
    const group = await tenantDb.groups.findById(groupId);
    if (!group) {
        throw new Error('Group not found');
    }

    const org_id = group.org_id;

    try {
        // Delete all model_map entries that reference this group
        const { error: modelMapError } = await supabase
            .from('model_map')
            .delete()
            .eq('group_id', groupId)
            .eq('org_id', org_id);

        if (modelMapError) {
            console.error("Error deleting model_map entries:", modelMapError);
            throw new Error(`Failed to delete model_map entries: ${modelMapError.message}`);
        }

        // Delete all group_map entries that reference this group
        const { error: groupMapError } = await supabase
            .from('group_map')
            .delete()
            .eq('group_id', groupId)
            .eq('org_id', org_id);

        if (groupMapError) {
            console.error("Error deleting group_map entries:", groupMapError);
            throw new Error(`Failed to delete group_map entries: ${groupMapError.message}`);
        }

        // Finally, delete the group itself
        await tenantDb.groups.delete(groupId);
    } catch (error) {
        console.error("Error deleting group and related mappings:", error);
        throw new Error("Failed to delete group and related mappings");
    }

    console.debug("Deleted group:", groupId);
    return [{ id: groupId }];
}

export async function getGroups(org_id: string): Promise<Group[]> {
    const tenantDb = await getTenantDb();

    const data = await tenantDb.groups.findMany();
    return data;
}

export async function addUserToGroup(groupId: string, userId: string, org_id: string) {
    const supabase = await createSupabaseServerClient();

    // First verify the group exists and belongs to the org
    const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .eq('org_id', org_id)
        .single();

    if (groupError || !group) {
        throw new Error('Group not found or access denied');
    }

    const { data, error } = await supabase
        .from('group_map')
        .insert({
            group_id: groupId,
            user_id: userId,
            org_id: org_id
        })
        .select();

    if (error) {
        console.error("Error adding user to group:", error);
        throw error;
    }

    return data;
}

export async function removeUserFromGroup(groupId: string, userId: string, org_id: string) {
    const supabase = await createSupabaseServerClient();

    // First verify the group exists and belongs to the org
    const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .eq('org_id', org_id)
        .single();

    if (groupError || !group) {
        throw new Error('Group not found or access denied');
    }

    const { data, error } = await supabase
        .from('group_map')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('org_id', org_id)
        .select();

    if (error) {
        console.error("Error removing user from group:", error);
        throw error;
    }

    return data;
}

export async function getAllUserGroups(org_id: string): Promise<GroupMap[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from('group_map')
        .select('*')
        .eq('org_id', org_id);

    if (error) {
        console.error("Error fetching user groups:", error);
        return [];
    }

    return data ?? [];
}

export async function getUserGroupsAcrossOrgs(userId: string) {
    const supabase = await createSupabaseServerClient();

    // Get all group memberships for the user
    const { data: groupMapData, error: gmError } = await supabase
        .from('group_map')
        .select('group_id, org_id, created_at')
        .eq('user_id', userId);

    if (gmError || !groupMapData || groupMapData.length === 0) {
        return [];
    }

    const groupIds = groupMapData.map(gm => gm.group_id);
    const org_ids = Array.from(new Set(groupMapData.map(gm => gm.org_id)));

    // Get groups and organizations
    const [groupsResult, orgsResult] = await Promise.all([
        supabase.from('groups').select('*').in('id', groupIds),
        supabase.from('organizations').select('*').in('id', org_ids)
    ]);

    if (groupsResult.error) {
        console.error("Error fetching groups:", groupsResult.error);
        return [];
    }
    if (orgsResult.error) {
        console.error("Error fetching organizations:", orgsResult.error);
        return [];
    }

    const groupsMap = new Map((groupsResult.data ?? []).map(g => [g.id, g]));
    const orgsMap = new Map((orgsResult.data ?? []).map(o => [o.id, o]));

    return groupMapData.map(gm => {
        const group = groupsMap.get(gm.group_id);
        const org = orgsMap.get(gm.org_id);
        return {
            groupId: gm.group_id,
            groupName: group?.role ?? '',
            description: group?.description ?? null,
            org_id: gm.org_id,
            orgName: org?.name ?? null,
            joinedAt: gm.created_at
        };
    });
}

export async function getGroup(groupId: string, org_id: string): Promise<Group | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .eq('org_id', org_id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error("Error fetching group:", error);
        return null;
    }

    return data;
}

export async function getModelGroups(model_id: string, org_id: string): Promise<ModelMap[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from('model_map')
        .select('*')
        .eq('model_id', model_id)
        .eq('org_id', org_id);

    if (error) {
        console.error("Error fetching model groups:", error);
        return [];
    }

    return data ?? [];
}

export async function addModelToGroup(model_id: string, groupId: string, org_id: string) {
    const supabase = await createSupabaseServerClient();

    // First verify the group exists and belongs to the org
    const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .eq('org_id', org_id)
        .single();

    if (groupError || !group) {
        throw new Error('Group not found or access denied');
    }

    const { data, error } = await supabase
        .from('model_map')
        .insert({ model_id: model_id, group_id: groupId, org_id: org_id })
        .select();

    if (error) {
        console.error("Error adding model to group:", error);
        throw error;
    }

    return data;
}

export async function removeModelFromGroup(model_id: string, groupId: string, org_id: string) {
    const supabase = await createSupabaseServerClient();

    // First verify the group exists and belongs to the org
    const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .eq('org_id', org_id)
        .single();

    if (groupError || !group) {
        throw new Error('Group not found or access denied');
    }

    const { data, error } = await supabase
        .from('model_map')
        .delete()
        .eq('model_id', model_id)
        .eq('group_id', groupId)
        .eq('org_id', org_id)
        .select();

    if (error) {
        console.error("Error removing model from group:", error);
        throw error;
    }

    return data;
}

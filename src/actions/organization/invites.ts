'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { canInviteUsers } from '@/lib/auth/subscription';

export async function getUserInvites(userEmail: string) {
  // Use user context client - RLS policy allows users to see invites sent to their email
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.from('invites').select('*').eq('invitee', userEmail);

  if (error) {
    console.error('[getUserInvites] Error fetching user invites:', error);
    return [];
  }

  return data ?? [];
}

export async function getInviteGroup(groupId: string, inviteOrg: string) {
  // Use user context client - RLS policy allows users to see groups they're invited to
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .eq('org_id', inviteOrg)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Group not found');
    }
    console.error('Error fetching invite group:', error);
    throw new Error('Failed to fetch group');
  }

  return [data];
}

export async function getInviteOrg(org_id: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', org_id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return [];
    console.error('Error fetching invite org:', error);
    return [];
  }

  return data ? [data] : [];
}

export async function getInviteInviter(inviterId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.from('profiles').select('*').eq('id', inviterId).single();

  if (error) {
    if (error.code === 'PGRST116') return { data: null };
    console.error('Error fetching inviter profile:', error);
    return { data: null };
  }

  return { data };
}

export async function getOrgInvites(org_id: string) {
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

  const { data, error } = await supabase.from('invites').select('*').eq('org_id', org_id);

  if (error) {
    console.error('Error fetching org invites:', error);
    return [];
  }

  return data ?? [];
}

// Batched function to get all invite display data in minimal queries
export async function getOrgInvitesWithDisplayData(org_id: string) {
  const supabase = await createSupabaseServerClient();

  // First verify the organization exists and get invites
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', org_id)
    .single();

  if (orgError || !org) {
    throw new Error('Organization not found or access denied');
  }

  const { data: invites, error: invitesError } = await supabase
    .from('invites')
    .select('*')
    .eq('org_id', org_id);

  if (invitesError) {
    console.error('Error fetching org invites:', invitesError);
    return { invites: [], displayData: {} };
  }

  if (!invites || invites.length === 0) {
    return { invites: [], displayData: {} };
  }

  // Get unique group_ids and inviter_ids
  const groupIds = Array.from(new Set(invites.map(i => i.group_id).filter(Boolean)));
  const inviterIds = Array.from(new Set(invites.map(i => i.inviter).filter(Boolean)));

  // Batch fetch groups and profiles
  const [groupsResult, profilesResult] = await Promise.all([
    groupIds.length > 0
      ? supabase
          .from('groups')
          .select('id, role')
          .in('id', groupIds as string[])
      : Promise.resolve({ data: [], error: null }),
    inviterIds.length > 0
      ? supabase.from('profiles').select('id, email').in('id', inviterIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  // Create lookup maps
  const groupMap = new Map((groupsResult.data || []).map(g => [g.id, g.role]));
  const profileMap = new Map((profilesResult.data || []).map(p => [p.id, p.email]));

  // Build display data
  const displayData: Record<string, { orgName: string; groupName: string; inviterEmail: string }> =
    {};
  for (const invite of invites) {
    const mapKey = invite.id || `${invite.org_id}-${invite.invitee}`;
    displayData[mapKey] = {
      orgName: org.name || org_id,
      groupName: groupMap.get(invite.group_id ?? '') || (invite.group_id ?? ''),
      inviterEmail: profileMap.get(invite.inviter) || invite.inviter || '',
    };
  }

  return { invites, displayData };
}

export async function removeInvite(inviteId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.from('invites').delete().eq('id', inviteId).select();

  if (error) {
    console.error('Error removing invite:', error);
    throw error;
  }

  return data ?? [];
}

export async function addInvite(invitee: string, org_id: string, groupId: string, inviter: string) {
  // Check if user has the "org_users" feature for team collaboration
  const canInvite = await canInviteUsers();
  if (!canInvite) {
    throw new Error(
      'Team collaboration requires the "Organization Users" feature. ' +
        'Please upgrade your plan to invite team members to your organization.'
    );
  }

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

  // Validate inputs
  if (!groupId || !org_id) {
    throw new Error('Invalid parameters: group and organization are required');
  }

  // Verify the group exists and belongs to the org (uses RLS - won't leak info about other orgs)
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id')
    .eq('id', groupId)
    .eq('org_id', org_id)
    .single();

  if (groupError || !group) {
    throw new Error('Group not found or access denied');
  }

  const { data, error } = await supabase
    .from('invites')
    .insert({
      id: uuidv4(),
      invitee: invitee,
      org_id: org_id,
      inviter: inviter,
      group_id: groupId,
    })
    .select();

  if (error) {
    console.error('Error adding invite:', error);
    throw error;
  }

  return data ?? [];
}

export async function acceptInviteAction(inviteId: string, userId: string) {
  // Use user context client - RLS policies now handle all validation
  const supabase = await createSupabaseServerClient();

  // 1. Verify invite exists and is for this user (RLS policy allows users to see their own invites)
  const { data: invite, error: inviteError } = await supabase
    .from('invites')
    .select('*')
    .eq('id', inviteId)
    .single();

  if (inviteError || !invite) {
    throw new Error('Invite not found or not authorized');
  }

  // 2. Verify the user profile email matches the invite
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  if (profileError || !profile || profile.email !== invite.invitee) {
    throw new Error('Invite does not match your email address');
  }

  // 3. Add to Org - Check if already in org
  const { data: existingOrgMap, error: orgMapCheckError } = await supabase
    .from('org_map')
    .select('id')
    .eq('org_id', invite.org_id)
    .eq('user_id', userId)
    .single();

  // Only treat PGRST116 (no rows) as "not in org", other errors should be thrown
  if (orgMapCheckError && orgMapCheckError.code !== 'PGRST116') {
    console.error('Error checking org membership:', orgMapCheckError);
    throw new Error('Failed to check organization membership');
  }

  if (!existingOrgMap) {
    // RLS policy allows INSERT if user has valid invite
    const { error: orgMapError } = await supabase.from('org_map').insert({
      id: uuidv4(),
      org_id: invite.org_id,
      user_id: userId,
    });

    if (orgMapError) {
      console.error('Error adding user to org:', orgMapError);
      throw new Error('Failed to add user to organization');
    }
  }

  // 4. Add to Group (RLS policy allows INSERT if user has valid invite)
  if (invite.group_id) {
    const { data: existingGroupMap, error: groupMapCheckError } = await supabase
      .from('group_map')
      .select('group_id')
      .eq('group_id', invite.group_id)
      .eq('user_id', userId)
      .eq('org_id', invite.org_id)
      .single();

    // Only treat PGRST116 (no rows) as "not in group", other errors should be thrown
    if (groupMapCheckError && groupMapCheckError.code !== 'PGRST116') {
      console.error('Error checking group membership:', groupMapCheckError);
      throw new Error('Failed to check group membership');
    }

    if (!existingGroupMap) {
      const { error: groupMapError } = await supabase.from('group_map').insert({
        group_id: invite.group_id,
        user_id: userId,
        org_id: invite.org_id,
      });

      if (groupMapError) {
        console.error('Error adding user to group:', groupMapError);
        throw new Error('Failed to add user to group');
      }
    }
  }

  // 5. Delete Invite (RLS policy allows users to delete invites sent to their email)
  const { error: deleteError } = await supabase.from('invites').delete().eq('id', inviteId);

  if (deleteError) {
    console.error('Error deleting invite:', deleteError);
    // Don't throw - the user was added successfully
  }

  return { success: true };
}

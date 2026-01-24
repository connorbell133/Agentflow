import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('[API/invites GET] Request received');

  try {
    const { userId, user } = await auth();

    console.log('[API/invites GET] Auth result:', {
      hasUserId: !!userId,
      hasUser: !!user,
      userId: userId?.substring(0, 10) + '...',
    });

    if (!userId) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const userEmail = user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: { message: 'User email not found' } }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Fetch user's invites
    const { data: invitesData, error: invitesError } = await supabase
      .from('invites')
      .select('*')
      .eq('invitee', userEmail);

    if (invitesError) {
      console.error('Error fetching invites:', invitesError);
      throw invitesError;
    }

    if (!invitesData || invitesData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Get unique group and org IDs, filtering out any falsy values
    const groupIds = Array.from(
      new Set(invitesData.map(i => i.group_id).filter(Boolean))
    ) as string[];
    const org_ids = Array.from(new Set(invitesData.map(i => i.org_id).filter(Boolean))) as string[];

    // Fetch groups and organizations in parallel
    const [groupsResult, orgsResult] = await Promise.all([
      groupIds.length > 0
        ? supabase.from('groups').select('*').in('id', groupIds)
        : { data: [], error: null },
      org_ids.length > 0
        ? supabase.from('organizations').select('*').in('id', org_ids)
        : { data: [], error: null },
    ]);

    if (groupsResult.error) {
      console.error('Error fetching groups:', groupsResult.error);
    }
    if (orgsResult.error) {
      console.error('Error fetching organizations:', orgsResult.error);
    }

    const groupsMap = new Map((groupsResult.data ?? []).map(g => [g.id, g]));
    const orgsMap = new Map((orgsResult.data ?? []).map(o => [o.id, o]));

    // Transform the data to match the expected format
    const formattedInvites = invitesData.map(invite => {
      const group = invite.group_id ? groupsMap.get(invite.group_id) : null;
      const org = orgsMap.get(invite.org_id);
      return {
        id: invite.id,
        created_at: invite.created_at,
        org_id: invite.org_id,
        invitee: invite.invitee,
        inviter: invite.inviter,
        groupId: invite.group_id,
        message: invite.message,
        group: group
          ? {
              id: group.id,
              role: group.role,
              description: group.description,
              org_id: group.org_id,
            }
          : undefined,
        organization: org
          ? {
              id: org.id,
              name: org.name,
              owner: org.owner,
              status: org.status,
            }
          : undefined,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedInvites,
    });
  } catch (error) {
    console.error('Error fetching invites:', error);
    return NextResponse.json({ error: { message: 'Failed to fetch invites' } }, { status: 500 });
  }
}

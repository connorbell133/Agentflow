import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt-verify';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('[API/user/groups GET] Request received');

  try {
    // Get auth context
    const authResult = await auth();
    let userId = authResult.userId;

    console.log('[API/user/groups GET] Auth result:', {
      hasUserId: !!userId,
      userId: userId?.substring(0, 10) + '...',
    });

    // Try JWT verification if no Clerk auth
    if (!userId) {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        userId = await verifyJWT(authHeader);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();

    // Fetch user's groups with organization details using Supabase
    const { data: groupMapData, error: groupMapError } = await supabase
      .from('group_map')
      .select('group_id, org_id')
      .eq('user_id', userId);

    if (groupMapError) {
      console.error('Error fetching group_map:', groupMapError);
      throw groupMapError;
    }

    if (!groupMapData || groupMapData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const groupIds = groupMapData.map(gm => gm.group_id);
    const org_ids = Array.from(new Set(groupMapData.map(gm => gm.org_id)));

    // Fetch groups and organizations in parallel
    const [groupsResult, orgsResult] = await Promise.all([
      supabase.from('groups').select('*').in('id', groupIds),
      supabase.from('organizations').select('*').in('id', org_ids),
    ]);

    if (groupsResult.error) {
      console.error('Error fetching groups:', groupsResult.error);
      throw groupsResult.error;
    }
    if (orgsResult.error) {
      console.error('Error fetching organizations:', orgsResult.error);
      throw orgsResult.error;
    }

    const groupsMap = new Map((groupsResult.data ?? []).map(g => [g.id, g]));
    const orgsMap = new Map((orgsResult.data ?? []).map(o => [o.id, o]));

    // Transform the data to match the expected format
    const formattedGroups = groupMapData
      .map(gm => {
        const group = groupsMap.get(gm.group_id);
        const org = orgsMap.get(gm.org_id);
        return {
          id: group?.id,
          role: group?.role,
          description: group?.description,
          org_id: group?.org_id,
          created_at: group?.created_at,
          organization: org
            ? {
                id: org.id,
                name: org.name,
                owner: org.owner,
                status: org.status,
              }
            : undefined,
        };
      })
      .filter(g => g.id); // Filter out any groups that weren't found

    return NextResponse.json({
      success: true,
      data: formattedGroups,
    });
  } catch (error) {
    console.error('Error fetching user groups:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch user groups' } },
      { status: 500 }
    );
  }
}

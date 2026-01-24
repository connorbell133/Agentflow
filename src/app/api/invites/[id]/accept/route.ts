import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { removeInvite } from '@/actions/organization/invites';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const inviteId = params.id;
    const supabase = await createSupabaseServerClient();

    // Get the invite details
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('id', inviteId)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: { message: 'Invite not found' } }, { status: 404 });
    }

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
    }

    // Add user to the group if groupId exists
    if (invite.group_id) {
      const { error: groupMapError } = await supabase.from('group_map').insert({
        user_id: userId,
        group_id: invite.group_id,
        org_id: invite.org_id,
      });

      if (groupMapError) {
        console.error('Error adding user to group:', groupMapError);
        return NextResponse.json(
          { error: { message: 'Failed to add user to group' } },
          { status: 500 }
        );
      }
    }

    // Remove the invite after accepting
    await removeInvite(inviteId);

    return NextResponse.json({
      success: true,
      message: 'Invite accepted successfully',
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json({ error: { message: 'Failed to accept invite' } }, { status: 500 });
  }
}

// Handle DELETE request for declining invites
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const inviteId = params.id;

    // Remove the invite
    await removeInvite(inviteId);

    return NextResponse.json({
      success: true,
      message: 'Invite declined successfully',
    });
  } catch (error) {
    console.error('Error declining invite:', error);
    return NextResponse.json({ error: { message: 'Failed to decline invite' } }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const groupId = params.id;
    const authResult = await auth();
    const userId = authResult.userId;

    if (!userId) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();

    // Remove user from the group
    const { data: result, error } = await supabase
      .from('group_map')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Error leaving group:', error);
      throw error;
    }

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: { message: 'User not found in this group' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully left the group',
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    return NextResponse.json({ error: { message: 'Failed to leave group' } }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt-verify';
import { getTenantContext } from '@/lib/db/tenant-context';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<any>> {
  try {
    // Authenticate user
    const authResult = await auth();
    let userId = authResult.userId;

    // If no userId from Clerk auth, try JWT verification (for external clients like React Native)
    if (!userId) {
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        userId = await verifyJWT(authHeader);
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tenant context to verify org access
    const tenantContext = await getTenantContext();
    const conversationId = params.id;

    // Create Supabase client
    const supabase = await createSupabaseServerClient();

    // Verify conversation access by checking if conversation exists and belongs to user's org
    if (tenantContext.org_id) {
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id, org_id')
        .eq('id', conversationId)
        .eq('org_id', tenantContext.org_id)
        .single();

      if (convError || !conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
    } else {
      // If user has no org, check if conversation belongs to them directly
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id, user')
        .eq('id', conversationId)
        .eq('user', userId)
        .single();

      if (convError || !conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
    }

    // Fetch all messages for the conversation
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.json(messages ?? []);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
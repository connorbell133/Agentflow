import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { addMessage } from '@/actions/chat/conversations';
import { z } from 'zod';

const messageSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
  content: z.string().nullable().optional(),
  conversationId: z.string().uuid(),
  role: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Get userId from Better-Auth
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = messageSchema.parse(body);

    // Transform to snake_case for Supabase and handle nullable fields
    const messageData = {
      id: validated.id,
      conversation_id: validated.conversationId,
      created_at: validated.created_at,
      content: validated.content ?? null,
      role: validated.role ?? null,
      metadata: null,
      parts: null,
      ai_sdk_id: null,
    };

    const result = await addMessage(messageData);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', issues: error.issues },
        { status: 400 }
      );
    }

    console.error('Error adding message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

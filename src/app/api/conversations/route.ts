import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getConversations, createConvo } from '@/actions/chat/conversations';
import { z } from 'zod';
import { verifyJWT } from '@/lib/auth/jwt-verify';

const createConversationSchema = z.object({
  id: z.string().uuid(),
  user: z.string(),
  created_at: z.string(),
  model: z.string().uuid().nullable().optional(),
  org_id: z.string().uuid(),
  title: z.string(),
});

export async function GET(req: NextRequest) {
  console.log('[API/conversations GET] Request received');
  console.log('[API/conversations GET] Headers:', {
    authorization: req.headers.get('authorization')?.substring(0, 30) + '...',
    'content-type': req.headers.get('content-type'),
    origin: req.headers.get('origin'),
    referer: req.headers.get('referer')
  });

  try {
    // Try to get userId from Clerk auth (for same-domain requests)
    const authResult = await auth();
    let userId = authResult.userId;

    console.log('[API/conversations GET] Clerk auth result:', {
      hasUserId: !!userId,
      userId: userId?.substring(0, 10) + '...',
      sessionId: authResult.sessionId,
      orgId: authResult.orgId
    });

    // If no userId from Clerk auth, try JWT verification (for external clients like React Native)
    if (!userId) {
      const authHeader = req.headers.get('authorization');
      console.log('[API/conversations GET] No Clerk userId, checking JWT auth header:', {
        hasAuthHeader: !!authHeader,
        authHeaderLength: authHeader?.length
      });

      if (authHeader) {
        userId = await verifyJWT(authHeader);
        console.log('[API/conversations GET] JWT verification result:', {
          hasUserId: !!userId,
          userId: userId?.substring(0, 10) + '...'
        });
      }
    }

    if (!userId) {
      console.error('[API/conversations GET] No valid authentication found - returning 401');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await getConversations(userId);

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Try to get userId from Clerk auth (for same-domain requests)
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

    const body = await req.json();
    const validated = createConversationSchema.parse(body);

    // Transform undefined to null for the model field
    const conversationData = {
      ...validated,
      model: validated.model ?? null
    };

    const result = await createConvo(conversationData);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', issues: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
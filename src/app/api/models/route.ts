import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getModelsForUser } from '@/actions/chat/models-optimized';
import { verifyJWT } from '@/lib/auth/jwt-verify';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  console.log('[API/models GET] Request received');
  console.log('[API/models GET] Headers:', {
    authorization: req.headers.get('authorization')?.substring(0, 30) + '...',
    'content-type': req.headers.get('content-type'),
    origin: req.headers.get('origin'),
  });

  try {
    // Try to get userId from Clerk auth (for same-domain requests)
    const authResult = await auth();
    let userId = authResult.userId;

    console.log('[API/models GET] Clerk auth result:', {
      hasUserId: !!userId,
      userId: userId?.substring(0, 10) + '...',
    });

    // If no userId from Clerk auth, try JWT verification (for external clients like React Native)
    if (!userId) {
      const authHeader = req.headers.get('authorization');
      console.log('[API/models GET] No Clerk userId, checking JWT auth header:', {
        hasAuthHeader: !!authHeader,
      });

      if (authHeader) {
        userId = await verifyJWT(authHeader);
        console.log('[API/models GET] JWT verification result:', {
          hasUserId: !!userId,
          userId: userId?.substring(0, 10) + '...',
        });
      }
    }

    if (!userId) {
      console.error('[API/models GET] No valid authentication found - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const models = await getModelsForUser(userId);

    return NextResponse.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

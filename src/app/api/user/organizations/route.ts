import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getOrgsForUser } from '@/actions/organization/organizations';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('[API/user/organizations GET] Request received');
  console.log('[API/user/organizations GET] Headers:', {
    authorization: request.headers.get('authorization')?.substring(0, 30) + '...',
    origin: request.headers.get('origin'),
  });

  try {
    // Try to get userId from Clerk auth (for same-domain requests)
    const authResult = await auth();
    let userId = authResult.userId;

    console.log('[API/user/organizations GET] Clerk auth result:', {
      hasUserId: !!userId,
      userId: userId?.substring(0, 10) + '...',
    });

    if (!userId) {
      console.error('[API/user/organizations GET] No valid authentication found - returning 401');
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
    }

    // Use the existing getOrgsForUser function
    const organizations = await getOrgsForUser(userId);

    return NextResponse.json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    console.error('Error fetching user organizations:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch user organizations' } },
      { status: 500 }
    );
  }
}

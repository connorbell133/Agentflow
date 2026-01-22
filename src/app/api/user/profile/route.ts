import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/actions/auth/users';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const profileData = await getUserProfile(userId);

    if (!profileData || profileData.length === 0) {
      return NextResponse.json({ email: userId, fullName: null }, { status: 200 });
    }

    const profile = profileData[0];
    return NextResponse.json({
      email: profile.email || userId,
      fullName: profile.full_name || null,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/permissions';

export async function POST(req: Request) {
  try {
    const { userId, org_id } = await auth();

    // Check admin permissions
    await requireAdmin(userId, org_id ?? null);

    // Your existing logic here
    const body = await req.json();
    // ... rest of implementation

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.error('[Admin API Error]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

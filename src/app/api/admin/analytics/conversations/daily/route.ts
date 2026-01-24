import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { validateDateRange, validateorg_id } from '@/lib/db/query-validator';
import { z } from 'zod';

// Query parameters schema
const querySchema = z.object({
  org_id: z.string().uuid('Invalid organization ID'),
  days: z.coerce.number().min(1).max(365).default(90).optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authResult = await auth();
  if (!authResult.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // Validate query parameters
  const validation = querySchema.safeParse({
    org_id: searchParams.get('org_id'),
    days: searchParams.get('days') || undefined,
  });

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        issues: validation.error.issues,
      },
      { status: 400 }
    );
  }

  const { org_id, days = 90 } = validation.data;

  // Additional validation using validator functions
  let validatedorg_id: string;
  let validatedDays: number;

  try {
    validatedorg_id = validateorg_id(org_id);
    validatedDays = validateDateRange(days);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid parameters' },
      { status: 400 }
    );
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startWindow = new Date(startOfToday);
  startWindow.setDate(startWindow.getDate() - validatedDays);
  const startIso = startWindow.toISOString();

  try {
    const supabase = await createSupabaseServerClient();

    // Fetch conversations within the date range
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('created_at')
      .eq('org_id', validatedorg_id)
      .gte('created_at', startIso)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching conversations for analytics:', error);
      throw error;
    }

    // Group by date in JavaScript
    const dateCountMap = new Map<string, number>();

    for (const conv of conversations ?? []) {
      const date = new Date(conv.created_at);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      dateCountMap.set(dateStr, (dateCountMap.get(dateStr) ?? 0) + 1);
    }

    // Convert to sorted array
    const rows = Array.from(dateCountMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log('[Analytics API] Query results:', {
      org_id: validatedorg_id,
      days: validatedDays,
      startWindow: startWindow.toISOString(),
      rowCount: rows.length,
    });

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

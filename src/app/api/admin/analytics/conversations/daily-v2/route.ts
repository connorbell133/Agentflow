import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { validateDateRange, validateorg_id } from '@/lib/db/query-validator'
import { z } from 'zod'

// Query parameters schema
const querySchema = z.object({
    org_id: z.string().uuid('Invalid organization ID'),
    days: z.coerce.number().min(1).max(365).default(90).optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const authResult = await auth();
        if (!authResult.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url)

        // Validate query parameters
        const validation = querySchema.safeParse({
            org_id: searchParams.get('org_id'),
            days: searchParams.get('days') || undefined,
        });

        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    issues: validation.error.issues
                },
                { status: 400 }
            );
        }

        const { org_id, days = 90 } = validation.data;

        // Additional validation using validator functions
        let validatedorg_id: string
        let validatedDays: number

        try {
            validatedorg_id = validateorg_id(org_id)
            validatedDays = validateDateRange(days)
        } catch (error) {
            return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid parameters' }, { status: 400 })
        }

        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const startWindow = new Date(startOfToday)
        startWindow.setDate(startWindow.getDate() - validatedDays)
        const startIso = startWindow.toISOString()

        const supabase = await createSupabaseServerClient();

        // Fetch conversations within the date range
        const { data: conversations, error } = await supabase
            .from('conversations')
            .select('created_at')
            .eq('org_id', validatedorg_id)
            .gte('created_at', startIso)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching conversations for analytics:", error);
            throw error;
        }

        // Group by date in JavaScript with debug info
        const dateCountMap = new Map<string, { count: number; minTimestamp: string; maxTimestamp: string }>();

        for (const conv of conversations ?? []) {
            if (!conv.created_at) continue; // Skip records without created_at
            const dateStr = conv.created_at.split('T')[0]; // YYYY-MM-DD
            const existing = dateCountMap.get(dateStr);
            if (existing) {
                existing.count++;
                if (conv.created_at < existing.minTimestamp) existing.minTimestamp = conv.created_at;
                if (conv.created_at > existing.maxTimestamp) existing.maxTimestamp = conv.created_at;
            } else {
                dateCountMap.set(dateStr, {
                    count: 1,
                    minTimestamp: conv.created_at,
                    maxTimestamp: conv.created_at
                });
            }
        }

        // Convert to sorted array with debug info
        const debugRows = Array.from(dateCountMap.entries())
            .map(([date, data]) => ({
                date,
                dateAlt1: date,
                dateAlt2: date,
                count: data.count,
                minTimestamp: data.minTimestamp,
                maxTimestamp: data.maxTimestamp
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Transform to standard format
        const standardRows = debugRows.map(row => ({
            date: row.date,
            count: row.count
        }));

        console.log('[Analytics API V2] Query results:', {
            org_id: validatedorg_id,
            days: validatedDays,
            startWindow: startWindow.toISOString(),
            rowCount: standardRows.length,
        })

        return NextResponse.json({ data: standardRows, debug: debugRows })
    } catch (error) {
        console.error('Analytics V2 error:', error)

        if (error instanceof Error) {
            if (error.message.includes('Unauthorized')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            if (error.message.includes('Forbidden')) {
                return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
            }
        }

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

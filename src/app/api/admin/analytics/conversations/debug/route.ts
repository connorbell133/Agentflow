import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest): Promise<NextResponse> {
    const authResult = await auth();
    if (!authResult.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')

    if (!org_id) {
        return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

    try {
        const supabase = await createSupabaseServerClient();

        // Get raw conversation data with timestamps
        const { data: rawData, error: rawError } = await supabase
            .from('conversations')
            .select('id, created_at')
            .eq('org_id', org_id)
            .order('created_at', { ascending: true })
            .limit(20);

        if (rawError) {
            throw rawError;
        }

        // Transform raw data to include formatted dates
        const formattedRawData = (rawData ?? []).map(conv => ({
            id: conv.id,
            created_at: conv.created_at,
            dateOnly: conv.created_at.split('T')[0],
            formatted: new Date(conv.created_at).toISOString()
        }));

        // Group conversations by date
        const dateCountMap = new Map<string, { count: number; minTime: string; maxTime: string }>();

        const { data: allConversations, error: allError } = await supabase
            .from('conversations')
            .select('created_at')
            .eq('org_id', org_id)
            .order('created_at', { ascending: true });

        if (allError) {
            throw allError;
        }

        for (const conv of allConversations ?? []) {
            const dateStr = conv.created_at.split('T')[0];
            const existing = dateCountMap.get(dateStr);
            if (existing) {
                existing.count++;
                if (conv.created_at < existing.minTime) existing.minTime = conv.created_at;
                if (conv.created_at > existing.maxTime) existing.maxTime = conv.created_at;
            } else {
                dateCountMap.set(dateStr, {
                    count: 1,
                    minTime: conv.created_at,
                    maxTime: conv.created_at
                });
            }
        }

        const groupedData = Array.from(dateCountMap.entries())
            .map(([date, data]) => ({
                date,
                count: data.count,
                minTime: data.minTime,
                maxTime: data.maxTime
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({
            rawSamples: formattedRawData,
            grouped: groupedData,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
    } catch (error) {
        console.error('Analytics debug error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

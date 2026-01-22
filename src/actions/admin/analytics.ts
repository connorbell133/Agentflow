"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/core/cache";
import { validateDateRange, validateorg_id } from "@/lib/db/query-validator";
import { withQueryTracking } from "@/utils/helpers/query";

export interface DailyCount {
    date: string; // YYYY-MM-DD
    count: number;
}

export async function getOrgConversationDailyCounts(
    org_id: string,
    days: number = 90
): Promise<DailyCount[]> {
    // Validate inputs
    const validatedorg_id = validateorg_id(org_id);
    const validatedDays = validateDateRange(days);

    return withCache(
        `analytics:org:${validatedorg_id}:daily_counts:${validatedDays}`,
        () =>
            withQueryTracking("getOrgConversationDailyCounts", async () => {
                const supabase = await createSupabaseServerClient();

                const now = new Date();
                // Start from the beginning of today to avoid TZ issues
                const startOfToday = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate()
                );
                const startWindow = new Date(startOfToday);
                startWindow.setDate(startWindow.getDate() - validatedDays);

                const startIso = startWindow.toISOString();

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

                // Group by date in JavaScript
                const dateCountMap = new Map<string, number>();

                for (const conv of conversations ?? []) {
                    const date = new Date(conv.created_at);
                    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
                    dateCountMap.set(dateStr, (dateCountMap.get(dateStr) ?? 0) + 1);
                }

                // Convert to sorted array
                const rows: DailyCount[] = Array.from(dateCountMap.entries())
                    .map(([date, count]) => ({ date, count }))
                    .sort((a, b) => a.date.localeCompare(b.date));

                return rows;
            }),
        2 * 60 * 1000 // 2 minutes TTL
    );
}

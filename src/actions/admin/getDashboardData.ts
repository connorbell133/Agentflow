"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/core/cache";
import { withQueryTracking } from "@/utils/helpers/query";
import { createLogger } from "@/lib/infrastructure/logger";

const logger = createLogger("getDashboardData");

export interface DashboardStats {
  userCount: number;
  groupCount: number;
  modelCount: number;
  conversationCount: number;
}

/**
 * Optimized query to fetch all dashboard statistics
 * Uses parallel Supabase queries for best performance
 */
export async function getDashboardData(org_id: string): Promise<DashboardStats> {
  return withCache(
    `dashboard:stats:${org_id}`,
    () =>
      withQueryTracking("getDashboardData", async () => {
        try {
          const supabase = await createSupabaseServerClient();

          // Run all count queries in parallel
          const [usersResult, groupsResult, modelsResult, conversationsResult] = await Promise.all([
            supabase
              .from('org_map')
              .select('user_id', { count: 'exact', head: true })
              .eq('org_id', org_id),
            supabase
              .from('groups')
              .select('id', { count: 'exact', head: true })
              .eq('org_id', org_id),
            supabase
              .from('models')
              .select('id', { count: 'exact', head: true })
              .eq('org_id', org_id),
            supabase
              .from('conversations')
              .select('id', { count: 'exact', head: true })
              .eq('org_id', org_id),
          ]);

          // Check for errors in count queries
          const countResults = [
            ['users', usersResult],
            ['groups', groupsResult],
            ['models', modelsResult],
            ['conversations', conversationsResult],
          ] as const;

          for (const [label, result] of countResults) {
            if (result.error) {
              logger.error(`Supabase error fetching ${label} count`, {
                org_id,
                error: result.error,
              });
              throw result.error;
            }
          }

          return {
            userCount: usersResult.count ?? 0,
            groupCount: groupsResult.count ?? 0,
            modelCount: modelsResult.count ?? 0,
            conversationCount: conversationsResult.count ?? 0,
          };
        } catch (error) {
          logger.error("Failed to fetch dashboard data", { error, org_id });
          throw error;
        }
      }),
    2 * 60 * 1000 // 2 minutes cache for more responsive dashboard
  );
}

/**
 * Get dashboard data with user activity metrics
 * Combines basic stats with activity information
 */
export async function getDashboardDataWithActivity(org_id: string) {
  return withCache(
    `dashboard:full:${org_id}`,
    () =>
      withQueryTracking("getDashboardDataWithActivity", async () => {
        try {
          // Parallel fetch of basic stats and activity data
          const [stats, activityData] = await Promise.all([
            getDashboardData(org_id),
            getOrgActivityMetrics(org_id),
          ]);

          return {
            ...stats,
            ...activityData,
          };
        } catch (error) {
          logger.error("Failed to fetch dashboard data with activity", { error, org_id });
          throw error;
        }
      }),
    1 * 60 * 1000 // 1 minute cache for activity metrics
  );
}

/**
 * Get organization activity metrics
 */
async function getOrgActivityMetrics(org_id: string) {
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Run all activity queries in parallel
  const [
    activeUsers7dResult,
    activeUsers30dResult,
    newConversationsTodayResult,
    orgConversationsResult,
  ] = await Promise.all([
    // Active users in last 7 days - get users from conversations
    supabase
      .from('conversations')
      .select('user')
      .eq('org_id', org_id)
      .gte('created_at', sevenDaysAgo.toISOString()),

    // Active users in last 30 days
    supabase
      .from('conversations')
      .select('user')
      .eq('org_id', org_id)
      .gte('created_at', thirtyDaysAgo.toISOString()),

    // New conversations today
    supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org_id)
      .gte('created_at', startOfToday.toISOString()),

    // Get conversation IDs for message counting
    supabase
      .from('conversations')
      .select('id')
      .eq('org_id', org_id),
  ]);

  // Check for errors in activity queries
  const activityResults = [
    ['activeUsers7d', activeUsers7dResult],
    ['activeUsers30d', activeUsers30dResult],
    ['newConversationsToday', newConversationsTodayResult],
    ['orgConversations', orgConversationsResult],
  ] as const;

  for (const [label, result] of activityResults) {
    if (result.error) {
      logger.error(`Supabase error fetching ${label}`, { org_id, error: result.error });
      throw result.error;
    }
  }

  // Calculate distinct active users, filtering out null/undefined
  const activeUsers7d = new Set((activeUsers7dResult.data ?? []).map(c => c.user).filter(Boolean)).size;
  const activeUsers30d = new Set((activeUsers30dResult.data ?? []).map(c => c.user).filter(Boolean)).size;

  // Get messages count for today from conversations in this org
  let totalMessagesToday = 0;
  if (orgConversationsResult.data && orgConversationsResult.data.length > 0) {
    const conversationIds = orgConversationsResult.data.map(c => c.id);
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .gte('created_at', startOfToday.toISOString());
    totalMessagesToday = count ?? 0;
  }

  return {
    activeUsers7Days: activeUsers7d,
    activeUsers30Days: activeUsers30d,
    newConversationsToday: newConversationsTodayResult.count ?? 0,
    totalMessagesToday,
  };
}

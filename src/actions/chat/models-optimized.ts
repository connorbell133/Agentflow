"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/core/cache";
import { withQueryTracking } from "@/utils/helpers/query";
import { createLogger } from "@/lib/infrastructure/logger";
import type { Model } from "@/lib/supabase/types";

const logger = createLogger("models-optimized");

/**
 * Optimized query to fetch all models accessible to a user in a single database round trip
 * This replaces the 3-query pattern: getUserGroups → getGroupModels → getModelsDetails
 */
export async function getModelsForUser(userId: string): Promise<Model[]> {
  return withCache(
    `models:user:${userId}`,
    () =>
      withQueryTracking("getModelsForUser", async () => {
        try {
          const supabase = await createSupabaseServerClient();

          // Get all groups the user belongs to
          const { data: userGroups, error: groupError } = await supabase
            .from('group_map')
            .select('group_id, org_id')
            .eq('user_id', userId);

          if (groupError) {
            logger.error("Failed to fetch user groups", { error: groupError, userId });
            throw groupError;
          }

          if (!userGroups || userGroups.length === 0) {
            logger.info(`No groups found for user ${userId}`);
            return [];
          }

          const groupIds = userGroups.map(g => g.group_id);

          // Get all model mappings for these groups
          const { data: modelMappings, error: mappingError } = await supabase
            .from('model_map')
            .select('model_id')
            .in('group_id', groupIds);

          if (mappingError) {
            logger.error("Failed to fetch model mappings", { error: mappingError, userId });
            throw mappingError;
          }

          if (!modelMappings || modelMappings.length === 0) {
            logger.info(`No models mapped to user's groups for user ${userId}`);
            return [];
          }

          const model_ids = Array.from(new Set(modelMappings.map(m => m.model_id)));

          // Fetch the actual models
          const { data: models, error: modelsError } = await supabase
            .from('models')
            .select('*')
            .in('id', model_ids);

          if (modelsError) {
            logger.error("Failed to fetch models", { error: modelsError, userId });
            throw modelsError;
          }

          logger.info(`Found ${models?.length ?? 0} models for user ${userId}`);
          return (models ?? []) as Model[];
        } catch (error) {
          logger.error("Failed to fetch models for user", { error, userId });
          throw error;
        }
      }),
    5 * 60 * 1000 // 5 minutes cache
  );
}

/**
 * Get models for a specific organization with user access check
 */
export async function getModelsForUserInOrg(userId: string, org_id: string): Promise<Model[]> {
  return withCache(
    `models:user:${userId}:org:${org_id}`,
    () =>
      withQueryTracking("getModelsForUserInOrg", async () => {
        try {
          const supabase = await createSupabaseServerClient();

          // Get user's groups in this org
          const { data: userGroups, error: groupError } = await supabase
            .from('group_map')
            .select('group_id')
            .eq('user_id', userId)
            .eq('org_id', org_id);

          if (groupError) {
            logger.error("Failed to fetch user groups in org", { error: groupError, userId, org_id });
            throw groupError;
          }

          if (!userGroups || userGroups.length === 0) {
            return [];
          }

          const groupIds = userGroups.map(g => g.group_id);

          // Get model mappings for these groups
          const { data: modelMappings, error: mappingError } = await supabase
            .from('model_map')
            .select('model_id')
            .in('group_id', groupIds)
            .eq('org_id', org_id);

          if (mappingError) {
            logger.error("Failed to fetch model mappings in org", { error: mappingError, userId, org_id });
            throw mappingError;
          }

          if (!modelMappings || modelMappings.length === 0) {
            return [];
          }

          const model_ids = Array.from(new Set(modelMappings.map(m => m.model_id)));

          // Fetch the models
          const { data: models, error: modelsError } = await supabase
            .from('models')
            .select('*')
            .in('id', model_ids)
            .eq('org_id', org_id);

          if (modelsError) {
            logger.error("Failed to fetch models in org", { error: modelsError, userId, org_id });
            throw modelsError;
          }

          return (models ?? []) as Model[];
        } catch (error) {
          logger.error("Failed to fetch models for user in org", { error, userId, org_id });
          throw error;
        }
      }),
    5 * 60 * 1000 // 5 minutes cache
  );
}

/**
 * Batch fetch models by IDs (for when you already know which models to fetch)
 */
export async function getModelsByIds(model_ids: string[]): Promise<Model[]> {
  if (model_ids.length === 0) return [];

  const cacheKey = `models:batch:${model_ids.sort().join(',')}`;

  return withCache(
    cacheKey,
    () =>
      withQueryTracking("getModelsByIds", async () => {
        try {
          const supabase = await createSupabaseServerClient();

          const { data, error } = await supabase
            .from('models')
            .select('*')
            .in('id', model_ids);

          if (error) {
            logger.error("Failed to fetch models by IDs", { error, model_ids });
            throw error;
          }

          return (data ?? []) as Model[];
        } catch (error) {
          logger.error("Failed to fetch models by IDs", { error, model_ids });
          throw error;
        }
      }),
    10 * 60 * 1000 // 10 minutes cache for batch fetches
  );
}

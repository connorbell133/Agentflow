'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTenantDb } from '@/lib/db/tenant-db';
import { withQueryTracking } from '@/utils/helpers/query';
import { withCache, queryCache } from '@/lib/core/cache';
import { PaginationParams } from '@/lib/core/pagination';
import { createLogger } from '@/lib/infrastructure/logger';
import type { Model, ModelMap, GroupMap } from '@/lib/supabase/types';

const logger = createLogger('models-actions');

// Type for message format config
export interface message_format_config {
  mapping?: {
    role?: { source: string; target: string; transform: string };
    content?: { source: string; target: string; transform: string };
  };
}

export async function getUserGroups(userId: string): Promise<GroupMap[]> {
  return withCache(
    `user:groups:${userId}`,
    () =>
      withQueryTracking('getUserGroups', async () => {
        const supabase = await createSupabaseServerClient();

        const { data, error } = await supabase.from('group_map').select('*').eq('user_id', userId);

        if (error) {
          console.error('Error fetching user groups:', error);
          return [];
        }

        return data ?? [];
      }),
    3 * 60 * 1000 // 3 minutes TTL
  );
}

export async function getGroupModels(groupIds: string[]): Promise<ModelMap[]> {
  if (groupIds.length === 0) return [];

  const cacheKey = `groups:models:${groupIds.sort().join(',')}`;
  return withCache(
    cacheKey,
    () =>
      withQueryTracking('getGroupModels', async () => {
        const supabase = await createSupabaseServerClient();

        const { data, error } = await supabase
          .from('model_map')
          .select('*')
          .in('group_id', groupIds);

        if (error) {
          console.error('Error fetching group models:', error);
          return [];
        }

        return data ?? [];
      }),
    3 * 60 * 1000 // 3 minutes TTL
  );
}

export async function getModelsDetails(model_ids: string[]): Promise<Model[]> {
  if (model_ids.length === 0) return [];

  const cacheKey = `models:details:${model_ids.sort().join(',')}`;
  return withCache(
    cacheKey,
    () =>
      withQueryTracking('getModelsDetails', async () => {
        const supabase = await createSupabaseServerClient();

        const { data, error } = await supabase.from('models').select('*').in('id', model_ids);

        if (error) {
          console.error('Error fetching model details:', error);
          return [];
        }

        return data ?? [];
      }),
    5 * 60 * 1000 // 5 minutes TTL for model details
  );
}

export async function getOrgModels(
  org_id: string,
  params: PaginationParams = { page: 1, limit: 50 }
): Promise<Model[]> {
  return withCache(
    `org:models:${org_id}:${params.page}:${params.limit}`,
    () =>
      withQueryTracking('getOrgModels', async () => {
        const supabase = await createSupabaseServerClient();

        const { data, error } = await supabase
          .from('models')
          .select('*')
          .eq('org_id', org_id)
          .range((params.page - 1) * params.limit, params.page * params.limit - 1);

        if (error) {
          console.error('Error fetching org models:', error);
          return [];
        }

        return data ?? [];
      }),
    3 * 60 * 1000 // 3 minutes TTL
  );
}

// Get all org models without pagination (for dropdowns, etc.)
export async function getAllOrgModels(org_id: string): Promise<Model[]> {
  return withCache(
    `org:models:all:${org_id}`,
    () =>
      withQueryTracking('getAllOrgModels', async () => {
        const tenantDb = await getTenantDb();
        return tenantDb.models.findMany();
      }),
    3 * 60 * 1000 // 3 minutes TTL
  );
}

export async function addModel(model: Partial<Model> & { org_id?: string }) {
  return withQueryTracking('addModel', async () => {
    const tenantDb = await getTenantDb();

    // Remove org_id from input - it will be auto-injected by tenant db
    const { org_id: _inputOrgId, ...modelData } = model;

    const data = await tenantDb.models.create({
      ...modelData,
      suggestion_prompts: model.suggestion_prompts || null,
    });

    // Invalidate related cache entries
    const org_id = tenantDb.context.org_id;
    if (org_id) {
      queryCache.invalidate(`org:models:${org_id}`);
      queryCache.invalidate(`org:models:all:${org_id}`);
    }

    logger.info('Model added successfully', { model_id: data[0]?.id });
    return data;
  });
}

export async function updateModel(model: Model) {
  return withQueryTracking('updateModel', async () => {
    logger.info('Updating model', { model_id: model.id, model: model.nice_name || model.id });

    const tenantDb = await getTenantDb();

    const data = await tenantDb.models.update(model.id, {
      nice_name: model.nice_name,
      schema: model.schema,
      description: model.description,
      endpoint: (model as any)?.endpoint ?? '',
      method: (model as any)?.method ?? 'POST',
      response_path: model.response_path,
      model_id: model.model_id,
      headers: model.headers,
      body_config: model.body_config,
      message_format_config: model.message_format_config,
      suggestion_prompts: model.suggestion_prompts || null,
      // AI SDK 6 Routing fields
      endpoint_type: (model as any)?.endpoint_type,
      stream_config: (model as any)?.stream_config,
      // Template Tracking fields (commented out until database migration)
      // template_id: (model as any)?.template_id,
      // template_modified_fields: (model as any)?.template_modified_fields,
      // template_mode: (model as any)?.template_mode,
    });

    // Invalidate related cache entries
    const org_id = tenantDb.context.org_id;
    if (org_id) {
      queryCache.invalidate(`org:models:${org_id}`);
      queryCache.invalidate(`org:models:all:${org_id}`);
    }
    queryCache.invalidate(`models:details:${model.id}`);

    logger.info('Model updated successfully', { model_id: model.id });
    return data;
  });
}

// Delete model function with cache invalidation
export async function deleteModel(model_id: string, org_id: string) {
  return withQueryTracking('deleteModel', async () => {
    const tenantDb = await getTenantDb();
    const supabase = await createSupabaseServerClient();

    // First, delete all model_map entries that reference this model
    // This is necessary because the foreign key constraint doesn't have CASCADE
    const { error: mapError } = await supabase
      .from('model_map')
      .delete()
      .eq('model_id', model_id)
      .eq('org_id', org_id);

    if (mapError) {
      logger.error('Error deleting model_map entries:', mapError);
      throw mapError;
    }

    // Now delete the model itself
    await tenantDb.models.delete(model_id);

    // Invalidate related cache entries
    queryCache.invalidate(`org:models:${org_id}`);
    queryCache.invalidate(`org:models:all:${org_id}`);
    queryCache.invalidate(`models:details:${model_id}`);

    logger.info('Model deleted successfully', { model_id });
    return [{ id: model_id }];
  });
}

export async function getAllModelGroups(org_id: string): Promise<ModelMap[]> {
  const supabase = await createSupabaseServerClient();

  // First verify the organization exists and user has access
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', org_id)
    .single();

  if (orgError || !org) {
    throw new Error('Organization not found or access denied');
  }

  const { data, error } = await supabase.from('model_map').select('*').eq('org_id', org_id);

  if (error) {
    console.error('Error fetching model groups:', error);
    return [];
  }

  return data ?? [];
}

// Moved from services/model/data.ts
export async function getModelData(model_id: string): Promise<Model> {
  const tenantDb = await getTenantDb();
  return tenantDb.models.findById(model_id);
}

// Moved from services/model/data.ts
export async function getModelApiKey(model_id: string): Promise<string> {
  const tenantDb = await getTenantDb();

  // First verify the model exists and user has access
  await tenantDb.models.findById(model_id);

  // Use raw client for model_keys (no RLS on this table)
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('model_keys')
    .select('key')
    .eq('model_id', model_id)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching model API key:', error);
    return '';
  }

  return data?.key || '';
}

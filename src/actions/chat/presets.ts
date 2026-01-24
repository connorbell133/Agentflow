'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { auth } from '@/lib/auth/server';
import { withCache, queryCache } from '@/lib/core/cache';
import { withQueryTracking } from '@/utils/helpers/query';
import { createLogger } from '@/lib/infrastructure/logger';
import { revalidatePath } from 'next/cache';
import type { ModelConfigPreset } from '@/types/event-mapping';

const logger = createLogger('presets-actions');

/**
 * Get all system presets (visible to all users)
 */
export async function getSystemPresets(): Promise<ModelConfigPreset[]> {
  return withCache(
    'system:presets',
    () =>
      withQueryTracking('getSystemPresets', async () => {
        const supabase = await createSupabaseServerClient();

        const { data, error } = await supabase
          .from('model_config_presets' as any)
          .select('*')
          .eq('is_system', true)
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (error) {
          logger.error('Error fetching system presets:', error);
          throw new Error('Failed to fetch system presets');
        }

        return (data ?? []) as unknown as ModelConfigPreset[];
      }),
    10 * 60 * 1000 // 10 minutes TTL (system presets rarely change)
  );
}

/**
 * Get organization-specific presets
 */
export async function getOrgPresets(org_id: string): Promise<ModelConfigPreset[]> {
  return withCache(
    `org:presets:${org_id}`,
    () =>
      withQueryTracking('getOrgPresets', async () => {
        const supabase = await createSupabaseServerClient();

        const { data, error } = await supabase
          .from('model_config_presets' as any)
          .select('*')
          .eq('is_system', false)
          .eq('org_id', org_id)
          .order('name', { ascending: true });

        if (error) {
          logger.error('Error fetching org presets:', { org_id, error });
          throw new Error('Failed to fetch organization presets');
        }

        return (data ?? []) as unknown as ModelConfigPreset[];
      }),
    3 * 60 * 1000 // 3 minutes TTL
  );
}

/**
 * Get all presets available to a user (system + org presets)
 */
export async function getAllAvailablePresets(org_id?: string): Promise<ModelConfigPreset[]> {
  const systemPresets = await getSystemPresets();

  if (!org_id) {
    return systemPresets;
  }

  const orgPresets = await getOrgPresets(org_id);
  return [...systemPresets, ...orgPresets];
}

/**
 * Get a single preset by ID
 */
export async function getPresetById(presetId: string): Promise<ModelConfigPreset | null> {
  return withQueryTracking('getPresetById', async () => {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('model_config_presets' as any)
      .select('*')
      .eq('id', presetId)
      .single();

    if (error) {
      logger.error('Error fetching preset:', { presetId, error });
      return null;
    }

    return data as unknown as any;
  });
}

/**
 * Create a new organization preset
 */
export async function createOrgPreset(preset: {
  name: string;
  description?: string;
  category: 'openai' | 'anthropic' | 'langchain' | 'custom';
  event_mappings: any;
  org_id: string;
}): Promise<ModelConfigPreset> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  return withQueryTracking('createOrgPreset', async () => {
    const supabase = await createSupabaseServerClient();

    // Verify user is org owner (RLS will also enforce this)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('owner')
      .eq('id', preset.org_id)
      .single();

    if (orgError || org?.owner !== userId) {
      throw new Error('Only organization owners can create presets');
    }

    const { data, error } = await supabase
      .from('model_config_presets' as any)
      .insert({
        name: preset.name,
        description: preset.description,
        category: preset.category,
        event_mappings: preset.event_mappings,
        is_system: false,
        org_id: preset.org_id,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating org preset:', { preset, error });
      throw new Error('Failed to create preset');
    }

    // Invalidate cache
    queryCache.invalidateExact(`org:presets:${preset.org_id}`);
    revalidatePath('/admin/models');

    logger.info('Created org preset:', { presetId: (data as any).id, org_id: preset.org_id });

    return data as unknown as any;
  });
}

/**
 * Update an organization preset
 */
export async function updateOrgPreset(
  presetId: string,
  updates: {
    name?: string;
    description?: string;
    category?: 'openai' | 'anthropic' | 'langchain' | 'custom';
    event_mappings?: any;
  }
): Promise<ModelConfigPreset> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  return withQueryTracking('updateOrgPreset', async () => {
    const supabase = await createSupabaseServerClient();

    // Get existing preset to verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('model_config_presets' as any)
      .select('*, organizations!inner(owner)')
      .eq('id', presetId)
      .single();

    if (fetchError || !existing) {
      throw new Error('Preset not found');
    }

    const preset = existing as any;

    if (preset.is_system) {
      throw new Error('Cannot update system presets');
    }

    if (preset.organizations?.owner !== userId) {
      throw new Error('Only organization owners can update presets');
    }

    const { data, error } = await supabase
      .from('model_config_presets' as any)
      .update(updates)
      .eq('id', presetId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating preset:', { presetId, error });
      throw new Error('Failed to update preset');
    }

    // Invalidate cache
    if (preset.org_id) {
      queryCache.invalidateExact(`org:presets:${preset.org_id}`);
    }
    revalidatePath('/admin/models');

    logger.info('Updated org preset:', { presetId });

    return data as unknown as any;
  });
}

/**
 * Delete an organization preset
 */
export async function deleteOrgPreset(presetId: string): Promise<void> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  return withQueryTracking('deleteOrgPreset', async () => {
    const supabase = await createSupabaseServerClient();

    // Get existing preset to verify ownership and get org_id for cache invalidation
    const { data: existing, error: fetchError } = await supabase
      .from('model_config_presets' as any)
      .select('*, organizations!inner(owner)')
      .eq('id', presetId)
      .single();

    if (fetchError || !existing) {
      throw new Error('Preset not found');
    }

    const preset = existing as any;

    if (preset.is_system) {
      throw new Error('Cannot delete system presets');
    }

    if (preset.organizations?.owner !== userId) {
      throw new Error('Only organization owners can delete presets');
    }

    const { error } = await supabase
      .from('model_config_presets' as any)
      .delete()
      .eq('id', presetId);

    if (error) {
      logger.error('Error deleting preset:', { presetId, error });
      throw new Error('Failed to delete preset');
    }

    // Invalidate cache
    if (preset.org_id) {
      queryCache.invalidateExact(`org:presets:${preset.org_id}`);
    }
    revalidatePath('/admin/models');

    logger.info('Deleted org preset:', { presetId });
  });
}

/**
 * Duplicate a preset (system or org) as a new org preset
 */
export async function duplicatePreset(
  sourcePresetId: string,
  targetOrgId: string,
  newName?: string
): Promise<ModelConfigPreset> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  return withQueryTracking('duplicatePreset', async () => {
    const supabase = await createSupabaseServerClient();

    // Get source preset
    const { data: source, error: fetchError } = await supabase
      .from('model_config_presets' as any)
      .select('*')
      .eq('id', sourcePresetId)
      .single();

    if (fetchError || !source) {
      throw new Error('Source preset not found');
    }

    const sourcePreset = source as any;

    // Verify user is org owner
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('owner')
      .eq('id', targetOrgId)
      .single();

    if (orgError || org?.owner !== userId) {
      throw new Error('Only organization owners can create presets');
    }

    // Create duplicate
    const { data, error } = await supabase
      .from('model_config_presets' as any)
      .insert({
        name: newName || `${sourcePreset.name} (Copy)`,
        description: sourcePreset.description,
        category: sourcePreset.category,
        event_mappings: sourcePreset.event_mappings,
        is_system: false,
        org_id: targetOrgId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error duplicating preset:', { sourcePresetId, targetOrgId, error });
      throw new Error('Failed to duplicate preset');
    }

    // Invalidate cache
    queryCache.invalidateExact(`org:presets:${targetOrgId}`);
    revalidatePath('/admin/models');

    logger.info('Duplicated preset:', { sourceId: sourcePresetId, newId: (data as any).id });

    return data as unknown as any;
  });
}

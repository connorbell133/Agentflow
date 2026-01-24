/**
 * Cleanup Manager
 *
 * Automatic cleanup system that uses ResourceTracker to delete all test data
 * after each test in the correct dependency order.
 *
 * Features:
 * - Respects foreign key constraints
 * - Handles cleanup failures gracefully
 * - Provides detailed cleanup reports
 * - Verifies cleanup completion
 *
 * Usage:
 *   const manager = new CleanupManager(supabaseClient, resourceTracker);
 *   await manager.cleanup(); // Deletes all tracked resources
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { ResourceTracker, ResourceType, type TrackedResource } from './resource-tracker';
import { createSupabaseTestClient } from './supabase-test-client';

export interface CleanupOptions {
  /**
   * Continue cleanup even if some operations fail
   * @default true
   */
  continueOnError?: boolean;

  /**
   * Verify cleanup completed successfully
   * @default true
   */
  verifyCleanup?: boolean;

  /**
   * Log cleanup operations
   * @default true
   */
  verbose?: boolean;

  /**
   * Timeout for each cleanup operation (ms)
   * @default 5000
   */
  timeout?: number;
}

export interface CleanupResult {
  success: boolean;
  totalResources: number;
  deletedResources: number;
  failedResources: number;
  errors: Array<{ type: ResourceType; id: string; error: string }>;
  duration: number;
}

export class CleanupManager {
  private supabase: SupabaseClient | null;
  private tracker: ResourceTracker;
  private options: Required<CleanupOptions>;

  constructor(
    supabase: SupabaseClient | null = null,
    tracker: ResourceTracker,
    options: CleanupOptions = {}
  ) {
    this.supabase = supabase;
    this.tracker = tracker;
    this.options = {
      continueOnError: options.continueOnError ?? true,
      verifyCleanup: options.verifyCleanup ?? true,
      verbose: options.verbose ?? true,
      timeout: options.timeout ?? 5000,
    };
  }

  /**
   * Lazy initialize supabase client
   */
  private async getSupabase(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await createSupabaseTestClient();
    }
    return this.supabase;
  }

  /**
   * Execute cleanup for all tracked resources
   */
  async cleanup(): Promise<CleanupResult> {
    const startTime = Date.now();
    const result: CleanupResult = {
      success: true,
      totalResources: this.tracker.getTotalCount(),
      deletedResources: 0,
      failedResources: 0,
      errors: [],
      duration: 0,
    };

    if (result.totalResources === 0) {
      this.log('No resources to clean up');
      result.duration = Date.now() - startTime;
      return result;
    }

    this.log(`\n🧹 Starting cleanup of ${result.totalResources} resources...`);

    // Get resources grouped by type in cleanup order
    const resourcesByType = this.tracker.getIDsByTypeInCleanupOrder();

    // Delete each resource type
    for (const [type, ids] of resourcesByType.entries()) {
      try {
        const deleted = await this.cleanupResourceType(type, ids);
        result.deletedResources += deleted;
      } catch (error: any) {
        result.failedResources += ids.length;
        result.errors.push({
          type,
          id: ids.join(', '),
          error: error.message,
        });

        if (!this.options.continueOnError) {
          result.success = false;
          break;
        }
      }
    }

    // Verify cleanup if enabled
    if (this.options.verifyCleanup && result.success) {
      const verifyResult = await this.verifyCleanup(resourcesByType);
      if (!verifyResult.success) {
        result.success = false;
        result.errors.push(...verifyResult.errors);
      }
    }

    result.duration = Date.now() - startTime;

    // Clear tracker after successful cleanup
    if (result.success) {
      this.tracker.clear();
      this.log(`✅ Cleanup completed in ${result.duration}ms`);
    } else {
      this.log(`❌ Cleanup failed with ${result.errors.length} errors`);
    }

    return result;
  }

  /**
   * Clean up resources of a specific type
   */
  private async cleanupResourceType(type: ResourceType, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    this.log(`  Deleting ${ids.length} ${type} resource(s)...`);

    try {
      switch (type) {
        case ResourceType.MESSAGE:
          return await this.deleteMessages(ids);

        case ResourceType.CONVERSATION:
          return await this.deleteConversations(ids);

        case ResourceType.MODEL_MAP:
          return await this.deleteModelMaps(ids);

        case ResourceType.GROUP_MAP:
          return await this.deleteGroupMaps(ids);

        case ResourceType.INVITE:
          return await this.deleteInvites(ids);

        case ResourceType.TEMP_ORG_REQUEST:
          return await this.deleteTempOrgRequests(ids);

        case ResourceType.GROUP:
          return await this.deleteGroups(ids);

        case ResourceType.MODEL:
          return await this.deleteModels(ids);

        case ResourceType.ORG_MAP:
          return await this.deleteOrgMaps(ids);

        case ResourceType.ORGANIZATION:
          return await this.deleteOrganizations(ids);

        case ResourceType.PROFILE:
          return await this.deleteProfiles(ids);

        case ResourceType.AUTH_USER:
          return await this.deleteAuthUsers(ids);

        default:
          throw new Error(`Unknown resource type: ${type}`);
      }
    } catch (error: any) {
      this.log(`    ❌ Failed to delete ${type}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete messages
   */
  private async deleteMessages(ids: string[]): Promise<number> {
    const supabase = await this.getSupabase();
    const { error, count } = await supabase
      .from('messages')
      .delete()
      .in('id', ids)
      .select('id', { count: 'exact', head: false });

    if (error) throw error;
    this.log(`    ✓ Deleted ${count || ids.length} messages`);
    return count || ids.length;
  }

  /**
   * Delete conversations
   */
  private async deleteConversations(ids: string[]): Promise<number> {
    const supabase = await this.getSupabase();
    const { error, count } = await supabase
      .from('conversations')
      .delete()
      .in('id', ids)
      .select('id', { count: 'exact', head: false });

    if (error) throw error;
    this.log(`    ✓ Deleted ${count || ids.length} conversations`);
    return count || ids.length;
  }

  /**
   * Delete model_map entries
   */
  private async deleteModelMaps(ids: string[]): Promise<number> {
    // IDs are in format "modelId-groupId"
    const supabase = await this.getSupabase();
    let deleted = 0;
    for (const id of ids) {
      const [modelId, groupId] = id.split('-');
      const { error } = await supabase
        .from('model_map')
        .delete()
        .eq('model_id', modelId)
        .eq('group_id', groupId);

      if (!error) deleted++;
    }

    this.log(`    ✓ Deleted ${deleted} model_map entries`);
    return deleted;
  }

  /**
   * Delete group_map entries
   */
  private async deleteGroupMaps(ids: string[]): Promise<number> {
    // IDs are in format "userId-groupId"
    const supabase = await this.getSupabase();
    let deleted = 0;
    for (const id of ids) {
      const [userId, groupId] = id.split('-');
      const { error } = await supabase
        .from('group_map')
        .delete()
        .eq('user_id', userId)
        .eq('group_id', groupId);

      if (!error) deleted++;
    }

    this.log(`    ✓ Deleted ${deleted} group_map entries`);
    return deleted;
  }

  /**
   * Delete invites
   */
  private async deleteInvites(ids: string[]): Promise<number> {
    const supabase = await this.getSupabase();
    const { error, count } = await supabase
      .from('invites')
      .delete()
      .in('id', ids)
      .select('id', { count: 'exact', head: false });

    if (error) throw error;
    this.log(`    ✓ Deleted ${count || ids.length} invites`);
    return count || ids.length;
  }

  /**
   * Delete temp_org_requests
   */
  private async deleteTempOrgRequests(ids: string[]): Promise<number> {
    const supabase = await this.getSupabase();
    const { error, count } = await supabase
      .from('temp_org_requests')
      .delete()
      .in('id', ids)
      .select('id', { count: 'exact', head: false });

    if (error) throw error;
    this.log(`    ✓ Deleted ${count || ids.length} temp_org_requests`);
    return count || ids.length;
  }

  /**
   * Delete groups
   */
  private async deleteGroups(ids: string[]): Promise<number> {
    const supabase = await this.getSupabase();
    const { error, count } = await supabase
      .from('groups')
      .delete()
      .in('id', ids)
      .select('id', { count: 'exact', head: false });

    if (error) throw error;
    this.log(`    ✓ Deleted ${count || ids.length} groups`);
    return count || ids.length;
  }

  /**
   * Delete models
   */
  private async deleteModels(ids: string[]): Promise<number> {
    const supabase = await this.getSupabase();
    const { error, count } = await supabase
      .from('models')
      .delete()
      .in('id', ids)
      .select('id', { count: 'exact', head: false });

    if (error) throw error;
    this.log(`    ✓ Deleted ${count || ids.length} models`);
    return count || ids.length;
  }

  /**
   * Delete org_map entries
   */
  private async deleteOrgMaps(ids: string[]): Promise<number> {
    // IDs are in format "userId-orgId"
    const supabase = await this.getSupabase();
    let deleted = 0;
    for (const id of ids) {
      const [userId, orgId] = id.split('-');
      const { error } = await supabase
        .from('org_map')
        .delete()
        .eq('user_id', userId)
        .eq('org_id', orgId);

      if (!error) deleted++;
    }

    this.log(`    ✓ Deleted ${deleted} org_map entries`);
    return deleted;
  }

  /**
   * Delete organizations
   */
  private async deleteOrganizations(ids: string[]): Promise<number> {
    const supabase = await this.getSupabase();
    const { error, count } = await supabase
      .from('organizations')
      .delete()
      .in('id', ids)
      .select('id', { count: 'exact', head: false });

    if (error) throw error;
    this.log(`    ✓ Deleted ${count || ids.length} organizations`);
    return count || ids.length;
  }

  /**
   * Delete profiles
   */
  private async deleteProfiles(ids: string[]): Promise<number> {
    const supabase = await this.getSupabase();
    const { error, count } = await supabase
      .from('profiles')
      .delete()
      .in('id', ids)
      .select('id', { count: 'exact', head: false });

    if (error) throw error;
    this.log(`    ✓ Deleted ${count || ids.length} profiles`);
    return count || ids.length;
  }

  /**
   * Delete auth users (via Supabase Admin API)
   */
  private async deleteAuthUsers(ids: string[]): Promise<number> {
    const supabase = await this.getSupabase();
    let deleted = 0;
    for (const userId of ids) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (!error) deleted++;
      } catch (error: any) {
        this.log(`    ⚠️  Failed to delete auth user ${userId}: ${error.message}`);
      }
    }

    this.log(`    ✓ Deleted ${deleted} auth users`);
    return deleted;
  }

  /**
   * Verify cleanup completed successfully
   */
  private async verifyCleanup(
    resourcesByType: Map<ResourceType, string[]>
  ): Promise<{
    success: boolean;
    errors: Array<{ type: ResourceType; id: string; error: string }>;
  }> {
    const errors: Array<{ type: ResourceType; id: string; error: string }> = [];

    this.log('\n🔍 Verifying cleanup...');

    for (const [type, ids] of resourcesByType.entries()) {
      try {
        const remaining = await this.checkRemainingResources(type, ids);
        if (remaining.length > 0) {
          errors.push({
            type,
            id: remaining.join(', '),
            error: `${remaining.length} resource(s) still exist after cleanup`,
          });
          this.log(`  ❌ ${type}: ${remaining.length} resources still exist`);
        } else {
          this.log(`  ✓ ${type}: All resources deleted`);
        }
      } catch (error: any) {
        errors.push({
          type,
          id: 'verification',
          error: `Verification failed: ${error.message}`,
        });
      }
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * Check for remaining resources of a specific type
   */
  private async checkRemainingResources(type: ResourceType, ids: string[]): Promise<string[]> {
    const tableName = this.getTableName(type);
    if (!tableName) return [];

    const { data, error } = await supabase.from(tableName).select('id').in('id', ids);

    if (error) throw error;
    return (data || []).map((row: any) => row.id);
  }

  /**
   * Get database table name for resource type
   */
  private getTableName(type: ResourceType): string | null {
    const mapping: Record<string, string> = {
      [ResourceType.MESSAGE]: 'messages',
      [ResourceType.CONVERSATION]: 'conversations',
      [ResourceType.MODEL_MAP]: 'model_map',
      [ResourceType.GROUP_MAP]: 'group_map',
      [ResourceType.INVITE]: 'invites',
      [ResourceType.TEMP_ORG_REQUEST]: 'temp_org_requests',
      [ResourceType.GROUP]: 'groups',
      [ResourceType.MODEL]: 'models',
      [ResourceType.ORG_MAP]: 'org_map',
      [ResourceType.ORGANIZATION]: 'organizations',
      [ResourceType.PROFILE]: 'profiles',
    };

    return mapping[type] || null;
  }

  /**
   * Log helper
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(message);
    }
  }

  /**
   * Quick cleanup for worker pattern (bypasses tracker)
   */
  static async cleanupByWorkerPattern(
    workerPattern: string,
    supabase?: SupabaseClient
  ): Promise<CleanupResult> {
    const client = supabase || createSupabaseTestClient();
    const startTime = Date.now();
    const result: CleanupResult = {
      success: true,
      totalResources: 0,
      deletedResources: 0,
      failedResources: 0,
      errors: [],
      duration: 0,
    };

    console.log(`\n🧹 Cleaning up resources matching pattern: ${workerPattern}%`);

    try {
      // Delete in order (respecting FKs)
      // Messages
      await client.from('messages').delete().ilike('conversation_id', `${workerPattern}%`);

      // Conversations
      await client.from('conversations').delete().ilike('title', `${workerPattern}%`);

      // Model maps (by model pattern)
      await client.from('model_map').delete().ilike('model_id', `${workerPattern}%`);

      // Group maps (by group pattern)
      await client.from('group_map').delete().ilike('group_id', `${workerPattern}%`);

      // Invites (by email pattern)
      await client.from('invites').delete().ilike('email', `${workerPattern}%`);

      // Groups (by name pattern)
      await client.from('groups').delete().ilike('name', `${workerPattern}%`);

      // Models (by id pattern)
      await client.from('models').delete().ilike('id', `${workerPattern}%`);

      // Org maps (by org pattern)
      await client.from('org_map').delete().ilike('org_id', `${workerPattern}%`);

      // Organizations (by name pattern)
      await client.from('organizations').delete().ilike('name', `${workerPattern}%`);

      // Profiles (by email pattern)
      const { data: profiles } = await client
        .from('profiles')
        .select('id')
        .ilike('email', `${workerPattern}%`);

      if (profiles && profiles.length > 0) {
        const userIds = profiles.map((p: any) => p.id);

        // Delete profiles
        await client.from('profiles').delete().in('id', userIds);

        // Delete auth users
        for (const userId of userIds) {
          try {
            await client.auth.admin.deleteUser(userId);
          } catch (error) {
            console.log(`  ⚠️  Failed to delete auth user ${userId}`);
          }
        }
      }

      console.log(`✅ Pattern-based cleanup completed in ${Date.now() - startTime}ms`);
    } catch (error: any) {
      result.success = false;
      result.errors.push({
        type: ResourceType.PROFILE,
        id: 'pattern',
        error: error.message,
      });
      console.log(`❌ Pattern-based cleanup failed: ${error.message}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }
}

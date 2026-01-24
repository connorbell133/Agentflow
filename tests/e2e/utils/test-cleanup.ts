/**
 * Comprehensive Test Data Cleanup Utility
 *
 * This utility provides systematic cleanup of all test data from the database.
 * It should be used:
 * - Before test runs (global setup)
 * - After test runs (global teardown)
 * - Before/after individual tests that need complete isolation
 *
 * The cleanup is order-dependent due to foreign key constraints:
 * 1. Messages (references conversations, users)
 * 2. Conversations (references users, orgs, models)
 * 3. Model map (references models, groups, orgs)
 * 4. Group map (references users, groups, orgs)
 * 5. Invites (references users, orgs, groups)
 * 6. Groups (references orgs)
 * 7. Models (references orgs)
 * 8. Org map (references users, orgs)
 * 9. Temp org requests (references users)
 * 10. Profiles (users)
 * 11. Organizations
 * 12. Supabase Auth users
 */

import { createSupabaseTestClient } from './supabase-test-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

/**
 * Options for cleanup operations
 */
export interface CleanupOptions {
  /** Email patterns to match for user cleanup (supports wildcards with %) */
  emailPattern?: string;
  /** Specific user IDs to clean up */
  userIds?: string[];
  /** Specific organization IDs to clean up */
  orgIds?: string[];
  /** Whether to clean up Supabase Auth users (default: true) */
  cleanAuthUsers?: boolean;
  /** Whether to log cleanup progress (default: true) */
  verbose?: boolean;
  /** Whether to preserve certain test users (e.g., admin) */
  preserveEmails?: string[];
}

/**
 * Result of cleanup operation
 */
export interface CleanupResult {
  success: boolean;
  deletedCounts: {
    messages: number;
    conversations: number;
    modelMaps: number;
    groupMaps: number;
    invites: number;
    groups: number;
    models: number;
    orgMaps: number;
    tempOrgRequests: number;
    profiles: number;
    organizations: number;
    authUsers: number;
  };
  errors: string[];
}

/**
 * Logs a message if verbose mode is enabled
 */
function log(message: string, verbose: boolean = true) {
  if (verbose) {
    console.log(message);
  }
}

/**
 * Gets user IDs based on cleanup options
 */
async function getUserIdsToCleanup(
  supabase: SupabaseClient<Database>,
  options: CleanupOptions
): Promise<string[]> {
  const userIds = new Set<string>(options.userIds || []);

  // If email pattern provided, find matching users
  if (options.emailPattern) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .like('email', options.emailPattern);

    if (profiles) {
      // Filter out preserved emails
      profiles
        .filter(p => !options.preserveEmails?.includes(p.email))
        .forEach(p => userIds.add(p.id));
    }
  }

  return Array.from(userIds);
}

/**
 * Gets organization IDs based on cleanup options
 */
async function getOrgIdsToCleanup(
  supabase: SupabaseClient<Database>,
  options: CleanupOptions,
  userIds: string[]
): Promise<string[]> {
  const orgIds = new Set<string>(options.orgIds || []);

  // If we have user IDs, get their orgs
  if (userIds.length > 0) {
    const { data: orgMaps } = await supabase
      .from('org_map')
      .select('org_id')
      .in('user_id', userIds);

    if (orgMaps) {
      orgMaps.forEach(om => orgIds.add(om.org_id));
    }
  }

  return Array.from(orgIds);
}

/**
 * Deletes messages for given conversation IDs
 */
async function deleteMessages(
  supabase: SupabaseClient<Database>,
  conversationIds: string[],
  verbose: boolean
): Promise<number> {
  if (conversationIds.length === 0) return 0;

  log('  🗑️  Deleting messages...', verbose);
  const { data, error } = await supabase
    .from('messages')
    .delete()
    .in('conversation_id', conversationIds)
    .select('id');

  if (error) {
    throw new Error(`Failed to delete messages: ${error.message}`);
  }

  const count = data?.length || 0;
  log(`    ✓ Deleted ${count} messages`, verbose);
  return count;
}

/**
 * Deletes conversations for given user IDs or org IDs
 */
async function deleteConversations(
  supabase: SupabaseClient<Database>,
  userIds: string[],
  orgIds: string[],
  verbose: boolean
): Promise<{ count: number; conversationIds: string[] }> {
  if (userIds.length === 0 && orgIds.length === 0) {
    return { count: 0, conversationIds: [] };
  }

  log('  🗑️  Deleting conversations...', verbose);

  // Build query
  let query = supabase.from('conversations').select('id');

  if (userIds.length > 0) {
    query = query.in('user_id', userIds);
  } else if (orgIds.length > 0) {
    query = query.in('org_id', orgIds);
  }

  const { data: conversations } = await query;
  const conversationIds = conversations?.map(c => c.id) || [];

  if (conversationIds.length === 0) {
    log('    ✓ No conversations to delete', verbose);
    return { count: 0, conversationIds: [] };
  }

  // Delete messages first
  await deleteMessages(supabase, conversationIds, verbose);

  // Then delete conversations
  const { data, error } = await supabase
    .from('conversations')
    .delete()
    .in('id', conversationIds)
    .select('id');

  if (error) {
    throw new Error(`Failed to delete conversations: ${error.message}`);
  }

  const count = data?.length || 0;
  log(`    ✓ Deleted ${count} conversations`, verbose);
  return { count, conversationIds };
}

/**
 * Deletes model mappings for given org IDs
 */
async function deleteModelMaps(
  supabase: SupabaseClient<Database>,
  orgIds: string[],
  verbose: boolean
): Promise<number> {
  if (orgIds.length === 0) return 0;

  log('  🗑️  Deleting model mappings...', verbose);
  const { data, error } = await supabase
    .from('model_map')
    .delete()
    .in('org_id', orgIds)
    .select('id');

  if (error) {
    throw new Error(`Failed to delete model_map: ${error.message}`);
  }

  const count = data?.length || 0;
  log(`    ✓ Deleted ${count} model mappings`, verbose);
  return count;
}

/**
 * Deletes group mappings for given user IDs or org IDs
 */
async function deleteGroupMaps(
  supabase: SupabaseClient<Database>,
  userIds: string[],
  orgIds: string[],
  verbose: boolean
): Promise<number> {
  if (userIds.length === 0 && orgIds.length === 0) return 0;

  log('  🗑️  Deleting group mappings...', verbose);

  let query = supabase.from('group_map').delete().select('id');

  if (userIds.length > 0) {
    query = query.in('user_id', userIds);
  } else if (orgIds.length > 0) {
    query = query.in('org_id', orgIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to delete group_map: ${error.message}`);
  }

  const count = data?.length || 0;
  log(`    ✓ Deleted ${count} group mappings`, verbose);
  return count;
}

/**
 * Deletes invites for given user IDs or org IDs
 */
async function deleteInvites(
  supabase: SupabaseClient<Database>,
  userIds: string[],
  orgIds: string[],
  emails: string[],
  verbose: boolean
): Promise<number> {
  if (userIds.length === 0 && orgIds.length === 0 && emails.length === 0) return 0;

  log('  🗑️  Deleting invites...', verbose);

  let deleted = 0;

  // Delete by inviter user ID
  if (userIds.length > 0) {
    const { data, error } = await supabase
      .from('invites')
      .delete()
      .in('inviter', userIds)
      .select('id');

    if (error) {
      throw new Error(`Failed to delete invites by inviter: ${error.message}`);
    }
    deleted += data?.length || 0;
  }

  // Delete by org ID
  if (orgIds.length > 0) {
    const { data, error } = await supabase
      .from('invites')
      .delete()
      .in('org_id', orgIds)
      .select('id');

    if (error) {
      throw new Error(`Failed to delete invites by org: ${error.message}`);
    }
    deleted += data?.length || 0;
  }

  // Delete by invitee email
  if (emails.length > 0) {
    const { data, error } = await supabase
      .from('invites')
      .delete()
      .in('invitee', emails)
      .select('id');

    if (error) {
      throw new Error(`Failed to delete invites by email: ${error.message}`);
    }
    deleted += data?.length || 0;
  }

  log(`    ✓ Deleted ${deleted} invites`, verbose);
  return deleted;
}

/**
 * Deletes groups for given org IDs
 */
async function deleteGroups(
  supabase: SupabaseClient<Database>,
  orgIds: string[],
  verbose: boolean
): Promise<number> {
  if (orgIds.length === 0) return 0;

  log('  🗑️  Deleting groups...', verbose);
  const { data, error } = await supabase.from('groups').delete().in('org_id', orgIds).select('id');

  if (error) {
    throw new Error(`Failed to delete groups: ${error.message}`);
  }

  const count = data?.length || 0;
  log(`    ✓ Deleted ${count} groups`, verbose);
  return count;
}

/**
 * Deletes models for given org IDs
 */
async function deleteModels(
  supabase: SupabaseClient<Database>,
  orgIds: string[],
  verbose: boolean
): Promise<number> {
  if (orgIds.length === 0) return 0;

  log('  🗑️  Deleting models...', verbose);
  const { data, error } = await supabase.from('models').delete().in('org_id', orgIds).select('id');

  if (error) {
    throw new Error(`Failed to delete models: ${error.message}`);
  }

  const count = data?.length || 0;
  log(`    ✓ Deleted ${count} models`, verbose);
  return count;
}

/**
 * Deletes org mappings for given user IDs or org IDs
 */
async function deleteOrgMaps(
  supabase: SupabaseClient<Database>,
  userIds: string[],
  orgIds: string[],
  verbose: boolean
): Promise<number> {
  if (userIds.length === 0 && orgIds.length === 0) return 0;

  log('  🗑️  Deleting org mappings...', verbose);

  let query = supabase.from('org_map').delete().select('id');

  if (userIds.length > 0) {
    query = query.in('user_id', userIds);
  } else if (orgIds.length > 0) {
    query = query.in('org_id', orgIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to delete org_map: ${error.message}`);
  }

  const count = data?.length || 0;
  log(`    ✓ Deleted ${count} org mappings`, verbose);
  return count;
}

/**
 * Deletes temp org requests for given user IDs
 */
async function deleteTempOrgRequests(
  supabase: SupabaseClient<Database>,
  userIds: string[],
  verbose: boolean
): Promise<number> {
  if (userIds.length === 0) return 0;

  log('  🗑️  Deleting temp org requests...', verbose);
  const { data, error } = await supabase
    .from('temp_org_requests')
    .delete()
    .in('requester_id', userIds)
    .select('id');

  if (error) {
    throw new Error(`Failed to delete temp_org_requests: ${error.message}`);
  }

  const count = data?.length || 0;
  log(`    ✓ Deleted ${count} temp org requests`, verbose);
  return count;
}

/**
 * Deletes user profiles for given user IDs
 */
async function deleteProfiles(
  supabase: SupabaseClient<Database>,
  userIds: string[],
  verbose: boolean
): Promise<number> {
  if (userIds.length === 0) return 0;

  log('  🗑️  Deleting user profiles...', verbose);
  const { data, error } = await supabase.from('profiles').delete().in('id', userIds).select('id');

  if (error) {
    throw new Error(`Failed to delete profiles: ${error.message}`);
  }

  const count = data?.length || 0;
  log(`    ✓ Deleted ${count} profiles`, verbose);
  return count;
}

/**
 * Deletes organizations for given org IDs
 */
async function deleteOrganizations(
  supabase: SupabaseClient<Database>,
  orgIds: string[],
  verbose: boolean
): Promise<number> {
  if (orgIds.length === 0) return 0;

  log('  🗑️  Deleting organizations...', verbose);
  const { data, error } = await supabase
    .from('organizations')
    .delete()
    .in('id', orgIds)
    .select('id');

  if (error) {
    throw new Error(`Failed to delete organizations: ${error.message}`);
  }

  const count = data?.length || 0;
  log(`    ✓ Deleted ${count} organizations`, verbose);
  return count;
}

/**
 * Deletes Supabase Auth users for given user IDs
 */
async function deleteAuthUsers(
  supabase: SupabaseClient<Database>,
  userIds: string[],
  verbose: boolean
): Promise<number> {
  if (userIds.length === 0) return 0;

  log('  🗑️  Deleting Supabase Auth users...', verbose);
  let deleted = 0;

  for (const userId of userIds) {
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (!error) {
        deleted++;
      } else {
        log(`    ⚠️  Could not delete auth user ${userId}: ${error.message}`, verbose);
      }
    } catch (e) {
      log(`    ⚠️  Could not delete auth user ${userId}: ${(e as Error).message}`, verbose);
    }
  }

  log(`    ✓ Deleted ${deleted} auth users`, verbose);
  return deleted;
}

/**
 * Get emails for user IDs (for invite cleanup)
 */
async function getEmailsForUsers(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<string[]> {
  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase.from('profiles').select('email').in('id', userIds);

  return profiles?.map(p => p.email) || [];
}

/**
 * Comprehensive cleanup of test data
 *
 * This function deletes test data in the correct order to respect foreign key constraints.
 *
 * @param options Cleanup options to specify what to clean up
 * @returns Result object with counts of deleted items and any errors
 */
export async function cleanupTestData(options: CleanupOptions = {}): Promise<CleanupResult> {
  const {
    emailPattern,
    userIds: providedUserIds,
    orgIds: providedOrgIds,
    cleanAuthUsers = true,
    verbose = true,
    preserveEmails = [],
  } = options;

  const result: CleanupResult = {
    success: true,
    deletedCounts: {
      messages: 0,
      conversations: 0,
      modelMaps: 0,
      groupMaps: 0,
      invites: 0,
      groups: 0,
      models: 0,
      orgMaps: 0,
      tempOrgRequests: 0,
      profiles: 0,
      organizations: 0,
      authUsers: 0,
    },
    errors: [],
  };

  try {
    const supabase = await createSupabaseTestClient();

    log('\n🧹 Starting comprehensive test data cleanup...', verbose);

    // Step 1: Determine which users and orgs to clean up
    log('\n📋 Identifying data to clean up...', verbose);
    const userIds = await getUserIdsToCleanup(supabase, options);
    const orgIds = await getOrgIdsToCleanup(supabase, options, userIds);
    const emails = await getEmailsForUsers(supabase, userIds);

    log(`  Found ${userIds.length} users to clean up`, verbose);
    log(`  Found ${orgIds.length} organizations to clean up`, verbose);

    if (userIds.length === 0 && orgIds.length === 0) {
      log('\n✅ No data to clean up\n', verbose);
      return result;
    }

    // Step 2: Delete in correct order (respecting foreign keys)
    log('\n🗑️  Deleting data in order...', verbose);

    // Delete conversations (and their messages)
    const { count: conversationsCount } = await deleteConversations(
      supabase,
      userIds,
      orgIds,
      verbose
    );
    result.deletedCounts.conversations = conversationsCount;

    // Delete model mappings
    result.deletedCounts.modelMaps = await deleteModelMaps(supabase, orgIds, verbose);

    // Delete group mappings
    result.deletedCounts.groupMaps = await deleteGroupMaps(supabase, userIds, orgIds, verbose);

    // Delete invites
    result.deletedCounts.invites = await deleteInvites(supabase, userIds, orgIds, emails, verbose);

    // Delete groups
    result.deletedCounts.groups = await deleteGroups(supabase, orgIds, verbose);

    // Delete models
    result.deletedCounts.models = await deleteModels(supabase, orgIds, verbose);

    // Delete org mappings
    result.deletedCounts.orgMaps = await deleteOrgMaps(supabase, userIds, orgIds, verbose);

    // Delete temp org requests
    result.deletedCounts.tempOrgRequests = await deleteTempOrgRequests(supabase, userIds, verbose);

    // Delete profiles
    result.deletedCounts.profiles = await deleteProfiles(supabase, userIds, verbose);

    // Delete organizations
    result.deletedCounts.organizations = await deleteOrganizations(supabase, orgIds, verbose);

    // Delete auth users
    if (cleanAuthUsers) {
      result.deletedCounts.authUsers = await deleteAuthUsers(supabase, userIds, verbose);
    }

    log('\n✅ Cleanup complete!\n', verbose);
  } catch (error) {
    result.success = false;
    result.errors.push((error as Error).message);
    log(`\n❌ Cleanup failed: ${(error as Error).message}\n`, verbose);
  }

  return result;
}

/**
 * Cleanup test data for a specific email pattern
 * Convenience function for common use case
 */
export async function cleanupTestUserByEmail(
  email: string,
  verbose: boolean = true
): Promise<CleanupResult> {
  return cleanupTestData({
    emailPattern: email,
    cleanAuthUsers: true,
    verbose,
  });
}

/**
 * Cleanup all test data matching a pattern (e.g., 'test.%@example.com')
 * Useful for cleaning up all test users at once
 */
export async function cleanupAllTestUsers(
  emailPattern: string = 'test.%@example.com',
  preserveEmails: string[] = [],
  verbose: boolean = true
): Promise<CleanupResult> {
  return cleanupTestData({
    emailPattern,
    preserveEmails,
    cleanAuthUsers: true,
    verbose,
  });
}

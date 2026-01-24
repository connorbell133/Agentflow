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
 * Gets organization IDs that the users OWN (can safely delete everything)
 *
 * IMPORTANT: This only returns orgs where the user is the OWNER.
 * For orgs where the user is just a member, we should only delete the user's
 * membership data, not the org itself or its contents.
 */
async function getOwnedOrgIds(
  supabase: SupabaseClient<Database>,
  options: CleanupOptions,
  userIds: string[]
): Promise<string[]> {
  const orgIds = new Set<string>(options.orgIds || []);

  // Only get orgs where user is the OWNER
  if (userIds.length > 0) {
    const { data: ownedOrgs } = await supabase
      .from('organizations')
      .select('id')
      .in('owner', userIds);

    if (ownedOrgs) {
      ownedOrgs.forEach(org => orgIds.add(org.id));
    }
  }

  return Array.from(orgIds);
}

/**
 * Gets organization IDs based on cleanup options
 *
 * NOTE: This function is kept for backwards compatibility but now only returns
 * OWNED orgs to prevent race conditions where one test's cleanup deletes
 * another test's data.
 *
 * Previously, this returned all orgs a user belonged to (via org_map), which
 * caused issues when:
 * - User A from Test 1 creates Org X
 * - User B from Test 2 accepts invite to Org X
 * - Test 2 cleans up User B, finds Org X via org_map
 * - Test 2's cleanup deletes Org X and all its data, breaking Test 1
 */
async function getOrgIdsToCleanup(
  supabase: SupabaseClient<Database>,
  options: CleanupOptions,
  userIds: string[]
): Promise<string[]> {
  // Only return orgs the user OWNS to prevent cross-test data deletion
  return getOwnedOrgIds(supabase, options, userIds);
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
 * Deletes conversations for given user IDs
 *
 * IMPORTANT: Only deletes conversations owned by the users being cleaned up.
 * For owned orgs, we also delete all conversations in those orgs.
 * This prevents deleting other users' conversations in shared orgs.
 */
async function deleteConversations(
  supabase: SupabaseClient<Database>,
  userIds: string[],
  ownedOrgIds: string[],
  verbose: boolean
): Promise<{ count: number; conversationIds: string[] }> {
  if (userIds.length === 0 && ownedOrgIds.length === 0) {
    return { count: 0, conversationIds: [] };
  }

  log('  🗑️  Deleting conversations...', verbose);

  const allConversationIds: string[] = [];

  // Get conversations by user_id (conversations the user created)
  if (userIds.length > 0) {
    const { data: userConversations } = await supabase
      .from('conversations')
      .select('id')
      .in('user_id', userIds);

    if (userConversations) {
      allConversationIds.push(...userConversations.map(c => c.id));
    }
  }

  // For OWNED orgs only, get all conversations in those orgs
  // This is safe because we're deleting orgs we own
  if (ownedOrgIds.length > 0) {
    const { data: orgConversations } = await supabase
      .from('conversations')
      .select('id')
      .in('org_id', ownedOrgIds);

    if (orgConversations) {
      // Add any that aren't already in the list
      for (const conv of orgConversations) {
        if (!allConversationIds.includes(conv.id)) {
          allConversationIds.push(conv.id);
        }
      }
    }
  }

  if (allConversationIds.length === 0) {
    log('    ✓ No conversations to delete', verbose);
    return { count: 0, conversationIds: [] };
  }

  // Delete messages first
  await deleteMessages(supabase, allConversationIds, verbose);

  // Then delete conversations
  const { data, error } = await supabase
    .from('conversations')
    .delete()
    .in('id', allConversationIds)
    .select('id');

  if (error) {
    throw new Error(`Failed to delete conversations: ${error.message}`);
  }

  const count = data?.length || 0;
  log(`    ✓ Deleted ${count} conversations`, verbose);
  return { count, conversationIds: allConversationIds };
}

/**
 * Deletes model mappings for given org IDs
 *
 * IMPORTANT: This should only be called with org IDs that the user OWNS.
 * The caller (cleanupTestData) ensures this by using getOrgIdsToCleanup
 * which now only returns owned orgs.
 */
async function deleteModelMaps(
  supabase: SupabaseClient<Database>,
  ownedOrgIds: string[],
  verbose: boolean
): Promise<number> {
  if (ownedOrgIds.length === 0) return 0;

  log('  🗑️  Deleting model mappings...', verbose);
  const { data, error } = await supabase
    .from('model_map')
    .delete()
    .in('org_id', ownedOrgIds)
    .select('id');

  if (error) {
    throw new Error(`Failed to delete model_map: ${error.message}`);
  }

  const count = data?.length || 0;
  log(`    ✓ Deleted ${count} model mappings`, verbose);
  return count;
}

/**
 * Deletes group mappings for given user IDs
 *
 * IMPORTANT: Only deletes by user_id to avoid deleting other users' group memberships.
 * The org_id parameter is only used for orgs that are OWNED by the users being cleaned up.
 */
async function deleteGroupMaps(
  supabase: SupabaseClient<Database>,
  userIds: string[],
  ownedOrgIds: string[],
  verbose: boolean
): Promise<number> {
  if (userIds.length === 0) return 0;

  log('  🗑️  Deleting group mappings...', verbose);

  let totalDeleted = 0;

  // Delete by user_id - this removes the user's memberships in any group
  const { data, error } = await supabase
    .from('group_map')
    .delete()
    .in('user_id', userIds)
    .select('id');

  if (error) {
    throw new Error(`Failed to delete group_map by user_id: ${error.message}`);
  }

  totalDeleted += data?.length || 0;

  // NOTE: We intentionally do NOT delete by org_id alone.
  // Deleting by org_id for orgs the user is a member of (but doesn't own)
  // would delete OTHER users' group memberships, causing race conditions.
  //
  // For owned orgs, the group_map entries will be cleaned up when we delete
  // the groups themselves (via CASCADE or explicit cleanup in deleteGroups).

  log(`    ✓ Deleted ${totalDeleted} group mappings`, verbose);
  return totalDeleted;
}

/**
 * Deletes invites for given user IDs or org IDs
 *
 * IMPORTANT: Only deletes invites that belong to the users/emails being cleaned up.
 * Does NOT delete invites by org_id alone to avoid deleting invites from other tests
 * that happen to be in the same org.
 */
async function deleteInvites(
  supabase: SupabaseClient<Database>,
  userIds: string[],
  orgIds: string[],
  emails: string[],
  verbose: boolean
): Promise<number> {
  if (userIds.length === 0 && emails.length === 0) return 0;

  log('  🗑️  Deleting invites...', verbose);

  let deleted = 0;

  // Delete by inviter user ID (invites created by users being cleaned up)
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

  // Delete by invitee email (invites sent to users being cleaned up)
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

  // NOTE: We intentionally do NOT delete invites by org_id alone.
  // This prevents deleting invites from other tests that happen to be in the same org.
  // Invites are only deleted if:
  // 1. The inviter is one of the users being cleaned up, OR
  // 2. The invitee is one of the emails being cleaned up
  // This ensures each test only cleans up its own invites.

  log(`    ✓ Deleted ${deleted} invites`, verbose);
  return deleted;
}

/**
 * Deletes groups for given org IDs
 * Also includes a fallback to find and delete orphaned groups (groups whose orgs don't exist)
 * IMPORTANT: This must be called AFTER deleteGroupMaps to avoid foreign key violations
 *
 * IMPORTANT: This should only be called with org IDs that the user OWNS.
 * The caller (cleanupTestData) ensures this by using getOrgIdsToCleanup
 * which now only returns owned orgs.
 */
async function deleteGroups(
  supabase: SupabaseClient<Database>,
  ownedOrgIds: string[],
  verbose: boolean
): Promise<number> {
  let totalDeleted = 0;

  // Delete groups by org_id if we have org IDs (only for owned orgs)
  if (ownedOrgIds.length > 0) {
    log('  🗑️  Deleting groups...', verbose);

    // First, get all group IDs that belong to these orgs
    const { data: groupsToDelete } = await supabase
      .from('groups')
      .select('id')
      .in('org_id', ownedOrgIds);

    if (groupsToDelete && groupsToDelete.length > 0) {
      const groupIds = groupsToDelete.map(g => g.id);

      // Delete any remaining group_map entries that reference these groups
      // (in case deleteGroupMaps didn't catch them all)
      const { error: groupMapError } = await supabase
        .from('group_map')
        .delete()
        .in('group_id', groupIds);

      if (groupMapError) {
        log(
          `    ⚠️  Warning: Failed to clean up group_map entries: ${groupMapError.message}`,
          verbose
        );
      }

      // Now delete the groups
      const { data, error } = await supabase
        .from('groups')
        .delete()
        .in('id', groupIds)
        .select('id');

      if (error) {
        throw new Error(`Failed to delete groups: ${error.message}`);
      }

      totalDeleted = data?.length || 0;
      log(`    ✓ Deleted ${totalDeleted} groups`, verbose);
    } else {
      log(`    ✓ No groups to delete`, verbose);
    }
  }

  // Fallback: Find and delete orphaned groups (groups whose org_id doesn't exist in organizations table)
  // This handles cases where orgs were deleted but groups weren't cleaned up
  log('  🔍 Checking for orphaned groups...', verbose);

  // Get all existing org IDs
  const { data: existingOrgs } = await supabase.from('organizations').select('id');
  const existingOrgIds = new Set(existingOrgs?.map(o => o.id) || []);

  // Get all groups and find orphaned ones (org doesn't exist)
  const { data: allGroups } = await supabase.from('groups').select('id, org_id');

  if (allGroups) {
    const orphanedGroups = allGroups.filter(g => !existingOrgIds.has(g.org_id));

    if (orphanedGroups.length > 0) {
      const orphanedIds = orphanedGroups.map(g => g.id);

      // Delete group_map entries that reference these orphaned groups first
      const { error: groupMapError } = await supabase
        .from('group_map')
        .delete()
        .in('group_id', orphanedIds);

      if (groupMapError) {
        log(
          `    ⚠️  Warning: Failed to clean up group_map entries for orphaned groups: ${groupMapError.message}`,
          verbose
        );
      }

      // Now delete the orphaned groups
      const { data: deletedOrphans, error: deleteError } = await supabase
        .from('groups')
        .delete()
        .in('id', orphanedIds)
        .select('id');

      if (deleteError) {
        log(`    ⚠️  Failed to delete orphaned groups: ${deleteError.message}`, verbose);
      } else {
        const orphanCount = deletedOrphans?.length || 0;
        totalDeleted += orphanCount;
        log(`    ✓ Deleted ${orphanCount} orphaned groups`, verbose);
      }
    } else {
      log(`    ✓ No orphaned groups found`, verbose);
    }
  }

  return totalDeleted;
}

/**
 * Deletes models for given org IDs
 *
 * IMPORTANT: This should only be called with org IDs that the user OWNS.
 * The caller (cleanupTestData) ensures this by using getOrgIdsToCleanup
 * which now only returns owned orgs.
 */
async function deleteModels(
  supabase: SupabaseClient<Database>,
  ownedOrgIds: string[],
  verbose: boolean
): Promise<number> {
  if (ownedOrgIds.length === 0) return 0;

  log('  🗑️  Deleting models...', verbose);
  const { data, error } = await supabase
    .from('models')
    .delete()
    .in('org_id', ownedOrgIds)
    .select('id');

  if (error) {
    throw new Error(`Failed to delete models: ${error.message}`);
  }

  const count = data?.length || 0;
  log(`    ✓ Deleted ${count} models`, verbose);
  return count;
}

/**
 * Deletes org mappings for given user IDs
 * IMPORTANT: This must be called BEFORE deleteOrganizations to avoid foreign key violations
 *
 * Only deletes by user_id to avoid deleting other users' org memberships.
 * For owned orgs, we also delete all org_map entries for that org (to allow org deletion).
 */
async function deleteOrgMaps(
  supabase: SupabaseClient<Database>,
  userIds: string[],
  ownedOrgIds: string[],
  verbose: boolean
): Promise<number> {
  if (userIds.length === 0 && ownedOrgIds.length === 0) return 0;

  log('  🗑️  Deleting org mappings...', verbose);

  let totalDeleted = 0;

  // Delete by user_id - removes the user's memberships in any org
  if (userIds.length > 0) {
    const { data, error } = await supabase
      .from('org_map')
      .delete()
      .in('user_id', userIds)
      .select('id');

    if (error) {
      throw new Error(`Failed to delete org_map by user_id: ${error.message}`);
    }

    totalDeleted += data?.length || 0;
  }

  // For OWNED orgs only, delete all org_map entries
  // This is necessary to allow the org to be deleted (foreign key constraint)
  // This is safe because we're deleting orgs we own, so other users in those
  // orgs will lose access (which is correct - the org is being deleted)
  if (ownedOrgIds.length > 0) {
    const { data, error } = await supabase
      .from('org_map')
      .delete()
      .in('org_id', ownedOrgIds)
      .select('id');

    if (error) {
      throw new Error(`Failed to delete org_map for owned orgs: ${error.message}`);
    }

    totalDeleted += data?.length || 0;
  }

  log(`    ✓ Deleted ${totalDeleted} org mappings`, verbose);
  return totalDeleted;
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
 * IMPORTANT: This must be called AFTER deleteOrgMaps to avoid foreign key violations
 *
 * IMPORTANT: This should only be called with org IDs that the user OWNS.
 * The caller (cleanupTestData) ensures this by using getOrgIdsToCleanup
 * which now only returns owned orgs.
 */
async function deleteOrganizations(
  supabase: SupabaseClient<Database>,
  ownedOrgIds: string[],
  verbose: boolean
): Promise<number> {
  if (ownedOrgIds.length === 0) return 0;

  log('  🗑️  Deleting organizations...', verbose);

  // Safety check: Delete any remaining org_map entries that reference these orgs
  // (in case deleteOrgMaps didn't catch them all)
  const { error: orgMapError } = await supabase.from('org_map').delete().in('org_id', ownedOrgIds);

  if (orgMapError) {
    log(
      `    ⚠️  Warning: Failed to clean up remaining org_map entries: ${orgMapError.message}`,
      verbose
    );
  }

  // Now delete the organizations
  const { data, error } = await supabase
    .from('organizations')
    .delete()
    .in('id', ownedOrgIds)
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
    // Only get orgs the users OWN (not orgs they're just members of)
    // This prevents cleaning up data from other tests
    const ownedOrgIds = await getOrgIdsToCleanup(supabase, options, userIds);
    const emails = await getEmailsForUsers(supabase, userIds);

    log(`  Found ${userIds.length} users to clean up`, verbose);
    log(`  Found ${ownedOrgIds.length} organizations to clean up`, verbose);

    if (userIds.length === 0 && ownedOrgIds.length === 0) {
      log('\n✅ No data to clean up\n', verbose);
      return result;
    }

    // Step 2: Delete in correct order (respecting foreign keys)
    log('\n🗑️  Deleting data in order...', verbose);

    // Delete conversations (and their messages)
    // - By user_id: Conversations the user created
    // - By org_id (owned orgs only): All conversations in orgs the user owns
    const { count: conversationsCount } = await deleteConversations(
      supabase,
      userIds,
      ownedOrgIds,
      verbose
    );
    result.deletedCounts.conversations = conversationsCount;

    // Delete model mappings (only for owned orgs)
    result.deletedCounts.modelMaps = await deleteModelMaps(supabase, ownedOrgIds, verbose);

    // Delete group mappings (only by user_id, not by org_id)
    result.deletedCounts.groupMaps = await deleteGroupMaps(supabase, userIds, ownedOrgIds, verbose);

    // Delete invites (by inviter user_id or invitee email, not by org_id)
    result.deletedCounts.invites = await deleteInvites(
      supabase,
      userIds,
      ownedOrgIds,
      emails,
      verbose
    );

    // Delete groups (only for owned orgs)
    result.deletedCounts.groups = await deleteGroups(supabase, ownedOrgIds, verbose);

    // Delete models (only for owned orgs)
    result.deletedCounts.models = await deleteModels(supabase, ownedOrgIds, verbose);

    // Delete org mappings:
    // - By user_id: User's memberships in any org
    // - By org_id (owned orgs only): All memberships in orgs the user owns
    result.deletedCounts.orgMaps = await deleteOrgMaps(supabase, userIds, ownedOrgIds, verbose);

    // Delete temp org requests
    result.deletedCounts.tempOrgRequests = await deleteTempOrgRequests(supabase, userIds, verbose);

    // Delete profiles
    result.deletedCounts.profiles = await deleteProfiles(supabase, userIds, verbose);

    // Delete organizations (only owned orgs)
    result.deletedCounts.organizations = await deleteOrganizations(supabase, ownedOrgIds, verbose);

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
 * Cleanup all test data matching a pattern (e.g., 'test+%@test.com')
 * Useful for cleaning up all test users at once
 *
 * Note: The default pattern matches emails generated by generateTestEmail():
 * Format: test+{title}.w{index}.{timestamp}.{randomId}@test.com
 */
export async function cleanupAllTestUsers(
  emailPattern: string = 'test+%@test.com',
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

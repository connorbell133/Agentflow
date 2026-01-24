/**
 * Cleanup script for orphaned test groups
 * Removes all groups with test name patterns from the database
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment from .env file
config({ path: resolve(process.cwd(), '.env') });

async function cleanupOrphanedTestGroups() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🧹 Cleaning up orphaned test groups...\n');

  // First, find all groups with test patterns
  const patterns = ['user-mgmt-%', 'model-mgmt-%', 'crud-test-%', 'test-group-%', 'test1'];

  let totalDeleted = 0;
  const groupsToDelete: Array<{ id: string; role: string }> = [];

  for (const pattern of patterns) {
    const isExact = pattern === 'test1';
    const query = isExact
      ? supabase.from('groups').select('id, role').eq('role', pattern)
      : supabase.from('groups').select('id, role').like('role', pattern);

    const { data, error } = await query;

    if (error) {
      console.error(`❌ Error finding groups with pattern ${pattern}:`, error.message);
    } else if (data && data.length > 0) {
      groupsToDelete.push(...data);
      console.log(`📋 Found ${data.length} groups matching ${pattern}`);
    }
  }

  console.log(`\n🗑️  Deleting ${groupsToDelete.length} groups total...\n`);

  // Delete each group with proper cascading
  for (const group of groupsToDelete) {
    console.log(`  Deleting: ${group.role} (${group.id})`);

    // Step 1: Delete group_map entries
    const { error: groupMapError } = await supabase
      .from('group_map')
      .delete()
      .eq('group_id', group.id);

    if (groupMapError) {
      console.error(`    ❌ Error deleting group_map: ${groupMapError.message}`);
      continue;
    }

    // Step 2: Delete model_map entries
    const { error: modelMapError } = await supabase
      .from('model_map')
      .delete()
      .eq('group_id', group.id);

    if (modelMapError) {
      console.error(`    ❌ Error deleting model_map: ${modelMapError.message}`);
      continue;
    }

    // Step 3: Delete the group itself
    const { error: groupError } = await supabase.from('groups').delete().eq('id', group.id);

    if (groupError) {
      console.error(`    ❌ Error deleting group: ${groupError.message}`);
    } else {
      console.log(`    ✅ Deleted: ${group.role}`);
      totalDeleted++;
    }
  }

  console.log(`\n✨ Cleanup complete! Deleted ${totalDeleted} orphaned test groups total.`);
}

cleanupOrphanedTestGroups()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
  });

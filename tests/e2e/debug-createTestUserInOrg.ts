#!/usr/bin/env tsx

/**
 * Debug script for createTestUserInOrg function
 *
 * This script tests the createTestUserInOrg function to ensure it works correctly.
 * It creates a test user, verifies it was created, then cleans up.
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.test
dotenv.config({ path: resolve(process.cwd(), '.env.test') });

import { createTestUserInOrg, deleteTestUserProfile, getOrgIdByEmail } from './utils/db-utils';
import { createSupabaseServerClient } from './utils/supabase-test-client';

async function debugCreateTestUserInOrg() {
  console.log('\n🔍 Starting createTestUserInOrg debug test...\n');

  const supabase = await createSupabaseServerClient();
  let createdOrgId: string | null = null;

  try {
    // Create a test organization first
    console.log(`1️⃣ Creating test organization...`);

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: `Test Org ${Date.now()}`,
        owner: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
      })
      .select('id')
      .single();

    if (orgError || !org) {
      throw new Error(`Failed to create test org: ${orgError?.message || 'No org returned'}`);
    }

    const orgId = org.id;
    createdOrgId = orgId;
    console.log(`   ✅ Test Org ID: ${orgId}\n`);

    // Create a test user
    const testUserEmail = `test-user-debug-${Date.now()}@example.com`;
    const testUserFullName = 'Debug Test User';

    console.log(`2️⃣ Creating test user:`);
    console.log(`   Email: ${testUserEmail}`);
    console.log(`   Full Name: ${testUserFullName}`);
    console.log(`   Org ID: ${orgId}`);

    const userId = await createTestUserInOrg(orgId, testUserEmail, testUserFullName);
    console.log(`   ✅ User created with ID: ${userId}\n`);

    // Verify the user was created in profiles table
    console.log(`3️⃣ Verifying user in profiles table...`);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, signup_complete')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error(
        `❌ Profile verification failed: ${profileError?.message || 'No profile found'}`
      );
    }

    console.log(`   ✅ Profile found:`);
    console.log(`      ID: ${profile.id}`);
    console.log(`      Email: ${profile.email}`);
    console.log(`      Full Name: ${profile.full_name}`);
    console.log(`      Signup Complete: ${profile.signup_complete}\n`);

    // Verify the user was added to org_map
    console.log(`4️⃣ Verifying user in org_map table...`);

    const { data: orgMap, error: orgMapError } = await supabase
      .from('org_map')
      .select('user_id, org_id')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .single();

    if (orgMapError || !orgMap) {
      throw new Error(
        `❌ org_map verification failed: ${orgMapError?.message || 'No org_map entry found'}`
      );
    }

    console.log(`   ✅ org_map entry found:`);
    console.log(`      User ID: ${orgMap.user_id}`);
    console.log(`      Org ID: ${orgMap.org_id}\n`);

    // Cleanup
    console.log(`5️⃣ Cleaning up test user...`);
    await deleteTestUserProfile(userId);
    console.log(`   ✅ Test user deleted\n`);

    // Cleanup test org
    if (createdOrgId) {
      console.log(`6️⃣ Cleaning up test organization...`);
      const { error: orgDeleteError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', createdOrgId);

      if (orgDeleteError) {
        console.warn(`   ⚠️ Warning: Failed to delete test org: ${orgDeleteError.message}`);
      } else {
        console.log(`   ✅ Test organization deleted\n`);
      }
    }

    console.log('✅ All tests passed! createTestUserInOrg is working correctly.\n');
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    console.error('\n');

    // Cleanup on error
    if (createdOrgId) {
      try {
        await supabase.from('organizations').delete().eq('id', createdOrgId);
        console.log('🧹 Cleaned up test organization');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup test org:', cleanupError);
      }
    }

    process.exit(1);
  }
}

// Run the debug test
debugCreateTestUserInOrg();

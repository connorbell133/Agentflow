import { createClient } from '@supabase/supabase-js';

/**
 * Complete cleanup script for test admin user.
 * Deletes both Supabase Auth user AND database profile to ensure clean test state.
 */
async function cleanupAdminUserComplete() {
  const email = process.env.TEST_ADMIN_EMAIL || 'admin@gmail.com';
  console.log(`\n🧹 Complete cleanup of test admin user: ${email}\n`);

  // Get Supabase credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    process.exit(1);
  }

  // Create admin client for both auth and database operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Step 1: Delete from Supabase Auth
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Error listing users:', listError);
  } else {
    const authUser = users.users.find(u => u.email === email);
    if (authUser) {
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(authUser.id);
      if (deleteAuthError) {
        console.error('❌ Error deleting auth user:', deleteAuthError);
      } else {
        console.log(`✅ Deleted Supabase Auth user: ${email}`);
      }
    } else {
      console.log('ℹ️  No Supabase Auth user found');
    }
  }

  // Step 2: Delete from database (profile and related data)

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (!profile) {
    console.log('ℹ️  No profile found in database');
    console.log('\n✅ Cleanup complete!\n');
    return;
  }

  console.log(`Found profile: ${profile.id}`);

  // Delete related data in correct order (respecting foreign key constraints)

  // 1. Delete conversations (and cascade to messages)
  const { error: convError } = await supabase
    .from('conversations')
    .delete()
    .eq('user_id', profile.id);
  if (!convError) {
    console.log('✅ Deleted conversations and messages');
  } else if (convError.code !== 'PGRST116') {
    // PGRST116 = no rows found
    console.log('⚠️  Error deleting conversations:', convError.message);
  }

  // 2. Delete temp org requests
  const { error: reqError } = await supabase
    .from('temp_org_requests')
    .delete()
    .eq('requester_id', profile.id);
  if (!reqError) {
    console.log('✅ Deleted temp org requests');
  } else if (reqError.code !== 'PGRST116') {
    console.log('⚠️  Error deleting temp org requests:', reqError.message);
  }

  // 3. Get organization IDs this user owns
  const { data: orgs } = await supabase.from('organizations').select('id').eq('owner', profile.id);

  if (orgs && orgs.length > 0) {
    for (const org of orgs) {
      // Delete org_map entries for this org
      await supabase.from('org_map').delete().eq('org_id', org.id);
      console.log(`✅ Deleted org_map entries for org ${org.id}`);

      // Delete the organization
      await supabase.from('organizations').delete().eq('id', org.id);
      console.log(`✅ Deleted organization ${org.id}`);
    }
  }

  // 4. Delete org_map entries for this user
  const { error: orgMapError } = await supabase.from('org_map').delete().eq('user_id', profile.id);
  if (!orgMapError) {
    console.log('✅ Deleted user org_map entries');
  } else if (orgMapError.code !== 'PGRST116') {
    console.log('⚠️  Error deleting org_map:', orgMapError.message);
  }

  // 5. Finally delete the profile
  const { error: profileError } = await supabase.from('profiles').delete().eq('id', profile.id);
  if (!profileError) {
    console.log('✅ Deleted profile');
  } else {
    console.error('❌ Error deleting profile:', profileError);
  }

  console.log('\n✅ Complete cleanup finished!\n');
}

cleanupAdminUserComplete().catch(error => {
  console.error('Fatal error during cleanup:', error);
  process.exit(1);
});

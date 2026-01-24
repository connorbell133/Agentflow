import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test'), override: true });

/**
 * Cleans up the invited test user from Supabase Auth and database.
 * This ensures a fresh state for invite tests that require signing up a new user.
 *
 * Run with: npx tsx tests/cleanup-invited-user.ts [email]
 */
export async function cleanupInvitedUser(email?: string) {
  const targetEmail = email || process.env.TEST_INVITED_USER_EMAIL || 'test.user2@example.com';
  console.log(`\n🧹 Cleaning up invited test user: ${targetEmail}\n`);

  // Create Supabase client directly (not through Next.js server utils)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get user profile from Supabase
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', targetEmail)
    .single();

  // Delete invites for this email (do this first, before deleting profile)
  const { error: inviteError } = await supabase.from('invites').delete().eq('invitee', targetEmail);

  if (!inviteError) {
    console.log('✓ Deleted invites');
  } else {
    console.log(`Note: Could not delete invites: ${inviteError.message}`);
  }

  if (profile) {
    console.log(`Found profile: ${profile.id}`);

    // Delete from group_map
    const { error: groupMapError } = await supabase
      .from('group_map')
      .delete()
      .eq('user_id', profile.id);

    if (!groupMapError) {
      console.log('✓ Deleted group_map entries');
    }

    // Delete from org_map
    const { error: orgMapError } = await supabase
      .from('org_map')
      .delete()
      .eq('user_id', profile.id);

    if (!orgMapError) {
      console.log('✓ Deleted org_map entries');
    }

    // Delete temp org requests
    const { error: reqError } = await supabase
      .from('temp_org_requests')
      .delete()
      .eq('requester_id', profile.id);

    if (!reqError) {
      console.log('✓ Deleted temp org requests');
    }

    // Delete the profile
    const { error: profileError } = await supabase.from('profiles').delete().eq('id', profile.id);

    if (!profileError) {
      console.log('✓ Deleted profile');
    }
  } else {
    console.log('No profile found in Supabase');
  }

  // Also clean up invites by email even if profile doesn't exist
  const { error: inviteCleanupError } = await supabase
    .from('invites')
    .delete()
    .eq('email', targetEmail);

  if (!inviteCleanupError) {
    console.log('✓ Cleaned up any pending invites');
  }

  // Delete user from Supabase Auth
  // IMPORTANT: Check by email, not just profile ID, because:
  // - User might exist in auth.users but not in profiles
  // - This happens if signup fails partway through
  // - We need to clean up auth users regardless of profile state
  console.log('Checking for Supabase Auth user...');

  try {
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (!listError && authUsers) {
      const authUser = authUsers.users.find(u => u.email === targetEmail);

      if (authUser) {
        console.log(`Found auth user with email ${targetEmail} (ID: ${authUser.id})`);
        const { error: authError } = await supabase.auth.admin.deleteUser(authUser.id);

        if (!authError) {
          console.log('✓ Deleted Supabase Auth user');
        } else {
          console.log(`Note: Could not delete Supabase Auth user: ${authError.message}`);
        }
      } else {
        console.log('No auth user found with that email');
      }
    } else if (listError) {
      console.log(`Note: Could not list auth users: ${listError.message}`);
    }
  } catch (e) {
    console.log('Note: Could not check Supabase Auth:', (e as Error).message);
  }

  console.log('\n✅ Cleanup complete!\n');
}

// Run as standalone script
cleanupInvitedUser(process.argv[2]).catch(console.error);

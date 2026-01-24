import { createSupabaseServerClient } from '@/lib/supabase/server';

async function cleanupAdminUser() {
  const email = process.env.TEST_ADMIN_EMAIL || 'admin.test@example.com';
  console.log(`\n🧹 Cleaning up test admin user: ${email}\n`);

  const supabase = await createSupabaseServerClient();

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (!profile) {
    console.log('✓ No profile found - nothing to clean up');
    return;
  }

  console.log(`Found profile: ${profile.id}`);

  // Delete temp org requests
  const { error: reqError } = await supabase
    .from('temp_org_requests')
    .delete()
    .eq('requester_id', profile.id);

  if (!reqError) {
    console.log('✓ Deleted temp org requests');
  }

  // Delete from orgMap
  const { error: orgMapError } = await supabase.from('org_map').delete().eq('user_id', profile.id);

  if (!orgMapError) {
    console.log('✓ Deleted orgMap entries');
  }

  // Ensure signup_complete is set to true to prevent onboarding redirect
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ signup_complete: true })
    .eq('id', profile.id);

  if (!profileError) {
    console.log('✓ Set signup_complete = true');
  }

  // Note: We're NOT deleting the profile itself to preserve the admin user for testing
  // We're just cleaning up org-related data to allow fresh test runs

  console.log('\n✅ Cleanup complete!\n');
}

cleanupAdminUser().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test'), override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function checkInviteState() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const targetEmail = 'test.user2@example.com';

  console.log('\n🔍 Checking invite state for:', targetEmail);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check Supabase Auth user
  const { data: authData } = await supabase.auth.admin.listUsers();
  const authUser = authData?.users.find(u => u.email === targetEmail);

  if (authUser) {
    console.log('✅ Supabase Auth User:');
    console.log(`   ID: ${authUser.id}`);
    console.log(`   Email: ${authUser.email}`);
    console.log(`   Created: ${authUser.created_at}`);
  } else {
    console.log('❌ No Supabase Auth user found');
  }

  // Check profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', targetEmail)
    .single();

  if (profile) {
    console.log('\n✅ Profile:');
    console.log(`   ID: ${profile.id}`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Full name: ${profile.full_name}`);
    console.log(`   Signup complete: ${profile.signup_complete}`);
  } else {
    console.log('\n❌ No profile found');
  }

  // Check invites
  const { data: invites } = await supabase.from('invites').select('*').eq('invitee', targetEmail);

  if (invites && invites.length > 0) {
    console.log(`\n✅ Found ${invites.length} invite(s):`);
    invites.forEach((invite, i) => {
      console.log(`\n   Invite #${i + 1}:`);
      console.log(`   ID: ${invite.id}`);
      console.log(`   Org ID: ${invite.org_id}`);
      console.log(`   Inviter: ${invite.inviter}`);
      console.log(`   Invitee: ${invite.invitee}`);
      console.log(`   Group ID: ${invite.group_id}`);
      console.log(`   Status: ${invite.status || 'pending'}`);
      console.log(`   Created: ${invite.created_at}`);
    });
  } else {
    console.log('\n❌ No invites found');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkInviteState().catch(console.error);

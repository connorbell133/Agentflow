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

async function testRLS() {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const targetEmail = 'test.user2@example.com';

  console.log('\n🔍 Testing RLS for invite queries...\n');

  // Get the user
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
  const authUser = authData?.users.find(u => u.email === targetEmail);

  if (!authUser) {
    console.error('❌ No auth user found');
    return;
  }

  console.log(`✅ Auth user ID: ${authUser.id}`);
  console.log(`   Email: ${authUser.email}\n`);

  // Try query with SERVICE ROLE (no RLS)
  console.log('📋 Query 1: Using SERVICE ROLE (bypasses RLS)');
  const { data: invitesAdmin, error: errorAdmin } = await supabaseAdmin
    .from('invites')
    .select('*')
    .eq('invitee', targetEmail);

  console.log(`   Found: ${invitesAdmin?.length || 0} invites`);
  if (errorAdmin) {
    console.error(`   Error:`, errorAdmin);
  }

  // Now create a client with user's JWT to test RLS
  console.log('\n📋 Query 2: Using USER JWT (RLS applied)');

  // First, generate an access token for the user
  const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: targetEmail,
  });

  if (tokenError || !tokenData.properties?.access_token) {
    console.error('❌ Failed to generate access token:', tokenError);
    return;
  }

  // Create client with user's token
  const supabaseAsUser = createClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: {
          Authorization: `Bearer ${tokenData.properties.access_token}`,
        },
      },
    }
  );

  const { data: invitesUser, error: errorUser } = await supabaseAsUser
    .from('invites')
    .select('*')
    .eq('invitee', targetEmail);

  console.log(`   Found: ${invitesUser?.length || 0} invites`);
  if (errorUser) {
    console.error(`   Error:`, errorUser);
  }

  if ((invitesAdmin?.length || 0) > (invitesUser?.length || 0)) {
    console.log('\n❌ RLS IS BLOCKING THE INVITES!');
    console.log(`   Service role sees ${invitesAdmin?.length} invites`);
    console.log(`   User sees ${invitesUser?.length} invites`);
    console.log('\n🔍 This is the root cause of the test failure!');
  } else {
    console.log('\n✅ RLS is working correctly');
  }
}

testRLS().catch(console.error);

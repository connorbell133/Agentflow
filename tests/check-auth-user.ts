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

async function checkAuthUser() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('\n🔍 Checking Supabase Auth users...\n');

  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('❌ Error listing users:', error);
    return;
  }

  const targetEmail = 'test.user2@example.com';
  const user = data.users.find(u => u.email === targetEmail);

  if (user) {
    console.log(`✅ Found auth user: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Created: ${user.created_at}`);
    console.log(`   Last sign in: ${user.last_sign_in_at || 'Never'}`);
    console.log(`   Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);

    // Try to delete
    console.log('\n🗑️  Attempting to delete user from Supabase Auth...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('❌ Error deleting user:', deleteError);
    } else {
      console.log('✅ Successfully deleted user from Supabase Auth');
    }
  } else {
    console.log(`❌ No auth user found for ${targetEmail}`);
  }

  console.log('\n');
}

checkAuthUser().catch(console.error);

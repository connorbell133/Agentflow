import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const email = 'admin@gmail.com';

async function deleteAuthUser() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Get user by email
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  const user = users.users.find(u => u.email === email);

  if (!user) {
    console.log(`User ${email} not found in Supabase Auth`);
    return;
  }

  // Delete user
  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('Error deleting user:', deleteError);
    return;
  }

  console.log(`✅ Deleted user ${email} from Supabase Auth`);
}

deleteAuthUser().catch(console.error);

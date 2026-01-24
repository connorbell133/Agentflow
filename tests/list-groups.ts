/**
 * List groups in the database
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment from .env file
config({ path: resolve(process.cwd(), '.env') });

async function listGroups() {
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

  console.log('📋 Recent groups in database:\n');

  const { data, error } = await supabase
    .from('groups')
    .select('id, role, org_id, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data.length} groups:\n`);
    data.forEach((g, i) => {
      console.log(`${i + 1}. ${g.role}`);
      console.log(`   ID: ${g.id}`);
      console.log(`   Org: ${g.org_id.slice(0, 8)}...`);
      console.log(`   Created: ${new Date(g.created_at).toLocaleString()}`);
      console.log();
    });
  }
}

listGroups()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });

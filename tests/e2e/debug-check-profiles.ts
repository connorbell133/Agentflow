#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.test
dotenv.config({ path: resolve(process.cwd(), '.env.test') });

import { createSupabaseServerClient } from './utils/supabase-test-client';

async function checkProfiles() {
  const supabase = await createSupabaseServerClient();
  const email = process.env.TEST_ADMIN_EMAIL || 'admin.test@example.com';

  console.log(`\n🔍 Checking profiles for: ${email}\n`);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', email);

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log(`Found ${data?.length || 0} profile(s):\n`);
  console.log(JSON.stringify(data, null, 2));
  console.log('\n');
}

checkProfiles();

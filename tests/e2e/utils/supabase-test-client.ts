/**
 * Supabase Test Client
 *
 * A simple Supabase client for E2E tests that bypasses user authentication.
 * This bypasses the RLS authentication layer since tests need direct database access.
 *
 * This client uses the service role key which bypasses RLS entirely,
 * allowing tests to read/write any data.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

let testClient: SupabaseClient<Database> | null = null;

/**
 * Creates a Supabase client for E2E testing purposes.
 * Uses the service role key to bypass RLS.
 *
 * @returns A Supabase client instance
 */
export async function createSupabaseTestClient(): Promise<SupabaseClient<Database>> {
  if (testClient) {
    return testClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' + 'Make sure .env.test is loaded.'
    );
  }

  if (!supabaseServiceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
        'This key is required for E2E tests to bypass RLS. ' +
        'Make sure .env.test is loaded.'
    );
  }

  testClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        apikey: supabaseServiceRoleKey,
      },
    },
  });

  return testClient;
}

// Alias for backwards compatibility with existing test code
export const createSupabaseServerClient = createSupabaseTestClient;

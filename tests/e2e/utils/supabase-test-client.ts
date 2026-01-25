/**
 * Supabase Test Client
 *
 * Provides Supabase clients for E2E tests with two modes:
 * 1. Service role client - For admin operations (user creation, cleanup)
 * 2. Authenticated client - For testing RLS-protected operations with real user sessions
 *
 * With FORCE ROW LEVEL SECURITY enabled, most test operations should use
 * authenticated clients to properly test RLS policies.
 */

import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

let serviceRoleClient: SupabaseClient<Database> | null = null;

/**
 * Creates a Supabase client using the service role key.
 *
 * **IMPORTANT**: With FORCE ROW LEVEL SECURITY enabled, this client is ONLY for:
 * - Creating/deleting auth users (admin operations)
 * - Cleanup operations
 * - Operations that have explicit service_role bypass policies
 *
 * For testing application logic, use createAuthenticatedClient() instead.
 *
 * @returns A Supabase client with service role privileges
 */
export async function createSupabaseTestClient(): Promise<SupabaseClient<Database>> {
  if (serviceRoleClient) {
    return serviceRoleClient;
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

  serviceRoleClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
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
        // CRITICAL: PostgREST uses Authorization header to determine role for RLS
        // Without this, the client is treated as 'anon' even with service role key
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
      },
    },
  });

  return serviceRoleClient;
}

/**
 * Creates a Supabase client authenticated with a specific user's session.
 *
 * **Use this for testing RLS-protected operations** to ensure your tests
 * properly validate that RLS policies are working correctly.
 *
 * @param session User session from signInWithPassword or createAuthenticatedUser
 * @returns A Supabase client authenticated as the specified user
 */
export async function createAuthenticatedClient(
  session: Session
): Promise<SupabaseClient<Database>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.');
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.');
  }

  // Create client with the access token in the Authorization header
  // This ensures PostgREST recognizes the user for RLS policies
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  });

  // Also set the session on the auth object for completeness
  await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  return client;
}

// Alias for backwards compatibility with existing test code
export const createSupabaseServerClient = createSupabaseTestClient;

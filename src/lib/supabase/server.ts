/**
 * Supabase Server Client with Supabase Auth
 *
 * This client is used in server-side code (Server Components, Server Actions, API Routes).
 * It creates a Supabase client that uses Supabase Auth sessions with @supabase/ssr.
 *
 * ARCHITECTURE:
 * 1. Uses @supabase/ssr for proper SSR session management
 * 2. Automatically handles cookies for session persistence
 * 3. RLS policies use auth.uid() to identify the authenticated user
 * 4. Session is automatically validated on each request
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { Database } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Internal: Memoized Supabase client creation with SSR support.
 * React's cache() ensures this only runs once per server request.
 */
const getSupabaseClientCached = cache(async (): Promise<SupabaseClient<Database>> => {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Ignore - called from Server Component
        }
      },
    },
  });
});

/**
 * Create a Supabase client for server-side use with Supabase Auth.
 * This uses @supabase/ssr for proper SSR session management.
 *
 * RLS policies automatically enforce data access based on auth.uid().
 *
 * @example
 * // In a Server Component or Server Action
 * import { createSupabaseServerClient } from '@/lib/supabase/server'
 *
 * const supabase = await createSupabaseServerClient()
 * const { data } = await supabase
 *   .from('conversations')
 *   .select()
 *   // RLS automatically filters by authenticated user
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  return getSupabaseClientCached();
}

/**
 * Create a Supabase client for read-only server operations.
 * Use this when you need to read data but don't need to modify it.
 */
export async function createSupabaseServerClientReadOnly(): Promise<SupabaseClient<Database>> {
  return createSupabaseServerClient();
}

/**
 * Get the current user ID from the Supabase session.
 *
 * @returns User ID or null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

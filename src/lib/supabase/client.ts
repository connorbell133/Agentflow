/**
 * Supabase Browser Client with Supabase Auth
 *
 * This client is used in client-side React components.
 * Uses @supabase/ssr for proper browser session management.
 * RLS policies automatically enforce data access based on the authenticated user.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client for browser use with Supabase Auth.
 * Uses @supabase/ssr for proper browser session management.
 *
 * RLS policies automatically enforce data access based on auth.uid().
 *
 * @example
 * ```tsx
 * 'use client'
 * import { getSupabaseBrowserClient } from '@/lib/supabase/client'
 *
 * function MyComponent() {
 *   const client = getSupabaseBrowserClient()
 *
 *   // RLS automatically filters by authenticated user
 *   const { data } = await client
 *     .from('conversations')
 *     .select()
 * }
 * ```
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Alias for getSupabaseBrowserClient for backwards compatibility
 */
export const createSupabaseClient = getSupabaseBrowserClient;

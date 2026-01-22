/**
 * Supabase Browser Client with Clerk Authentication
 *
 * This client is used in client-side React components.
 * It creates a Supabase client that uses Clerk session tokens for RLS.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Create a Supabase client that uses the Clerk session for authentication.
 * This enables Row Level Security (RLS) policies based on the Clerk user ID.
 *
 * @param getToken - Function to get the Clerk session token (from useSession().session.getToken)
 * @returns A Supabase client configured with Clerk authentication
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useSession } from '@clerk/nextjs'
 * import { createClerkSupabaseClient } from '@/lib/supabase/client'
 *
 * function MyComponent() {
 *   const { session } = useSession()
 *   // Use Supabase JWT template for RLS policies
 *   const client = createClerkSupabaseClient(
 *     () => session?.getToken({ template: 'supabase' }) ?? null
 *   )
 *   // Use client for RLS-protected queries
 * }
 * ```
 */
export function createClerkSupabaseClient(
  getToken: () => Promise<string | null> | string | null
): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => {
      // getToken is provided by the caller with the template already configured
      // On client-side, Clerk caches tokens so this won't cause rate limiting
      const token = await getToken()
      return token ?? null
    },
  })
}

/**
 * @deprecated Use createClerkSupabaseClient instead for RLS support.
 * This client does not include Clerk authentication and RLS policies will not work.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey)
}

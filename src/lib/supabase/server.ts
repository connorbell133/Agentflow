/**
 * Supabase Server Client with Clerk Authentication
 *
 * This client is used in server-side code (Server Components, Server Actions, API Routes).
 * It creates a Supabase client that uses Clerk session tokens for RLS.
 *
 * ARCHITECTURE FOR SCALE:
 * 1. Middleware gets the Supabase token ONCE per request and passes it via header
 * 2. Server components/actions read from header first (no Clerk API call)
 * 3. Falls back to Clerk API only if header is missing
 * 4. React's cache() memoizes within the same request for additional safety
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { cache } from 'react'
import type { Database } from './types'
import { SUPABASE_TOKEN_HEADER } from '@/middleware'

/**
 * Internal: Get the Supabase token, preferring the middleware-injected header.
 * This avoids hitting Clerk's API on every server action.
 */
async function getSupabaseToken(): Promise<string | null> {
  // First, try to read from middleware-injected header (no Clerk API call)
  try {
    const headersList = await headers()
    const tokenFromHeader = headersList.get(SUPABASE_TOKEN_HEADER)
    if (tokenFromHeader) {
      return tokenFromHeader
    }
  } catch {
    // headers() not available (e.g., during build) - fall through to Clerk
  }

  // Fallback: get token from Clerk (makes API call)
  // Use Supabase JWT template for RLS policies using auth.jwt()->>'sub'
  try {
    const { getToken } = await auth()
    return await getToken({ template: 'supabase' })
  } catch {
    return null
  }
}

/**
 * Internal: Memoized Supabase client creation.
 * React's cache() ensures this only runs once per server request,
 * even when called from multiple server actions/components.
 */
const getSupabaseClientCached = cache(async (): Promise<SupabaseClient<Database>> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  // Get token from middleware header or Clerk fallback
  const cachedToken = await getSupabaseToken()

  // Create client with proper authorization header
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: cachedToken
        ? {
          Authorization: `Bearer ${cachedToken}`,
        }
        : {},
    },
    auth: {
      persistSession: false,
    },
  })
})

/**
 * Create a Supabase client for server-side use with Clerk authentication.
 * This enables Row Level Security (RLS) policies based on the Clerk user ID.
 *
 * PERFORMANCE: This is memoized per-request using React's cache().
 * Multiple calls within the same request reuse the same client and token,
 * preventing Clerk rate limit issues.
 *
 * @example
 * // In a Server Component
 * const supabase = await createSupabaseServerClient()
 * const { data } = await supabase.from('profiles').select()
 *
 * @example
 * // In a Server Action
 * const supabase = await createSupabaseServerClient()
 * await supabase.from('conversations').insert({ ... })
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  return getSupabaseClientCached()
}

/**
 * Create a Supabase client for read-only server operations with Clerk authentication.
 * Use this when you need RLS but don't need to modify data.
 */
export async function createSupabaseServerClientReadOnly(): Promise<SupabaseClient<Database>> {
  return createSupabaseServerClient()
}

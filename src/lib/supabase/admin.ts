/**
 * Supabase Admin Client (Service Role)
 *
 * This client bypasses Row Level Security (RLS) and should ONLY be used for:
 * - Clerk webhooks (user sync)
 * - Cron jobs
 * - Admin operations that require elevated access
 * - Server-side operations that need to bypass RLS
 *
 * SECURITY WARNING: Never expose the service role key to the client!
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

let adminClient: ReturnType<typeof createClient<Database>> | null = null

/**
 * Get the Supabase admin client (singleton pattern)
 * This client uses the service role key and bypasses RLS
 *
 * @example
 * // In a webhook handler
 * const supabase = getSupabaseAdminClient()
 * await supabase.from('profiles').upsert({ id: clerkUserId, ... })
 */
export function getSupabaseAdminClient() {
  if (adminClient) {
    return adminClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable'
    )
  }

  if (!supabaseServiceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. This is required for admin operations.'
    )
  }

  adminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}

/**
 * Create a new Supabase admin client
 * Use this when you need a fresh client instance
 */
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable'
    )
  }

  if (!supabaseServiceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. This is required for admin operations.'
    )
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

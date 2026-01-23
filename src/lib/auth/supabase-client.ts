/**
 * Supabase Auth Browser Client
 *
 * Creates a Supabase client for client-side use with Supabase Auth.
 * Uses @supabase/ssr for browser-based cookie management.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../supabase/types';

/**
 * Create a Supabase client for client-side use in React components.
 *
 * This client automatically handles:
 * - Cookie-based session management
 * - Authentication state
 * - Real-time subscriptions
 * - RLS enforcement using auth.uid()
 *
 * @example
 * ```tsx
 * 'use client'
 * import { createClient } from '@/lib/auth/supabase-client'
 * import { useEffect, useState } from 'react'
 *
 * export default function MyComponent() {
 *   const [user, setUser] = useState(null)
 *   const supabase = createClient()
 *
 *   useEffect(() => {
 *     // Get current user
 *     supabase.auth.getUser().then(({ data: { user } }) => {
 *       setUser(user)
 *     })
 *
 *     // Listen for auth changes
 *     const { data: { subscription } } = supabase.auth.onAuthStateChange(
 *       (_event, session) => {
 *         setUser(session?.user ?? null)
 *       }
 *     )
 *
 *     return () => subscription.unsubscribe()
 *   }, [])
 *
 *   return <div>{user?.email}</div>
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Sign in
 * const supabase = createClient()
 * const { error } = await supabase.auth.signInWithPassword({
 *   email: 'user@example.com',
 *   password: 'password'
 * })
 * ```
 *
 * @example
 * ```tsx
 * // Sign out
 * const supabase = createClient()
 * await supabase.auth.signOut()
 * ```
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Supabase Auth Server Client
 *
 * Creates a Supabase client for server-side use with Supabase Auth.
 * Uses @supabase/ssr for Next.js App Router cookie management.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '../supabase/types';

/**
 * Create a Supabase client for server-side use in Server Components and Server Actions.
 *
 * This client automatically handles:
 * - Cookie-based session management
 * - Authentication state
 * - RLS enforcement using auth.uid()
 *
 * @example
 * ```ts
 * // In a Server Component
 * import { createClient } from '@/lib/auth/supabase-server'
 *
 * export default async function Page() {
 *   const supabase = await createClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 *
 *   if (!user) redirect('/sign-in')
 *
 *   const { data } = await supabase
 *     .from('conversations')
 *     .select()
 *   // RLS automatically filters to current user's conversations
 *
 *   return <div>{data.length} conversations</div>
 * }
 * ```
 *
 * @example
 * ```ts
 * // In a Server Action
 * 'use server'
 * import { createClient } from '@/lib/auth/supabase-server'
 *
 * export async function deleteConversation(id: string) {
 *   const supabase = await createClient()
 *   const { error } = await supabase
 *     .from('conversations')
 *     .delete()
 *     .eq('id', id)
 *   // RLS ensures user can only delete their own conversations
 * }
 * ```
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

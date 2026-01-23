/**
 * Server-side Authentication Utilities
 *
 * Helper functions for authentication in Server Components and Server Actions.
 */

import { createClient } from './supabase-server';
import { cache } from 'react';

/**
 * Authentication result interface
 */
export interface AuthResult {
  /** User ID (null if not authenticated) */
  userId: string | null;
  /** User object from Supabase Auth */
  user: any | null;
  /** Organization ID from user metadata */
  org_id: string | null;
  /** User role from user metadata */
  role: string | null;
}

/**
 * Get the current authenticated user in Server Components or Server Actions.
 *
 * This is cached per request using React's cache() function, so you can call it
 * multiple times without additional database queries.
 *
 * @returns Authentication result with user info
 *
 * @example
 * ```ts
 * import { auth } from '@/lib/auth/server'
 *
 * export default async function Page() {
 *   const { userId, user, org_id } = await auth()
 *
 *   if (!userId) {
 *     redirect('/sign-in')
 *   }
 *
 *   return <div>Hello {user.email}</div>
 * }
 * ```
 *
 * @example
 * ```ts
 * // In a Server Action
 * 'use server'
 * import { auth } from '@/lib/auth/server'
 *
 * export async function myAction() {
 *   const { userId, org_id } = await auth()
 *
 *   if (!userId) {
 *     throw new Error('Unauthorized')
 *   }
 *
 *   // Use userId and org_id for authorization
 * }
 * ```
 */
export const auth = cache(async (): Promise<AuthResult> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      user: null,
      org_id: null,
      role: null,
    };
  }

  return {
    userId: user.id,
    user,
    org_id: user.user_metadata?.org_id ?? null,
    role: user.user_metadata?.role ?? null,
  };
});

/**
 * Require authentication in Server Components or Server Actions.
 * Throws an error if user is not authenticated.
 *
 * @returns Authentication result (guaranteed to have user)
 * @throws Error if not authenticated
 *
 * @example
 * ```ts
 * import { requireAuth } from '@/lib/auth/server'
 *
 * export default async function ProtectedPage() {
 *   const { userId, user } = await requireAuth()
 *   // Guaranteed to have user here
 *
 *   return <div>Welcome {user.email}</div>
 * }
 * ```
 */
export async function requireAuth(): Promise<
  Required<Omit<AuthResult, 'org_id' | 'role'>> & Pick<AuthResult, 'org_id' | 'role'>
> {
  const authResult = await auth();

  if (!authResult.userId || !authResult.user) {
    throw new Error('Unauthorized - Authentication required');
  }

  return authResult as Required<Omit<AuthResult, 'org_id' | 'role'>> &
    Pick<AuthResult, 'org_id' | 'role'>;
}

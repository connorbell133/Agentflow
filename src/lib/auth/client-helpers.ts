/**
 * Client-side Authentication Helpers
 *
 * Convenience functions for client components to use Supabase Auth.
 * These wrap the Supabase client methods for common operations.
 */

'use client';

import { createClient } from './supabase-client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }

  // Redirect to sign-in page
  window.location.href = '/sign-in';
}

/**
 * Hook to get current session
 * Returns session data and loading state
 */
export function useSession() {
  const [session, setSession] = useState<{ user: User } | null>(null);
  const [isPending, setIsPending] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSession(user ? { user } : null);
      setIsPending(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session?.user ? { user: session.user } : null);
      setIsPending(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    data: session,
    isPending,
  };
}

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/hooks/auth/use-user';
import { getUserInvites } from '@/actions/organization/invites';
import { Invite } from '@/lib/supabase/types';

export const usePendingInvites = () => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isUserLoaded } = useUser();
  const isLoaded = isUserLoaded;
  const fetchedEmailRef = useRef<string | null>(null);
  const fetchingRef = useRef<boolean>(false);

  useEffect(() => {
    const email = user?.email;

    console.log('[usePendingInvites] 🔄 useEffect triggered', {
      isLoaded,
      email,
      fetchedEmail: fetchedEmailRef.current,
      isFetching: fetchingRef.current,
    });

    // Exit early if not loaded or no email
    if (!isLoaded) {
      console.log('[usePendingInvites] ⏸️  Not loaded yet, skipping');
      return;
    }

    if (!email) {
      console.log('[usePendingInvites] ⚠️  No email, setting loading to false');
      setLoading(false);
      return;
    }

    // Skip if we've already fetched for this email or currently fetching
    if (fetchedEmailRef.current === email || fetchingRef.current) {
      console.log('[usePendingInvites] ⏭️  Already fetched or fetching, skipping');
      return;
    }

    // Mark as fetching
    fetchingRef.current = true;
    console.log('[usePendingInvites] 🚀 Starting fetch for:', email);

    const fetchInvites = async () => {
      try {
        setLoading(true);
        console.log('[usePendingInvites] 📡 Calling getUserInvites...');
        const data = await getUserInvites(email);
        console.log('[usePendingInvites] ✅ Received data:', {
          count: data?.length || 0,
          hasData: !!data,
        });
        setInvites(data || []);
        fetchedEmailRef.current = email;
      } catch (error) {
        console.error('[usePendingInvites] ❌ Error fetching invites:', error);
        setInvites([]);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
        console.log('[usePendingInvites] ✅ Fetch complete');
      }
    };

    fetchInvites();
  }, [isLoaded, user?.email]);

  const refetch = async () => {
    const email = user?.email;
    if (!email || fetchingRef.current) return;

    fetchingRef.current = true;
    fetchedEmailRef.current = null;

    try {
      setLoading(true);
      const data = await getUserInvites(email);
      setInvites(data || []);
      fetchedEmailRef.current = email;
    } catch (error) {
      console.error('Error refetching invites:', error);
      setInvites([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  return {
    invites,
    loading,
    refetch,
  };
};

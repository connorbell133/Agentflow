import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { getUserInvites } from '@/actions/organization/invites';
import { Invite } from '@/lib/supabase/types';

export const usePendingInvites = () => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isLoaded } = useUser();
  const fetchedEmailRef = useRef<string | null>(null);
  const fetchingRef = useRef<boolean>(false);

  useEffect(() => {
    const email = user?.primaryEmailAddress?.emailAddress;

    // Exit early if not loaded or no email
    if (!isLoaded) {
      return;
    }

    if (!email) {
      setLoading(false);
      return;
    }

    // Skip if we've already fetched for this email or currently fetching
    if (fetchedEmailRef.current === email || fetchingRef.current) {
      return;
    }

    // Mark as fetching
    fetchingRef.current = true;

    const fetchInvites = async () => {
      try {
        setLoading(true);
        const data = await getUserInvites(email);
        setInvites(data || []);
        fetchedEmailRef.current = email;
      } catch (error) {
        console.error('Error fetching invites:', error);
        setInvites([]);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchInvites();
  }, [isLoaded, user?.primaryEmailAddress?.emailAddress]);

  const refetch = async () => {
    const email = user?.primaryEmailAddress?.emailAddress;
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
    refetch
  };
};
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/auth/supabase-client';
import { Profile } from '@/lib/supabase/types';
import { getOrgUsers, getUserGroups, getUserProfile } from '@/actions/auth/users';
import {
  getOrgUsersLastConversation,
  getUsersLastConversation,
} from '@/actions/chat/conversations';
import { getOrgInvites } from '@/actions/organization/invites';
import { getDifferenceInDays } from '@/utils/formatters/date';
import { createLogger } from '@/lib/infrastructure/logger';
import type { User } from '@supabase/supabase-js';

const logger = createLogger('use-user.ts');

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userAdmin, setUserAdmin] = useState<boolean | null>(false);

  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const getUser = async () => {
      if (!user) {
        logger.debug('No user found');
        return;
      }

      // get user profile using Supabase user ID
      const userProfile = await getUserProfile(user.id);
      logger.debug('User Profile: ', userProfile);
      if (userProfile) {
        setProfile((userProfile as any)[0]);
      }

      // get user group
      const profileData = await getUserGroups(user.id);
      logger.debug('Profile Data: ', profileData);
      if (profileData && profileData.length > 0) {
        // map to array of group names
        const groups = profileData.map((profile: any) => profile.groups?.role).filter(Boolean);
        if (groups.includes('admin')) {
          setUserAdmin(true);
        } else {
          setUserAdmin(false);
        }
      } else {
        // No groups found - default to non-admin
        logger.debug('No groups found for user, defaulting to non-admin');
        setUserAdmin(false);
      }
    };

    if (!loading) {
      getUser();
    }
  }, [user, loading]);

  return {
    user: user,
    profile: profile as Profile,
    userAdmin: userAdmin as boolean,
    isUserLoaded: !loading,
  };
};

export const useUsers = (org: string) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [userActivity, setUserActivity] = useState<Record<string, string | null>>({});
  const [pendingByEmail, setPendingByEmail] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getUsers = async () => {
      if (!org) {
        setUsers([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const [data, lastConvos, invites, globalLast] = await Promise.all([
        getOrgUsers(org),
        getOrgUsersLastConversation(org),
        getOrgInvites(org),
        getUsersLastConversation(),
      ]);
      logger.debug('Org Users: ', data);
      if (data) {
        logger.info('Org Users: ', data);
        const profiles: Profile[] = data
          .map((row: any) => row?.profiles)
          .filter((p: any) => Boolean(p));
        logger.debug('Org Profiles: ', profiles);
        setUsers(profiles);
        const activity: Record<string, string | null> = {};
        (globalLast || []).forEach((row: any) => {
          activity[row.user] = row.lastcreated_at || null;
        });
        (lastConvos || []).forEach((row: any) => {
          activity[row.user] = row.lastcreated_at || activity[row.user] || null;
        });
        logger.info('Computed user activity map', activity);
        setUserActivity(activity);
        const pending = new Set<string>((invites || []).map((i: any) => i.invitee));
        setPendingByEmail(pending);
      } else {
        logger.info('No Org Users found');
        setUsers([]);
      }
      setIsLoading(false);
    };

    getUsers();
  }, [org]);

  const getUserById = (id: string) => {
    return users.find(user => user.id === id);
  };

  const getUserStatus = (user: Profile) => {
    if (pendingByEmail.has(user.email)) return 'pending';
    const last = userActivity[user.id];
    if (!last) return 'not_started';
    const diff = getDifferenceInDays(new Date(last), new Date());
    return diff <= 7 ? 'active' : 'inactive';
  };
  return {
    users,
    getUserById,
    isLoading,
    getUserStatus,
  };
};

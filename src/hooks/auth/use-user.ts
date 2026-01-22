import { useState, useEffect } from 'react';
import { useUser as useClerkUser } from '@clerk/nextjs';
import { Profile } from "@/lib/supabase/types"
import { getOrgUsers, getUserGroups, getUserProfile } from '@/actions/auth/users';
import { getOrgUsersLastConversation, getUsersLastConversation } from '@/actions/chat/conversations';
import { getOrgInvites } from '@/actions/organization/invites';
import { getDifferenceInDays } from '@/utils/formatters/date';
import { createLogger } from '@/lib/infrastructure/logger';

const logger = createLogger("use-user.ts");

export const useUser = () => {
    const { user: clerkUser, isLoaded } = useClerkUser();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [userAdmin, setUserAdmin] = useState<boolean | null>(false);

    useEffect(() => {
        const getUser = async () => {
            if (!clerkUser) {
                logger.debug('No Clerk user found');
                return;
            }

            // get user profile using Clerk user ID
            const userProfile = await getUserProfile(clerkUser.id);
            logger.debug("User Profile: ", userProfile);
            if (userProfile) {
                setProfile((userProfile as any)[0]);
            }

            // get user group
            const profileData = await getUserGroups(clerkUser.id);
            logger.debug("Profile Data: ", profileData);
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
        }

        if (isLoaded) {
            getUser();
        }
    }, [clerkUser, isLoaded]);

    return {
        user: clerkUser,
        profile: profile as Profile,
        userAdmin: userAdmin as boolean,
        isUserLoaded: isLoaded
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
            logger.debug("Org Users: ", data);
            if (data) {
                logger.info("Org Users: ", data);
                const profiles: Profile[] = data
                    .map((row: any) => row?.profiles)
                    .filter((p: any) => Boolean(p));
                logger.debug("Org Profiles: ", profiles);
                setUsers(profiles);
                const activity: Record<string, string | null> = {};
                (globalLast || []).forEach((row: any) => { activity[row.user] = row.lastcreated_at || null; });
                (lastConvos || []).forEach((row: any) => { activity[row.user] = row.lastcreated_at || activity[row.user] || null; });
                logger.info("Computed user activity map", activity);
                setUserActivity(activity);
                const pending = new Set<string>((invites || []).map((i: any) => i.invitee));
                setPendingByEmail(pending);
            } else {
                logger.info("No Org Users found");
                setUsers([]);
            }
            setIsLoading(false);
        };

        getUsers();
    }, [org]);

    const getUserById = (id: string) => {
        return users.find(user => user.id === id);
    }

    const getUserStatus = (user: Profile) => {
        if (pendingByEmail.has(user.email)) return 'pending';
        const last = userActivity[user.id];
        if (!last) return 'not_started';
        const diff = getDifferenceInDays(new Date(last), new Date());
        return diff <= 7 ? 'active' : 'inactive';
    }
    return {
        users, getUserById, isLoading, getUserStatus
    }
}

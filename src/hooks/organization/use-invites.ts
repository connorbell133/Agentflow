import { useState, useCallback } from 'react';
import { Group, Invite, Organization } from '@/lib/supabase/types';
import {
  addInvite,
  getInviteGroup,
  getOrgInvites,
  getOrgInvitesWithDisplayData,
  getUserInvites,
  removeInvite,
  getInviteOrg,
  getInviteInviter,
  acceptInviteAction,
} from '@/actions/organization/invites';
import { useSession } from '@/lib/auth/client-helpers';
export const useInvites = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // returns Invite[] for a user with display data
  const fetchInvites = useCallback(
    async (
      user_email: string
    ): Promise<{
      invites: Invite[];
      displayData: Map<string, { orgName: string; groupName: string; inviterEmail: string }>;
    }> => {
      console.log('Fetching invites for user: ', user_email);
      const data = await getUserInvites(user_email);
      if (data) {
        console.log('Invites: ', data);
        const invites = data as Invite[];
        const displayData = new Map<
          string,
          { orgName: string; groupName: string; inviterEmail: string }
        >();

        // Use Promise.all to fetch all org and group data in parallel
        await Promise.all(
          invites.map(async invite => {
            try {
              // Fetch org, group, and inviter data in parallel
              const [orgData, groupData, inviterData] = await Promise.all([
                getInviteOrg(invite.org_id),
                getInviteGroup(invite.group_id ?? '', invite.org_id ?? ''),
                getInviteInviter(invite.inviter),
              ]);

              let orgName = invite.org_id; // Default to UUID if fetch fails
              let groupName = invite.group_id ?? ''; // Default to UUID if fetch fails
              let inviterEmail = invite.inviter; // Default to user ID if fetch fails

              if (orgData && orgData[0]) {
                const org = orgData[0] as Organization;
                orgName = org.name ?? invite.org_id;
              }

              if (groupData && groupData[0]) {
                const group = groupData[0] as Group;
                groupName = group.role ?? invite.group_id ?? '';
              }

              if (inviterData && inviterData.data) {
                inviterEmail = (inviterData.data as any).email ?? invite.inviter;
              }

              // Store display data in map - use a fallback key if id is missing
              const mapKey = invite.id || `${invite.org_id}-${invite.invitee}`;
              displayData.set(mapKey, {
                orgName,
                groupName,
                inviterEmail,
              });
            } catch (error) {
              console.error('Error enriching invite data:', error, { invite });
              // Store defaults if enrichment fails - use a fallback key if id is missing
              const mapKey = invite.id || `${invite.org_id}-${invite.invitee}`;
              displayData.set(mapKey, {
                orgName: invite.org_id,
                groupName: invite.group_id ?? '',
                inviterEmail: invite.inviter,
              });
            }
          })
        );

        setIsLoading(false);
        console.log('Invites with display data: ', invites, displayData);
        return { invites, displayData };
      }
      setIsLoading(false);
      return { invites: [], displayData: new Map() };
    },
    []
  );

  // Optimized: Uses batched server action to fetch all display data in 2-3 queries instead of N+1
  const fetchOrgInvites = useCallback(
    async (
      org_id: string
    ): Promise<{
      invites: Invite[];
      displayData: Map<string, { orgName: string; groupName: string; inviterEmail: string }>;
    }> => {
      try {
        const result = await getOrgInvitesWithDisplayData(org_id);
        const invites = result.invites as Invite[];
        const displayData = new Map<
          string,
          { orgName: string; groupName: string; inviterEmail: string }
        >(Object.entries(result.displayData));
        setIsLoading(false);
        return { invites, displayData };
      } catch (error) {
        console.error('Error fetching org invites:', error);
        setIsLoading(false);
        return { invites: [], displayData: new Map() };
      }
    },
    []
  );

  const acceptInvite = async (invite: Invite): Promise<boolean> => {
    console.log('Accepting invite: ', invite);
    if (!userId) {
      console.error('User not found');
      return false;
    }

    try {
      const result = await acceptInviteAction(invite.id as string, userId);
      if (result.success) {
        console.log('Invite accepted successfully');
        return true;
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
    }
    return false;
  };

  const denyInvite = async (invite: Invite): Promise<boolean> => {
    console.log('Denying invite: ', invite);

    if (!userId) {
      console.error('User not found');
      return false;
    }
    const data = await removeInvite(invite.id as string);
    if (data) {
      console.log('Invite denied: ', data);
    }
    return true;
  };

  const sendInvite = async (
    invitee: string,
    org_id: string,
    group_id: string,
    inviter: string
  ): Promise<boolean> => {
    console.log('Sending invite to: ', invitee);
    console.log('Invite: ', { invitee, org_id, group_id, inviter });

    try {
      const data = await addInvite(invitee, org_id, group_id, inviter);
      if (data) {
        console.log('Invite sent: ', data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to send invite:', error);
      // Re-throw the error so the UI can handle it
      throw error;
    }
  };

  const deleteInvite = async (invite: Invite): Promise<boolean> => {
    console.log('Deleting invite: ', invite);
    const data = await removeInvite(invite.id as string);
    if (data) {
      console.log('Invite deleted: ', data);
    }
    return true;
  };

  return {
    fetchInvites,
    acceptInvite,
    denyInvite,
    sendInvite,
    fetchOrgInvites,
    deleteInvite,
    isLoading,
  };
};

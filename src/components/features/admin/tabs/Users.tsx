'use client';

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Profile, Organization, Group, Invite } from '@/lib/supabase/types';
import UserTable from '@/components/features/admin/management/UserTable/UserTable';
import { useAdminData } from '@/contexts/AdminDataContext';
import { SkeletonTable } from '@/components/shared/cards/SkeletonCard';
import { createLogger } from '@/lib/infrastructure/logger';
import { getDifferenceInDays } from '@/utils/formatters/date';
import { canInviteUsers } from '@/actions/auth/subscription';
import { useInvites } from '@/hooks/organization/use-invites';
import LoadingButton from '@/components/shared/buttons/LoadingButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import GenericTable from '@/components/shared/tables/BaseTable';

interface UsersProps {
  org_id: string;
  currentUser: Profile;
  org: Organization;
}

const logger = createLogger('Users.tsx');

// Extended invite type with joined data
type InviteWithDetails = Invite & {
  group_name?: string;
  org_name?: string;
};

interface InviteUserProps {
  groups: Group[];
  org: Organization;
  org_id: string;
  sendInvite: (email: string, org: string, group: string, inviter: string) => void;
  refreshInvites: () => void;
}

const InviteUserForm: React.FC<InviteUserProps> = ({
  groups,
  org,
  org_id,
  sendInvite,
  refreshInvites,
}) => {
  const [email, setEmail] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvite = async () => {
    setIsInviting(true);
    setError(null);
    try {
      await sendInvite(email, org_id, selectedGroup, org.owner || '');
      setEmail('');
      setSelectedGroup('');
      refreshInvites();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation';
      setError(errorMessage);
      console.error('Failed to send invite:', err);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="w-full items-end justify-items-end">
      <div className="bg-card/10 flex w-fit gap-4 rounded-lg border border-border p-3">
        <div className="flex h-fit flex-row gap-4">
          <div>
            <input
              type="email"
              id="email"
              data-testid="invite-user-email-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isInviting}
              className="block h-full w-full rounded-md border border-border bg-input px-3 py-2 text-foreground shadow-sm focus:outline-none disabled:opacity-50 sm:text-sm"
              placeholder="Enter user's email"
            />
          </div>
          <div>
            <Select value={selectedGroup} onValueChange={setSelectedGroup} disabled={isInviting}>
              <SelectTrigger
                data-testid="invite-user-group-select"
                className="h-full w-full bg-input text-foreground"
              >
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent data-testid="invite-user-group-select-content">
                {groups.map(group => (
                  <SelectItem
                    key={group.id}
                    value={group.id}
                    data-testid={`invite-user-group-option-${group.id}`}
                  >
                    {group.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <LoadingButton
            onClick={handleInvite}
            loading={isInviting}
            loadingText="Inviting..."
            data-testid="invite-user-submit-button"
            className="hover:bg-primary/90 h-full w-fit rounded-md bg-primary px-3 py-2 text-primary-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Invite
          </LoadingButton>
        </div>
      </div>
      {error && (
        <div
          className="bg-destructive/10 border-destructive/20 mt-2 rounded-md border p-2"
          data-testid="invite-user-error"
        >
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
};

interface PendingInvitesProps {
  invites: Invite[];
  displayData: Record<string, { orgName: string; groupName: string; inviterEmail: string }>;
  deleteInvite: (invite: Invite) => void;
  refreshInvites: () => void;
}

const PendingInvites: React.FC<PendingInvitesProps> = ({
  invites,
  displayData,
  deleteInvite,
  refreshInvites,
}) => {
  const [deletingInvites, setDeletingInvites] = useState<Set<string>>(new Set());

  const handle_delete = async (invite: Invite) => {
    setDeletingInvites(prev => new Set(prev).add(invite.id));
    try {
      await deleteInvite(invite);
      refreshInvites();
    } finally {
      setDeletingInvites(prev => {
        const newSet = new Set(prev);
        newSet.delete(invite.id);
        return newSet;
      });
    }
  };

  // Map invites to include display data
  const invitesWithDetails: InviteWithDetails[] = invites.map(invite => {
    const mapKey = invite.id || `${invite.org_id}-${invite.invitee}`;
    const displayInfo = displayData[mapKey as keyof typeof displayData] || {
      groupName: '',
      inviterEmail: '',
    };
    return {
      ...invite,
      group_name: displayInfo.groupName || invite.group_id || '',
      org_name: displayInfo.inviterEmail || invite.inviter,
    };
  });

  return (
    invites.length > 0 && (
      <div className="w-full">
        <div className="w-full">
          <h2 className="whitespace-nowrap text-center text-lg font-bold text-foreground">
            Pending Invites
          </h2>
          <GenericTable
            data={invitesWithDetails}
            headers={['Email', 'Group', 'Invited By', 'Actions']}
            renderRow={(invite: InviteWithDetails) => (
              <tr key={invite.id} data-testid={`invite-row-${invite.id}`}>
                <td className="px-6 py-4" data-testid={`invite-email-${invite.id}`}>
                  {invite.invitee}
                </td>
                <td className="px-6 py-4">{invite.group_name}</td>
                <td className="px-6 py-4">{invite.org_name}</td>
                <td className="px-6 py-4">
                  <LoadingButton
                    onClick={() => handle_delete(invite)}
                    loading={deletingInvites.has(invite.id)}
                    loadingText="Deleting..."
                    data-testid={`revoke-invite-button-${invite.id}`}
                    className="hover:bg-destructive/90 rounded-md bg-destructive px-2 py-1 text-destructive-foreground"
                  >
                    Delete
                  </LoadingButton>
                </td>
              </tr>
            )}
            getId={invite => invite.id}
          />
        </div>
      </div>
    )
  );
};

// Client component wrapper that handles the interactive parts
export default function Users({ org_id, currentUser, org }: UsersProps) {
  const [canInvite, setCanInvite] = useState<boolean>(true); // Always true - full access in open source

  // Check if user can invite using server action
  useEffect(() => {
    canInviteUsers()
      .then(result => {
        setCanInvite(result);
      })
      .catch(error => {
        console.error('Error checking invite permission:', error);
        // Default to true on error (free users should have org_users feature)
        setCanInvite(true);
      });
  }, []);

  // Track if this is the first render
  const hasRenderedRef = useRef(false);

  useEffect(() => {
    hasRenderedRef.current = true;
  }, []);

  // Use centralized admin data
  const {
    users,
    groups,
    userGroups,
    invites,
    userActivity,
    updateUserGroup,
    isLoading,
    loadMoreUsers,
  } = useAdminData();

  // Invite management
  const { fetchOrgInvites, sendInvite, deleteInvite } = useInvites();
  const [localInvites, setLocalInvites] = useState<Invite[]>([]);
  const [inviteDisplayData, setInviteDisplayData] = useState<
    Record<string, { orgName: string; groupName: string; inviterEmail: string }>
  >({});
  const invitesFetchedRef = useRef<string | null>(null);

  // Fetch invites when org_id changes - use ref to prevent duplicate fetches
  useEffect(() => {
    if (org_id && invitesFetchedRef.current !== org_id) {
      invitesFetchedRef.current = org_id;
      fetchOrgInvites(org_id).then(({ invites, displayData }) => {
        setLocalInvites(invites);
        setInviteDisplayData(Object.fromEntries(displayData.entries()));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org_id]);

  const refreshInvites = useCallback(() => {
    if (org_id) {
      // Don't update ref - this is an intentional refresh
      fetchOrgInvites(org_id).then(({ invites, displayData }) => {
        setLocalInvites(invites);
        setInviteDisplayData(Object.fromEntries(displayData.entries()));
      });
    }
  }, [org_id, fetchOrgInvites]);

  // Create getUserStatus function using data from context
  const getUserStatus = useMemo(() => {
    const pendingByEmail = new Set(invites.map((i: any) => i.invitee));

    return (user: Profile) => {
      if (pendingByEmail.has(user.email)) return 'pending';
      const last = userActivity[user.id];
      if (!last) return 'not_started';
      const diff = getDifferenceInDays(new Date(last), new Date());
      return diff <= 7 ? 'active' : 'inactive';
    };
  }, [invites, userActivity]);
  // Don't fetch data if org_id is empty
  if (!org_id) {
    return <div className="p-4 text-center text-gray-500">Organization setup required</div>;
  }

  // Never show skeleton if we already have data
  // Only show on absolute first load when there's no data at all
  if (users.data.length === 0 && groups.length === 0 && !hasRenderedRef.current) {
    return <SkeletonTable rows={10} cols={5} />;
  }

  logger.info('Users: ', users.data);

  return (
    <div className="space-y-6">
      {/* Always show invite form first when canInvite is true */}
      {canInvite && (
        <>
          <InviteUserForm
            groups={groups}
            org={org}
            org_id={org_id}
            sendInvite={sendInvite}
            refreshInvites={refreshInvites}
          />
          <PendingInvites
            invites={localInvites}
            displayData={inviteDisplayData}
            deleteInvite={deleteInvite}
            refreshInvites={refreshInvites}
          />
        </>
      )}

      {/* Show empty state when no users exist */}
      {!isLoading && users.data.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <div className="mb-4">
            <svg
              className="text-muted-foreground/50 mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground">No users found</h3>
          <p className="mt-2 text-sm">
            {canInvite
              ? "This organization doesn't have any users yet. Use the invite form above to add your first team member!"
              : "This organization doesn't have any users yet. Users will appear here once they join the organization."}
          </p>
        </div>
      ) : (
        <>
          {/* Show user table when users exist */}
          <UserTable
            users={users.data}
            active_user={currentUser}
            org={org}
            groups={groups}
            userGroups={userGroups}
            updateUserGroup={updateUserGroup}
            getUserStatus={getUserStatus}
          />
          {/* Load more button for pagination */}
          {users.hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={loadMoreUsers}
                disabled={users.isLoading}
                className="hover:text-primary/80 px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
              >
                {users.isLoading ? 'Loading...' : 'Load More Users'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

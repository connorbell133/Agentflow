'use client';

import React from 'react';
import { usePendingInvites } from '@/hooks/organization/use-pending-invites';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { removeInvite } from '@/actions/organization/invites';
import { addUserToGroup } from '@/actions/organization/group';
import { addUserToOrg } from '@/actions/auth/users';
import { getOrgName } from '@/actions/organization/organizations';
import { getProfile } from '@/actions/auth/profile';
import { getInviteGroup } from '@/actions/organization/invites';
import { Bell, Check, X } from 'lucide-react';
import { useSession } from '@/lib/auth/client-helpers';

interface InviteBadgeProps {
  refreshModels: () => void;
  open?: boolean;
}

export default function InviteBadge({ refreshModels, open = true }: InviteBadgeProps) {
  const { invites, loading, refetch } = usePendingInvites();
  const [enrichedInvites, setEnrichedInvites] = React.useState<any[]>([]);
  const { data: session } = useSession();
  const userId = session?.user?.id;

  React.useEffect(() => {
    const enrichInvites = async () => {
      if (!invites || invites.length === 0) {
        setEnrichedInvites([]);
        return;
      }

      const enriched = await Promise.all(
        invites.map(async invite => {
          const [orgData, inviterData, groupData] = await Promise.all([
            getOrgName(invite.org_id),
            getProfile(invite.inviter),
            invite.group_id ? getInviteGroup(invite.group_id, invite.org_id) : null,
          ]);

          return {
            ...invite,
            orgName: orgData?.[0]?.name || invite.org_id,
            inviterEmail:
              (inviterData?.success && (inviterData?.data as any)?.email) || invite.inviter,
            groupName: groupData?.[0]?.role || 'No group',
          };
        })
      );
      setEnrichedInvites(enriched);
    };

    enrichInvites();
  }, [invites]);

  if (loading) {
    return null;
  }

  const handleAcceptInvite = async (invite: any) => {
    if (!userId) {
      console.error('No user ID found');
      return;
    }

    try {
      // Add user to org
      await addUserToOrg(invite.org_id, userId);

      // Add user to group if specified
      if (invite.group_id) {
        await addUserToGroup(invite.group_id, userId, invite.org_id);
      }

      // Remove the invite
      await removeInvite(invite.id);

      console.log('Invite accepted successfully!');
      await refetch();
      refreshModels();
    } catch (error) {
      console.error('Failed to accept invite:', error);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await removeInvite(inviteId);
      console.log('Invite declined');
      await refetch();
    } catch (error) {
      console.error('Failed to decline invite:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="invite-badge-trigger"
          className={`relative flex h-9 w-full items-center justify-start ${open ? 'px-4' : 'px-4'} rounded-lg transition-all hover:bg-accent`}
        >
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 flex-shrink-0" />
            <div
              className={`overflow-hidden transition-all duration-200 ${open ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}
            >
              <p className="whitespace-nowrap text-sm font-semibold">Invites</p>
            </div>
          </div>
          {enrichedInvites.length > 0 && (
            <span
              className={`absolute -top-1 ${open ? 'right-1' : 'right-0'} flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white`}
            >
              {enrichedInvites.length}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80" data-testid="invite-badge-dropdown">
        <div className="border-b p-2">
          <p className="text-sm font-medium">Pending Invitations</p>
        </div>
        {enrichedInvites.length === 0 ? (
          <div className="p-8 text-center">
            {/* Inbox Empty Illustration */}
            <svg
              className="text-muted-foreground/50 mx-auto mb-4 h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1"
            >
              <g>
                {/* Envelope */}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
                {/* Checkmark circle overlay */}
                <circle cx="17" cy="17" r="5" fill="currentColor" className="text-background" />
                <circle cx="17" cy="17" r="5" strokeLinecap="round" strokeLinejoin="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 17l1.5 1.5L19.5 15" />
              </g>
            </svg>
            <p className="mb-1 text-sm font-medium text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground">You have no pending invitations</p>
          </div>
        ) : (
          enrichedInvites.map(invite => (
            <div
              key={invite.id}
              className="border-b p-3 last:border-b-0"
              data-testid={`invite-badge-item-${invite.id}`}
            >
              <div className="space-y-2">
                <div>
                  <p className="font-medium">{invite.orgName}</p>
                  <p className="text-sm text-muted-foreground">Group: {invite.groupName}</p>
                  <p className="text-xs text-muted-foreground">From: {invite.inviterEmail}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptInvite(invite)}
                    data-testid={`invite-badge-accept-${invite.id}`}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md bg-green-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-green-600"
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineInvite(invite.id)}
                    data-testid={`invite-badge-decline-${invite.id}`}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md bg-red-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

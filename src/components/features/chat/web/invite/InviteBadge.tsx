"use client";

import React from "react";
import { usePendingInvites } from "@/hooks/organization/use-pending-invites";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { removeInvite } from "@/actions/organization/invites";
import { addUserToGroup } from "@/actions/organization/group";
import { addUserToOrg } from "@/actions/auth/users";
import { getOrgName } from "@/actions/organization/organizations";
import { getProfile } from "@/actions/auth/profile";
import { getInviteGroup } from "@/actions/organization/invites";
import { Bell, Check, X } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

interface InviteBadgeProps {
  refreshModels: () => void;
  open?: boolean;
}

export default function InviteBadge({ refreshModels, open = true }: InviteBadgeProps) {
  const { invites, loading, refetch } = usePendingInvites();
  const [enrichedInvites, setEnrichedInvites] = React.useState<any[]>([]);
  const { userId } = useAuth();

  React.useEffect(() => {
    const enrichInvites = async () => {
      if (!invites || invites.length === 0) {
        setEnrichedInvites([]);
        return;
      }

      const enriched = await Promise.all(
        invites.map(async (invite) => {
          const [orgData, inviterData, groupData] = await Promise.all([
            getOrgName(invite.org_id),
            getProfile(invite.inviter),
            invite.group_id ? getInviteGroup(invite.group_id, invite.org_id) : null
          ]);

          return {
            ...invite,
            orgName: orgData?.[0]?.name || invite.org_id,
            inviterEmail: (inviterData?.success && (inviterData?.data as any)?.email) || invite.inviter,
            groupName: groupData?.[0]?.role || 'No group'
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
      console.error("No user ID found");
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

      console.log("Invite accepted successfully!");
      await refetch();
      refreshModels();
    } catch (error) {
      console.error("Failed to accept invite:", error);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await removeInvite(inviteId);
      console.log("Invite declined");
      await refetch();
    } catch (error) {
      console.error("Failed to decline invite:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="invite-badge-trigger"
          className={`flex items-center justify-start w-full relative h-9 ${open ? 'px-4' : 'px-4'} hover:bg-accent rounded-lg transition-all`}
        >
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 flex-shrink-0" />
            <div className={`overflow-hidden transition-all duration-200 ${open ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
              <p className="text-sm font-semibold whitespace-nowrap">Invites</p>
            </div>
          </div>
          {enrichedInvites.length > 0 && (
            <span className={`absolute -top-1 ${open ? 'right-1' : 'right-0'} h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center`}>
              {enrichedInvites.length}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80" data-testid="invite-badge-dropdown">
        <div className="p-2 border-b">
          <p className="text-sm font-medium">Pending Invitations</p>
        </div>
        {enrichedInvites.length === 0 ? (
          <div className="p-8 text-center">
            {/* Inbox Empty Illustration */}
            <svg
              className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50"
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
                <circle
                  cx="17"
                  cy="17"
                  r="5"
                  fill="currentColor"
                  className="text-background"
                />
                <circle
                  cx="17"
                  cy="17"
                  r="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.5 17l1.5 1.5L19.5 15"
                />
              </g>
            </svg>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              All caught up!
            </p>
            <p className="text-xs text-muted-foreground">
              You have no pending invitations
            </p>
          </div>
        ) : (
          enrichedInvites.map((invite) => (
            <div key={invite.id} className="p-3 border-b last:border-b-0" data-testid={`invite-badge-item-${invite.id}`}>
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
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineInvite(invite.id)}
                    data-testid={`invite-badge-decline-${invite.id}`}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
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
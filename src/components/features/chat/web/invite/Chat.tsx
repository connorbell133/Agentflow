'use client';
import React, { Fragment, useState, useEffect } from 'react';
import { useUser } from '@/hooks/auth/use-user';
import { useInvites } from '@/hooks/organization/use-invites';
import { Invite } from '@/lib/supabase/types';
import { Menu, Transition } from '@headlessui/react';
const RoleCard = ({ role, onSelect }: { role: string; onSelect: () => void }) => (
  <div
    className="bg-card/10 flex h-[300px] w-1/2 flex-col items-start justify-center rounded-2xl border-2 px-5 hover:border-4"
    onClick={onSelect}
  >
    <h3 className="text-3xl text-muted-foreground">I am a...</h3>
    <h1 className="text-6xl text-foreground">{role}</h1>
  </div>
);

const InviteBox = ({
  invite,
  displayInfo,
  acceptInvite,
  denyInvite,
}: {
  invite: Invite;
  displayInfo?: { orgName: string; groupName: string; inviterEmail: string };
  acceptInvite: (invite: Invite) => void;
  denyInvite: (invite: Invite) => void;
}) => (
  <div className="flex w-fit flex-row items-center justify-between gap-5 rounded-lg bg-transparent p-4">
    <div className="flex flex-col items-start">
      <h1 className="text-m w-fit whitespace-nowrap font-semibold text-foreground">
        {displayInfo?.orgName || invite.org_id}
      </h1>
      <span className="w-fit whitespace-nowrap px-0 text-start text-sm font-bold text-muted-foreground">
        {invite.invitee}
      </span>
      {displayInfo?.inviterEmail && (
        <span className="w-fit whitespace-nowrap px-0 text-start text-xs text-muted-foreground">
          Invited by {displayInfo.inviterEmail}
        </span>
      )}
    </div>
    <div className="flex flex-row gap-2">
      <button
        onClick={() => acceptInvite(invite)}
        className="h-fit w-full rounded-lg bg-green-600 px-4 text-white transition duration-300 hover:bg-green-700"
      >
        Accept
      </button>
      <button
        onClick={() => denyInvite(invite)}
        className="h-fit w-full rounded-lg bg-red-600 px-4 text-white transition duration-300 hover:bg-red-700"
      >
        Reject
      </button>
    </div>
  </div>
);

interface InvitePopupProps {
  refreshModels?: () => void;
}
export const InvitePopup: React.FC<InvitePopupProps> = ({ refreshModels }) => {
  const { user, isUserLoaded } = useUser();
  const { fetchInvites, acceptInvite, denyInvite } = useInvites();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteDisplayData, setInviteDisplayData] = useState<
    Map<string, { orgName: string; groupName: string; inviterEmail: string }>
  >(new Map());
  const [invitesFetched, setInvitesFetched] = useState(false);
  useEffect(() => {
    if (user && user.email && !invitesFetched) {
      fetchInvites(user.email).then(data => {
        setInvites(data.invites);
        setInviteDisplayData(data.displayData);
        setInvitesFetched(true); // Mark invites as fetched
      });
    }
  }, [user, fetchInvites, invitesFetched]);

  if (!isUserLoaded || !user) {
    return <div className="h-screen w-screen bg-background">Loading...</div>;
  }

  return (
    <div className="relative inline-block text-left">
      <Menu>
        {({ open }) => (
          <>
            {/* Trigger button */}
            <Menu.Button className="inline-flex w-fit justify-center rounded-md bg-transparent px-4 py-2 font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              Invites
              <svg
                className={`ml-2 h-5 w-5 transform transition-transform duration-200 ${
                  open ? 'rotate-180' : ''
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Menu.Button>

            {/* Dropdown Panel */}
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Menu.Items className="bg-popover/95 absolute right-0 z-50 mt-2 h-fit w-fit origin-top-right rounded-2xl p-2 shadow-lg ring-1 ring-border backdrop-blur-sm focus:outline-none">
                {invites.length === 0 ? (
                  <div className="whitespace-nowrap p-4 text-center text-muted-foreground">
                    No invites available
                  </div>
                ) : (
                  invites.map(invite => (
                    <Menu.Item key={invite.id}>
                      {({ active }) => (
                        <div className={`rounded-3xl ${active ? '' : ''}`}>
                          <InviteBox
                            invite={invite}
                            displayInfo={inviteDisplayData.get(
                              invite.id || `${invite.org_id}-${invite.invitee}`
                            )}
                            // accept the invite and refresh the models
                            acceptInvite={async invite => {
                              await acceptInvite(invite);
                              refreshModels && refreshModels();
                            }}
                            denyInvite={denyInvite}
                          />
                        </div>
                      )}
                    </Menu.Item>
                  ))
                )}
              </Menu.Items>
            </Transition>
          </>
        )}
      </Menu>
    </div>
  );
};
export default InvitePopup;

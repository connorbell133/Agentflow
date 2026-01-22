"use client";
import React, { Fragment, useState, useEffect } from "react";
import { useUser } from "@/hooks/auth/use-user";
import { useInvites } from "@/hooks/organization/use-invites";
import { Invite } from "@/lib/supabase/types"
import { Menu, Transition } from "@headlessui/react";
const RoleCard = ({
  role,
  onSelect,
}: {
  role: string;
  onSelect: () => void;
}) => (
  <div
    className="flex flex-col items-start w-1/2 border-2 hover:border-4 rounded-2xl h-[300px] justify-center px-5 bg-card/10"
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
  displayInfo?: { orgName: string, groupName: string, inviterEmail: string };
  acceptInvite: (invite: Invite) => void;
  denyInvite: (invite: Invite) => void;
}) => (
  <div className="flex flex-row w-fit justify-between items-center gap-5 p-4 bg-transparent rounded-lg">
    <div className="flex items-start flex-col">
      <h1 className="text-m w-fit text-foreground font-semibold whitespace-nowrap">
        {displayInfo?.orgName || invite.org_id}
      </h1>
      <span className="text-sm text-start px-0 w-fit text-muted-foreground font-bold whitespace-nowrap">
        {invite.invitee}
      </span>
      {displayInfo?.inviterEmail && (
        <span className="text-xs text-start px-0 w-fit text-muted-foreground whitespace-nowrap">
          Invited by {displayInfo.inviterEmail}
        </span>
      )}
    </div>
    <div className="flex flex-row gap-2">
      <button
        onClick={() => acceptInvite(invite)}
        className="px-4 w-full h-fit bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300"
      >
        Accept
      </button>
      <button
        onClick={() => denyInvite(invite)}
        className="px-4  w-full h-fit bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300"
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
  const [inviteDisplayData, setInviteDisplayData] = useState<Map<string, { orgName: string, groupName: string, inviterEmail: string }>>(new Map());
  const [invitesFetched, setInvitesFetched] = useState(false);
  useEffect(() => {
    if (user && user.emailAddresses && !invitesFetched) {
      fetchInvites(user.emailAddresses[0].emailAddress).then((data) => {
        setInvites(data.invites);
        setInviteDisplayData(data.displayData);
        setInvitesFetched(true); // Mark invites as fetched
      });
    }
  }, [user, fetchInvites, invitesFetched]);

  if (!isUserLoaded || !user) {
    return <div className="w-screen h-screen bg-background">Loading...</div>;
  }

  return (
    <div className="relative inline-block text-left">
      <Menu>
        {({ open }) => (
          <>
            {/* Trigger button */}
            <Menu.Button className="inline-flex justify-center w-fit rounded-md bg-transparent px-4 py-2 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
              Invites
              <svg
                className={`ml-2 h-5 w-5 transform transition-transform duration-200 ${open ? "rotate-180" : ""
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
              <Menu.Items className="absolute h-fit right-0 mt-2 w-fit origin-top-right rounded-2xl bg-popover/95 backdrop-blur-sm shadow-lg ring-1 ring-border focus:outline-none p-2 z-50">
                {invites.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground whitespace-nowrap">
                    No invites available
                  </div>
                ) : (
                  invites.map((invite) => (
                    <Menu.Item key={invite.id}>
                      {({ active }) => (
                        <div className={`rounded-3xl ${active ? "" : ""}`}>
                          <InviteBox
                            invite={invite}
                            displayInfo={inviteDisplayData.get(invite.id || `${invite.org_id}-${invite.invitee}`)}
                            // accept the invite and refresh the models
                            acceptInvite={async (invite) => {
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
        )
        }
      </Menu >
    </div >
  );
};
export default InvitePopup;

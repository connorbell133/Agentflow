"use client";

import React, { useState } from "react";
import GenericTable from "@/components/shared/tables/BaseTable";
import Image from "next/image";
import default_icon from "@/assets/images/avatars/default_user.png";
import { Badge } from "@/components/ui/badge";
import { formatTimeAgo } from "@/utils/formatters/date";
import { Group, GroupMap, Organization, Profile } from "@/lib/supabase/types";
import { useOrgs } from "@/hooks/organization/use-organizations";
import EditUserModal from "./EditUserModal";
import { updateUserProfile } from "@/actions/auth/users";

interface UserTableProps {
  users: Profile[];
  active_user: Profile;
  groups: Group[];
  org: Organization;
  userGroups: GroupMap[];
  updateUserGroup: (user_id: string, group: string) => void;
  getUserStatus?: (user: Profile) => 'pending' | 'active' | 'inactive' | 'not_started';
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  active_user,
  org,
  groups,
  userGroups,
  updateUserGroup,
  getUserStatus,
}) => {
  const [removingUsers, setRemovingUsers] = useState<Set<string>>(new Set());
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const { removeUserFromOrg } = useOrgs(active_user);

  const handleRemoveUser = async (userId: string, orgId: string) => {
    setRemovingUsers(prev => new Set(prev).add(userId));
    try {
      await removeUserFromOrg(userId, orgId);
    } finally {
      setRemovingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const getUserGroupsStatic = (userId: string) => {
    const assigned = (userGroups || [])
      .filter(g => g.user_id === userId)
      .map(g => groups.find(gr => gr.id === g.group_id)?.role)
      .filter(Boolean) as string[];
    return assigned;
  };

  const getStatus = (user: Profile) => {
    if (typeof getUserStatus === 'function') return getUserStatus(user);
    return "not_started" as const;
  };

  const renderRow = (
    user: Profile,
    index: number,
    toggleSelect: (id: string) => void
  ) => {
    const assigned = getUserGroupsStatic(user.id);
    const status = getStatus(user);
    const statusDot =
      status === "active" ? "bg-green-500" :
        status === "pending" ? "bg-yellow-500" :
          status === "inactive" ? "bg-red-500" : "bg-gray-400";

    // Check if this user is the org owner
    const isOrgOwner = user.id === org.owner;

    return (
      <tr key={user.id}>
        <td className="py-4 px-6">
          <div className="flex items-center gap-3">
            <Image
              src={user.avatar_url || default_icon}
              alt="Avatar"
              width={28}
              height={28}
              className="h-7 w-7 rounded-full"
            />
            <div className="flex flex-col">
              <span className="font-medium text-foreground">
                {user.full_name || user.email}
                {isOrgOwner && (
                  <Badge variant="default" className="ml-2 text-xs">Owner</Badge>
                )}
              </span>
            </div>
          </div>
        </td>
        <td className="py-4 px-6">
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${statusDot}`} />
            <span className="capitalize">
              {status.replace("_", " ")}
            </span>
          </div>
        </td>
        <td className="py-4 px-6">
          <div className="flex flex-wrap gap-1">
            {assigned.slice(0, 3).map((role, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-xs px-2 py-0.5"
              >
                {role}
              </Badge>
            ))}
            {assigned.length > 3 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5">+{assigned.length - 3}</Badge>
            )}
          </div>
        </td>
        <td className="py-4 px-6">{user.email}</td>
        <td className="py-4 px-6">{formatTimeAgo(user.created_at)}</td>
        <td className="py-4 px-6">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditingUser(user)}
              className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted"
              aria-label="Edit user"
              title="Edit"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            {/* Don't allow removing the org owner */}
            {!isOrgOwner && (
              <button
                onClick={() => handleRemoveUser(user.id, org.id || '')}
                className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted text-destructive"
                aria-label="Remove user"
                title="Remove"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
      <GenericTable
        data={users}
        headers={["Full name", "Status", "Groups", "Email", "Signed up", "Actions"]}
        renderRow={renderRow}
        getId={(user) => user.id}
      />
      <EditUserModal
        user={editingUser}
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSaveProfile={async (userId, profile) => { await updateUserProfile(userId, profile); }}
        groups={groups}
        userGroups={userGroups}
        updateUserGroup={updateUserGroup}
      />
    </>
  );
};

export default UserTable;

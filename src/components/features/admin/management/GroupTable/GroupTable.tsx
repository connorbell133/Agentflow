"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import GroupSelector from "@/components/features/admin/selectors/GroupSelector/groupGroupSelector";
import GroupModelSelector from "@/components/features/admin/selectors/GroupSelector/groupModelSelector";
import { Model, Group, GroupMap, ModelMap, Profile } from "@/lib/supabase/types"
import { createLogger } from "@/lib/infrastructure/logger";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
const logger = createLogger("GroupTable.tsx");

interface GroupTableProps {
  users: Profile[];
  groups: Group[];
  models: Model[];

  userGroups: GroupMap[];
  modelGroups: ModelMap[];

  handleUpdateUser: (id: string, group: string) => void;
  handleUpdateModel: (id: string, group: string) => void;

  // Add a handler for adding a new group
  deleteGroup: (id: string) => void;
  handleAddGroup: (
    name: string,
    description: string,
    users: string[],
    models: string[]
  ) => void;
  refreshGroups: () => void;
  orgId: string;
}

interface GroupSettingsPopupProps {
  group: Group;
  users: Profile[];
  models: Model[];
  activeGroup: Group | null;
  setActiveGroup: (group: Group | null) => void;
  deleteGroup: (id: string) => void;
  refreshGroups: () => void;
  groupMap: GroupMap[];
  modelMap: ModelMap[];
}

const GroupSettingsPopup: React.FC<GroupSettingsPopupProps> = ({
  group,
  users,
  models,
  activeGroup,
  setActiveGroup,
  deleteGroup,
  refreshGroups,
  groupMap,
  modelMap,
}) => {
  // Local state to hold the API key
  const [apiKey, setApiKey] = useState<string>("");

  // Re-initialize the API key whenever the popup opens
  useEffect(() => {
    if (activeGroup) {
      setApiKey(uuidv4());
    }
  }, [activeGroup]);

  // If no group is active, don't render the popup at all
  if (!activeGroup) return null;

  // Handler for refreshing the API key
  const handleRefreshApiKey = () => {
    setApiKey(uuidv4());
  };

  return (
    <div className="relative bg-background rounded-lg shadow-2xl p-0 overflow-hidden h-[85vh] flex flex-col">
      {/* Header */}
      <div className="relative p-6 bg-primary text-primary-foreground">
        {/* Title & Group ID */}
        <h3 className="text-2xl font-semibold">{group.role}</h3>
        <p className="text-sm opacity-80">Group ID: {group.id}</p>

        {/* Close button */}
        <Button
          onClick={() => setActiveGroup(null)}
          size="sm"
          variant="ghost"
          className="absolute top-4 right-4 text-primary-foreground hover:text-primary-foreground/80"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Group Info */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base">Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{group.org_id}</p>
          </CardContent>
        </Card>

        {/* Users */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base">Users in Group</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {groupMap
                .filter((gm) => gm.group_id === group.id)
                .map((gm) => {
                  const user = users.find((u) => u.id === gm.user_id);
                  if (!user) return null;
                  return (
                    <p key={gm.id} className="text-sm text-foreground">
                      {user.email}
                    </p>
                  );
                })}
              {groupMap.filter((gm) => gm.group_id === group.id).length === 0 && (
                <p className="text-sm text-muted-foreground">No users assigned</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Models */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base">Models in Group</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {modelMap
                .filter((mm) => mm.group_id === group.id)
                .map((mm) => {
                  const model = models.find((m) => m.id === mm.model_id);
                  if (!model) return null;
                  return (
                    <p key={mm.id} className="text-sm text-foreground">
                      {model.nice_name}
                    </p>
                  );
                })}
              {modelMap.filter((mm) => mm.group_id === group.id).length === 0 && (
                <p className="text-sm text-muted-foreground">No models assigned</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* API Key section */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base">API Key</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                value={apiKey}
                readOnly
                className="flex-1"
              />
              <Button
                onClick={handleRefreshApiKey}
                size="sm"
              >
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Buttons */}
      <div className="p-4 bg-background border-t border-border flex justify-end space-x-2">
        <Button
          onClick={() => setActiveGroup(null)}
          variant="outline"
          data-testid="group-settings-close-button"
        >
          Close
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            deleteGroup(group.id);
            setActiveGroup(null);
            refreshGroups();
          }}
          data-testid="group-settings-delete-button"
        >
          Delete Group
        </Button>
      </div>
    </div>
  );
};

const GroupTable: React.FC<GroupTableProps> = ({
  users,
  groups,
  models,
  userGroups,
  modelGroups,
  handleUpdateUser,
  handleUpdateModel,
  handleAddGroup,
  deleteGroup,
  refreshGroups,
  orgId,
}) => {
  // Only log on mount/unmount, not on every data change
  useEffect(() => {
    logger.info("GroupTable component mounted");
    return () => {
      logger.info("GroupTable component unmounted");
    };
  }, []);

  const [activeGroup, setActiveGroup] = useState<Group | null>(null);

  const handleEditClick = useCallback((group: Group) => {
    logger.info(`Edit button clicked for group: ${group.id}`);
    setActiveGroup(group);
  }, []);

  // Memoize update handlers to prevent child re-renders
  const memoizedHandleUpdateUser = useCallback((id: string, newGroup: string) => {
    logger.info(`Updating user group for user: ${id}, new group: ${newGroup}`);
    handleUpdateUser(id, newGroup);
  }, [handleUpdateUser]);

  const memoizedHandleUpdateModel = useCallback((id: string, newGroup: string) => {
    logger.info(`Updating model group for model: ${id}, new group: ${newGroup}`);
    handleUpdateModel(id, newGroup);
  }, [handleUpdateModel]);


  return (
    <>
      <div className="p-6">
        <div className="rounded-lg border">
          <div className="relative w-full overflow-x-auto overflow-y-visible">
            <table className="w-full caption-bottom text-sm" style={{ tableLayout: 'fixed' }} data-testid="groups-table">
              <thead>
                <tr className="border-b bg-muted hover:bg-muted">
                  <th className="h-10 px-6 text-left align-middle font-medium text-muted-foreground text-xs uppercase w-[15%]">
                    Name
                  </th>
                  <th className="h-10 px-6 text-left align-middle font-medium text-muted-foreground text-xs uppercase w-[40%]">
                    Users
                  </th>
                  <th className="h-10 px-6 text-left align-middle font-medium text-muted-foreground text-xs uppercase w-[35%]">
                    Models
                  </th>
                  <th className="h-10 px-6 text-left align-middle font-medium text-muted-foreground text-xs uppercase w-[10%]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id} className="border-b transition-colors hover:bg-muted/50" data-testid={`group-row-${group.id}`}>
                    <td className="py-4 px-6 align-middle overflow-hidden text-ellipsis">{group.role}</td>
                    <td className="py-4 px-6 align-middle overflow-visible relative z-10">
                      <GroupSelector
                        users={users}
                        groupsAssigned={userGroups}
                        updateGroups={memoizedHandleUpdateUser}
                        id={group.id}
                        type="group"
                      />
                    </td>
                    <td className="py-4 px-6 align-middle overflow-visible relative z-10">
                      <GroupModelSelector
                        models={models}
                        groupsAssigned={modelGroups}
                        updateGroups={memoizedHandleUpdateModel}
                        id={group.id}
                        type="group"
                      />
                    </td>
                    <td className="py-4 px-6 align-middle">
                      <Button
                        onClick={() => handleEditClick(group)}
                        size="sm"
                        data-testid={`group-edit-button-${group.id}`}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Conditionally render the popup if `activeGroup` is set */}
      {activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl mx-4 sm:mx-6 lg:mx-8">
            <GroupSettingsPopup
              group={activeGroup}
              users={users}
              models={models}
              activeGroup={activeGroup}
              setActiveGroup={setActiveGroup}
              deleteGroup={deleteGroup}
              refreshGroups={refreshGroups}
              groupMap={userGroups}
              modelMap={modelGroups}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default GroupTable;

"use client";

import React, { useState, useEffect } from "react";
import { GroupMap, Group } from "@/lib/supabase/types"
import { createLogger } from "@/lib/infrastructure/logger";

const logger = createLogger("groupGroupSelector.tsx");

interface GroupSelectorProps {
  groups: Group[]; // Array of group objects
  groupsAssigned: GroupMap[]; // Array of group assignment objects
  updateGroups: (id: string, group: string) => void;
  id: string;
  type: string;
}

const GroupSelector = ({
  groups,
  groupsAssigned,
  updateGroups,
  id,
  type,
}: GroupSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    logger.info("GroupSelector component initialized", { id, type });
    logger.debug("Initial groups", groups);
    logger.debug("Initial group assignments", groupsAssigned);
  }, [id, type, groups, groupsAssigned]);
  // Extracting group roles
  const groupRoles = (groups || []).map((group) => ({
    id: group.id,
    role: group.role,
  }));
  logger.debug("Computed groupRoles", groupRoles);

  // Extracting assigned groups for the given user
  const assignedGroupRoles = (groupsAssigned || [])
    .filter((assignment) => assignment.user_id === id)
    .map((assignment) => {
      const group = (groups || []).find((group) => group.id === assignment.group_id);
      return group ? { id: group.id, role: group.role } : null; // Return an object with id and role
    })
    .filter(Boolean); // Filter out null values

  logger.debug("Computed assignedGroupRoles", assignedGroupRoles);
  const toggleGroup = (selectedGroup: string) => {
    logger.info("Toggling group assignment", { selectedGroup, id, type });

    if (type === "group") {
      updateGroups(selectedGroup, id); // id is userId, selectedGroup is groupId
    } else if (type === "user") {
      updateGroups(id, selectedGroup); // selectedGroup is userId, id is groupId
    }
  };

  const filteredGroups = groupRoles.filter((role) =>
    role.role.toLowerCase().includes(searchQuery.toLowerCase())
  );
  logger.info("filteredGroups", filteredGroups);
  return (
    <div className="relative flex flex-col w-72 rounded-lg shadow-lg overflow-visible">
      {/* Selected Groups */}
      <div className="flex flex-wrap items-center py-2 cursor-text min-h-[34px]">
        {assignedGroupRoles.map(
          (role) =>
            role && (
              <div
                key={role.id}
                className="flex-shrink-0 flex items-center bg-primary rounded-full px-3 py-1 my-1 mx-1 text-sm leading-5 text-primary-foreground whitespace-nowrap w-fit shadow-sm"
              >
                <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]">
                  {role?.role}
                </span>
                <button
                  onClick={() => toggleGroup(role.id)}
                  className="ml-2 flex items-center justify-center w-5 h-5 rounded-full hover:bg-primary/80 focus:ring-2 focus:ring-ring transition-colors"
                >
                  <svg
                    viewBox="0 0 8 8"
                    className="w-3 h-3 fill-current text-primary-foreground"
                  >
                    <polygon points="8 1 7 0 4 3 1 0 0 1 3 4 0 7 1 8 4 5 7 8 8 7 5 4" />
                  </svg>
                </button>
              </div>
            )
        )}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-grow min-w-0 basis-0 bg-transparent text-foreground h-[28px] focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Filtered Groups List */}
      {searchQuery && (
        <div className="max-h-[240px] overflow-y-auto bg-card border-t border-border">
          {filteredGroups.map((role) => (
            <div
              key={role.id}
              role="menuitem"
              onClick={() => toggleGroup(role.id)}
              className={`px-3 py-2 cursor-pointer rounded-md transition-colors ${assignedGroupRoles.some((assigned) => assigned?.id === role.id)
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
                } flex items-center`}
            >
              {role.role}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupSelector;

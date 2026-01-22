"use client";

import React, { useState } from "react";
import { ModelMap, Group } from "@/lib/supabase/types"
import { createLogger } from "@/lib/infrastructure/logger";

const logger = createLogger("modelGroupSelector.tsx");

interface ModelGroupSelectorProps {
  groups: Group[]; // Array of group objects
  groupsAssigned: ModelMap[]; // Array of group assignment objects
  updateGroups: (id: string, group: string) => void;
  id: string;
  type: string;
}

const ModelGroupSelector = ({
  groups,
  groupsAssigned,
  updateGroups,
  id,
}: ModelGroupSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Extracting group roles
  const groupRoles = groups.map((group) => ({
    id: group.id,
    role: group.role,
  }));

  logger.info("Group roles extracted", { groupRoles });

  // Extracting assigned groups for the given user
  const assignedGroupRoles = groupsAssigned
    .filter((group) => group.model_id === id)
    .map((group) => ({
      group_id: group.group_id,
      role: group.id,
      // map group_id to group name
      nice_name: groups.find((g) => g.id === group.group_id)?.role,
    }));

  logger.info("Assigned group roles for user", {
    userId: id,
    assignedGroupRoles,
  });

  // Function to toggle group assignment
  const toggleGroup = (selectedGroup: string) => {
    logger.info("Toggling group assignment", {
      selectedGroup,
      targetId: id,
    });
    updateGroups(id, selectedGroup); // id is userId, selectedGroup is groupId
  };

  // Filtering groups based on the search query
  const filteredGroups = groupRoles.filter((role) =>
    role.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  logger.info("Filtered groups based on search query", {
    searchQuery,
    filteredGroups,
  });

  return (
    <div className="relative flex flex-col w-72 rounded-lg shadow-lg overflow-visible">
      {/* Selected Groups */}
      <div className="flex flex-wrap items-center py-2 cursor-text min-h-[34px]">
        {assignedGroupRoles.map((role) => (
          <div
            key={role.group_id} // Use a valid unique key
            className="flex-shrink-0 flex items-center bg-primary rounded-full px-3 py-1 my-1 mx-1 text-sm leading-5 text-primary-foreground whitespace-nowrap w-fit shadow-sm"
          >
            <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]">
              {role.nice_name || "Unnamed Role"}
              {/* Ensure this value is a valid string */}
            </span>
            <button
              onClick={() => {
                logger.info("Removing assigned group", {
                  groupId: role.group_id,
                  assignedTo: id,
                });
                toggleGroup(role.group_id); // Use group_id here
              }}
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
        ))}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            logger.info("Search query updated", {
              previousQuery: searchQuery,
              newQuery: e.target.value,
            });
            setSearchQuery(e.target.value);
          }}
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
              onClick={() => {
                logger.info("Assigning group from filtered list", {
                  groupId: role.id,
                  assignedTo: id,
                });
                toggleGroup(role.id);
              }}
              className={`px-3 py-2 cursor-pointer rounded-md transition-colors ${assignedGroupRoles.some(
                (assigned) => assigned.group_id === role.id
              )
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

export default ModelGroupSelector;

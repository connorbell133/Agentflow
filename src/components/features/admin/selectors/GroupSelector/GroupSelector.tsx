"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

interface GroupSelectorProps {
  groups: string[];
  groupsAssigned: string[];
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
  const toggleGroup = (selectedGroup: string) => {
    if (type === "group") {
      updateGroups(selectedGroup, id); // id is userId, selectedGroup is groupId
    } else if (type === "user") {
      updateGroups(id, selectedGroup); // selectedGroup is userId, id is groupId
    } else if (type === "model") {
      updateGroups(id, selectedGroup); // selectedGroup is model_id, id is groupId
    }
  };
  console.log("groups", groups);
  console.log("groupsAssigned", groupsAssigned);
  const filteredGroups = groups.filter((group) =>
    group.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-72">
      {/* Selected Groups */}
      <div className="flex flex-wrap gap-2 mb-2 min-h-[34px] p-2 border rounded-md">
        {groupsAssigned.map((group) => (
          <div
            key={group}
            className="flex items-center bg-primary rounded-full px-3 py-1 text-sm text-primary-foreground whitespace-nowrap shadow-sm"
          >
            <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]">
              {group}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleGroup(group)}
              className="ml-2 h-5 w-5 p-0 hover:bg-primary/80 rounded-full"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Command Component for Search and Selection */}
      <Command className="rounded-lg border">
        <CommandInput
          placeholder="Search groups..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>No groups found.</CommandEmpty>
          <CommandGroup>
            {filteredGroups.map((group) => (
              <CommandItem
                key={group}
                onSelect={() => toggleGroup(group)}
                className={`cursor-pointer ${groupsAssigned.includes(group)
                    ? "bg-accent text-accent-foreground"
                    : ""
                  }`}
              >
                {group}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
};

export default GroupSelector;

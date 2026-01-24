'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { GroupMap, Profile } from '@/lib/supabase/types';
import { createLogger } from '@/lib/infrastructure/logger';
import { CornerDownLeft } from 'lucide-react';

const logger = createLogger('groupGroupSelector.tsx');

interface GroupSelectorProps {
  users: Profile[]; // Array of group objects
  groupsAssigned: GroupMap[]; // Array of group assignment objects
  updateGroups: (id: string, group: string) => void;
  id: string;
  type: string;
}

const GroupSelector = React.memo(
  ({ users, groupsAssigned, updateGroups, id, type }: GroupSelectorProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{
      top: number;
      left: number;
      width: number;
    } | null>(null);

    // Memoize groupRoles to prevent recalculation on every render
    const groupRoles = useMemo(() => {
      return (users || []).map(user => ({
        id: user.id,
        full_name: user.email,
      }));
    }, [users]);

    // Memoize assignedGroupRoles to prevent recalculation on every render
    const assignedGroupRoles = useMemo(() => {
      return (groupsAssigned || [])
        .filter(group => group.group_id === id)
        .map(group => ({
          id: group.id, // Use unique group_map.id instead of group_id
          user: group.user_id,
          full_name: (users || []).find(user => user.id === group.user_id)?.email,
        }));
    }, [groupsAssigned, id, users]);

    const toggleGroup = useCallback(
      (selectedGroup: string) => {
        logger.info('Toggling group assignment', { selectedGroup, id, type });
        if (type === 'group') {
          updateGroups(selectedGroup, id);
        } else if (type === 'user') {
          updateGroups(id, selectedGroup);
        }
        setSearchQuery('');
      },
      [id, type, updateGroups]
    );

    // Memoize filteredGroups to prevent recalculation on every render
    const filteredGroups = useMemo(() => {
      return groupRoles
        .filter(role => !assignedGroupRoles.some(assigned => assigned?.user === role.id))
        .filter(role => role.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [groupRoles, assignedGroupRoles, searchQuery]);

    const handleSearchChange = useCallback((query: string) => {
      setSearchQuery(query);
    }, []);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && filteredGroups.length > 0) {
          toggleGroup(filteredGroups[0].id);
        }
      },
      [filteredGroups, toggleGroup]
    );

    // Update dropdown position when search query changes
    useEffect(() => {
      if (searchQuery && containerRef.current) {
        const updatePosition = () => {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownPosition({
              top: rect.bottom,
              left: rect.left,
              width: rect.width,
            });
          }
        };
        updatePosition();
        // Update on scroll/resize
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
          window.removeEventListener('scroll', updatePosition, true);
          window.removeEventListener('resize', updatePosition);
        };
      } else {
        setDropdownPosition(null);
      }
    }, [searchQuery]);

    const dropdownContent =
      searchQuery && dropdownPosition ? (
        <div
          className="fixed z-[9999] mt-1 max-h-[240px] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
          data-testid={`user-dropdown-list-${id}`}
        >
          {filteredGroups.length === 0 && (
            <div className="px-3 py-2 text-center text-sm text-muted-foreground">
              No users found
            </div>
          )}
          {filteredGroups.map((role, index) => (
            <div
              key={role.id}
              role="menuitem"
              onClick={() => toggleGroup(role.id)}
              className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors ${
                index === 0
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              data-testid={`user-option-${role.id}`}
            >
              <span>{role.full_name}</span>
              {index === 0 && <CornerDownLeft className="h-4 w-4 opacity-50" />}
            </div>
          ))}
        </div>
      ) : null;

    return (
      <>
        <div
          ref={containerRef}
          className="relative flex w-full flex-col overflow-visible rounded-lg"
          data-testid="group-user-selector"
        >
          {/* Selected Groups */}
          <div
            className={`flex min-h-[34px] cursor-text flex-wrap items-center rounded-md border px-2 py-2 transition-colors ${isFocused ? 'border-orange-600' : 'border-border'}`}
          >
            {assignedGroupRoles &&
              assignedGroupRoles.map(
                role =>
                  role && (
                    <div
                      key={role.id}
                      className="mx-1 my-1 flex w-fit flex-shrink-0 items-center whitespace-nowrap rounded-full bg-primary px-3 py-1 text-sm leading-5 text-primary-foreground shadow-sm"
                      data-testid={`selected-user-${role.user}`}
                    >
                      <span className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {role.full_name}
                      </span>
                      <button
                        onClick={() => toggleGroup(role.user)}
                        className="hover:bg-primary/80 ml-2 flex h-5 w-5 items-center justify-center rounded-full transition-colors focus:ring-2 focus:ring-ring"
                        data-testid={`remove-user-${role.user}`}
                      >
                        <svg
                          viewBox="0 0 8 8"
                          className="h-3 w-3 fill-current text-primary-foreground"
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
              onChange={e => handleSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Add user..."
              className="h-[28px] min-w-0 flex-grow basis-0 bg-transparent text-foreground focus:outline-none"
              data-testid={`user-search-input-${id}`}
            />
          </div>
        </div>
        {typeof window !== 'undefined' &&
          dropdownContent &&
          createPortal(dropdownContent, document.body)}
      </>
    );
  }
);

GroupSelector.displayName = 'GroupSelector';

export default GroupSelector;

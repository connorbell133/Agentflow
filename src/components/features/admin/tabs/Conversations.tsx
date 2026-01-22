"use client";

import React, { useRef, useEffect } from "react";
import { Profile, Organization } from "@/lib/supabase/types";
import ConversationTable from "@/components/features/admin/analytics/ConversationsView/Table";
import { useAdminData } from "@/contexts/AdminDataContext";
import { SkeletonTable } from "@/components/shared/cards/SkeletonCard";
import { createLogger } from "@/lib/infrastructure/logger";

const logger = createLogger("Conversations");

interface ConversationsProps {
    org_id: string;
    user: Profile;
    org: Organization;
}

export default function Conversations({
    org_id,
    user,
    org
}: ConversationsProps) {
    // Track if this is the first render
    const hasRenderedRef = useRef(false);

    useEffect(() => {
        hasRenderedRef.current = true;
    }, []);

    const {
        users,
        groups,
        models,
        userGroups,
        conversations,
        updateUserGroup,
        isLoading,
        loadMoreConversations
    } = useAdminData();

    // Don't fetch data if org_id is empty
    if (!org_id) {
        return <div className="p-4 text-center text-gray-500">Organization setup required</div>;
    }


    // Never show skeleton if we already have data
    // Only show on absolute first load when there's no data at all
    if (users.data.length === 0 && conversations.data.length === 0 && !hasRenderedRef.current) {
        return <SkeletonTable rows={12} cols={4} />;
    }

    return (
        <>
            <ConversationTable
                users={users.data}
                org={org}
                groups={groups}
                userGroups={userGroups}
                updateUserGroup={updateUserGroup}
                models={models}
            />
            {/* Load more button for pagination if conversations support it */}
            {conversations.hasMore && (
                <div className="mt-4 flex justify-center">
                    <button
                        onClick={loadMoreConversations}
                        disabled={conversations.isLoading}
                        className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50"
                    >
                        {conversations.isLoading ? 'Loading...' : 'Load More Conversations'}
                    </button>
                </div>
            )}
        </>
    );
}

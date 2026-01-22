"use client";

import React from "react";
import { Profile, Organization } from "@/lib/supabase/types";

// Import your original components
import Overview from "@/components/features/admin/tabs/Overview";
import Users from "@/components/features/admin/tabs/Users";
import Models from "@/components/features/admin/tabs/Models";
import Groups from "@/components/features/admin/tabs/Groups";
import Conversations from "@/components/features/admin/tabs/Conversations";
import Settings from "@/components/features/admin/tabs/Settings";

interface AdminTabContentProps {
    tab: string;
    user: Profile;
    org: Organization;
}

// Client component that keeps all tabs mounted to prevent reloading
export default function AdminTabContent({
    tab,
    user,
    org
}: AdminTabContentProps) {
    return (
        <div className="relative">
            {/* Overview Tab */}
            <div className={tab === 'overview' ? 'block' : 'hidden'}>
                <Overview org_id={org.id} />
            </div>

            {/* Users Tab */}
            <div className={tab === 'users' ? 'block' : 'hidden'}>
                <Users
                    org_id={org.id}
                    currentUser={user}
                    org={org}
                />
            </div>

            {/* Models Tab */}
            <div className={tab === 'models' ? 'block' : 'hidden'}>
                <Models org_id={org.id} />
            </div>

            {/* Groups Tab */}
            <div className={tab === 'groups' ? 'block' : 'hidden'}>
                <Groups
                    org_id={org.id}
                    user={user}
                    org={org}
                />
            </div>

            {/* Conversations Tab */}
            <div className={tab === 'conversations' ? 'block' : 'hidden'}>
                <Conversations
                    org_id={org.id}
                    user={user}
                    org={org}
                />
            </div>

            {/* Settings Tab */}
            <div className={tab === 'settings' ? 'block' : 'hidden'}>
                <Settings user={user} org={org} />
            </div>
        </div>
    );
}

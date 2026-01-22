"use client";

import React from "react";
import { Tabs } from "@/components/shared/menus/TabbedMenu";

// importing icons
import model_svg from "@/assets/admin/tabs/model.svg";
import overview_svg from "@/assets/admin/tabs/overview.svg";
import user_svg from "@/assets/admin/tabs/user-alt-1-svgrepo-com.svg";
import group_svg from "@/assets/admin/tabs/group-team-svgrepo-com.svg";
import conversation_svg from "@/assets/admin/tabs/convo.svg";

interface AdminTabsProps {
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

export function AdminTabs({ activeTab = 'overview', onTabChange }: AdminTabsProps) {
    const handlePageChange = (page: string) => {
        if (onTabChange) {
            onTabChange(page);
        }
    };

    const tabs = [
        {
            label: "Overview",
            active: activeTab === 'overview',
            icon: overview_svg,
            setPage: handlePageChange,
        },
        {
            label: "Users",
            active: activeTab === 'users',
            icon: user_svg,
            setPage: handlePageChange,
        },
        {
            label: "Models",
            active: activeTab === 'models',
            icon: model_svg,
            setPage: handlePageChange,
        },
        {
            label: "Groups",
            active: activeTab === 'groups',
            icon: group_svg,
            setPage: handlePageChange,
        },
        {
            label: "Conversations",
            active: activeTab === 'conversations',
            icon: conversation_svg,
            setPage: handlePageChange,
        },
        {
            label: "Settings",
            active: activeTab === 'settings',
            icon: model_svg,
            setPage: handlePageChange,
        },
    ];

    return <Tabs tabs={tabs} setPage={handlePageChange} />;
}

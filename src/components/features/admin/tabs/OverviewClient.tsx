"use client";

import React, { useMemo } from "react";
import { TableSkeleton } from "@/components/shared/cards/table-skeleton";
import { useAdminData } from "@/contexts/AdminDataContext";
import { createLogger } from "@/lib/infrastructure/logger";
import overview_icon from "@/assets/icons/admin/overview_icon.png";
import groups_icon from "@/assets/icons/admin/groups_icon.png";
import models_icon from "@/assets/icons/admin/models_icon.png";
import users_icon from "@/assets/icons/admin/users_icon.png";
import GroupTable from "@/components/features/admin/management/GroupTable/GroupTable";
import { SectionCards } from "@/components/shared/cards/section-cards";
import { performanceMonitor } from "@/utils/performance-monitor";
import dynamic from 'next/dynamic';

// Lazy load the chart component to improve initial page load
const ChartAreaInteractive = dynamic(
    () => import('@/components/features/admin/analytics/Chart/chart-area-interactive').then(mod => ({ default: mod.ChartAreaInteractive })),
    {
        ssr: false,
        loading: () => <div className="h-[400px] bg-card animate-pulse rounded-lg" />
    }
);

const logger = createLogger("OverviewWrapper.tsx");

interface OptimizedOverviewProps {
    org_id: string;
}

export default function OverviewClient({
    org_id
}: OptimizedOverviewProps) {
    // Track component mount time
    React.useEffect(() => {
        performanceMonitor.startTimer('overview-dashboard-load');
        return () => {
            const duration = performanceMonitor.endTimer('overview-dashboard-load');
            logger.info(`Dashboard load time: ${duration?.toFixed(2)}ms`);
        };
    }, []);

    // Use centralized admin data - all data and methods come from context now
    const {
        users,
        models,
        groups,
        userGroups,
        modelGroups,
        stats,
        isLoading,
        updateUserGroup,
        updateModelGroup,
        addGroup,
        deleteGroup,
        refreshGroups
    } = useAdminData();

    // Memoized card data using stats from admin context
    const cardData = useMemo(() => {
        if (!stats) {
            // Show loading state
            return [
                {
                    title: "Total Users",
                    value: "...",
                    percentage: "0%",
                    subtitle: "Loading...",
                    mainIcon: users_icon,
                    isLoading: true,
                },
                {
                    title: "Total Models",
                    value: "...",
                    percentage: "0%",
                    subtitle: "Loading...",
                    mainIcon: models_icon,
                    isLoading: true,
                },
                {
                    title: "Total Groups",
                    value: "...",
                    percentage: "0%",
                    subtitle: "Loading...",
                    mainIcon: groups_icon,
                    isLoading: true,
                },
                {
                    title: "Total Conversations",
                    value: "...",
                    percentage: "0%",
                    subtitle: "Loading...",
                    mainIcon: overview_icon,
                    isLoading: true,
                },
            ];
        }

        return [
            {
                title: "Total Users",
                value: stats.userCount.toString(),
                percentage: "8.5%",
                subtitle: "Up from yesterday",
                mainIcon: users_icon,
                isLoading: false,
            },
            {
                title: "Total Models",
                value: stats.modelCount.toString(),
                percentage: "8.5%",
                subtitle: "Up from yesterday",
                mainIcon: models_icon,
                isLoading: false,
            },
            {
                title: "Total Groups",
                value: stats.groupCount.toString(),
                percentage: "8.5%",
                subtitle: "Up from yesterday",
                mainIcon: groups_icon,
                isLoading: false,
            },
            {
                title: "Total Conversations",
                value: stats.conversationCount.toString(),
                percentage: "8.5%",
                subtitle: "Up from yesterday",
                mainIcon: overview_icon,
                isLoading: false,
            },
        ];
    }, [stats]);

    if (!org_id) {
        return <div className="p-4 text-center text-gray-500">Organization setup required</div>;
    }


    // Group operations are now handled by the context

    const handleAddGroup = async (
        name: string,
        description: string,
        userIds: string[],
        model_ids: string[]
    ) => {
        try {
            // 1. create new group with name using context method
            const response = await addGroup(name, description);
            if (!response) {
                throw new Error("Failed to add group.");
            }

            logger.info("Group created:", response);

            // 2. add all models to group concurrently
            await Promise.all(
                model_ids.map((model) => updateModelGroup(model, response[0].id))
            );

            // 3. add all users to group concurrently
            await Promise.all(
                userIds.map((user) => updateUserGroup(user, response[0].id))
            );

            logger.info(`Group ${name} added successfully with users and models.`);

            // No need to manually refresh - context handles it
        } catch (error) {
            logger.error("Failed to add group:", error);
        }
    };





    return (
        <div className="w-full flex flex-col max-w-6xl mx-auto p-6 gap-6">
            {/* Overview Cards Section - Show individual loading states */}
            <SectionCards cards={cardData.map((card) => ({
                title: card.title,
                value: card.value,
                percentageChange: parseFloat(card.percentage),
                description: card.subtitle,
                footerDescription: card.subtitle,
                isLoading: card.isLoading
            }))} />

            {/* Chart Section - Component handles its own loading state */}
            <div className="transition-all duration-300 ease-in-out">
                <ChartAreaInteractive org_id={org_id} />
            </div>

            {/* Groups Section */}
            <div className="transition-all duration-300 ease-in-out">
                <h1 className="text-3xl font-bold text-foreground mb-4">Groups</h1>
                {!groups ? (
                    <TableSkeleton rows={5} cols={4} />
                ) : (
                    <GroupTable
                        users={users.data}
                        groups={groups}
                        userGroups={userGroups}
                        models={models}
                        modelGroups={modelGroups}
                        handleUpdateUser={updateUserGroup}
                        handleUpdateModel={updateModelGroup}
                        handleAddGroup={handleAddGroup}
                        deleteGroup={deleteGroup}
                        refreshGroups={refreshGroups}
                        orgId={org_id}
                    />
                )}
            </div>

            {/* Loading indicator for background operations */}
            {isLoading && (
                <div className="fixed bottom-4 right-4 bg-card border rounded-lg p-3 shadow-lg">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span>Loading data...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

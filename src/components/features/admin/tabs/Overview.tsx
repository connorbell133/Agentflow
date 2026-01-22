"use client";

import OverviewClient from "./OverviewClient";

interface OverviewWrapperProps {
    org_id: string;
}

export default function Overview({ org_id }: OverviewWrapperProps) {
    // Dashboard stats are already loaded in AdminDataContext from the initial page load
    // No need to fetch again here
    return <OverviewClient org_id={org_id} />;
}
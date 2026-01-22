"use client";

import { PricingTable } from '@clerk/nextjs';

export default function ProContentPage() {
    return (
        <div className="flex justify-center items-center h-screen">
            <PricingTable />
        </div>
    )
}
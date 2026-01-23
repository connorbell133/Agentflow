'use client';

import React, { Suspense } from 'react';
import { Profile, Organization } from '@/lib/supabase/types';
import { SkeletonTable } from '@/components/shared/cards/SkeletonCard';
import { AdminHeader } from '@/components/features/admin/layout/AdminHeader';
import { AdminTabs } from '@/components/features/admin/layout/AdminTabs';

interface AdminDashboardLayoutProps {
  user: Profile;
  org: Organization;
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

// Client component for layout and interactive content
export default function AdminDashboardLayout({
  user,
  org,
  children,
  activeTab,
  onTabChange,
}: AdminDashboardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AdminHeader org_name={org?.name || ''} user={user} />
      <div className="flex flex-1 flex-col overflow-hidden p-4">
        <div className="@container/main flex min-w-0 flex-1 flex-col gap-2">
          <div className="w-full py-5">
            <AdminTabs activeTab={activeTab} onTabChange={onTabChange} />
          </div>

          <Suspense fallback={<SkeletonTable rows={8} cols={4} />}>{children}</Suspense>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback, createContext, useContext, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DashboardProvider } from '@/contexts/DashboardContext';
import { AdminDataProvider } from '@/contexts/AdminDataContext';
import AdminDashboardLayout from '@/components/features/admin/layout/AdminDashboardLayout';
import AdminTabContent from '@/components/features/admin/AdminTabContent';
import { OrganizationCreatedModal } from '@/components/features/admin/modals/OrganizationCreatedModal';
import { Profile, Organization } from '@/lib/supabase/types';

interface AdminPageWrapperProps {
  user: Profile;
  org: Organization;
  currentTab: string;
  initialData?: any;
}

// Render counter for debugging
let renderCount = 0;

export function AdminPageWrapper({
  user,
  org,
  currentTab: initialTab,
  initialData,
}: AdminPageWrapperProps) {
  renderCount++;
  console.log(`[AdminPageWrapper] Render #${renderCount}, initialTab: ${initialTab}`);

  const searchParams = useSearchParams();
  console.log(`[AdminPageWrapper] searchParams:`, searchParams?.toString());

  const [showOrgCreatedModal, setShowOrgCreatedModal] = useState(false);
  const [createdOrgName, setCreatedOrgName] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    // Check if we came from organization creation
    const orgCreated = searchParams.get('orgCreated');
    const orgName = searchParams.get('orgName');

    if (orgCreated === 'true' && orgName) {
      setCreatedOrgName(decodeURIComponent(orgName));
      setShowOrgCreatedModal(true);

      // Clean up URL params after showing modal
      const url = new URL(window.location.href);
      url.searchParams.delete('orgCreated');
      url.searchParams.delete('orgName');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  // Handle tab change - purely client-side state management
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab.toLowerCase());
  }, []);

  return (
    <ThemeProvider>
      <DashboardProvider org_id={org.id} initialStats={initialData?.stats}>
        <AdminDataProvider org_id={org.id} initialData={initialData}>
          {/* Organization Created Modal */}
          <OrganizationCreatedModal
            isOpen={showOrgCreatedModal}
            onClose={() => setShowOrgCreatedModal(false)}
            orgName={createdOrgName}
          />

          <AdminDashboardLayout
            user={user}
            org={org}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          >
            <AdminTabContent tab={activeTab} user={user} org={org} />
          </AdminDashboardLayout>
        </AdminDataProvider>
      </DashboardProvider>
    </ThemeProvider>
  );
}

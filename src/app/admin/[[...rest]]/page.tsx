import React from "react";
import { auth } from '@clerk/nextjs/server';
import { getUserProfile, getOrgUsers } from '@/actions/auth/users';
import OrgCreationScreen from "@/components/features/admin/org_management/OrgCreation";
import { fetchOrg } from "@/actions/organization/organizations";
import { getUserOrgStatus } from "@/actions/organization/user-org-status";
import { getGroups, getAllUserGroups } from "@/actions/organization/group";
import { AdminPageWrapper } from "@/components/features/admin/AdminPageWrapper";
import { getDashboardData } from "@/actions/admin/getDashboardData";
import { getOrgModels, getAllModelGroups } from '@/actions/chat/models';
import { getOrgConversations, getOrgUsersLastConversation } from '@/actions/chat/conversations';
import { getOrgInvites } from '@/actions/organization/invites';
interface AdminPageProps {
  searchParams: { tab?: string };
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  console.log('[AdminPage SERVER] Rendering server component, searchParams:', searchParams);

  // Check if user is signed in
  const { userId } = await auth();
  if (!userId) {
    return <div>Please sign in to access admin panel</div>;
  }

  // Get user profile
  const userProfileData = await getUserProfile(userId);
  const profile = userProfileData?.[0] as any;
  if (!profile) {
    return <div>Profile not found. Please complete your profile setup.</div>;
  }

  // Check if user has an organization using getUserOrgStatus (bypasses RLS issues)
  const orgStatus = await getUserOrgStatus(userId);
  if (!orgStatus.success || !orgStatus.data?.hasOrganization) {
    return <OrgCreationScreen user={profile} />;
  }

  // Get the full org details using the orgId from getUserOrgStatus
  const userOrgId = orgStatus.data.organizations[0]?.org_id;
  const orgData = await fetchOrg(userId);
  // Use org from fetchOrg if available, otherwise construct from orgStatus
  const org = orgData.data || {
    id: userOrgId,
    name: orgStatus.data.organizations[0]?.orgName,
    owner: orgStatus.data.organizations[0]?.isOwner,
    created_at: new Date().toISOString(),
    status: null
  };

  if (!org || !org.id) {
    return <OrgCreationScreen user={profile} />;
  }


  // Get current tab
  const currentTab = searchParams.tab || 'overview';

  // Fetch all admin data in parallel
  const [
    dashboardStats,
    initialUsers,
    initialConversations,
    groupsData,
    modelsData,
    userGroupsData,
    modelGroupsData,
    invitesData,
    userActivityData
  ] = await Promise.all([
    getDashboardData(org.id),
    getOrgUsers(org.id, { page: 1, limit: 100 }), // Increased limit to ensure we get all users
    getOrgConversations(org.id, { page: 1, limit: 50 }),
    getGroups(org.id),
    getOrgModels(org.id),
    getAllUserGroups(org.id),
    getAllModelGroups(org.id),
    getOrgInvites(org.id),
    getOrgUsersLastConversation(org.id)
  ]);

  // Process user activity into a map
  const userActivity: Record<string, string | null> = {};
  (userActivityData || []).forEach((row: any) => {
    userActivity[row.user] = row.lastcreated_at;
  });

  // Prepare comprehensive initial data
  // Serialize models to ensure they're plain objects
  const serializedModels = (modelsData || []).map(model => ({
    ...model,
    // Convert any non-serializable fields to plain objects
    message_format_config: model.message_format_config ? JSON.parse(JSON.stringify(model.message_format_config)) : null
  }));

  const initialData = {
    stats: dashboardStats,
    users: initialUsers || [],
    conversations: initialConversations?.data || [],
    groups: groupsData || [],
    models: serializedModels,
    userGroups: userGroupsData || [],
    modelGroups: modelGroupsData || [],
    invites: invitesData || [],
    userActivity
  };

  // Render admin dashboard
  return (
    <AdminPageWrapper
      user={profile}
      org={org}
      currentTab={currentTab}
      initialData={initialData}
    />
  );
}

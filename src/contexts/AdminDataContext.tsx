"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Profile, Group, Model, GroupMap, ModelMap, Conversation } from '@/lib/supabase/types';
import { getOrgUsers } from '@/actions/auth/users';
import { getOrgModels, addModel as addModelAction, updateModel as updateModelAction } from '@/actions/chat/models';
import {
  getGroups,
  getAllUserGroups,
  addGroup as addGroupAction,
  deleteGroup as deleteGroupAction,
  addUserToGroup,
  removeUserFromGroup,
  addModelToGroup,
  removeModelFromGroup
} from '@/actions/organization/group';
import { getAllModelGroups } from '@/actions/chat/models';
import { getOrgUsersLastConversation, getOrgConversations, type ConversationFilters } from '@/actions/chat/conversations';
import { getOrgInvites } from '@/actions/organization/invites';
import { createLogger } from '@/lib/infrastructure/logger';

const logger = createLogger('AdminDataContext');

// Paginated data interface
interface PaginatedData<T> {
  data: T[];
  hasMore: boolean;
  page: number;
  isLoading: boolean;
}

interface AdminDataContextValue {
  // Paginated data
  users: PaginatedData<Profile>;
  conversations: PaginatedData<Conversation>;

  // Full datasets (typically smaller)
  groups: Group[];
  models: Model[];
  userGroups: GroupMap[];
  modelGroups: ModelMap[];
  invites: any[];

  // Metadata
  userActivity: Record<string, string | null>;
  stats: {
    userCount: number;
    groupCount: number;
    modelCount: number;
    conversationCount: number;
  };

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Filters
  conversationFilters: ConversationFilters;
  setConversationFilters: (filters: ConversationFilters) => void;

  // Pagination methods
  loadMoreUsers: () => Promise<void>;
  loadMoreConversations: () => Promise<void>;

  // Mutation methods
  addGroup: (name: string, description: string) => Promise<any>;
  deleteGroup: (groupId: string) => Promise<void>;
  updateUserGroup: (userId: string, groupId: string) => Promise<void>;
  updateModelGroup: (model_id: string, groupId: string) => Promise<void>;
  addModel: (model: Model) => Promise<void>;
  updateModel: (model: Model) => Promise<void>;

  // Refresh methods
  refresh: () => Promise<void>;
  refreshGroups: () => Promise<void>;
  refreshModels: () => Promise<void>;
}

const AdminDataContext = createContext<AdminDataContextValue | undefined>(undefined);

interface AdminDataProviderProps {
  children: React.ReactNode;
  org_id: string;
  initialData?: {
    users?: Profile[];
    conversations?: Conversation[];
    groups?: Group[];
    models?: Model[];
    userGroups?: GroupMap[];
    modelGroups?: ModelMap[];
    invites?: any[];
    userActivity?: Record<string, string | null>;
    stats?: any;
  };
}

export function AdminDataProvider({ children, org_id, initialData }: AdminDataProviderProps) {
  // Paginated data states
  const [users, setUsers] = useState<PaginatedData<Profile>>({
    data: initialData?.users || [],
    hasMore: initialData?.users?.length === 50,
    page: 1,
    isLoading: false
  });

  const [conversations, setConversations] = useState<PaginatedData<Conversation>>({
    data: initialData?.conversations || [],
    hasMore: initialData?.conversations?.length === 50,
    page: 1,
    isLoading: false
  });

  // Filter state
  const [conversationFilters, setConversationFilters] = useState<ConversationFilters>({});

  // Full datasets
  const [groups, setGroups] = useState<Group[]>(initialData?.groups || []);
  const [models, setModels] = useState<Model[]>(initialData?.models || []);
  const [userGroups, setUserGroups] = useState<GroupMap[]>(initialData?.userGroups || []);
  const [modelGroups, setModelGroups] = useState<ModelMap[]>(initialData?.modelGroups || []);
  const [invites, setInvites] = useState<any[]>(initialData?.invites || []);
  const [userActivity, setUserActivity] = useState<Record<string, string | null>>(initialData?.userActivity || {});
  const [stats, setStats] = useState(initialData?.stats || {
    userCount: 0,
    groupCount: 0,
    modelCount: 0,
    conversationCount: 0
  });

  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  // Prevent duplicate fetches
  const fetchInProgress = useRef(false);
  const hasInitialData = useRef(!!initialData);

  // Refs for stable callback references (prevents infinite loops when state changes)
  const userGroupsRef = useRef<GroupMap[]>(initialData?.userGroups || []);
  const modelGroupsRef = useRef<ModelMap[]>(initialData?.modelGroups || []);

  // Keep refs in sync with state
  useEffect(() => {
    userGroupsRef.current = userGroups;
  }, [userGroups]);

  useEffect(() => {
    modelGroupsRef.current = modelGroups;
  }, [modelGroups]);

  // Load more users with pagination
  const loadMoreUsers = useCallback(async () => {
    if (!users.hasMore || users.isLoading) return;

    logger.info('Loading more users', { currentPage: users.page });
    setUsers(prev => ({ ...prev, isLoading: true }));

    try {
      const nextPage = users.page + 1;
      const newUsers = await getOrgUsers(org_id, { page: nextPage, limit: 50 });

      setUsers(prev => ({
        data: [...prev.data, ...(newUsers || [])],
        hasMore: (newUsers || []).length === 50,
        page: nextPage,
        isLoading: false
      }));
    } catch (err) {
      logger.error('Error loading more users:', err);
      setUsers(prev => ({ ...prev, isLoading: false }));
    }
  }, [org_id, users.hasMore, users.isLoading, users.page]);

  // Load more conversations with pagination
  const loadMoreConversations = useCallback(async () => {
    if (!conversations.hasMore || conversations.isLoading) return;

    logger.info('Loading more conversations', { currentPage: conversations.page, filters: conversationFilters });
    setConversations(prev => ({ ...prev, isLoading: true }));

    try {
      const nextPage = conversations.page + 1;
      const result = await getOrgConversations(org_id, { page: nextPage, limit: 50 }, conversationFilters);
      const newConversations = result.data || [];

      setConversations(prev => ({
        data: [...prev.data, ...newConversations],
        hasMore: newConversations.length === 50,
        page: nextPage,
        isLoading: false
      }));
    } catch (err) {
      logger.error('Error loading more conversations:', err);
      setConversations(prev => ({ ...prev, isLoading: false }));
    }
  }, [org_id, conversations.hasMore, conversations.isLoading, conversations.page, conversationFilters]);

  // Refresh all data
  const refresh = useCallback(async () => {
    if (fetchInProgress.current) return;

    // Don't auto-refresh on mount if we have initial data
    if (hasInitialData.current) {
      hasInitialData.current = false;
      return;
    }

    logger.info('Refreshing all admin data for org:', org_id);
    fetchInProgress.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const [
        usersData,
        conversationsResult,
        groupsData,
        modelsData,
        userGroupsData,
        modelGroupsData,
        invitesData,
        lastConvosData
      ] = await Promise.all([
        getOrgUsers(org_id, { page: 1, limit: 50 }),
        getOrgConversations(org_id, { page: 1, limit: 50 }, conversationFilters),
        getGroups(org_id),
        getOrgModels(org_id),
        getAllUserGroups(org_id),
        getAllModelGroups(org_id),
        getOrgInvites(org_id),
        getOrgUsersLastConversation(org_id)
      ]);

      // Update users
      setUsers({
        data: usersData || [],
        hasMore: (usersData || []).length === 50,
        page: 1,
        isLoading: false
      });

      // Update conversations
      setConversations({
        data: conversationsResult.data || [],
        hasMore: (conversationsResult.data || []).length === 50,
        page: 1,
        isLoading: false
      });

      // Update other data
      setGroups(groupsData || []);
      setModels(modelsData || []);
      setUserGroups(userGroupsData || []);
      setModelGroups(modelGroupsData || []);
      setInvites(invitesData || []);

      // Process user activity
      const activity: Record<string, string | null> = {};
      (lastConvosData || []).forEach((row: any) => {
        activity[row.user] = row.lastcreated_at || null;
      });
      setUserActivity(activity);

      // Update stats
      setStats({
        userCount: usersData?.length || 0,
        groupCount: groupsData?.length || 0,
        modelCount: modelsData?.length || 0,
        conversationCount: conversationsResult.data?.length || 0
      });

      logger.info('Admin data refreshed successfully');
    } catch (err) {
      logger.error('Error refreshing admin data:', err);
      setError('Failed to refresh admin data');
    } finally {
      setIsLoading(false);
      fetchInProgress.current = false;
    }
  }, [org_id, conversationFilters]);

  // Refresh only groups and mappings
  const refreshGroups = useCallback(async () => {
    try {
      const [groupsData, userGroupsData, modelGroupsData] = await Promise.all([
        getGroups(org_id),
        getAllUserGroups(org_id),
        getAllModelGroups(org_id)
      ]);

      setGroups(groupsData || []);
      setUserGroups(userGroupsData || []);
      setModelGroups(modelGroupsData || []);
    } catch (err) {
      logger.error('Error refreshing groups:', err);
    }
  }, [org_id]);

  // Refresh only models and mappings
  const refreshModels = useCallback(async () => {
    try {
      const [modelsData, modelGroupsData] = await Promise.all([
        getOrgModels(org_id),
        getAllModelGroups(org_id)
      ]);

      setModels(modelsData || []);
      setModelGroups(modelGroupsData || []);
    } catch (err) {
      logger.error('Error refreshing models:', err);
    }
  }, [org_id]);

  // Group mutations
  const addGroup = useCallback(async (name: string, description: string) => {
    const result = await addGroupAction(name, description, org_id);
    await refreshGroups();
    return result;
  }, [org_id, refreshGroups]);

  const deleteGroup = useCallback(async (groupId: string) => {
    await deleteGroupAction(groupId);
    await refreshGroups();
  }, [refreshGroups]);

  // User group mapping
  // Note: Uses ref instead of state to prevent callback recreation on state change
  const updateUserGroup = useCallback(async (userId: string, groupId: string) => {
    const userGroupExists = userGroupsRef.current.some(ug => ug.user_id === userId && ug.group_id === groupId);

    if (userGroupExists) {
      await removeUserFromGroup(groupId, userId, org_id);
    } else {
      await addUserToGroup(groupId, userId, org_id);
    }

    await refreshGroups();
  }, [org_id, refreshGroups]);

  // Model group mapping
  // Note: Uses ref instead of state to prevent callback recreation on state change
  const updateModelGroup = useCallback(async (model_id: string, groupId: string) => {
    const modelGroupExists = modelGroupsRef.current.some(mg => mg.model_id === model_id && mg.group_id === groupId);

    if (modelGroupExists) {
      await removeModelFromGroup(model_id, groupId, org_id);
    } else {
      await addModelToGroup(model_id, groupId, org_id);
    }

    await refreshGroups();
  }, [org_id, refreshGroups]);

  // Model mutations
  const addModel = useCallback(async (model: Model) => {
    await addModelAction(model);
    await refreshModels();
  }, [refreshModels]);

  const updateModel = useCallback(async (model: Model) => {
    await updateModelAction(model);
    await refreshModels();
  }, [refreshModels]);

  // Track if this is the initial mount
  const isInitialMount = useRef(true);

  // When filters change, reset conversations and reload
  useEffect(() => {
    if (!org_id) return;

    // Skip on initial mount if we already have initial data
    if (isInitialMount.current && initialData?.conversations) {
      isInitialMount.current = false;
      return;
    }

    logger.info('Conversation filters changed, reloading data', conversationFilters);

    // Reset conversations and fetch first page
    async function loadFilteredConversations() {
      setConversations(prev => ({ ...prev, isLoading: true }));

      try {
        const result = await getOrgConversations(org_id, { page: 1, limit: 50 }, conversationFilters);
        const newConversations = result.data || [];

        setConversations({
          data: newConversations,
          hasMore: newConversations.length === 50,
          page: 1,
          isLoading: false
        });
      } catch (err) {
        logger.error('Error loading filtered conversations:', err);
        setConversations(prev => ({ ...prev, isLoading: false }));
      }
    }

    loadFilteredConversations();
    isInitialMount.current = false;
    // Note: initialData is intentionally excluded from dependencies
    // It's only used for the initial render check, and including it causes
    // infinite loops when server actions trigger server component re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationFilters, org_id]);

  return (
    <AdminDataContext.Provider value={{
      users,
      conversations,
      groups,
      models,
      userGroups,
      modelGroups,
      invites,
      userActivity,
      stats,
      isLoading,
      error,
      conversationFilters,
      setConversationFilters,
      loadMoreUsers,
      loadMoreConversations,
      refresh,
      refreshGroups,
      refreshModels,
      addGroup,
      deleteGroup,
      updateUserGroup,
      updateModelGroup,
      addModel,
      updateModel
    }}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error('useAdminData must be used within AdminDataProvider');
  }
  return context;
}
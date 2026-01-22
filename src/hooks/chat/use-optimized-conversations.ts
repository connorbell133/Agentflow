import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getConversationList, getOrgConversations } from '@/actions/chat/conversations';
import { Conversation } from "@/lib/supabase/types"
import { PaginationParams } from '@/lib/core/pagination';
import { createLogger } from '@/lib/infrastructure/logger';

const logger = createLogger('useOptimizedConversations');

export const useOptimizedConversations = (
  userId?: string,
  org_id?: string,
  initialParams?: PaginationParams
) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize initialParams to prevent infinite re-renders
  const memoizedParams = useMemo(() => {
    if (!initialParams) return { page: 1, limit: 20 };
    return initialParams;
  }, [initialParams?.page, initialParams?.limit]); // eslint-disable-line react-hooks/exhaustive-deps

  const [pagination, setPagination] = useState({
    page: memoizedParams.page,
    limit: memoizedParams.limit,
    total: 0,
    hasMore: false,
    totalPages: 0,
  });

  // Prevent concurrent fetches without blocking the initial fetch due to loading=true
  const isFetching = useRef(false);

  const fetchConversations = useCallback(async (params: PaginationParams = memoizedParams) => {
    logger.debug('fetchConversations called:', { userId, org_id, params, currentLoading: loading });

    if (!userId && !org_id) {
      logger.debug('No userId/org_id, setting loading to false');
      setLoading(false);
      return;
    }

    // Prevent rapid successive calls using an internal in-flight flag
    if (isFetching.current) {
      logger.warn('Fetch already in progress, skipping', { userId, org_id, params });
      return;
    }

    try {
      isFetching.current = true;
      setLoading(true);
      setError(null);

      let result;
      if (org_id) {
        logger.info('Fetching org conversations', { org_id, params });
        result = await getOrgConversations(org_id, params);
      } else if (userId) {
        logger.info('Fetching user conversations', { userId, params });
        result = await getConversationList(userId, params);
      }

      if (result) {
        logger.debug('fetchConversations result:', result);
        // map to conversation type (support both snake_case and camelCase)
        const mapped = (result as any).data?.map((conversation: any) => ({
          id: conversation.id,
          created_at: conversation.created_at ?? conversation.created_at,
          updatedAt: conversation.updatedAt ?? conversation.updated_at ?? conversation.created_at ?? conversation.created_at,
          user: conversation.user,
          model: conversation.model,
          org_id: conversation.org_id ?? conversation.org_id,
          title: conversation.title,
        })) || [];
        setConversations(mapped);
        setPagination({
          page: params.page,
          limit: params.limit,
          total: 0,
          hasMore: false,
          totalPages: 0,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations';
      logger.error('Failed to fetch conversations', { error: errorMessage, userId, org_id });
      setError(errorMessage);
      logger.error('fetchConversations error:', errorMessage);
    } finally {
      logger.debug('fetchConversations setting loading to false');
      isFetching.current = false;
      setLoading(false);
    }
  }, [userId, org_id, memoizedParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(async () => {
    if (!pagination.hasMore || loading) return;

    const nextParams = { ...memoizedParams, page: pagination.page + 1 };

    try {
      setLoading(true);

      let result;
      if (org_id) {
        result = await getOrgConversations(org_id, nextParams);
      } else if (userId) {
        result = await getConversationList(userId, nextParams);
      }

      if (result) {
        setConversations(prev => [...prev, ...(result.data as Conversation[] || [])]);
        setPagination(pagination);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more conversations';
      logger.error('Failed to load more conversations', { error: errorMessage });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [pagination, loading, org_id, userId, memoizedParams]);

  const refresh = useCallback(() => {
    fetchConversations(memoizedParams);
  }, [fetchConversations, memoizedParams]);

  useEffect(() => {
    // Only fetch if we have userId or org_id to prevent unnecessary calls
    if (userId || org_id) {
      fetchConversations();
    } else {
      // If no userId or org_id, set loading to false immediately
      setLoading(false);
      setConversations([]);
    }

    // Polling disabled to prevent infinite cache hits
    // Real-time updates handled via conversation mutations instead of polling
    //   
    //   return () => clearInterval(interval);
    // }
  }, [fetchConversations]); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoized grouped conversations for performance
  const groupedConversations = useMemo(() => {
    const grouped: { [key: string]: Conversation[] } = {
      Today: [],
      Yesterday: [],
      "Previous 7 Days": [],
      "Previous 30 Days": [],
      "Previous 90 Days": [],
      "Previous Year": [],
      "Older": [],
    };

    const now = new Date();
    const nowTime = now.getTime();

    conversations.forEach((conversation) => {
      const created_at = new Date(conversation.created_at);
      const diffDays = Math.floor((nowTime - created_at.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        grouped["Today"].push(conversation);
      } else if (diffDays <= 1) {
        grouped["Yesterday"].push(conversation);
      } else if (diffDays <= 7) {
        grouped["Previous 7 Days"].push(conversation);
      } else if (diffDays <= 30) {
        grouped["Previous 30 Days"].push(conversation);
      } else if (diffDays <= 90) {
        grouped["Previous 90 Days"].push(conversation);
      } else if (diffDays <= 365) {
        grouped["Previous Year"].push(conversation);
      } else {
        grouped["Older"].push(conversation);
      }
    });

    // Sort each group by created_at descending (since updated_at doesn't exist)
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    return grouped;
  }, [conversations]);

  return {
    conversations,
    groupedConversations,
    loading,
    error,
    pagination,
    loadMore,
    refresh,
    hasMore: pagination.hasMore,
  };
};

// Admin-specific hook for organization conversations
const defaultAdminParams = { page: 1, limit: 50 };
export const useAdminOptimizedConversations = (org_id: string) => {
  return useOptimizedConversations(undefined, org_id, defaultAdminParams);
};
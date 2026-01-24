import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/auth/use-user';
import { getUserProfile } from '@/actions/auth/users';
import { getModelsForUser } from '@/actions/chat/models-optimized';
import { getConversationList } from '@/actions/chat/conversations';
import { Model, Profile, Conversation } from '@/lib/supabase/types';
import { createLogger } from '@/lib/infrastructure/logger';

const logger = createLogger('useChatData');

interface ChatDataState {
  profile: Profile | null;
  models: Model[];
  conversations: Conversation[];
  selectedModel: Model | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook that fetches all required data for the chat page in parallel
 * This replaces sequential loading with a single parallel fetch operation
 */
export const useChatData = () => {
  const { user } = useUser();
  const userId = user?.id;
  const [state, setState] = useState<ChatDataState>({
    profile: null,
    models: [],
    conversations: [],
    selectedModel: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!userId) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchAllData = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // Fetch all data in parallel
        const [profileData, modelsData, conversationsResult] = await Promise.all([
          getUserProfile(userId),
          getModelsForUser(userId),
          getConversationList(userId, { page: 0, limit: 20 }), // Initial load of 20 conversations
        ]);

        const profile = (profileData as any)?.[0] || null;
        const conversations = conversationsResult || [];

        setState({
          profile,
          models: modelsData,
          conversations,
          selectedModel: modelsData[0] || null,
          isLoading: false,
          error: null,
        });

        logger.info('Chat data loaded successfully', {
          profileLoaded: !!profile,
          modelsCount: modelsData.length,
          conversationsCount: conversations.length,
        });
      } catch (error) {
        logger.error('Failed to fetch chat data', { error });
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load chat data. Please refresh the page.',
        }));
      }
    };

    fetchAllData();
  }, [userId]);

  const setSelectedModel = (model: Model | null) => {
    setState(prev => ({ ...prev, selectedModel: model }));
  };

  const addConversation = (conversation: Conversation) => {
    setState(prev => ({
      ...prev,
      conversations: [conversation, ...prev.conversations],
    }));
  };

  const refreshModels = async () => {
    if (!userId) return;

    try {
      const modelsData = await getModelsForUser(userId);
      setState(prev => ({
        ...prev,
        models: modelsData,
        selectedModel: prev.selectedModel || modelsData[0] || null,
      }));
    } catch (error) {
      logger.error('Failed to refresh models', { error });
    }
  };

  return {
    ...state,
    setSelectedModel,
    addConversation,
    refreshModels,
  };
};

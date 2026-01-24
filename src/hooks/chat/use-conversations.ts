import { useState, useEffect, useCallback } from 'react';
import { Conversation, Message, Model } from '@/lib/supabase/types';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '@/hooks/auth/use-user';
import { createLogger } from '@/lib/infrastructure/logger';
import {
  addMessage,
  createConvo,
  getConversation,
  getConversations,
  getAllMessages,
  getOrgConversations,
} from '@/actions/chat/conversations';

const logger = createLogger('use-conversations');

export const useConversations = () => {
  // State variables
  const { user } = useUser();
  const userId = user?.id;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setConversation] = useState<Conversation | null>(null);
  const [currentConversationMessages, setCurrentConversationMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');

  const fetchConversations = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const result = await getConversations(userId);
      if (result.error) throw result.error;

      setConversations(result.data);
    } catch (err) {
      logger.error('Error fetching conversations:', err);
      setError('Failed to fetch conversations.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const fetchConversation = async (conversationId: string) => {
    try {
      const response = await getConversation(conversationId);

      if (response.length === 0) {
        throw new Error('Conversation not found.');
      }
      setConversation(response[0] as Conversation);
    } catch (err) {
      logger.error('Error fetching conversation:', err);
      setError('Failed to fetch conversation.');
    }
  };

  const selectConversation = async (conversationId: string | null) => {
    if (!conversationId) {
      setConversation(null);
      setCurrentConversationMessages([]);
      return;
    }

    logger.debug('Selecting conversation:', conversationId);
    await fetchConversation(conversationId);

    // Fetch messages for the conversation
    try {
      const messagesResult = await getAllMessages(conversationId);

      // Map the database fields to the expected Message type
      const mappedMessages: Message[] = messagesResult.map((msg: any) => ({
        id: msg.id,
        created_at: msg.created_at,
        ai_sdk_id: msg.ai_sdk_id || null,
        metadata: msg.metadata || null,
        parts: msg.parts || null,
        sender: msg.role,
        role: msg.role,
        content: msg.content,
        conversation_id: msg.conversation_id,
      }));

      setCurrentConversationMessages(mappedMessages);
    } catch (err) {
      logger.error('Error fetching messages:', err);
      setError('Failed to fetch messages.');
    }

    logger.info('Conversation selected:', conversationId);
  };

  const newConversation = async () => {
    setConversation(null);
    setCurrentConversationMessages([]);
  };

  const getOrCreateConversation = async (userId: string, selectedModel: Model) => {
    let conversationId = currentConversation?.id || null;
    try {
      if (!conversationId) {
        logger.debug('No current conversation. Creating a new one.');

        const newConversation: Conversation = {
          id: uuidv4(),
          user: userId,
          created_at: new Date().toISOString(),
          model: selectedModel.id,
          org_id: selectedModel.org_id,
          title: inputText,
        };

        const response = await createConvo(newConversation);

        conversationId = newConversation.id;
        setConversations(prev => [...prev, newConversation]);
        setConversation(newConversation);
        return conversationId;
      } else {
        logger.debug('Existing conversation found:', conversationId);
        return conversationId;
      }
    } catch (err) {
      logger.error('Error creating conversation:', err);
      setError('Failed to create conversation.');
      throw err;
    }
  };

  const updateConversation = async (conversationId: string) => {
    const updatedMessages = await getAllMessages(conversationId);

    // Map the database fields to the expected Message type
    const mappedMessages: Message[] = updatedMessages.map((msg: any) => ({
      id: msg.id,
      created_at: msg.created_at,
      ai_sdk_id: msg.ai_sdk_id || null,
      metadata: msg.metadata || null,
      parts: msg.parts || null,
      sender: msg.role,
      role: msg.role,
      content: msg.content,
      conversation_id: msg.conversation_id,
    }));

    setCurrentConversationMessages(mappedMessages);
  };

  const prepareAndSendMessage = async (
    inputText: string,
    selectedModel: Model,
    conversationId: string
  ) => {
    // Prepare API request body
    const messages = currentConversationMessages.map(message => ({
      role: message.role,
      content: message.content,
    }));

    // Push most recent message
    messages.push({
      role: 'user',
      content: inputText,
    });

    logger.debug('DEBUG: messages array before adding to requestBody:', messages);

    const requestBody = {
      model: selectedModel.id,
      content: inputText,
      conversation_id: conversationId,
      vars: {
        time: new Date().toISOString(),
        user: userId,
        messages: messages, // ← Add the full messages array
      },
    };
    logger.debug('Request body prepared for API call:', requestBody);
    logger.debug('DEBUG: vars.messages in requestBody:', requestBody.vars.messages);
    const response = await fetch('/api/response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    logger.debug('API response received with status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('API request failed. Status:', response.status);
      throw new Error(`API request failed with status ${response.status}`);
    }
    const data = await response.json();
    return data;
  };

  const sendMessage = async (inputText: string, selectedModel: Model) => {
    // Validate input args
    if (!inputText || !userId || !selectedModel) {
      logger.warn('Missing required input, user, or selected model');
      return false;
    }
    // Set loading state
    setIsLoading(true);

    try {
      // Create a new conversation if no current conversation exists
      const conversationId = await getOrCreateConversation(userId, selectedModel);
      logger.debug('Conversation ID:', conversationId);

      // Add user message to the conversation
      await addMessage({
        id: uuidv4(),
        created_at: new Date().toISOString(),
        ai_sdk_id: null,
        metadata: null,
        parts: null,
        role: 'user',
        content: inputText,
        conversation_id: conversationId,
      });
      await updateConversation(conversationId);

      // Prepare API request body
      const data = await prepareAndSendMessage(inputText, selectedModel, conversationId);

      // Add bot message to the conversation
      await addMessage({
        id: uuidv4(),
        ai_sdk_id: null,
        metadata: null,
        parts: null,
        role: 'assistant',
        content: data.response,
        created_at: new Date().toISOString(),
        conversation_id: conversationId,
      });
      await updateConversation(conversationId);
    } catch (err) {
      logger.error('Error sending message:', err);
      setError('Failed to send message.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    inputText,
    setInputText,
    conversations,
    currentConversation,
    selectConversation,
    sendMessage,
    newConversation,
    currentConversationMessages,
    isLoading,
    error,
    refetch: fetchConversations,
  };
};

export const useAdminConversations = (org_id: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getOrgConversations(org_id, { page: 1, limit: 50 });

      setConversations(result.data as Conversation[]);
    } catch (err) {
      logger.error('Error fetching conversations:', err);
      setError('Failed to fetch conversations.');
    } finally {
      setIsLoading(false);
    }
  }, [org_id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    isLoading,
    error,
  };
};

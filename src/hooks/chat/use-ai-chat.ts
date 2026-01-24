/**
 * AI SDK Chat Hook
 *
 * Wrapper around AI SDK React's useChat with conversation management.
 * Uses official AI SDK 6 streaming with custom conversation persistence.
 */

'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { type UIMessage, DefaultChatTransport } from 'ai';
import { useSession } from '@/lib/auth/client-helpers';
import { type Model } from '@/lib/supabase/types';
import { getConversation, getAllMessages } from '@/actions/chat/conversations';
import { createLogger } from '@/lib/infrastructure/logger';
import { createUIMessage } from '@/utils/message-parts';

const logger = createLogger('use-ai-chat');

export interface UseAIChatOptions {
  /** Initial model to use */
  model?: Model;
  /** Initial conversation to load */
  conversationId?: string;
  /** Organization ID */
  org_id?: string;
  /** Callback when conversation is created */
  onConversationCreated?: (conversationId: string) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
}

export interface UseAIChatReturn {
  /** Current messages */
  messages: UIMessage[];
  /** Send a message */
  sendMessage: (message: { text: string }) => Promise<void>;
  /** Is currently streaming */
  isLoading: boolean;
  /** Error state */
  error?: Error;
  /** Stop streaming */
  stop: () => void;
  /** Current conversation ID */
  conversationId: string | undefined;
  /** Start a new conversation */
  startNewConversation: () => void;
  /** Load an existing conversation */
  loadConversation: (conversationId: string) => Promise<void>;
  /** Set the model to use */
  setModel: (model: Model) => void;
  /** Current model */
  currentModel: Model | undefined;
  /** Chat status */
  status: 'idle' | 'loading' | 'streaming' | 'error';
}

/**
 * Hook for AI SDK chat with conversation management
 */
export function useAIChat(options: UseAIChatOptions = {}): UseAIChatReturn {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [currentModel, setCurrentModel] = useState<Model | undefined>(options.model);
  const [conversationId, setConversationId] = useState<string | undefined>(options.conversationId);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  // Use refs to capture latest values for transport
  const conversationIdRef = useRef<string | undefined>(conversationId);
  const currentModelRef = useRef<Model | undefined>(currentModel);
  const orgIdRef = useRef<string | undefined>(options.org_id);

  // Update refs when values change
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    currentModelRef.current = currentModel;
  }, [currentModel]);

  useEffect(() => {
    orgIdRef.current = options.org_id;
  }, [options.org_id]);

  // Create transport once with refs to capture latest values at send time
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest: ({ messages }) => {
          // Use refs to get latest values at send time
          const model = currentModelRef.current;
          const convId = conversationIdRef.current;
          const orgId = orgIdRef.current || model?.org_id;

          console.log('🔵 [useAIChat] Preparing request (v6 format):', {
            model_id: model?.id,
            org_id: orgId,
            conversationId: convId,
            messageCount: messages.length,
            messages: messages.map(m => ({
              id: m.id,
              role: m.role,
              partsCount: m.parts?.length || 0,
            })),
          });

          logger.info('Preparing request', {
            model_id: model?.id,
            org_id: orgId,
            conversationId: convId,
            messageCount: messages.length,
            messages: messages.map(m => ({
              role: m.role,
              partsCount: m.parts?.length || 0,
            })),
          });

          return {
            body: {
              messages, // Use messages as-is from DefaultChatTransport
              model_id: model?.id,
              org_id: orgId,
              conversationId: convId,
            },
          };
        },
        fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
          // Custom fetch to extract X-Conversation-Id header and log response
          const response = await fetch(input, init);

          // DIAGNOSTIC: Log response details
          console.log('🔍 [useAIChat] DIAGNOSTIC - Fetch response:', {
            url: typeof input === 'string' ? input : input.toString(),
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            conversationId: response.headers.get('X-Conversation-Id'),
          });

          // Extract conversation ID from response header
          const newConversationId = response.headers.get('X-Conversation-Id');
          if (newConversationId && newConversationId !== conversationIdRef.current) {
            logger.info('New conversation created', { conversationId: newConversationId });
            setConversationId(newConversationId);
            options.onConversationCreated?.(newConversationId);
          }

          return response;
        },
      }),
    // Include options in dependencies since it's used in the fetch callback
    [options]
  );

  // Use official AI SDK useChat hook
  const {
    messages,
    sendMessage: sendMessageBase,
    setMessages,
    stop,
    status: statusBase,
    error: errorBase,
  } = useChat({
    transport,
    onFinish: ({ message }) => {
      logger.info('Message finished', {
        messageId: message.id,
        role: message.role,
        parts: message.parts,
        partsCount: message.parts?.length || 0,
      });

      // Log tool invocations if present
      if (message.parts) {
        const toolParts = message.parts.filter((p: any) => p.type === 'tool-invocation');
        if (toolParts.length > 0) {
          console.log('🔧 [useAIChat] Tool invocations in message:', toolParts);
        }
      }
    },
    onError: error => {
      logger.error('Chat error', { error });
      console.error('❌ [useAIChat] Chat error:', error);
      options.onError?.(error);
    },
  });

  // Debug log messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      console.log('📨 [useAIChat] Messages updated:', {
        count: messages.length,
        lastMessageRole: lastMessage.role,
        lastMessageParts: lastMessage.parts,
        lastMessagePartsCount: lastMessage.parts?.length || 0,
      });

      // Check for tool invocations
      if (lastMessage.parts) {
        const toolParts = lastMessage.parts.filter((p: any) => p.type === 'tool-invocation');
        if (toolParts.length > 0) {
          console.log('🔧 [useAIChat] Tool invocations detected:', toolParts);
        }
      }
    }
  }, [messages]);

  // Derive status from AI SDK status
  const status = isLoadingConversation
    ? 'loading'
    : statusBase === 'streaming'
      ? 'streaming'
      : statusBase === 'error'
        ? 'error'
        : 'idle';

  // Derive isLoading (loading conversation OR streaming)
  const isLoading = isLoadingConversation || statusBase === 'streaming';

  /**
   * Wrapped sendMessage with validation
   */
  const sendMessage = useCallback(
    async (message: { text: string }) => {
      console.log('🟡 [useAIChat] sendMessage called with:', message);

      if (!currentModel) {
        logger.warn('Cannot submit without a model selected');
        return;
      }

      if (!message.text.trim()) {
        logger.warn('Cannot submit empty message');
        return;
      }

      console.log('🟡 [useAIChat] Calling base sendMessage with model:', currentModel.id);
      logger.info('Submitting message', { model_id: currentModel.id, conversationId });

      // Call the AI SDK sendMessage
      await sendMessageBase(message);
    },
    [currentModel, conversationId, sendMessageBase]
  );

  /**
   * Start a new conversation
   */
  const startNewConversation = useCallback(() => {
    logger.info('Starting new conversation');
    setConversationId(undefined);
    setMessages([]);
  }, [setMessages]);

  /**
   * Load an existing conversation
   */
  const loadConversation = useCallback(
    async (convId: string) => {
      if (isLoadingConversation) return;
      setIsLoadingConversation(true);

      logger.info('Loading conversation', { conversationId: convId });

      try {
        // Verify conversation exists
        const conversations = await getConversation(convId);
        if (conversations.length === 0) {
          throw new Error('Conversation not found');
        }

        // Load messages
        const dbMessages = await getAllMessages(convId);

        // Convert database messages to UI format
        const uiMessages: UIMessage[] = dbMessages.map(msg => {
          // Use ai_sdk_id if available (for feedback mapping), fallback to database UUID
          const messageId = msg.ai_sdk_id || msg.id;

          return createUIMessage({
            id: messageId,
            role: msg.role as 'user' | 'assistant' | 'system',
            parts: (msg.parts as UIMessage['parts']) || [],
            createdAt: msg.created_at ? new Date(msg.created_at) : undefined,
          });
        });

        console.log(
          '🔵 [loadConversation] Loaded messages with IDs:',
          uiMessages.map(m => ({
            id: m.id,
            role: m.role,
          }))
        );

        setConversationId(convId);
        setMessages(uiMessages);

        logger.info('Conversation loaded', {
          conversationId: convId,
          messageCount: uiMessages.length,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load conversation');
        logger.error('Failed to load conversation', { error, conversationId: convId });
        options.onError?.(error);
        throw error;
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [isLoadingConversation, setMessages, options]
  );

  /**
   * Set the model to use
   */
  const setModel = useCallback((model: Model) => {
    logger.info('Model changed', { model_id: model.id });
    setCurrentModel(model);
  }, []);

  // Update model when option changes
  useEffect(() => {
    if (options.model && options.model.id !== currentModel?.id) {
      setCurrentModel(options.model);
    }
  }, [options.model, currentModel?.id]);

  // Load conversation when ID option changes
  useEffect(() => {
    if (options.conversationId && options.conversationId !== conversationId) {
      loadConversation(options.conversationId);
    }
  }, [options.conversationId, conversationId, loadConversation]);

  return {
    messages,
    sendMessage,
    isLoading,
    error: errorBase,
    stop,
    conversationId,
    startNewConversation,
    loadConversation,
    setModel,
    currentModel,
    status,
  };
}

export default useAIChat;

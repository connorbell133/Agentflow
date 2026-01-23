/**
 * AI SDK 6 Chat Streaming Endpoint
 *
 * This endpoint handles chat requests and streams responses compatible with
 * AI SDK's useChat hook. It routes to external AI endpoints based on model
 * configuration (endpoint_type).
 *
 * Supports three endpoint types:
 * - ai-sdk-stream: Direct pass-through for AI SDK-compatible endpoints
 *   (AI SDK data streams and UI message streams are passed through unchanged)
 * - sse: Server-Sent Events (e.g., OpenAI) converted to AI SDK UI stream
 * - webhook: JSON responses converted to AI SDK UI stream
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { z } from 'zod';
import { type UIMessage } from 'ai';

import { getModelData } from '@/actions/chat/models';
import { createConvo, getConversation } from '@/actions/chat/conversations';
import { createLogger } from '@/lib/infrastructure/logger';
import { apiCallLimiter, checkRateLimit } from '@/lib/security/rate-limiter';
import {
  routeToEndpoint,
  saveUserMessage,
  wrapResponseWithPersistence,
  type RoutableModel,
} from '@/lib/ai/router';
import { createUIMessage, extractTextFromMessage } from '@/utils/formatters/message-parts';

const logger = createLogger('api-chat');

/**
 * Request body schema matching AI SDK v6 useChat format
 * Messages use `parts` array instead of `content` string
 */
const requestSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['user', 'assistant', 'system']),
      parts: z.array(z.unknown()).optional(),
      createdAt: z.string().or(z.date()).optional(),
    })
  ),
  model_id: z.string().uuid('Invalid model ID'),
  conversationId: z.string().uuid().optional(),
  org_id: z.string().uuid().optional(),
});

type RequestBody = z.infer<typeof requestSchema>;

/**
 * Convert database model to RoutableModel format
 */
function toRoutableModel(model: any): RoutableModel {
  return {
    id: model.id,
    endpoint: model.endpoint || '',
    method: model.method || 'POST',
    headers: model.headers || null,
    body_config: model.body_config,
    response_path: model.response_path || null,
    endpoint_type: model.endpoint_type || 'webhook',
    stream_config: model.stream_config || null,
  };
}

/**
 * Get or create conversation
 */
async function getOrCreateConversation(
  conversationId: string | undefined,
  userId: string,
  model_id: string,
  org_id: string,
  firstMessage: string
): Promise<string> {
  if (conversationId) {
    // Verify conversation exists and user has access
    const conversations = await getConversation(conversationId);
    if (conversations.length > 0) {
      return conversationId;
    }
    // Conversation not found, create new one
  }

  // Create new conversation
  const title =
    (firstMessage || 'New conversation').substring(0, 50) +
    ((firstMessage?.length || 0) > 50 ? '...' : '');
  const newConversation = await createConvo({
    user: userId,
    model: model_id,
    title,
  });

  if (!newConversation || newConversation.length === 0) {
    throw new Error('Failed to create conversation');
  }

  return newConversation[0].id;
}

export async function POST(req: NextRequest) {
  logger.info('POST request received for /api/chat');

  // Rate limiting
  const rateLimitResult = checkRateLimit(req, apiCallLimiter);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests, please try again later' },
      { status: 429, headers: rateLimitResult.headers }
    );
  }

  try {
    // Authentication via Better-Auth middleware
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('Validation failed', { issues: validation.error.flatten() });
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { messages, model_id, conversationId, org_id } = validation.data;

    logger.info('📨 Received chat request', {
      messageCount: messages.length,
      model_id,
      conversationId,
      messages: messages.map(m => ({
        role: m.role,
        partsCount: m.parts?.length || 0,
        textPreview:
          m.parts
            ?.filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('')
            .substring(0, 100) || '',
      })),
    });

    // Get model configuration
    const modelData = await getModelData(model_id);
    if (!modelData || !modelData.id) {
      logger.error('❌ Model not found:', model_id);
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    logger.info('🤖 Model configuration loaded:', {
      id: modelData.id,
      name: modelData.nice_name,
      endpoint: modelData.endpoint,
      endpoint_type: modelData.endpoint_type,
      method: modelData.method,
    });

    // Get the last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) {
      return NextResponse.json({ error: 'No user message provided' }, { status: 400 });
    }

    // Extract text content from parts
    const lastUserMessageText = extractTextFromMessage(lastUserMessage as UIMessage);

    // Get or create conversation
    const resolvedConversationId = await getOrCreateConversation(
      conversationId,
      userId,
      model_id,
      org_id || modelData.org_id,
      lastUserMessageText
    );

    // Generate a UUID for the message (AI SDK uses short IDs, we need UUIDs)
    const userMessageId = crypto.randomUUID();
    const aiSdkMessageId = lastUserMessage.id; // Keep AI SDK ID for mapping

    // Save user message with parts
    await saveUserMessage(
      resolvedConversationId,
      userMessageId,
      (lastUserMessage.parts || []) as UIMessage['parts'],
      aiSdkMessageId // Store AI SDK ID for frontend mapping
    );

    // Convert to routable model
    const routableModel = toRoutableModel(modelData);

    // Convert messages to UIMessage format for router
    const uiMessages: UIMessage[] = messages.map(m =>
      createUIMessage({
        id: m.id,
        role: m.role,
        parts: (m.parts as UIMessage['parts']) || [],
        createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
      })
    );

    // Get AbortSignal from request
    const signal = req.signal;

    // Route to appropriate handler
    const response = await routeToEndpoint(routableModel, uiMessages, signal);

    // Wrap response with persistence to save assistant message
    const persistedResponse = wrapResponseWithPersistence(response, resolvedConversationId);

    // Add conversation ID to response headers for client
    const headers = new Headers(persistedResponse.headers);
    headers.set('X-Conversation-Id', resolvedConversationId);

    return new Response(persistedResponse.body, {
      status: persistedResponse.status,
      statusText: persistedResponse.statusText,
      headers,
    });
  } catch (error) {
    logger.error('Error processing chat request', { error });

    if (error instanceof Error) {
      const status = error.message.includes('not found')
        ? 404
        : error.message.includes('unauthorized')
          ? 403
          : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
import { type UIMessage, convertToModelMessages } from 'ai';

import { getModelData } from '@/actions/chat/models';
import { createConvo, getConversation } from '@/actions/chat/conversations';
import { createLogger } from '@/lib/infrastructure/logger';
import { apiCallLimiter, checkRateLimit } from '@/lib/security/rate-limiter';
import { verifyJWT } from '@/lib/auth/jwt-verify';
import {
  routeToEndpoint,
  saveUserMessage,
  wrapResponseWithPersistence,
  type RoutableModel,
} from '@/lib/ai/router';
import { extractTextFromMessage } from '@/utils/message-parts';

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
  console.log('[toRoutableModel] Converting model:', {
    id: model.id,
    endpoint: model.endpoint,
    body_config: model.body_config,
    body_config_type: typeof model.body_config,
    body_config_keys:
      model.body_config && typeof model.body_config === 'object'
        ? Object.keys(model.body_config)
        : 'N/A',
    body_config_stringified: JSON.stringify(model.body_config),
  });

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
    // Authentication: Try Clerk first, then JWT
    let userId = (await auth()).userId;

    if (!userId) {
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        userId = await verifyJWT(authHeader);
      }
    }

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

    const {
      messages: uiMessages,
      model_id,
      conversationId,
      org_id,
    } = validation.data as {
      messages: UIMessage[];
      model_id: string;
      conversationId?: string;
      org_id?: string;
    };

    logger.info('Received chat request', {
      messageCount: uiMessages.length,
      model_id,
      conversationId,
      messages: uiMessages.map(m => ({
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
    const lastUserMessage = [...uiMessages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) {
      return NextResponse.json({ error: 'No user message provided' }, { status: 400 });
    }

    // Get or create conversation
    const resolvedConversationId = await getOrCreateConversation(
      conversationId,
      userId,
      model_id,
      org_id || modelData.org_id,
      extractTextFromMessage(lastUserMessage)
    );

    // Save user message with parts
    await saveUserMessage(
      resolvedConversationId,
      crypto.randomUUID(), // Generate a UUID for the message (AI SDK uses short IDs, we need UUIDs)
      lastUserMessage.parts || [],
      lastUserMessage.id // Store AI SDK ID for frontend mapping
    );

    // Convert to routable model
    const routableModel = toRoutableModel(modelData);

    // Get AbortSignal from request
    const signal = req.signal;

    // Route to appropriate handler with conversationId for persistence
    // - ai-sdk-stream: Direct passthrough, wrap with persistence
    // - sse: Direct SSE event mapping, wrap with persistence
    // - webhook: Uses LanguageModelV3 provider with onFinish callback
    const response = await routeToEndpoint(
      routableModel,
      uiMessages,
      resolvedConversationId,
      signal
    );

    // For ai-sdk-stream and sse endpoints, wrap the response with persistence
    // Webhook endpoints handle persistence via onFinish callback
    const endpointType = modelData.endpoint_type || 'webhook';
    const finalResponse =
      endpointType === 'ai-sdk-stream' || endpointType === 'sse'
        ? wrapResponseWithPersistence(response, resolvedConversationId)
        : response;

    // Add conversation ID to response headers for client
    const headers = new Headers(finalResponse.headers);
    headers.set('X-Conversation-Id', resolvedConversationId);

    return new Response(finalResponse.body, {
      status: finalResponse.status,
      statusText: finalResponse.statusText,
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

/**
 * AI SDK 6 Router
 *
 * Routes chat requests to external AI endpoints.
 * Supports three endpoint types:
 *
 * - ai-sdk-stream: AI SDK-compatible endpoints (direct passthrough - no conversion!)
 * - sse: Server-Sent Events endpoints (via LanguageModelV3 provider)
 * - webhook: JSON response endpoints (via LanguageModelV3 provider)
 *
 * For ai-sdk-stream: Direct proxy since they already speak UI message protocol
 * For sse/webhook: Uses LanguageModelV3 providers with AI SDK's streamText()
 */

import { type UIMessage, streamText, convertToModelMessages } from 'ai';
import { createProviderFromConfig } from '@/lib/ai/providers';
import { saveUserMessage, wrapResponseWithPersistence } from './persistence';
import type { RoutableModel, RoutingStrategy, EndpointType } from './types';
import type { StreamConfig as ProviderStreamConfig } from '@/lib/ai/providers/types';

// Re-export types
export type {
  EndpointType,
  RoutableModel,
  RoutingStrategy,
  WebhookStreamConfig,
  StreamConfig,
} from './types';

// Re-export utilities
export { saveUserMessage, wrapResponseWithPersistence } from './persistence';

/**
 * Get the routing strategy for a model
 */
export function getRoutingStrategy(model: RoutableModel): RoutingStrategy {
  const endpointType = (model.endpoint_type || 'webhook') as EndpointType;

  switch (endpointType) {
    case 'ai-sdk-stream':
      return { type: 'passthrough', endpointType };
    case 'sse':
      return { type: 'convert-sse', endpointType };
    case 'webhook':
    default:
      return { type: 'convert-json', endpointType };
  }
}

/**
 * Route a chat request using LanguageModelV3 providers or direct passthrough
 *
 * This is the main entry point for routing. It:
 * 1. For AI SDK stream endpoints: passes through directly (no conversion needed!)
 * 2. For SSE/webhook endpoints: uses LanguageModelV3 providers with onFinish persistence
 * 3. Returns the streaming response in UI message format
 *
 * @param model - Model configuration with endpoint details
 * @param messages - Chat messages in UIMessage format
 * @param conversationId - Conversation ID for message persistence (optional for passthrough)
 * @param signal - Optional AbortSignal for cancellation
 * @returns Streaming response compatible with AI SDK useChat
 */
export async function routeToEndpoint(
  model: RoutableModel,
  messages: UIMessage[],
  conversationId?: string,
  signal?: AbortSignal
): Promise<Response> {
  const endpointType = (model.endpoint_type || 'webhook') as EndpointType;

  // For AI SDK stream endpoints, passthrough directly without conversion
  // These endpoints already speak the AI SDK UI message stream protocol
  if (endpointType === 'ai-sdk-stream') {
    console.log('[Passthrough] Direct proxy to AI SDK endpoint:', model.endpoint);
    console.log(
      '[Passthrough] Messages:',
      JSON.stringify(
        messages.map(m => ({
          id: m.id,
          role: m.role,
          partsCount: m.parts?.length || 0,
        })),
        null,
        2
      )
    );

    // Build request body
    const body =
      model.body_config && Object.keys(model.body_config).length > 0
        ? { ...model.body_config, messages }
        : { messages };

    console.log('[Passthrough] Request body keys:', Object.keys(body));

    // Direct fetch - no conversion needed!
    const response = await fetch(model.endpoint, {
      method: model.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(model.headers || {}),
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI SDK endpoint error (${response.status}): ${errorText}`);
    }

    console.log('[Passthrough] Response received, status:', response.status);

    // Return the response directly - it's already in UI message stream format
    // The persistence wrapper will be applied by the caller if conversationId is provided
    return response;
  }

  // For SSE endpoints, use direct event mapping (no provider intermediary)
  if (endpointType === 'sse') {
    console.log('[SSE Event Mapping] Direct SSE → UI Stream conversion');
    console.log('[SSE Event Mapping] Endpoint:', model.endpoint);

    // Import SSEEventMapper
    const { SSEEventMapper } = await import('@/lib/ai/streaming/sse-event-mapper');
    const { extractTextFromMessage } = await import('@/utils/message-parts');

    // Convert UIMessages to simple messages for external API
    const simpleMessages = messages.map(msg => ({
      role: msg.role,
      content: extractTextFromMessage(msg),
    }));

    // Build request body
    let body: any;
    if (model.body_config) {
      // Use same template builder as test endpoint for consistent placeholder replacement
      const { buildBodyFromTemplate } =
        await import('@/components/features/admin/model-wizard/utils/templateBuilder');

      body = buildBodyFromTemplate(
        model.body_config,
        {
          messages: JSON.stringify(simpleMessages),
          content: simpleMessages.map(m => m.content).join('\n'),
          conversation_id: conversationId || '',
          time: new Date().toISOString(),
        },
        (model as any).message_format_config || null
      );
    } else {
      body = { messages: simpleMessages };
    }

    console.log('[SSE Event Mapping] Request body keys:', Object.keys(body));
    console.log('[SSE Event Mapping] Full request body:', JSON.stringify(body, null, 2));

    // Fetch from SSE endpoint
    const response = await fetch(model.endpoint, {
      method: model.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(model.headers || {}),
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SSE endpoint error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    console.log('[SSE Event Mapping] Response received, applying event mappings...');

    // Create event mapper with config
    // Type guard to ensure we have event_mappings config
    const streamConfig = model.stream_config as any;
    console.log(
      '[SSE Event Mapping] stream_config from model:',
      JSON.stringify(streamConfig, null, 2)
    );

    const mapperConfig =
      streamConfig && 'event_mappings' in streamConfig
        ? streamConfig
        : {
            // Default to simple OpenAI Chat format
            event_mappings: [
              {
                source_event_type: 'data',
                target_ui_event: 'text-delta' as const,
                field_mappings: {
                  delta: 'choices[0].delta.content',
                },
              },
            ],
            done_signal: '[DONE]',
          };

    console.log('[SSE Event Mapping] Using mapper config:', JSON.stringify(mapperConfig, null, 2));
    const mapper = new SSEEventMapper(mapperConfig);

    // Transform stream
    const transformedStream = response.body.pipeThrough(mapper.transform());

    // Create new response with UI stream
    const uiStreamResponse = new Response(transformedStream, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });

    console.log('[SSE Event Mapping] Transformation complete, returning UI stream');

    // Return the UI stream response (will be wrapped with persistence by caller)
    return uiStreamResponse;
  }

  // For webhook endpoints, use the provider-based approach with conversion
  const provider = createProviderFromConfig({
    modelId: model.id,
    endpointType: endpointType,
    endpoint: model.endpoint,
    method: model.method,
    headers: model.headers || undefined,
    bodyConfig: model.body_config,
    responsePath: model.response_path,
    streamConfig: (endpointType === 'webhook' ? model.stream_config : undefined) as
      | ProviderStreamConfig
      | undefined,
  });

  // DIAGNOSTIC: Log messages before conversion
  console.log('🔍 [Provider Route] DIAGNOSTIC - Messages before convertToModelMessages:', {
    messageCount: messages.length,
    messages: messages.map((m, idx) => {
      const partsAnalysis = (m.parts || []).map((part: any, partIdx: number) => ({
        index: partIdx,
        isUndefined: part === undefined,
        isNull: part === null,
        type: typeof part,
        hasType: part != null && 'type' in part,
        partType: part?.type,
        hasText: part != null && 'text' in part,
        textPreview: part?.text?.substring?.(0, 50),
      }));

      return {
        messageIndex: idx,
        id: m.id,
        role: m.role,
        partsArray: m.parts,
        partsLength: m.parts?.length || 0,
        partsIsArray: Array.isArray(m.parts),
        partsAnalysis,
        hasUndefinedParts: partsAnalysis.some((p: any) => p.isUndefined),
        hasNullParts: partsAnalysis.some((p: any) => p.isNull),
      };
    }),
  });

  // Convert UIMessages to LanguageModelV3Prompt format
  const prompt = await convertToModelMessages(messages);

  // DIAGNOSTIC: Log prompt after conversion
  console.log('🔍 [Provider Route] DIAGNOSTIC - Prompt after convertToModelMessages:', {
    promptCount: prompt.length,
    prompt: prompt.map((m, idx) => ({
      messageIndex: idx,
      role: m.role,
      contentType: typeof m.content,
      contentIsArray: Array.isArray(m.content),
      contentLength: Array.isArray(m.content) ? m.content.length : undefined,
      contentAnalysis: Array.isArray(m.content)
        ? m.content.map((c: any, cIdx: number) => ({
            index: cIdx,
            isUndefined: c === undefined,
            isNull: c === null,
            type: typeof c,
            hasType: c != null && 'type' in c,
            contentType: c?.type,
            hasText: c != null && 'text' in c,
            textPreview: c?.text?.substring?.(0, 50),
          }))
        : typeof m.content === 'string'
          ? { stringLength: m.content.length, preview: m.content.substring(0, 50) }
          : m.content,
    })),
  });

  console.log('[Provider Route] Using provider for endpoint type:', endpointType);
  console.log('[Provider Route] Provider type:', provider.constructor.name);
  console.log(
    '[Provider Route] Prompt:',
    JSON.stringify(
      prompt.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content.substring(0, 100) : 'array',
      })),
      null,
      2
    )
  );

  // Use AI SDK's streamText with the provider (works for all endpoint types now!)
  const result = streamText({
    model: provider,
    messages: prompt,
    abortSignal: signal,
    // Server-side onFinish callback for message persistence
    onFinish: conversationId
      ? async ({ text, toolCalls, toolResults, usage, finishReason }) => {
          try {
            console.log('🟢 [onFinish] Persisting assistant message:', {
              conversationId,
              hasText: !!text,
              textLength: text?.length,
              toolCallsCount: toolCalls?.length || 0,
              usage,
              finishReason,
            });

            // Build parts array from AI SDK result
            const messageParts: UIMessage['parts'] = [];

            // Add text part if present
            if (text && text.trim()) {
              messageParts.push({
                type: 'text',
                text,
              });
            }

            // Add tool invocation parts if present
            if (toolCalls && toolCalls.length > 0) {
              for (const toolCall of toolCalls) {
                const toolResult = toolResults?.find(r => r.toolCallId === toolCall.toolCallId);
                messageParts.push({
                  type: 'tool-invocation',
                  toolInvocation: {
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    args: (toolCall as any).args || (toolCall as any).arguments || {},
                    state: toolResult ? 'result' : 'call',
                    result: (toolResult as any)?.result || (toolResult as any)?.output,
                  },
                } as any);
              }
            }

            // Save to database only if we have content
            if (messageParts.length > 0) {
              const { createSupabaseServerClient } = await import('@/lib/supabase/server');
              const supabase = await createSupabaseServerClient();

              const dbMessageId = crypto.randomUUID();
              const { error } = await supabase.from('messages').insert({
                id: dbMessageId,
                conversation_id: conversationId,
                role: 'assistant',
                parts: messageParts as any,
                ai_sdk_id: null, // onFinish doesn't provide message ID
              });

              if (error) {
                console.error('🔴 [onFinish] Failed to save assistant message:', error);
              } else {
                console.log('✅ [onFinish] Assistant message saved:', {
                  id: dbMessageId,
                  partsCount: messageParts.length,
                  toolCallsCount: toolCalls?.length || 0,
                  hasText: !!text?.trim(),
                });
              }
            }
          } catch (error) {
            console.error('🔴 [onFinish] Error persisting message:', error);
          }
        }
      : undefined,
  });

  console.log('[Provider Route] StreamText result obtained, converting to UI message stream...');

  // Use toUIMessageStreamResponse() to get properly formatted UI message stream
  // This ensures all events have required fields and are in the correct format for useChat hook
  const response = result.toUIMessageStreamResponse();

  // DIAGNOSTIC: Log response details
  console.log('🔍 [Provider Route] DIAGNOSTIC - Response from toUIMessageStreamResponse:', {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    hasBody: !!response.body,
  });

  console.log('⚠️ [Provider Route] About to apply step-event filter...');

  // Filter out start-step and finish-step events from the stream
  // AI SDK's streamText() emits these even for single-step generations
  // They lack required properties (e.g., 'text'), causing useChat to fail
  // These are only needed for multi-step agent coordination
  if (response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = '';

    const filteredStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) {
                controller.enqueue(encoder.encode(line + '\n'));
                continue;
              }

              if (trimmed.startsWith('data:')) {
                const data = trimmed.slice(5).trim();
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode(line + '\n'));
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);

                  // DIAGNOSTIC: Log every event we see
                  console.log(`🔍 [Filter] Saw event type: ${parsed.type}`, parsed);

                  // Filter out start-step and finish-step events
                  // AI SDK emits these even for single-step generations (default: stopWhen: stepCountIs(1))
                  // These events don't have required properties like 'text', causing useChat to fail
                  // when it tries to access them. They're only needed for multi-step agent coordination.
                  // See: https://github.com/vercel/ai/issues/8305
                  if (parsed.type === 'start-step' || parsed.type === 'finish-step') {
                    console.log(
                      `🔍 [Filter] ✂️ FILTERING OUT ${parsed.type} event (internal control event)`
                    );
                    continue; // Skip this event
                  }

                  // Also log and filter error events to see what's causing the issue
                  if (parsed.type === 'error') {
                    console.log(`🔍 [Filter] 🚨 ERROR EVENT:`, JSON.stringify(parsed, null, 2));
                  }

                  console.log(`🔍 [Filter] ✅ Passing through ${parsed.type} event`);
                  // Pass through all other events
                  controller.enqueue(encoder.encode(line + '\n'));
                } catch {
                  // If it's not JSON, pass it through
                  controller.enqueue(encoder.encode(line + '\n'));
                }
              } else {
                controller.enqueue(encoder.encode(line + '\n'));
              }
            }
          }

          // Process remaining buffer
          if (buffer.trim()) {
            controller.enqueue(encoder.encode(buffer));
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(filteredStream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  return response;
}

/**
 * Route and persist - convenience function for routing with persistence
 *
 * All endpoint types now use streamText with onFinish callback for persistence.
 * This function is a simple wrapper around routeToEndpoint.
 *
 * @param model - Model configuration
 * @param messages - Chat messages
 * @param conversationId - Conversation ID for message persistence
 * @param signal - Optional AbortSignal
 * @returns Streaming response with automatic message persistence via onFinish
 */
export async function routeAndPersist(
  model: RoutableModel,
  messages: UIMessage[],
  conversationId: string,
  signal?: AbortSignal
): Promise<Response> {
  // All endpoints now use onFinish callback for persistence
  return routeToEndpoint(model, messages, conversationId, signal);
}

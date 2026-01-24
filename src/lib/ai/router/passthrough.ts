/**
 * AI SDK Stream Pass-through Handler
 *
 * For external endpoints built with AI SDK that return AI SDK-compatible streams.
 *
 * AI SDK has two stream formats:
 * - Data streams: Lower-level format with events like "tool-input-start", "tool-output-available"
 * - UI message streams: Higher-level format with events like "tool-invocation", "tool-result"
 *
 * The useChat hook expects UI message streams, so this handler:
 * - Converts data streams to UI message streams
 * - Passes through UI message streams unchanged
 */

import { type UIMessage } from 'ai';
import { buildBodyJson } from '@/lib/api/model-utils';
import type { RoutableModel, SimpleMessage } from './types';
import { convertDataStreamToUIStream } from './stream-converter';
import { extractTextFromMessage, ensureParts } from '@/utils/message-parts';

/**
 * Pass through an AI SDK stream from an external endpoint
 *
 * When the external endpoint is built with AI SDK (endpoint_type: 'ai-sdk-stream'),
 * we check if it returns a data stream or UI message stream:
 * - Data streams are converted to UI message streams (for useChat compatibility)
 * - UI message streams are passed through unchanged
 */
export async function passThroughAISDKStream(
  model: RoutableModel,
  messages: UIMessage[],
  signal?: AbortSignal
): Promise<Response> {
  console.log('🔄 [AI SDK Passthrough] Starting request to:', model.endpoint);
  console.log('📝 [AI SDK Passthrough] Endpoint type:', model.endpoint_type);
  console.log('📨 [AI SDK Passthrough] Messages received:', messages.length);

  // Convert UIMessages to v6 format for external endpoint
  // AI SDK v6 expects messages with `parts` array, not `content` string
  const v6Messages = messages.map(m => ({
    id: m.id,
    role: m.role,
    parts: ensureParts(m),
    ...('createdAt' in m && m.createdAt ? { createdAt: m.createdAt as Date } : {}),
  }));

  console.log(
    '🔀 [AI SDK Passthrough] Converted messages to v6 format:',
    JSON.stringify(
      v6Messages.map(m => ({
        id: m.id,
        role: m.role,
        partsCount: m.parts?.length || 0,
        parts: m.parts,
      })),
      null,
      2
    )
  );

  // Build request body using template if configured
  let body: unknown;
  if (model.body_config) {
    console.log('⚙️ [AI SDK Passthrough] Using body_config template');
    // Extract text content for template variables (backwards compatibility)
    const lastMessageText = extractTextFromMessage(v6Messages[v6Messages.length - 1] || {});

    body = await buildBodyJson(model.body_config, {
      messages: v6Messages,
      content: lastMessageText, // For backwards compatibility with templates
    });
  } else {
    console.log('📦 [AI SDK Passthrough] Using default body (v6 format with parts)');
    // Default: send messages in v6 format with parts
    body = { messages: v6Messages };
  }

  console.log('📤 [AI SDK Passthrough] Request body:', JSON.stringify(body, null, 2));
  console.log(
    '🔑 [AI SDK Passthrough] Headers:',
    JSON.stringify(
      {
        'Content-Type': 'application/json',
        ...model.headers,
      },
      null,
      2
    )
  );

  // Forward request to external AI SDK agent
  console.log('🚀 [AI SDK Passthrough] Sending request to:', model.endpoint);
  const response = await fetch(model.endpoint, {
    method: model.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...model.headers,
    },
    body: JSON.stringify(body),
    signal,
  });

  console.log('✅ [AI SDK Passthrough] Response status:', response.status);
  console.log(
    '📋 [AI SDK Passthrough] Response headers:',
    JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ [AI SDK Passthrough] Error response:', errorText);
    throw new Error(`AI SDK endpoint error (${response.status}): ${errorText}`);
  }

  // Check what type of AI SDK stream this is
  const hasDataStream = response.headers.get('x-vercel-ai-data-stream') === 'v1';
  const hasUIStream = response.headers.get('x-vercel-ai-ui-message-stream') === 'v1';

  console.log('📋 [AI SDK Passthrough] Stream type detection:', {
    hasDataStream,
    hasUIStream,
    'content-type': response.headers.get('content-type'),
  });

  if (!response.body) {
    throw new Error('Response body is null');
  }

  // According to AI SDK docs, toUIMessageStreamResponse() returns UI message stream format
  // The useChat hook processes these events (tool-input-start, tool-output-available)
  // and creates message parts automatically. We should pass through when UI stream header is set.

  if (hasUIStream && !hasDataStream) {
    // It's explicitly a UI message stream - pass through directly
    // The useChat hook will process tool-input-start, tool-output-available events
    console.log(
      '✨ [AI SDK Passthrough] Passing through UI message stream - useChat will handle tool events'
    );
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'x-vercel-ai-ui-message-stream': 'v1',
      },
    });
  }

  // If it's a data stream or no headers, convert it
  // The converter will handle both v4 and v6 data stream formats
  console.log('🔄 [AI SDK Passthrough] Converting data stream to UI message stream');
  return convertDataStreamToUIStream(response.body);
}

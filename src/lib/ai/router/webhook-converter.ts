/**
 * Webhook to UI Stream Converter
 *
 * Converts JSON responses from traditional webhook endpoints
 * to AI SDK 6 UI message stream format.
 */

import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from 'ai';
import { buildBodyJson, getByPath } from '@/lib/api/model-utils';
import type { RoutableModel, SimpleMessage, WebhookStreamConfig } from './types';
import { extractTextFromMessage } from '@/utils/message-parts';

/**
 * Convert a JSON webhook response to UI message stream
 *
 * Calls the webhook endpoint, extracts the response using response_path,
 * and wraps it in a UI message stream format.
 */
export async function convertWebhookToUIStream(
  model: RoutableModel,
  messages: UIMessage[],
  signal?: AbortSignal
): Promise<Response> {
  // Convert UIMessages to simple format for external webhook endpoints
  // External APIs expect content strings, not parts arrays
  const simpleMessages: SimpleMessage[] = messages.map(m => ({
    role: m.role,
    content: extractTextFromMessage(m),
  }));

  // Build request body using template
  const body = await buildBodyJson(model.body_config, {
    messages: simpleMessages,
    content: simpleMessages[simpleMessages.length - 1]?.content ?? '',
  });

  // Call webhook endpoint
  const response = await fetch(model.endpoint, {
    method: model.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...model.headers,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Webhook error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Extract response text using path
  let text: string;
  if (model.response_path) {
    const extracted = getByPath(data, model.response_path);
    text = typeof extracted === 'string' ? extracted : JSON.stringify(extracted);
  } else {
    // Try common response fields
    text = data.response ?? data.content ?? data.text ?? JSON.stringify(data);
  }

  // Get stream config
  const streamConfig = model.stream_config as WebhookStreamConfig | null;
  const simulateStream = streamConfig?.simulateStream ?? false;
  const simulateDelay = streamConfig?.simulateDelay ?? 20;

  // Create UI message stream
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const messageId = crypto.randomUUID();

      writer.write({ type: 'start' });
      writer.write({ type: 'text-start', id: messageId });

      if (simulateStream && text.length > 0) {
        // Simulate streaming word by word for better UX
        const words = text.split(' ');
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const deltaText = i < words.length - 1 ? word + ' ' : word;
          writer.write({ type: 'text-delta', id: messageId, delta: deltaText });
          await new Promise(r => setTimeout(r, simulateDelay));
        }
      } else {
        // Emit full text at once
        writer.write({ type: 'text-delta', id: messageId, delta: text });
      }

      writer.write({ type: 'text-end', id: messageId });
      writer.write({ type: 'finish', finishReason: 'stop' });
    },
    onError: error => {
      console.error('Webhook stream error:', error);
      return error instanceof Error ? error.message : 'Unknown error';
    },
  });

  return createUIMessageStreamResponse({ stream });
}

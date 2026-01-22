/**
 * SSE to UI Stream Converter
 *
 * Converts non-AI SDK Server-Sent Events streams (like OpenAI's format)
 * to AI SDK 6 UI message stream format.
 */

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from 'ai';
import { buildBodyJson, getByPath } from '@/lib/api/model-utils';
import type { RoutableModel, SimpleMessage, SSEStreamConfig } from './types';
import { extractTextFromMessage } from '@/utils/formatters/message-parts';

/**
 * Default configuration for OpenAI-style SSE streams
 */
const DEFAULT_SSE_CONFIG: Required<SSEStreamConfig> = {
  contentPath: 'choices[0].delta.content',
  doneSignal: '[DONE]',
  errorPath: 'error.message',
};

/**
 * Convert an SSE stream to UI message stream
 *
 * Parses SSE events from the external endpoint, extracts deltas
 * using the configured path, and emits them as UI message stream parts.
 */
export async function convertSSEToUIStream(
  model: RoutableModel,
  messages: UIMessage[],
  signal?: AbortSignal
): Promise<Response> {
  // Convert UIMessages to simple format for external SSE endpoints
  // External APIs (like OpenAI) expect content strings, not parts arrays
  const simpleMessages: SimpleMessage[] = messages.map((m) => ({
    role: m.role,
    content: extractTextFromMessage(m),
  }));

  // Build request body using template
  const body = await buildBodyJson(model.body_config, {
    messages: simpleMessages,
    content: simpleMessages[simpleMessages.length - 1]?.content ?? '',
  });

  console.log('🔴 [SSE Converter] Sending to OpenAI:', {
    endpoint: model.endpoint,
    messagesCount: simpleMessages.length,
    messages: simpleMessages,
    bodyToSend: body,
  });

  // Call SSE endpoint
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
    throw new Error(`SSE endpoint error (${response.status}): ${errorText}`);
  }

  // Merge config with defaults
  const rawConfig = model.stream_config as SSEStreamConfig | null;
  const config: Required<SSEStreamConfig> = {
    contentPath: rawConfig?.contentPath ?? DEFAULT_SSE_CONFIG.contentPath,
    doneSignal: rawConfig?.doneSignal ?? DEFAULT_SSE_CONFIG.doneSignal,
    errorPath: rawConfig?.errorPath ?? DEFAULT_SSE_CONFIG.errorPath,
  };

  // Create UI message stream that transforms SSE events
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const messageId = crypto.randomUUID();

      writer.write({ type: 'start' });
      writer.write({ type: 'text-start', id: messageId });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();

            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith(':')) continue;

            // Parse SSE data lines
            if (trimmedLine.startsWith('data:')) {
              const data = trimmedLine.slice(5).trim();

              // Check for done signal
              if (data === config.doneSignal) continue;

              try {
                const parsed = JSON.parse(data);

                // Check for errors
                const error = getByPath(parsed, config.errorPath);
                if (error) {
                  throw new Error(String(error));
                }

                // Extract content delta
                const deltaContent = getByPath(parsed, config.contentPath);
                if (deltaContent && typeof deltaContent === 'string') {
                  writer.write({ type: 'text-delta', id: messageId, delta: deltaContent });
                }
              } catch (parseError) {
                // Skip unparseable lines (might be partial JSON)
                if (
                  parseError instanceof SyntaxError &&
                  data !== config.doneSignal
                ) {
                  // Silently skip JSON parse errors
                  continue;
                }
                // Re-throw other errors
                if (!(parseError instanceof SyntaxError)) {
                  throw parseError;
                }
              }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          const trimmedLine = buffer.trim();
          if (trimmedLine.startsWith('data:')) {
            const data = trimmedLine.slice(5).trim();
            if (data && data !== config.doneSignal) {
              try {
                const parsed = JSON.parse(data);
                const deltaContent = getByPath(parsed, config.contentPath);
                if (deltaContent && typeof deltaContent === 'string') {
                  writer.write({ type: 'text-delta', id: messageId, delta: deltaContent });
                }
              } catch {
                // Ignore final parse errors
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      writer.write({ type: 'text-end', id: messageId });
      writer.write({ type: 'finish', finishReason: 'stop' });
    },
    onError: (error) => {
      console.error('SSE stream conversion error:', error);
      return error instanceof Error ? error.message : 'Unknown error';
    },
  });

  return createUIMessageStreamResponse({ stream });
}

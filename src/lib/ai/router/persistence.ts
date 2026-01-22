/**
 * Stream Persistence Wrapper
 *
 * Wraps a UI message stream response to intercept and save
 * the complete assistant message (including tool calls) to the database.
 * 
 * Follows AI SDK pattern: saves complete UIMessage with parts array.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type UIMessage } from 'ai';

/**
 * Wrap a streaming response to persist the assistant message
 *
 * This creates a TransformStream that:
 * 1. Passes through all chunks unchanged
 * 2. Parses stream events to reconstruct complete UIMessage with parts
 * 3. Saves the complete message (including tool calls) when stream ends
 */
export function wrapResponseWithPersistence(
  response: Response,
  conversationId: string
): Response {
  if (!response.body) {
    return response;
  }

  // Track message state to reconstruct complete UIMessage
  let messageId: string | null = null;
  const parts: UIMessage['parts'] = [];
  const toolCalls = new Map<string, { toolCallId: string; toolName: string; args: unknown; result?: unknown }>();
  let currentText = '';

  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      // Pass through chunk unchanged
      controller.enqueue(chunk);

      // Parse stream events to reconstruct message parts
      try {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data:')) {
            const data = trimmedLine.slice(5).trim();
            if (data && data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);

                // Capture message ID
                if (parsed.id && !messageId) {
                  messageId = parsed.id;
                }

                // Handle text content
                if (parsed.type === 'text-delta' && parsed.delta) {
                  currentText += parsed.delta;
                } else if (parsed.type === 'text' && parsed.text) {
                  currentText += parsed.text;
                }

                // Handle tool invocations (from converted UI message streams)
                if (parsed.type === 'tool-invocation') {
                  toolCalls.set(parsed.toolCallId, {
                    toolCallId: parsed.toolCallId,
                    toolName: parsed.toolName,
                    args: parsed.args || {},
                  });
                }

                // Handle tool results (from converted UI message streams)
                if (parsed.type === 'tool-result') {
                  const toolCall = toolCalls.get(parsed.toolCallId);
                  if (toolCall) {
                    toolCall.result = parsed.result;
                  }
                }

                // Handle AI SDK v6 data stream tool events (direct from external endpoints)
                if (parsed.type === 'tool-input-available') {
                  toolCalls.set(parsed.toolCallId, {
                    toolCallId: parsed.toolCallId,
                    toolName: parsed.toolName,
                    args: parsed.input || {},
                  });
                }

                if (parsed.type === 'tool-output-available') {
                  const toolCall = toolCalls.get(parsed.toolCallId);
                  if (toolCall) {
                    toolCall.result = parsed.output;
                  } else {
                    // Tool call might not have been seen yet, create it
                    toolCalls.set(parsed.toolCallId, {
                      toolCallId: parsed.toolCallId,
                      toolName: 'unknown', // Will be updated if we see tool-input-available later
                      args: {},
                      result: parsed.output,
                    });
                  }
                }
              } catch {
                // Skip unparseable JSON
              }
            }
          }
        }
      } catch {
        // Ignore decode errors
      }
    },

    async flush() {
      // Reconstruct complete UIMessage with all parts
      try {
        const supabase = await createSupabaseServerClient();
        
        // Build parts array: text parts + tool invocation parts
        const messageParts: UIMessage['parts'] = [];
        
        // Add text part if there's text content
        if (currentText.trim()) {
          messageParts.push({
            type: 'text',
            text: currentText,
          });
        }

        // Add tool invocation parts
        for (const toolCall of Array.from(toolCalls.values())) {
          messageParts.push({
            type: 'tool-invocation',
            toolInvocation: {
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              args: toolCall.args,
              state: toolCall.result !== undefined ? 'result' : 'call',
              result: toolCall.result,
            },
          } as any);
        }

        // Only save if we have parts
        if (messageParts.length > 0) {
          const dbMessageId = crypto.randomUUID();
          
          await supabase.from('messages').insert({
            id: dbMessageId,
            conversation_id: conversationId,
            role: 'assistant',
            parts: messageParts as any, // Complete parts array
            ai_sdk_id: messageId, // Store AI SDK message ID for mapping
          });
          
          console.log('✅ [wrapResponseWithPersistence] Assistant message saved:', {
            id: dbMessageId,
            ai_sdk_id: messageId,
            partsCount: messageParts.length,
            toolCallsCount: toolCalls.size,
            hasText: !!currentText.trim(),
            parts: messageParts.map(p => ({
              type: p.type,
              ...(p.type === 'tool-invocation' && 'toolInvocation' in p ? { toolName: (p as any).toolInvocation.toolName } : {}),
            })),
          });
        }
      } catch (error) {
        console.error('🔴 Failed to persist assistant message:', error);
      }
    },
  });

  // Create new response with transformed stream
  const newBody = response.body.pipeThrough(transformStream);

  return new Response(newBody, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/**
 * Save a user message to the database
 *
 * This should be called before routing to save the user's message.
 */
export async function saveUserMessage(
  conversationId: string,
  messageId: string,
  parts: UIMessage['parts'],
  aiSdkId?: string
): Promise<void> {
  console.log('🟣 [saveUserMessage] Attempting to save user message:', {
    conversationId,
    messageId,
    aiSdkId,
    partsCount: parts?.length || 0,
  });

  const supabase = await createSupabaseServerClient();
  const result = await supabase.from('messages').insert({
    id: messageId,
    conversation_id: conversationId,
    role: 'user',
    parts: (parts || null) as any,
    ai_sdk_id: aiSdkId || null,
  } as any);

  if (result.error) {
    console.error('🔴 [saveUserMessage] Failed to save user message:', result.error);
    throw new Error(`Failed to save user message: ${result.error.message}`);
  }

  console.log('✅ [saveUserMessage] User message saved successfully');
}

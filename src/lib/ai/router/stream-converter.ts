/**
 * Stream Format Converter
 *
 * Converts AI SDK data stream format (v4 prefix format or v6 JSON format) 
 * to UI message stream format for compatibility with useChat hook from @ai-sdk/react
 */

/**
 * Convert AI SDK Data Stream to UI Message Stream
 *
 * Supports two input formats:
 * 
 * AI SDK v4 data stream format (prefix-based):
 * - 0:"text chunk"
 * - f:{"messageId":"..."}
 * - 9:{"toolCallId":"...","toolName":"..."}
 * - a:{"toolCallId":"...","result":...}
 * - e:{"finishReason":"..."}
 * - d:{"finishReason":"..."}
 *
 * AI SDK v6 data stream format (JSON-based):
 * - data: {"type":"start"}
 * - data: {"type":"start-step"}
 * - data: {"type":"tool-input-start","toolCallId":"...","toolName":"..."}
 * - data: {"type":"tool-input-available","toolCallId":"...","toolName":"...","input":{}}
 * - data: {"type":"tool-output-available","toolCallId":"...","output":...}
 * - data: {"type":"finish-step"}
 * - data: {"type":"finish","finishReason":"..."}
 *
 * UI message stream format (output):
 * - data: {"type":"text-delta","delta":"text chunk"}
 * - data: {"type":"tool-invocation","toolCallId":"...","toolName":"...","args":{}}
 * - data: {"type":"tool-result","toolCallId":"...","result":...}
 * - data: {"type":"finish","finishReason":"..."}
 */
export function convertDataStreamToUIStream(
  dataStream: ReadableStream<Uint8Array>
): Response {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let messageId = crypto.randomUUID();
  let currentText = '';
  let buffer = '';
  let streamFormat: 'v4' | 'v6' | 'ui-stream' | 'unknown' = 'unknown';
  const pendingToolCalls = new Map<string, { toolCallId: string; toolName: string; args: unknown }>();

  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, controller) {
      // Decode the chunk and add to buffer
      buffer += decoder.decode(chunk, { stream: true });

      // Process complete lines
      const lines = buffer.split('\n');
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || line.trim() === 'data: [DONE]') {
          if (line.trim() === 'data: [DONE]') {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          }
          continue;
        }

        console.log('🔍 [Stream Converter] Processing line:', line);

        try {
          // Detect format on first non-empty line
          if (streamFormat === 'unknown') {
            if (line.startsWith('data: {')) {
              // Check if it's already UI message stream format
              try {
                const jsonStr = line.slice(6);
                const event = JSON.parse(jsonStr);
                // UI message stream has types like: text-delta, tool-invocation, tool-result, finish
                // v6 data stream has types like: start, start-step, tool-input-start, tool-output-available, finish-step
                if (['text-delta', 'tool-invocation', 'tool-result', 'finish', 'message-start', 'message-end'].includes(event.type)) {
                  streamFormat = 'ui-stream';
                  console.log('📦 [Stream Converter] Detected UI message stream format - passing through');
                } else {
                  streamFormat = 'v6';
                  console.log('📦 [Stream Converter] Detected AI SDK v6 data stream format');
                }
              } catch {
                streamFormat = 'v6';
                console.log('📦 [Stream Converter] Detected AI SDK v6 format (parse error, assuming v6)');
              }
            } else if (line.includes(':') && /^[0-9a-f]:/.test(line)) {
              streamFormat = 'v4';
              console.log('📦 [Stream Converter] Detected AI SDK v4 format');
            }
          }

          // If it's already a UI stream, pass through unchanged
          if (streamFormat === 'ui-stream') {
            controller.enqueue(encoder.encode(line + '\n'));
            continue;
          }

          // Handle AI SDK v6 format (data: {"type":"..."})
          if (streamFormat === 'v6' && line.startsWith('data: ')) {
            const jsonStr = line.slice(6); // Remove "data: " prefix
            if (jsonStr.trim() === '[DONE]') {
              continue;
            }

            const event = JSON.parse(jsonStr);
            const eventType = event.type;

            switch (eventType) {
              case 'start':
                // Stream started - emit message-start
                if (event.id) {
                  messageId = event.id;
                }
                const messageStart = {
                  type: 'message-start',
                  id: messageId,
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(messageStart)}\n\n`)
                );
                console.log('📝 [Stream Converter] Emitted message-start:', messageId);
                break;

              case 'text-delta':
                // Text content
                if (event.textDelta) {
                  currentText += event.textDelta;
                  const textDelta = {
                    type: 'text-delta',
                    id: messageId,
                    delta: event.textDelta,
                  };
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(textDelta)}\n\n`)
                  );
                  console.log('✍️ [Stream Converter] Emitted text-delta');
                }
                break;

              case 'tool-input-start':
                // Tool call starting - store for when input is available
                if (event.toolCallId && event.toolName) {
                  pendingToolCalls.set(event.toolCallId, {
                    toolCallId: event.toolCallId,
                    toolName: event.toolName,
                    args: {},
                  });
                  console.log('🔧 [Stream Converter] Tool call starting:', event.toolName);
                }
                break;

              case 'tool-input-delta':
                // Tool call input being streamed - accumulate
                if (event.toolCallId && event.inputTextDelta) {
                  const pending = pendingToolCalls.get(event.toolCallId);
                  if (pending) {
                    // Accumulate input deltas (though typically they come as complete JSON)
                    try {
                      const deltaObj = JSON.parse(event.inputTextDelta);
                      pending.args = { ...(typeof pending.args === 'object' && pending.args !== null ? pending.args : {}), ...deltaObj };
                    } catch {
                      // If not JSON, just store as string
                      pending.args = event.inputTextDelta;
                    }
                  }
                }
                break;

              case 'tool-input-available':
                // Tool call input complete - emit tool-invocation
                if (event.toolCallId && event.toolName) {
                  const args = event.input || pendingToolCalls.get(event.toolCallId)?.args || {};

                  const toolInvocation = {
                    type: 'tool-invocation',
                    id: messageId,
                    toolCallId: event.toolCallId,
                    toolName: event.toolName,
                    args: args,
                    state: 'call', // Add state for UI rendering
                  };

                  const output = `data: ${JSON.stringify(toolInvocation)}\n\n`;
                  controller.enqueue(encoder.encode(output));
                  console.log('🔧 [Stream Converter] Emitted tool-invocation:', {
                    toolName: event.toolName,
                    toolCallId: event.toolCallId,
                    args,
                    outputSent: output
                  });

                  // Keep in pending for result matching
                  pendingToolCalls.set(event.toolCallId, {
                    toolCallId: event.toolCallId,
                    toolName: event.toolName,
                    args: args,
                  });
                }
                break;

              case 'tool-output-available':
                // Tool result available - emit tool-result
                if (event.toolCallId) {
                  const toolResultEvent = {
                    type: 'tool-result',
                    id: messageId,
                    toolCallId: event.toolCallId,
                    result: event.output,
                    state: 'result', // Add state for UI rendering
                  };

                  const output = `data: ${JSON.stringify(toolResultEvent)}\n\n`;
                  controller.enqueue(encoder.encode(output));
                  console.log('📊 [Stream Converter] Emitted tool-result:', {
                    toolCallId: event.toolCallId,
                    hasResult: !!event.output,
                    outputSent: output
                  });

                  // Clean up pending tool call
                  pendingToolCalls.delete(event.toolCallId);
                }
                break;

              case 'finish-step':
                // Step finished - can emit step-finish if needed
                const stepFinish = {
                  type: 'step-finish',
                  id: messageId,
                  finishReason: event.finishReason || 'stop',
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(stepFinish)}\n\n`)
                );
                console.log('🏁 [Stream Converter] Emitted step-finish');
                break;

              case 'finish':
                // Stream finished
                const finish = {
                  type: 'finish',
                  id: messageId,
                  finishReason: event.finishReason || 'stop',
                  usage: event.usage,
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(finish)}\n\n`)
                );
                console.log('✅ [Stream Converter] Emitted finish');
                break;

              case 'start-step':
              case 'error':
                // Ignore these events or handle as needed
                break;

              default:
                console.log('⚠️ [Stream Converter] Unknown v6 event type:', eventType);
            }
            continue;
          }

          // Handle AI SDK v4 format (prefix:data)
          if (streamFormat === 'v4') {
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) continue;

            const prefix = line.slice(0, colonIndex);
            const data = line.slice(colonIndex + 1);

            switch (prefix) {
              case '0': // Text chunk
                const textContent = data.startsWith('"') && data.endsWith('"')
                  ? JSON.parse(data)
                  : data;

                currentText += textContent;

                const textDelta = {
                  type: 'text-delta',
                  id: messageId,
                  delta: textContent,
                };

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(textDelta)}\n\n`)
                );
                console.log('✍️ [Stream Converter] Emitted text-delta:', textContent);
                break;

              case 'f': // Message start
                const messageData = JSON.parse(data);
                if (messageData.messageId) {
                  messageId = messageData.messageId;

                  const messageStart = {
                    type: 'message-start',
                    id: messageId,
                  };

                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(messageStart)}\n\n`)
                  );
                  console.log('📝 [Stream Converter] Emitted message-start:', messageId);
                }
                break;

              case '9': // Tool call
                const toolCall = JSON.parse(data);

                const toolInvocation = {
                  type: 'tool-invocation',
                  id: messageId,
                  toolCallId: toolCall.toolCallId,
                  toolName: toolCall.toolName,
                  args: toolCall.args,
                };

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(toolInvocation)}\n\n`)
                );
                console.log('🔧 [Stream Converter] Emitted tool-invocation:', toolCall.toolName);
                break;

              case 'a': // Tool result
                const toolResult = JSON.parse(data);

                const toolResultEvent = {
                  type: 'tool-result',
                  id: messageId,
                  toolCallId: toolResult.toolCallId,
                  result: toolResult.result,
                };

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(toolResultEvent)}\n\n`)
                );
                console.log('📊 [Stream Converter] Emitted tool-result');
                break;

              case 'e': // Stream end for a step
                const stepEnd = JSON.parse(data);

                const stepFinish = {
                  type: 'step-finish',
                  id: messageId,
                  finishReason: stepEnd.finishReason,
                  usage: stepEnd.usage,
                  isContinued: stepEnd.isContinued,
                };

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(stepFinish)}\n\n`)
                );
                console.log('🏁 [Stream Converter] Emitted step-finish');
                break;

              case 'd': // Final stream end
                const finalEnd = JSON.parse(data);

                const finish = {
                  type: 'finish',
                  id: messageId,
                  finishReason: finalEnd.finishReason,
                  usage: finalEnd.usage,
                };

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(finish)}\n\n`)
                );
                console.log('✅ [Stream Converter] Emitted finish');
                break;

              default:
                console.log('⚠️ [Stream Converter] Unknown v4 prefix:', prefix);
            }
            continue;
          }

          // If format still unknown, try to parse as v6
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const event = JSON.parse(jsonStr);
              if (event.type) {
                streamFormat = 'v6';
                // Reprocess this line with v6 handler
                const reprocessLine = line;
                // We'll handle it in the next iteration by setting format
                continue;
              }
            } catch {
              // Not JSON, skip
            }
          }
        } catch (error) {
          console.error('❌ [Stream Converter] Error processing line:', error, 'Line:', line);
        }
      }
    },

    flush(controller) {
      // Process any remaining buffer
      if (buffer.trim()) {
        console.log('🔍 [Stream Converter] Processing remaining buffer:', buffer);

        if (streamFormat === 'ui-stream') {
          // Pass through UI stream unchanged
          controller.enqueue(encoder.encode(buffer + '\n'));
        } else if (streamFormat === 'v6' && buffer.startsWith('data: ')) {
          try {
            const jsonStr = buffer.slice(6);
            if (jsonStr.trim() && jsonStr.trim() !== '[DONE]') {
              const event = JSON.parse(jsonStr);
              // Handle the event (similar to transform logic)
              if (event.type === 'text-delta' && event.textDelta) {
                currentText += event.textDelta;
                const textDelta = {
                  type: 'text-delta',
                  id: messageId,
                  delta: event.textDelta,
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(textDelta)}\n\n`)
                );
              }
            }
          } catch (error) {
            console.error('❌ [Stream Converter] Error in flush (v6):', error);
          }
        } else if (streamFormat === 'v4') {
          const colonIndex = buffer.indexOf(':');
          if (colonIndex !== -1) {
            const prefix = buffer.slice(0, colonIndex);
            const data = buffer.slice(colonIndex + 1);

            try {
              if (prefix === '0') {
                const textContent = data.startsWith('"') && data.endsWith('"')
                  ? JSON.parse(data)
                  : data;

                const textDelta = {
                  type: 'text-delta',
                  id: messageId,
                  delta: textContent,
                };

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(textDelta)}\n\n`)
                );
              }
            } catch (error) {
              console.error('❌ [Stream Converter] Error in flush (v4):', error);
            }
          }
        }
      }

      // Only emit message-end if we're converting (not for ui-stream)
      if (streamFormat !== 'ui-stream') {
        const messageEnd = {
          type: 'message-end',
          id: messageId,
          content: currentText,
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(messageEnd)}\n\n`)
        );
        console.log('🔚 [Stream Converter] Emitted message-end');
      }

      // Send the final [DONE] marker
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    },
  });

  const transformedStream = dataStream.pipeThrough(transformStream);

  return new Response(transformedStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'x-vercel-ai-ui-message-stream': 'v1',
    },
  });
}

/**
 * Check if a response is a data stream or UI message stream
 */
export function isDataStream(response: Response): boolean {
  // Check for data stream header
  const hasDataStreamHeader = response.headers.get('x-vercel-ai-data-stream') === 'v1';

  // Check if it has UI stream header
  const hasUIStreamHeader = response.headers.get('x-vercel-ai-ui-message-stream') === 'v1';

  // If it has data stream header but NOT UI stream header (or both), treat as data stream
  // This handles the case where the external endpoint sets both headers
  return hasDataStreamHeader && !hasUIStreamHeader;
}

/**
 * Check if conversion is needed based on headers
 */
export function needsConversion(response: Response): boolean {
  const hasDataStream = response.headers.get('x-vercel-ai-data-stream') === 'v1';
  const hasUIStream = response.headers.get('x-vercel-ai-ui-message-stream') === 'v1';

  // If both headers are present, the endpoint is trying to be compatible
  // but we should check the actual content format
  if (hasDataStream && hasUIStream) {
    console.log('⚠️ [Stream Converter] Both stream headers present, will check content format');
    return true; // We'll need to inspect the content
  }

  // If only data stream header, definitely needs conversion
  if (hasDataStream && !hasUIStream) {
    return true;
  }

  // If only UI stream header or neither, no conversion needed
  return false;
}
/**
 * SSE Event Mapper
 *
 * Universal SSE-to-UI-Stream converter that maps arbitrary SSE event formats
 * to useChat UI stream events based on configuration.
 *
 * Supports:
 * - OpenAI Chat Completions
 * - OpenAI Assistants API
 * - Anthropic Claude
 * - Custom SSE formats
 *
 * @example
 * ```typescript
 * const mapper = new SSEEventMapper({
 *   event_mappings: [{
 *     source_event_type: 'thread.message.delta',
 *     target_ui_event: 'text-delta',
 *     field_mappings: { delta: 'delta.content[0].text.value' }
 *   }],
 *   done_signal: '[DONE]'
 * });
 *
 * const transformedStream = sseResponse.body.pipeThrough(mapper.transform());
 * ```
 */

import type { SSEEventMapperConfig, EventMapping, UIStreamEvent } from '@/types/event-mapping';

/**
 * Extract value from object using dot notation path with array support
 * @example getByPath({a: {b: [1,2,3]}}, 'a.b[1]') => 2
 */
function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;

  // Convert array notation to dot notation: a.b[0] → a.b.0
  const tokens = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);

  return tokens.reduce(
    (acc: unknown, key: string) =>
      acc == null ? undefined : (acc as Record<string, unknown>)[key],
    obj
  );
}

/**
 * Evaluate simple conditional expressions
 * @example evaluateCondition({type: 'tool_calls'}, "type == 'tool_calls'") => true
 */
function evaluateCondition(data: unknown, condition: string): boolean {
  if (!condition) return true;

  try {
    // Parse condition: "path == 'value'" or "path != 'value'"
    const match = condition.match(/^(.+?)\s*(==|!=)\s*['"](.+)['"]$/);
    if (!match) return true; // Invalid condition, skip

    const [, pathStr, operator, expectedValue] = match;
    const actualValue = getByPath(data, pathStr.trim());

    if (operator === '==') {
      return actualValue === expectedValue;
    } else if (operator === '!=') {
      return actualValue !== expectedValue;
    }
  } catch (error) {
    console.warn('[SSEEventMapper] Failed to evaluate condition:', condition, error);
  }

  return true;
}

/**
 * Parse a single SSE data line
 * Handles both "data: {...}" and raw JSON
 */
function parseSSEData(line: string): unknown | null {
  const trimmed = line.trim();

  // Empty line or comment
  if (!trimmed || trimmed.startsWith(':')) {
    return null;
  }

  // Parse "data: {...}"
  if (trimmed.startsWith('data:')) {
    const data = trimmed.slice(5).trim();

    // Done signal
    if (data === '[DONE]') {
      return '[DONE]';
    }

    // Try to parse as JSON
    try {
      return JSON.parse(data);
    } catch {
      return data; // Return as string if not JSON
    }
  }

  return null;
}

/**
 * Generate unique ID for stream events
 */
function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

/**
 * SSE Event Mapper
 *
 * Transforms SSE events to useChat UI stream format
 */
export class SSEEventMapper {
  private config: Required<Omit<SSEEventMapperConfig, 'event_type_path'>> &
    Pick<SSEEventMapperConfig, 'event_type_path'>;
  private textId: string;

  constructor(config: SSEEventMapperConfig) {
    this.config = {
      event_mappings: config.event_mappings,
      done_signal: config.done_signal || '[DONE]',
      error_path: config.error_path || 'error.message',
      event_type_path: config.event_type_path || undefined,
    };
    this.textId = generateId();
  }

  /**
   * Create a TransformStream that converts SSE bytes to UI stream events
   */
  transform(): TransformStream<Uint8Array, Uint8Array> {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = '';
    let currentEventType = '';
    let hasStarted = false;
    let hasTextStarted = false;

    const config = this.config;
    const textId = this.textId;

    return new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const chunkText = decoder.decode(chunk, { stream: true });
        console.log('[SSEEventMapper] Raw chunk received:', chunkText.slice(0, 500));
        buffer += chunkText;

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();

          // Parse event type line
          if (trimmed.startsWith('event:')) {
            currentEventType = trimmed.slice(6).trim();
            console.log('[SSEEventMapper] Explicit event type:', currentEventType);
            continue;
          }

          // Parse data line
          const parsedData = parseSSEData(line);
          if (parsedData === null) continue;

          console.log('[SSEEventMapper] Parsed data:', {
            currentEventType,
            dataType: typeof parsedData,
            data:
              typeof parsedData === 'object'
                ? JSON.stringify(parsedData).slice(0, 200)
                : parsedData,
          });

          // Check for done signal
          if (parsedData === config.done_signal || parsedData === '[DONE]') {
            // Emit finish event if we have text
            if (hasTextStarted) {
              const finishEvent: UIStreamEvent = {
                type: 'finish',
                finishReason: 'stop',
              };
              const sseData = `data: ${JSON.stringify(finishEvent)}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            }
            continue;
          }

          // Must be an object to process
          if (typeof parsedData !== 'object' || parsedData === null) {
            continue;
          }

          // Check for errors
          const error = getByPath(parsedData, config.error_path);
          if (error) {
            const errorEvent: UIStreamEvent = {
              type: 'error',
              error: String(error),
            };
            const sseData = `data: ${JSON.stringify(errorEvent)}\n\n`;
            controller.enqueue(encoder.encode(sseData));
            continue;
          }

          // Find matching event mapping
          // Strategy 1: If event_type_path is configured, extract from JSON data
          // Strategy 2: Use explicit SSE event type (from "event:" line)
          // Strategy 3: Fall back to "data" (SSE spec default)
          let normalizedEventType = currentEventType || 'data';
          let mapping;

          // Strategy 1: Check event_type_path if configured
          if (config.event_type_path && typeof parsedData === 'object' && parsedData !== null) {
            const extractedType = getByPath(parsedData, config.event_type_path);
            if (typeof extractedType === 'string') {
              console.log('[SSEEventMapper] Extracted event type from path:', {
                path: config.event_type_path,
                value: extractedType,
              });
              mapping = config.event_mappings.find(m => m.source_event_type === extractedType);
              if (mapping) {
                normalizedEventType = extractedType;
                console.log('[SSEEventMapper] Using mapping for extracted type:', extractedType);
              }
            }
          }

          // Strategy 2 & 3: Fall back to explicit event type or "data" default
          if (!mapping) {
            mapping = config.event_mappings.find(m => m.source_event_type === normalizedEventType);
          }

          if (!mapping) {
            // No mapping for this event type, skip
            console.log('[SSEEventMapper] No mapping found for event type:', normalizedEventType, {
              explicit: currentEventType || '(none)',
              extracted: config.event_type_path ? 'checked but not found' : '(not configured)',
            });
            console.log(
              '[SSEEventMapper] Available mappings:',
              config.event_mappings.map(m => m.source_event_type)
            );
            continue;
          }

          console.log('[SSEEventMapper] Found mapping:', {
            source: mapping.source_event_type,
            target: mapping.target_ui_event,
            when: mapping.when,
            normalized: currentEventType ? false : true,
          });

          // Check condition if specified
          if (mapping.when && !evaluateCondition(parsedData, mapping.when)) {
            console.log('[SSEEventMapper] Condition not met:', mapping.when);
            continue;
          }

          // Emit stream-start on first mapped event
          if (!hasStarted) {
            const startEvent = { type: 'start' };
            const sseData = `data: ${JSON.stringify(startEvent)}\n\n`;
            controller.enqueue(encoder.encode(sseData));
            hasStarted = true;
          }

          // Extract fields and emit UI event
          try {
            const uiEvent = mapToUIEvent(mapping, parsedData, textId, hasTextStarted);

            if (uiEvent) {
              console.log('[SSEEventMapper] Emitting UI event:', {
                type: uiEvent.type,
                hasContent: 'delta' in uiEvent || 'error' in uiEvent || 'toolName' in uiEvent,
              });

              // Track if text has started for text-start emission
              if (uiEvent.type === 'text-delta' && !hasTextStarted) {
                // Emit text-start first
                const textStartEvent = {
                  type: 'text-start',
                  id: textId,
                };
                const startData = `data: ${JSON.stringify(textStartEvent)}\n\n`;
                controller.enqueue(encoder.encode(startData));
                console.log('[SSEEventMapper] Emitted text-start event');
                hasTextStarted = true;
              }

              const sseData = `data: ${JSON.stringify(uiEvent)}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            } else {
              console.log('[SSEEventMapper] mapToUIEvent returned null');
            }
          } catch (error) {
            console.error('[SSEEventMapper] Failed to map event:', error);
          }

          // Reset event type after processing data (SSE spec: event type applies to next data)
          currentEventType = '';
        }
      },

      flush(controller) {
        // Ensure we emit finish if stream ends without done signal
        if (hasTextStarted) {
          const finishEvent: UIStreamEvent = {
            type: 'finish',
            finishReason: 'stop',
          };
          const sseData = `data: ${JSON.stringify(finishEvent)}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        }

        // Emit [DONE] marker
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      },
    });
  }
}

/**
 * Map SSE event data to UI stream event
 */
function mapToUIEvent(
  mapping: EventMapping,
  data: object,
  textId: string,
  hasTextStarted: boolean
): UIStreamEvent | null {
  const { target_ui_event, field_mappings } = mapping;

  switch (target_ui_event) {
    case 'text-delta': {
      const delta = getByPath(data, field_mappings.delta);
      console.log('[mapToUIEvent] text-delta extraction:', {
        path: field_mappings.delta,
        extractedValue: delta,
        valueType: typeof delta,
        isValidString: typeof delta === 'string' && delta !== '',
      });
      if (typeof delta === 'string' && delta) {
        return {
          type: 'text-delta',
          id: textId,
          delta,
        };
      }
      return null;
    }

    case 'tool-invocation': {
      const toolCallId = getByPath(data, field_mappings.toolCallId);
      const toolName = getByPath(data, field_mappings.toolName);
      const argsRaw = getByPath(data, field_mappings.args);

      if (typeof toolCallId === 'string' && typeof toolName === 'string') {
        // Parse args if string, otherwise use as-is
        let args: any;
        try {
          args = typeof argsRaw === 'string' ? JSON.parse(argsRaw) : argsRaw;
        } catch {
          args = argsRaw || {};
        }

        return {
          type: 'tool-invocation',
          toolCallId,
          toolName,
          args,
          state: 'call',
        };
      }
      return null;
    }

    case 'tool-result': {
      const toolCallId = getByPath(data, field_mappings.toolCallId);
      const result = getByPath(data, field_mappings.result);

      if (typeof toolCallId === 'string') {
        return {
          type: 'tool-result',
          toolCallId,
          result,
        };
      }
      return null;
    }

    case 'finish': {
      const finishReason = field_mappings.finishReason
        ? String(getByPath(data, field_mappings.finishReason) || 'stop')
        : 'stop';

      return {
        type: 'finish',
        finishReason: finishReason as any,
      };
    }

    case 'error': {
      const error = getByPath(data, field_mappings.error);
      if (error) {
        return {
          type: 'error',
          error: String(error),
        };
      }
      return null;
    }

    default:
      return null;
  }
}

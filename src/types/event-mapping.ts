import type { TemplateFieldMetadataMap } from './template-field-state';

/**
 * SSE Event Mapping Types
 *
 * Defines the configuration for mapping arbitrary SSE streaming formats
 * to useChat UI stream events.
 *
 * This enables:
 * - OpenAI Chat Completions → UI Stream
 * - OpenAI Assistants API → UI Stream
 * - Anthropic Claude → UI Stream
 * - Custom SSE formats → UI Stream
 */

/**
 * UI Stream Event Types
 * These are the target events that useChat hook expects
 */
export type UIStreamEventType =
  | 'text-delta' // Text content chunk
  | 'tool-invocation' // Tool/function call
  | 'tool-result' // Tool execution result
  | 'finish' // Stream completion
  | 'error'; // Error event

/**
 * Event Mapping Configuration
 *
 * Maps a single SSE event type to a UI stream event
 *
 * @example
 * ```typescript
 * {
 *   source_event_type: "thread.message.delta",
 *   target_ui_event: "text-delta",
 *   field_mappings: {
 *     delta: "delta.content[0].text.value"
 *   }
 * }
 * ```
 */
export interface EventMapping {
  /** SSE event type to match (from `event:` line) */
  source_event_type: string;

  /** UI stream event type to emit */
  target_ui_event: UIStreamEventType;

  /**
   * Optional condition to filter events
   * JSONPath expression that must evaluate to true
   * @example "delta.step_details.type == 'tool_calls'"
   */
  when?: string;

  /**
   * Field mappings: UI field → JSONPath to extract from SSE data
   *
   * For text-delta:
   *   - delta: string (required)
   *
   * For tool-invocation:
   *   - toolCallId: string (required)
   *   - toolName: string (required)
   *   - args: string (required, JSON stringified)
   *
   * For tool-result:
   *   - toolCallId: string (required)
   *   - result: any (required)
   *
   * For finish:
   *   - finishReason: string (optional)
   *
   * For error:
   *   - error: string (required)
   *
   * @example
   * ```typescript
   * {
   *   delta: "choices[0].delta.content",
   *   id: "id"
   * }
   * ```
   */
  field_mappings: Record<string, string>;
}

/**
 * SSE Event Mapper Configuration
 *
 * Complete configuration for mapping SSE events to UI stream events
 */
export interface SSEEventMapperConfig {
  /** Array of event mappings to apply */
  event_mappings: EventMapping[];

  /**
   * Signal that indicates stream completion
   * Can be:
   * - A specific data value (e.g., "[DONE]")
   * - An event type (e.g., "message_stop")
   * @default "[DONE]"
   */
  done_signal?: string;

  /**
   * Optional error path for extracting error messages
   * @example "error.message"
   */
  error_path?: string;

  /**
   * Optional JSONPath to extract event type from JSON data
   *
   * If set, the mapper will look for the event type in the JSON data at this path
   * instead of (or in addition to) the explicit SSE `event:` line.
   *
   * This is useful for APIs that send all events as `event: data` but include
   * the actual event type in a field like `type` in the JSON payload.
   *
   * @example "type" - For Anthropic: {"type": "content_block_delta", ...}
   * @example "event_type" - For custom APIs: {"event_type": "message", ...}
   * @example "meta.type" - For nested types: {"meta": {"type": "update"}, ...}
   */
  event_type_path?: string;
}

/**
 * Model Config Preset
 *
 * Stored in database for reusable configurations
 */
export interface ModelConfigPreset {
  id: string;
  name: string;
  description?: string;
  category: 'openai' | 'anthropic' | 'langchain' | 'custom';
  event_mappings: SSEEventMapperConfig;
  field_metadata?: TemplateFieldMetadataMap; // Optional for backward compatibility
  is_system: boolean;
  org_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * UI Stream Event Structures
 * These match the AI SDK useChat expected format
 */

export interface TextDeltaEvent {
  type: 'text-delta';
  id: string;
  delta: string;
}

export interface ToolInvocationEvent {
  type: 'tool-invocation';
  toolCallId: string;
  toolName: string;
  args: any; // JSON object
  state: 'call' | 'result' | 'partial-call';
  result?: any;
}

export interface ToolResultEvent {
  type: 'tool-result';
  toolCallId: string;
  result: any;
}

export interface FinishEvent {
  type: 'finish';
  finishReason?: 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other';
}

export interface ErrorEvent {
  type: 'error';
  error: string;
}

export type UIStreamEvent =
  | TextDeltaEvent
  | ToolInvocationEvent
  | ToolResultEvent
  | FinishEvent
  | ErrorEvent;

/**
 * Validation helpers
 */

export function isValidEventMapping(mapping: Partial<EventMapping>): mapping is EventMapping {
  if (!mapping.source_event_type || !mapping.target_ui_event || !mapping.field_mappings) {
    return false;
  }

  // Validate required fields based on target event type
  switch (mapping.target_ui_event) {
    case 'text-delta':
      return 'delta' in mapping.field_mappings;

    case 'tool-invocation':
      return (
        'toolCallId' in mapping.field_mappings &&
        'toolName' in mapping.field_mappings &&
        'args' in mapping.field_mappings
      );

    case 'tool-result':
      return 'toolCallId' in mapping.field_mappings && 'result' in mapping.field_mappings;

    case 'finish':
      return true; // finishReason is optional

    case 'error':
      return 'error' in mapping.field_mappings;

    default:
      return false;
  }
}

export function isValidMapperConfig(
  config: Partial<SSEEventMapperConfig>
): config is SSEEventMapperConfig {
  if (!config.event_mappings || !Array.isArray(config.event_mappings)) {
    return false;
  }

  return config.event_mappings.every(isValidEventMapping);
}

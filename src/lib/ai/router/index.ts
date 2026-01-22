/**
 * AI SDK 6 Router
 *
 * Routes chat requests to external AI endpoints based on model configuration.
 * Supports three endpoint types:
 *
 * - ai-sdk-stream: Direct pass-through for AI SDK-compatible endpoints
 *   (no conversion - the AI SDK client handles the stream format natively)
 * - sse: Server-Sent Events (like OpenAI) converted to AI SDK UI stream
 * - webhook: JSON responses converted to AI SDK UI stream
 */

import { type UIMessage } from 'ai';
import { passThroughAISDKStream } from './passthrough';
import { convertWebhookToUIStream } from './webhook-converter';
import { convertSSEToUIStream } from './sse-converter';
import { wrapResponseWithPersistence, saveUserMessage } from './persistence';
import type { RoutableModel, RoutingStrategy, EndpointType } from './types';

// Re-export types
export type {
  EndpointType,
  RoutableModel,
  RoutingStrategy,
  SSEStreamConfig,
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
 * Route a chat request to the appropriate handler
 *
 * This is the main entry point for routing. It:
 * 1. Determines the routing strategy based on endpoint_type
 * 2. Calls the appropriate handler
 * 3. Returns the streaming response
 *
 * @param model - Model configuration with endpoint details
 * @param messages - Chat messages to send
 * @param signal - Optional AbortSignal for cancellation
 * @returns Streaming response compatible with AI SDK useChat
 */
export async function routeToEndpoint(
  model: RoutableModel,
  messages: UIMessage[],
  signal?: AbortSignal
): Promise<Response> {
  const strategy = getRoutingStrategy(model);

  switch (strategy.type) {
    case 'passthrough':
      return passThroughAISDKStream(model, messages, signal);

    case 'convert-sse':
      return convertSSEToUIStream(model, messages, signal);

    case 'convert-json':
    default:
      return convertWebhookToUIStream(model, messages, signal);
  }
}

/**
 * Route and persist - convenience function that wraps routing with persistence
 *
 * @param model - Model configuration
 * @param messages - Chat messages
 * @param conversationId - Conversation ID for message persistence
 * @param signal - Optional AbortSignal
 * @returns Streaming response with automatic message persistence
 */
export async function routeAndPersist(
  model: RoutableModel,
  messages: UIMessage[],
  conversationId: string,
  signal?: AbortSignal
): Promise<Response> {
  const response = await routeToEndpoint(model, messages, signal);
  return wrapResponseWithPersistence(response, conversationId);
}

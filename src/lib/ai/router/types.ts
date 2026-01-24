/**
 * AI SDK 6 Router Types
 *
 * Types for the routing layer that handles different endpoint types:
 * - ai-sdk-stream: Pass-through for AI SDK agents
 * - webhook: JSON response conversion to UI stream
 * - sse: Server-Sent Events conversion to UI stream
 */

import { type UIMessage } from 'ai';
import type { SSEEventMapperConfig } from '@/types/event-mapping';

/**
 * Endpoint types supported by the router
 */
export type EndpointType = 'ai-sdk-stream' | 'webhook' | 'sse';

/**
 * Configuration for webhook response conversion
 */
export interface WebhookStreamConfig {
  /** Whether to simulate streaming for better UX */
  simulateStream?: boolean;
  /** Delay between words when simulating (ms) */
  simulateDelay?: number;
}

/**
 * Combined stream configuration type
 */
export type StreamConfig = SSEEventMapperConfig | WebhookStreamConfig | null;

/**
 * Model configuration for routing
 */
export interface RoutableModel {
  id: string;
  endpoint: string;
  method: string;
  headers: Record<string, string> | null;
  body_config: unknown;
  response_path: string | null;
  endpoint_type: EndpointType;
  stream_config: StreamConfig;
}

/**
 * Routing strategy returned by getRoutingStrategy
 */
export interface RoutingStrategy {
  type: 'passthrough' | 'convert-json' | 'convert-sse';
  endpointType: EndpointType;
}

/**
 * Options for route handlers
 */
export interface RouteHandlerOptions {
  model: RoutableModel;
  messages: UIMessage[];
  signal?: AbortSignal;
}

/**
 * Simple message format for external endpoints
 */
export interface SimpleMessage {
  role: string;
  content: string;
}

/**
 * AI Provider Types
 *
 * Shared types for custom LanguageModelV3 provider implementations.
 * These providers convert arbitrary HTTP endpoints (SSE, webhooks) into
 * AI SDK-compatible language models.
 */

/**
 * Configuration for webhook response parsing
 */
export interface WebhookStreamConfig {
  /** Whether to simulate streaming for better UX */
  simulateStream?: boolean;
  /** Delay between words when simulating (ms) */
  simulateDelay?: number;
}

/**
 * Combined stream configuration type
 * Note: SSE endpoints now use SSEEventMapperConfig directly, not through providers
 */
export type StreamConfig = WebhookStreamConfig | null;

/**
 * Base configuration for all provider types
 */
export interface ProviderConfig {
  /** Unique identifier for this model */
  modelId: string;
  /** Provider name for identification */
  provider?: string;
  /** HTTP endpoint URL */
  endpoint: string;
  /** HTTP method (POST, GET, etc.) */
  method?: string;
  /** Custom headers to send with requests */
  headers?: Record<string, string> | null;
  /** Request body template with variable substitution */
  bodyConfig?: unknown;
  /** JSON path to extract response content (for webhooks) */
  responsePath?: string | null;
  /** Stream-specific configuration */
  streamConfig?: StreamConfig;
}

/**
 * Configuration specific to webhook providers
 */
export interface WebhookProviderConfig extends ProviderConfig {
  streamConfig?: WebhookStreamConfig;
}

/**
 * Simple message format for external endpoints
 * (External APIs expect content strings, not parts arrays)
 */
export interface SimpleMessage {
  role: string;
  content: string;
}

/**
 * Default webhook configuration
 */
export const DEFAULT_WEBHOOK_CONFIG: Required<WebhookStreamConfig> = {
  simulateStream: false,
  simulateDelay: 20,
};

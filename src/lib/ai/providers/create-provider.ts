/**
 * Provider Factory
 *
 * Creates LanguageModelV3 instances from database model configuration.
 * This is the main entry point for converting stored model configs into
 * AI SDK-compatible language models.
 *
 * @example
 * ```typescript
 * // From database model config
 * const provider = createProviderFromConfig({
 *   modelId: model.id,
 *   endpointType: model.endpoint_type,
 *   endpoint: model.endpoint,
 *   headers: model.headers,
 *   bodyConfig: model.body_config,
 *   responsePath: model.response_path,
 *   streamConfig: model.stream_config,
 * });
 *
 * // Use with AI SDK
 * const result = await streamText({
 *   model: provider,
 *   messages: [...],
 * });
 * ```
 */

import type { LanguageModelV3 } from '@ai-sdk/provider';
import { WebhookLanguageModel } from './webhook-language-model';
import { AISDKStreamLanguageModel } from './ai-sdk-stream-language-model';
import type { ProviderConfig, WebhookStreamConfig, StreamConfig } from './types';

/**
 * Endpoint types supported by the provider factory
 */
export type EndpointType = 'ai-sdk-stream' | 'sse' | 'webhook';

/**
 * Configuration for creating a provider from database model
 */
export interface CreateProviderConfig {
  /** Unique model identifier */
  modelId: string;
  /** Type of endpoint */
  endpointType: EndpointType;
  /** HTTP endpoint URL */
  endpoint: string;
  /** HTTP method */
  method?: string;
  /** Custom headers */
  headers?: Record<string, string> | null;
  /** Request body template */
  bodyConfig?: unknown;
  /** JSON path to extract response (webhooks) */
  responsePath?: string | null;
  /** Stream-specific configuration */
  streamConfig?: StreamConfig;
  /** Optional provider name */
  provider?: string;
}

/**
 * Create a LanguageModelV3 provider from configuration
 *
 * This factory function determines the appropriate provider class based on
 * the endpoint type and returns a configured instance.
 *
 * @param config - The provider configuration
 * @returns A LanguageModelV3 instance
 * @throws Error if endpoint type is not supported
 */
export function createProviderFromConfig(config: CreateProviderConfig): LanguageModelV3 {
  const baseConfig: ProviderConfig = {
    modelId: config.modelId,
    provider: config.provider,
    endpoint: config.endpoint,
    method: config.method,
    headers: config.headers || undefined,
    bodyConfig: config.bodyConfig,
    responsePath: config.responsePath,
    streamConfig: config.streamConfig,
  };

  switch (config.endpointType) {
    case 'sse':
      // SSE endpoints now use direct event mapping in the router (see lib/ai/router)
      // No provider needed - the SSEEventMapper handles conversion directly
      throw new Error(
        'SSE endpoints should use direct event mapping, not provider-based conversion'
      );

    case 'webhook':
      return new WebhookLanguageModel({
        ...baseConfig,
        streamConfig: config.streamConfig as WebhookStreamConfig | undefined,
      });

    case 'ai-sdk-stream':
      // For external AI SDK endpoints that return data/UI streams
      // Handles tool calls, text deltas, and all other AI SDK events
      return new AISDKStreamLanguageModel({
        ...baseConfig,
        provider: config.provider || 'ai-sdk',
      });

    default:
      throw new Error(`Unsupported endpoint type: ${config.endpointType}`);
  }
}

/**
 * Create a webhook provider directly
 */
export function createWebhookProvider(
  config: Omit<ProviderConfig, 'streamConfig'> & { streamConfig?: WebhookStreamConfig }
): WebhookLanguageModel {
  return new WebhookLanguageModel(config);
}

/**
 * Create an AI SDK stream provider directly
 *
 * Use this for endpoints that already return AI SDK data/UI streams.
 * Handles tool calls, text deltas, and all AI SDK events natively.
 */
export function createAISDKStreamProvider(
  config: Omit<ProviderConfig, 'streamConfig'> & { usePartsFormat?: boolean }
): AISDKStreamLanguageModel {
  return new AISDKStreamLanguageModel(config);
}

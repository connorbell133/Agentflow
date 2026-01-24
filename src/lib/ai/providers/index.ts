/**
 * AI Providers
 *
 * Custom LanguageModelV3 implementations for the AI SDK.
 * These providers allow arbitrary HTTP endpoints to be used with
 * AI SDK's streamText() and generateText() functions.
 *
 * @example
 * ```typescript
 * import { createProviderFromConfig } from '@/lib/ai/providers';
 * import { streamText } from 'ai';
 *
 * // Create provider from database config (webhook endpoint)
 * const provider = createProviderFromConfig({
 *   modelId: 'my-model',
 *   endpointType: 'webhook',
 *   endpoint: 'https://api.example.com/chat',
 *   headers: { Authorization: 'Bearer ...' },
 *   bodyConfig: { messages: '${messages}' },
 *   responsePath: 'choices[0].message.content',
 * });
 *
 * // Use with AI SDK
 * const result = await streamText({
 *   model: provider,
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 *
 * return result.toUIMessageStreamResponse();
 * ```
 *
 * Note: SSE endpoints no longer use providers - they use direct event
 * mapping via SSEEventMapper in the router layer.
 */

// Provider classes
export { WebhookLanguageModel } from './webhook-language-model';
export { AISDKStreamLanguageModel } from './ai-sdk-stream-language-model';

// Factory functions
export {
  createProviderFromConfig,
  createWebhookProvider,
  createAISDKStreamProvider,
  type EndpointType,
  type CreateProviderConfig,
} from './create-provider';

// Types
export type {
  WebhookStreamConfig,
  StreamConfig,
  ProviderConfig,
  WebhookProviderConfig,
  SimpleMessage,
} from './types';

export { DEFAULT_WEBHOOK_CONFIG } from './types';

// Utilities (for advanced use cases)
export {
  buildBodyJson,
  getByPath,
  convertPromptToSimpleMessages,
  extractTextFromV3Message,
  getLastUserMessageText,
  parseSSELine,
  generateId,
} from './utils';

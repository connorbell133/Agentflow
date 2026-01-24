/**
 * Webhook Language Model
 *
 * A LanguageModelV3 implementation that converts traditional HTTP webhook endpoints
 * (JSON request/response) into AI SDK-compatible language models.
 *
 * This allows any REST API that returns JSON to be used with AI SDK's streamText()
 * and generateText() functions. Optionally simulates streaming for better UX.
 *
 * @example
 * ```typescript
 * const model = new WebhookLanguageModel({
 *   modelId: 'custom-webhook',
 *   endpoint: 'https://api.example.com/generate',
 *   headers: { 'Authorization': 'Bearer ...' },
 *   bodyConfig: { prompt: '${content}', max_tokens: 1000 },
 *   responsePath: 'result.text',
 *   streamConfig: {
 *     simulateStream: true,
 *     simulateDelay: 20,
 *   },
 * });
 *
 * const result = await streamText({ model, messages });
 * ```
 */

import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3StreamPart,
  LanguageModelV3GenerateResult,
  SharedV3Warning,
  SharedV3ProviderMetadata,
} from '@ai-sdk/provider';

import type { WebhookProviderConfig, WebhookStreamConfig } from './types';
import { DEFAULT_WEBHOOK_CONFIG } from './types';
import {
  buildBodyJson,
  convertPromptToSimpleMessages,
  getByPath,
  getLastUserMessageText,
  generateId,
} from './utils';

export class WebhookLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = 'v3' as const;
  readonly modelId: string;
  readonly provider: string;

  private readonly config: WebhookProviderConfig;
  private readonly webhookConfig: Required<WebhookStreamConfig>;

  /**
   * Declares which URLs (for file parts) the provider can handle natively.
   * For webhook endpoints, we don't support any URLs natively.
   */
  readonly supportedUrls: Record<string, RegExp[]> = {};

  constructor(config: WebhookProviderConfig) {
    this.modelId = config.modelId;
    this.provider = config.provider || 'webhook';
    this.config = config;

    // Merge with defaults
    this.webhookConfig = {
      simulateStream:
        (config.streamConfig as WebhookStreamConfig)?.simulateStream ??
        DEFAULT_WEBHOOK_CONFIG.simulateStream,
      simulateDelay:
        (config.streamConfig as WebhookStreamConfig)?.simulateDelay ??
        DEFAULT_WEBHOOK_CONFIG.simulateDelay,
    };
  }

  /**
   * Generate a complete response (non-streaming)
   *
   * This is the primary method for webhook endpoints since they return
   * complete responses.
   */
  async doGenerate(options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult> {
    const { prompt, abortSignal } = options;

    // Convert V3 prompt to simple messages for external API
    const simpleMessages = convertPromptToSimpleMessages(prompt);
    const lastUserText = getLastUserMessageText(prompt);

    // Build request body from template
    let body: unknown;
    if (this.config.bodyConfig) {
      body = await buildBodyJson(this.config.bodyConfig, {
        messages: simpleMessages,
        content: lastUserText,
      });
    } else {
      body = { messages: simpleMessages };
    }

    // Make the request
    const response = await fetch(this.config.endpoint, {
      method: this.config.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      body: JSON.stringify(body),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webhook error (${response.status}): ${errorText}`);
    }

    // Try to parse as JSON, but handle plain text responses
    let data: any;
    const contentType = response.headers.get('content-type') || '';
    const responseText = await response.text();

    if (
      contentType.includes('application/json') ||
      responseText.trim().startsWith('{') ||
      responseText.trim().startsWith('[')
    ) {
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.warn(
          '[WebhookLanguageModel] Failed to parse response as JSON, treating as plain text:',
          parseError
        );
        // If it looks like JSON but failed to parse, treat as plain text
        data = { response: responseText };
      }
    } else {
      // Plain text response - wrap it in an object for path extraction
      data = { response: responseText };
    }

    console.log('[WebhookLanguageModel] Parsed response data:', {
      type: typeof data,
      keys: typeof data === 'object' ? Object.keys(data) : 'N/A',
      preview:
        typeof data === 'string' ? data.substring(0, 100) : JSON.stringify(data).substring(0, 100),
    });

    // Extract response text using path
    let text: string;
    const responsePath = this.config.responsePath?.trim();

    if (responsePath) {
      // Handle paths that start with a dot (e.g., ".response")
      const cleanPath = responsePath.startsWith('.') ? responsePath.slice(1) : responsePath;

      console.log(
        '[WebhookLanguageModel] Extracting with path:',
        cleanPath,
        '(original:',
        responsePath,
        ')'
      );
      const extracted = getByPath(data, cleanPath);
      console.log('[WebhookLanguageModel] Extracted value:', {
        type: typeof extracted,
        isUndefined: extracted === undefined,
        isNull: extracted === null,
        value:
          typeof extracted === 'string'
            ? extracted.substring(0, 100)
            : extracted !== undefined && extracted !== null
              ? JSON.stringify(extracted).substring(0, 100)
              : 'undefined/null',
      });

      if (extracted !== undefined && extracted !== null) {
        // Successfully extracted a value
        text = typeof extracted === 'string' ? extracted : JSON.stringify(extracted);
        console.log('[WebhookLanguageModel] Successfully extracted text from path');
      } else {
        // Path didn't match, try fallback fields
        console.warn(
          '[WebhookLanguageModel] Path extraction returned undefined/null, trying fallback fields'
        );
        const rawText =
          (data as Record<string, unknown>).response ??
          (data as Record<string, unknown>).content ??
          (data as Record<string, unknown>).text ??
          (data as Record<string, unknown>).body ??
          (data as Record<string, unknown>).message ??
          (data as Record<string, unknown>).result ??
          (data as Record<string, unknown>).data;

        if (rawText !== undefined && rawText !== null) {
          text = typeof rawText === 'string' ? rawText : JSON.stringify(rawText);
          console.log(
            '[WebhookLanguageModel] Using fallback field:',
            Object.keys(data).find(k => (data as any)[k] === rawText)
          );
        } else {
          // Last resort: stringify the whole response
          text = JSON.stringify(data);
          console.warn('[WebhookLanguageModel] No fallback fields found, using full JSON response');
        }
      }
    } else {
      // No path configured, try common response fields
      console.log('[WebhookLanguageModel] No response path, trying common fields');
      const rawText =
        (data as Record<string, unknown>).response ??
        (data as Record<string, unknown>).content ??
        (data as Record<string, unknown>).text ??
        (data as Record<string, unknown>).body ??
        (data as Record<string, unknown>).message ??
        (data as Record<string, unknown>).result ??
        (data as Record<string, unknown>).data;

      if (rawText !== undefined && rawText !== null) {
        text = typeof rawText === 'string' ? rawText : JSON.stringify(rawText);
        console.log(
          '[WebhookLanguageModel] Using common field:',
          Object.keys(data).find(k => (data as any)[k] === rawText)
        );
      } else {
        text = JSON.stringify(data);
        console.warn('[WebhookLanguageModel] No common fields found, using full JSON response');
      }
    }

    console.log('[WebhookLanguageModel] Final extracted text:', {
      length: text.length,
      preview: text.substring(0, 100),
      isEmpty: text.trim().length === 0,
      isUndefined: text === 'undefined',
      isNull: text === 'null',
    });

    // Ensure we have valid text content
    if (!text || text === 'undefined' || text === 'null' || text.trim().length === 0) {
      console.error('[WebhookLanguageModel] Invalid text extracted, using fallback');
      // Last resort: try to get any string value from the response
      if (typeof data === 'string') {
        text = data;
      } else if (typeof data === 'object' && data !== null) {
        // Try to find any string value in the object
        const stringValues = Object.values(data).filter(
          v => typeof v === 'string' && v.trim().length > 0
        );
        if (stringValues.length > 0) {
          text = stringValues[0] as string;
          console.log(
            '[WebhookLanguageModel] Using first string value found:',
            text.substring(0, 100)
          );
        } else {
          text = JSON.stringify(data);
          console.log('[WebhookLanguageModel] No string values found, using JSON stringify');
        }
      } else {
        text = String(data || 'No response received');
      }
    }

    return {
      content: [{ type: 'text', text: text || '' }],
      finishReason: { unified: 'stop', raw: 'stop' },
      usage: {
        inputTokens: {
          total: undefined,
          noCache: undefined,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: undefined, text: undefined, reasoning: undefined },
      },
      warnings: [],
    };
  }

  /**
   * Generate a streaming response
   *
   * For webhook endpoints, we fetch the complete response and then
   * either emit it all at once or simulate streaming word-by-word.
   */
  async doStream(options: LanguageModelV3CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV3StreamPart>;
    rawCall: {
      rawPrompt: unknown;
      rawSettings: Record<string, unknown>;
    };
    rawResponse?: {
      headers?: Record<string, string>;
    };
    warnings?: SharedV3Warning[];
  }> {
    // Get the complete response first
    const generateResult = await this.doGenerate(options);
    const textContent = generateResult.content.find(c => c.type === 'text');
    const text = textContent && 'text' in textContent ? textContent.text : '';

    // Create stream based on config
    const stream = this.webhookConfig.simulateStream
      ? this.createSimulatedStream(text)
      : this.createImmediateStream(text);

    return {
      stream,
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {},
      },
      warnings: generateResult.warnings,
    };
  }

  /**
   * Create a stream that emits all text immediately
   */
  private createImmediateStream(text: string): ReadableStream<LanguageModelV3StreamPart> {
    const textId = generateId();
    return new ReadableStream<LanguageModelV3StreamPart>({
      start(controller) {
        controller.enqueue({ type: 'stream-start', warnings: [] });

        if (text) {
          // AI SDK UI Message Stream protocol requires: text-start → text-delta → text-end
          controller.enqueue({
            type: 'text-start',
            id: textId,
          });

          controller.enqueue({
            type: 'text-delta',
            id: textId,
            delta: text,
          });

          controller.enqueue({
            type: 'text-end',
            id: textId,
          });
        }

        controller.enqueue({
          type: 'finish',
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: {
            inputTokens: {
              total: undefined,
              noCache: undefined,
              cacheRead: undefined,
              cacheWrite: undefined,
            },
            outputTokens: { total: undefined, text: undefined, reasoning: undefined },
          },
        });

        controller.close();
      },
    });
  }

  /**
   * Create a stream that simulates word-by-word streaming for better UX
   */
  private createSimulatedStream(text: string): ReadableStream<LanguageModelV3StreamPart> {
    const delay = this.webhookConfig.simulateDelay;
    const textId = generateId();

    return new ReadableStream<LanguageModelV3StreamPart>({
      async start(controller) {
        controller.enqueue({ type: 'stream-start', warnings: [] });

        if (text) {
          // AI SDK UI Message Stream protocol requires: text-start → text-delta → text-end
          controller.enqueue({
            type: 'text-start',
            id: textId,
          });

          const words = text.split(' ');

          for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const deltaText = i < words.length - 1 ? word + ' ' : word;

            controller.enqueue({
              type: 'text-delta',
              id: textId,
              delta: deltaText,
            });

            // Delay between words
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          controller.enqueue({
            type: 'text-end',
            id: textId,
          });
        }

        controller.enqueue({
          type: 'finish',
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: {
            inputTokens: {
              total: undefined,
              noCache: undefined,
              cacheRead: undefined,
              cacheWrite: undefined,
            },
            outputTokens: { total: undefined, text: undefined, reasoning: undefined },
          },
        });

        controller.close();
      },
    });
  }
}

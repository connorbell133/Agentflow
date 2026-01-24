/**
 * AI SDK Stream Language Model
 *
 * A LanguageModelV3 implementation for external endpoints that are themselves
 * built with the AI SDK and return AI SDK data streams or UI message streams.
 *
 * This provider understands AI SDK's native stream formats:
 * - Data streams (v6): Events like `text-delta`, `tool-input-available`, `finish`
 * - UI message streams: Events like `text-delta`, `tool-invocation`, `finish`
 *
 * Since the external endpoint already uses AI SDK, this provider parses the
 * native format rather than using generic SSE parsing with content paths.
 *
 * @example
 * ```typescript
 * const model = new AISDKStreamLanguageModel({
 *   modelId: 'remote-agent',
 *   endpoint: 'https://my-agent.example.com/api/chat',
 *   headers: { 'Authorization': 'Bearer ...' },
 *   bodyConfig: { messages: '${messages}' },
 * });
 *
 * const result = await streamText({ model, messages });
 * ```
 */

import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3StreamPart,
  LanguageModelV3Prompt,
  LanguageModelV3GenerateResult,
  SharedV3Warning,
  SharedV3ProviderMetadata,
} from '@ai-sdk/provider';

import type { ProviderConfig } from './types';
import { buildBodyJson, generateId } from './utils';

/**
 * Configuration specific to AI SDK stream providers
 */
export interface AISDKStreamProviderConfig extends ProviderConfig {
  /**
   * Whether to send messages in V3 parts format (default) or simple format.
   * Most AI SDK endpoints expect the parts format.
   */
  usePartsFormat?: boolean;
}

export class AISDKStreamLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = 'v3' as const;
  readonly modelId: string;
  readonly provider: string;

  private readonly config: AISDKStreamProviderConfig;

  readonly supportedUrls: Record<string, RegExp[]> = {};

  constructor(config: AISDKStreamProviderConfig) {
    this.modelId = config.modelId;
    this.provider = config.provider || 'ai-sdk-stream';
    this.config = {
      ...config,
      usePartsFormat: config.usePartsFormat ?? true,
    };
  }

  /**
   * Generate a complete response (non-streaming)
   */
  async doGenerate(options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult> {
    const streamResult = await this.doStream(options);
    const reader = streamResult.stream.getReader();

    let text = '';
    const content: Array<{
      type: 'text';
      text: string;
      providerMetadata?: SharedV3ProviderMetadata;
    }> = [];
    const toolCalls: Array<{
      type: 'tool-call';
      toolCallId: string;
      toolName: string;
      input: string;
      providerMetadata?: SharedV3ProviderMetadata;
    }> = [];
    let finishReason: {
      unified: 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other';
      raw: string | undefined;
    } = { unified: 'stop', raw: undefined };
    let usage = {
      inputTokens: {
        total: undefined as number | undefined,
        noCache: undefined as number | undefined,
        cacheRead: undefined as number | undefined,
        cacheWrite: undefined as number | undefined,
      },
      outputTokens: {
        total: undefined as number | undefined,
        text: undefined as number | undefined,
        reasoning: undefined as number | undefined,
      },
    };
    const warnings: SharedV3Warning[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value.type === 'text-delta') {
          text += value.delta;
        } else if (value.type === 'tool-call') {
          toolCalls.push(value);
        } else if (value.type === 'finish') {
          finishReason = value.finishReason;
          if (value.usage) {
            usage = value.usage;
          }
        } else if (value.type === 'stream-start') {
          warnings.push(...value.warnings);
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (text) {
      content.push({ type: 'text', text });
    }

    return {
      content: [...content, ...toolCalls],
      finishReason,
      usage,
      warnings,
    };
  }

  /**
   * Generate a streaming response
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
    const { prompt, abortSignal } = options;

    // Build request body
    const body = await this.buildRequestBody(prompt);

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
      throw new Error(`AI SDK endpoint error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Detect stream format from headers
    const isDataStream = response.headers.get('x-vercel-ai-data-stream') === 'v1';
    const isUIStream = response.headers.get('x-vercel-ai-ui-message-stream') === 'v1';

    // Create appropriate transform stream
    const transformStream =
      isUIStream && !isDataStream
        ? this.createUIStreamTransform()
        : this.createDataStreamTransform();

    const stream = response.body.pipeThrough(transformStream);

    return {
      stream,
      rawCall: {
        rawPrompt: prompt,
        rawSettings: {},
      },
      rawResponse: {
        headers: Object.fromEntries(response.headers.entries()),
      },
    };
  }

  /**
   * Build request body for the external AI SDK endpoint
   */
  private async buildRequestBody(prompt: LanguageModelV3Prompt): Promise<unknown> {
    // Convert prompt to the format expected by the external endpoint
    const messages = this.config.usePartsFormat
      ? this.convertToPartsFormat(prompt)
      : this.convertToSimpleFormat(prompt);

    if (this.config.bodyConfig) {
      return buildBodyJson(this.config.bodyConfig, {
        messages,
        content: this.getLastUserContent(prompt),
      });
    }

    return { messages };
  }

  /**
   * Convert V3 prompt to parts format (for AI SDK endpoints)
   */
  private convertToPartsFormat(prompt: LanguageModelV3Prompt): unknown[] {
    return prompt.map(message => ({
      id: generateId(),
      role: message.role,
      parts: this.convertContentToParts(message.content),
    }));
  }

  /**
   * Convert message content to parts array
   */
  private convertContentToParts(content: unknown): unknown[] {
    if (typeof content === 'string') {
      return [{ type: 'text', text: content }];
    }

    if (Array.isArray(content)) {
      return content.map(part => {
        if (typeof part === 'string') {
          return { type: 'text', text: part };
        }
        return part;
      });
    }

    return [];
  }

  /**
   * Convert V3 prompt to simple format
   */
  private convertToSimpleFormat(prompt: LanguageModelV3Prompt): unknown[] {
    return prompt.map(message => ({
      role: message.role,
      content: this.extractTextContent(message.content),
    }));
  }

  /**
   * Extract text from message content
   */
  private extractTextContent(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map(part => {
          if (typeof part === 'string') return part;
          if (part && typeof part === 'object' && 'type' in part && part.type === 'text') {
            return (part as { text: string }).text;
          }
          return '';
        })
        .filter(Boolean)
        .join('');
    }

    return '';
  }

  /**
   * Get the last user message content
   */
  private getLastUserContent(prompt: LanguageModelV3Prompt): string {
    const userMessages = prompt.filter(m => m.role === 'user');
    if (userMessages.length === 0) return '';
    return this.extractTextContent(userMessages[userMessages.length - 1].content);
  }

  /**
   * Create transform for AI SDK data stream format
   *
   * Data stream events:
   * - data: {"type":"text-delta","textDelta":"..."}
   * - data: {"type":"tool-input-available","toolCallId":"...","toolName":"...","input":{}}
   * - data: {"type":"tool-output-available","toolCallId":"...","output":...}
   * - data: {"type":"finish","finishReason":"...","usage":{}}
   */
  private createDataStreamTransform(): TransformStream<Uint8Array, LanguageModelV3StreamPart> {
    const decoder = new TextDecoder();
    let buffer = '';
    let hasStarted = false;
    const pendingToolCalls = new Map<string, { toolName: string; args: string }>();

    return new TransformStream<Uint8Array, LanguageModelV3StreamPart>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);

            if (!hasStarted) {
              controller.enqueue({ type: 'stream-start', warnings: [] });
              hasStarted = true;
            }

            switch (event.type) {
              case 'text-delta':
                if (event.textDelta) {
                  controller.enqueue({
                    type: 'text-delta',
                    id: event.id || generateId(),
                    delta: event.textDelta,
                  });
                }
                break;

              case 'start':
              case 'start-step':
              case 'finish-step':
                // Pass through step events (for multi-step agents)
                break;

              case 'tool-input-start':
                if (event.toolCallId && event.toolName) {
                  pendingToolCalls.set(event.toolCallId, {
                    toolName: event.toolName,
                    args: '',
                  });
                }
                break;

              case 'tool-input-delta':
                if (event.toolCallId && event.inputTextDelta) {
                  const pending = pendingToolCalls.get(event.toolCallId);
                  if (pending) {
                    pending.args += event.inputTextDelta;
                    controller.enqueue({
                      type: 'tool-input-delta',
                      id: event.toolCallId,
                      delta: event.inputTextDelta,
                    });
                  }
                }
                break;

              case 'tool-input-available':
                if (event.toolCallId && event.toolName) {
                  const input =
                    typeof event.input === 'string'
                      ? event.input
                      : JSON.stringify(event.input || {});

                  controller.enqueue({
                    type: 'tool-call',
                    toolCallId: event.toolCallId,
                    toolName: event.toolName,
                    input,
                  });

                  pendingToolCalls.delete(event.toolCallId);
                }
                break;

              case 'tool-output-available':
                if (event.toolCallId && event.toolName) {
                  controller.enqueue({
                    type: 'tool-result',
                    toolCallId: event.toolCallId,
                    toolName: event.toolName,
                    result: event.output,
                  });
                }
                break;

              case 'error':
                // Handle error events from multi-step agents
                if (event.error || event.errorText) {
                  controller.enqueue({
                    type: 'error',
                    error: new Error(event.errorText || event.error || 'Unknown error'),
                  });
                }
                break;

              case 'finish':
                controller.enqueue({
                  type: 'finish',
                  finishReason: { unified: event.finishReason || 'stop', raw: event.finishReason },
                  usage: event.usage || {
                    inputTokens: {
                      total: undefined,
                      noCache: undefined,
                      cacheRead: undefined,
                      cacheWrite: undefined,
                    },
                    outputTokens: { total: undefined, text: undefined, reasoning: undefined },
                  },
                });
                break;
            }
          } catch {
            // Skip unparseable lines
          }
        }
      },

      flush(controller) {
        if (buffer.trim()) {
          // Process remaining buffer if needed
        }

        if (!hasStarted) {
          controller.enqueue({ type: 'stream-start', warnings: [] });
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
      },
    });
  }

  /**
   * Create transform for AI SDK UI message stream format
   *
   * UI stream events:
   * - data: {"type":"text-delta","delta":"..."}
   * - data: {"type":"tool-invocation","toolCallId":"...","toolName":"...","args":{}}
   * - data: {"type":"tool-result","toolCallId":"...","result":...}
   * - data: {"type":"finish","finishReason":"..."}
   */
  private createUIStreamTransform(): TransformStream<Uint8Array, LanguageModelV3StreamPart> {
    const decoder = new TextDecoder();
    let buffer = '';
    let hasStarted = false;

    return new TransformStream<Uint8Array, LanguageModelV3StreamPart>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);

            if (!hasStarted) {
              controller.enqueue({ type: 'stream-start', warnings: [] });
              hasStarted = true;
            }

            switch (event.type) {
              case 'text-delta':
                // UI stream uses 'delta' field
                if (event.delta) {
                  controller.enqueue({
                    type: 'text-delta',
                    id: event.id || generateId(),
                    delta: event.delta,
                  });
                }
                break;

              case 'start':
              case 'start-step':
              case 'finish-step':
                // Pass through step events (for multi-step agents)
                break;

              case 'tool-invocation':
                if (event.toolCallId && event.toolName) {
                  const input =
                    typeof event.args === 'string' ? event.args : JSON.stringify(event.args || {});

                  controller.enqueue({
                    type: 'tool-call',
                    toolCallId: event.toolCallId,
                    toolName: event.toolName,
                    input,
                  });
                }
                break;

              case 'tool-result':
                if (event.toolCallId && event.toolName) {
                  controller.enqueue({
                    type: 'tool-result',
                    toolCallId: event.toolCallId,
                    toolName: event.toolName,
                    result: event.result,
                  });
                }
                break;

              case 'error':
                // Handle error events from multi-step agents
                if (event.error || event.errorText) {
                  controller.enqueue({
                    type: 'error',
                    error: new Error(event.errorText || event.error || 'Unknown error'),
                  });
                }
                break;

              case 'finish':
                controller.enqueue({
                  type: 'finish',
                  finishReason: { unified: event.finishReason || 'stop', raw: event.finishReason },
                  usage: event.usage || {
                    inputTokens: {
                      total: undefined,
                      noCache: undefined,
                      cacheRead: undefined,
                      cacheWrite: undefined,
                    },
                    outputTokens: { total: undefined, text: undefined, reasoning: undefined },
                  },
                });
                break;
            }
          } catch {
            // Skip unparseable lines
          }
        }
      },

      flush(controller) {
        if (!hasStarted) {
          controller.enqueue({ type: 'stream-start', warnings: [] });
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
      },
    });
  }
}

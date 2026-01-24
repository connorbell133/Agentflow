/**
 * AI Provider Utilities
 *
 * Shared utilities for custom LanguageModelV3 provider implementations.
 */

import type { LanguageModelV3Prompt, LanguageModelV3Message } from '@ai-sdk/provider';
import type { SimpleMessage } from './types';

/**
 * Extract value from object using dot notation path
 * Supports array indexing: 'choices[0].delta.content'
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
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
 * Build request body from template with variable substitution
 * Supports ${var} and {{var}} syntax
 */
export async function buildBodyJson(
  bodyConfig: unknown,
  vars: Record<string, unknown>
): Promise<unknown> {
  const deepClone = (val: unknown): unknown => {
    if (Array.isArray(val)) return val.map(deepClone);
    if (val && typeof val === 'object') {
      const out: Record<string, unknown> = {};
      Object.entries(val as Record<string, unknown>).forEach(([k, v]) => {
        out[k] = deepClone(v);
      });
      return out;
    }
    return val;
  };

  const resolveString = (str: string): unknown => {
    // Exact match replacement: ${var} or {{var}}
    const exactMatch = str.match(/^\$\{(\w+)\}$/) || str.match(/^\{\{(\w+)\}\}$/);
    if (exactMatch) {
      const key = exactMatch[1];
      return vars[key];
    }

    // Inline replacement with stringification
    let result = str.replace(/\$\{(\w+)\}/g, (_m, key) => {
      const val = vars[key];
      if (val === undefined || val === null) return '';
      if (typeof val === 'string') return val;
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    });

    result = result.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
      const val = vars[key];
      if (val === undefined || val === null) return '';
      if (typeof val === 'string') return val;
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    });

    return result;
  };

  const walk = (val: unknown): unknown => {
    if (Array.isArray(val)) return val.map(walk);
    if (val && typeof val === 'object') {
      const out: Record<string, unknown> = {};
      Object.entries(val as Record<string, unknown>).forEach(([k, v]) => {
        out[k] = walk(v);
      });
      return out;
    }
    if (typeof val === 'string') return resolveString(val);
    return val;
  };

  return walk(deepClone(bodyConfig));
}

/**
 * Convert LanguageModelV3Prompt to SimpleMessage array
 *
 * The V3 prompt uses a specific format with content parts.
 * This flattens it to simple role/content strings for external APIs.
 */
export function convertPromptToSimpleMessages(prompt: LanguageModelV3Prompt): SimpleMessage[] {
  return prompt.map((message: LanguageModelV3Message) => {
    const content = extractTextFromV3Message(message);
    return {
      role: message.role,
      content,
    };
  });
}

/**
 * Extract text content from a LanguageModelV3Message
 */
export function extractTextFromV3Message(message: LanguageModelV3Message): string {
  if (typeof message.content === 'string') {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .map(part => {
        if (typeof part === 'string') return part;
        if (part.type === 'text') return part.text;
        // Skip non-text parts (images, tool calls, etc.)
        return '';
      })
      .filter(Boolean)
      .join('');
  }

  return '';
}

/**
 * Get the last user message text from prompt
 */
export function getLastUserMessageText(prompt: LanguageModelV3Prompt): string {
  const userMessages = prompt.filter(m => m.role === 'user');
  if (userMessages.length === 0) return '';
  return extractTextFromV3Message(userMessages[userMessages.length - 1]);
}

/**
 * Parse a line from SSE stream
 * Returns the data portion if it's a data line, null otherwise
 */
export function parseSSELine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(':')) return null;
  if (trimmed.startsWith('data:')) {
    return trimmed.slice(5).trim();
  }
  return null;
}

/**
 * Generate a unique ID for messages/tool calls
 */
export function generateId(): string {
  return crypto.randomUUID();
}

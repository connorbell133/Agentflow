/**
 * Message Parts Utilities
 * 
 * Utilities for working with AI SDK's native UIMessage type.
 * Uses the native `parts` array from the AI SDK library.
 * 
 * The AI SDK's UIMessage type provides:
 * - `parts: UIMessagePart[]` - Array of message parts (text, tool calls, etc.)
 * - Native support for tool calls, reasoning, files, etc.
 */

import { type UIMessage } from 'ai';

/**
 * Extract text content from UIMessage parts
 * Uses the native parts array from AI SDK
 */
export function extractTextFromMessage(message: UIMessage): string {
  if (!message.parts || !Array.isArray(message.parts) || message.parts.length === 0) {
    return '';
  }

  return message.parts
    .filter((p): p is { type: 'text'; text: string } =>
      typeof p === 'object' && p !== null && 'type' in p && p.type === 'text'
    )
    .map(p => p.text)
    .join('');
}

/**
 * Convert content string to parts array using native UIMessagePart format
 */
export function contentToParts(content: string | null | undefined): UIMessage['parts'] {
  if (!content || content.trim() === '') {
    return [];
  }
  // Use native TextUIPart format from AI SDK
  return [{ type: 'text', text: content }];
}

/**
 * Ensure message has parts array
 * Returns native UIMessage['parts'] format
 */
export function ensureParts(message: {
  parts?: UIMessage['parts'];
}): UIMessage['parts'] {
  // Return parts if they exist, otherwise empty array
  return message.parts && Array.isArray(message.parts) && message.parts.length > 0
    ? message.parts
    : [];
}

/**
 * Create a UIMessage using native AI SDK format
 * The parts array uses the native UIMessagePart types
 */
export function createUIMessage(params: {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: UIMessage['parts'];
  createdAt?: Date;
}): UIMessage {
  return {
    id: params.id,
    role: params.role,
    parts: params.parts || [],
    ...(params.createdAt && { createdAt: params.createdAt }),
  };
}


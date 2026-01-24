import { message_format_config } from '@/types/message-format';
import { transformMessages } from '@/utils/message-formatting';

export interface TemplateVariables {
  content: string;
  conversation_id: string;
  time: string;
  messages: string;
}

// Helper function to escape special regex characters
export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const buildBodyFromTemplate = (
  template: any, // Can be string or object
  vars: TemplateVariables,
  message_format_config: message_format_config
): any => {
  console.log('[templateBuilder] Inputs - template type:', typeof template, 'template:', template);

  // Parse and transform messages
  let messagesValue: any = [];
  try {
    const parsedMessages = JSON.parse(vars.messages);
    console.log('[templateBuilder] Parsed messages from JSON:', parsedMessages);

    // Only transform if we have a valid config
    if (message_format_config && message_format_config.mapping) {
      messagesValue = transformMessages(parsedMessages, message_format_config);
      console.log('[templateBuilder] Transformed messages:', messagesValue);
    } else {
      // No config or invalid config, use messages as-is
      console.log('[templateBuilder] No valid message_format_config, using parsed messages as-is');
      messagesValue = parsedMessages;
    }
  } catch (e) {
    console.warn('[templateBuilder] Failed to parse messages, using raw string:', e);
    messagesValue = vars.messages;
  }

  // If template is a string, use it directly for replacement
  // Otherwise, stringify it first
  let templateString = typeof template === 'string' ? template : JSON.stringify(template || {});

  console.log('[templateBuilder] Template string before replacement:', templateString);

  // Replace placeholders in the string
  // Handle quoted double braces for JSON insertion (replace entire quoted string)
  templateString = templateString
    .replace(/"\{\{messages\}\}"/g, JSON.stringify(messagesValue))
    .replace(/"\{\{conversation_id\}\}"/g, JSON.stringify(vars.conversation_id || ''))
    .replace(/"\{\{time\}\}"/g, JSON.stringify(vars.time || ''))
    .replace(/"\{\{content\}\}"/g, JSON.stringify(vars.content || ''))
    // Handle unquoted double braces for JSON insertion
    .replace(/\{\{messages\}\}/g, JSON.stringify(messagesValue))
    .replace(/\{\{conversation_id\}\}/g, vars.conversation_id || '')
    .replace(/\{\{time\}\}/g, vars.time || '')
    .replace(/\{\{content\}\}/g, vars.content || '');

  // Handle legacy single braces - BOTH quoted and unquoted
  // Quoted version: "${messages}" -> becomes the JSON array
  const quotedMessagesPlaceholder = '"${messages}"';
  if (templateString.includes(quotedMessagesPlaceholder)) {
    const replacement = JSON.stringify(messagesValue);
    console.log(
      '[templateBuilder] Replacing quoted',
      quotedMessagesPlaceholder,
      'with:',
      replacement
    );
    templateString = templateString.replace(
      new RegExp(escapeRegExp(quotedMessagesPlaceholder), 'g'),
      replacement
    );
  }

  // Unquoted version: ${messages} -> becomes the JSON array (no extra quotes)
  const unquotedMessagesPlaceholder = '${messages}';
  if (templateString.includes(unquotedMessagesPlaceholder)) {
    const replacement = JSON.stringify(messagesValue);
    console.log(
      '[templateBuilder] Replacing unquoted',
      unquotedMessagesPlaceholder,
      'with:',
      replacement
    );
    templateString = templateString.replace(
      new RegExp(escapeRegExp(unquotedMessagesPlaceholder), 'g'),
      replacement
    );
    console.log('[templateBuilder] After unquoted replacement:', templateString);
  }

  // Replace other legacy placeholders
  templateString = templateString
    .replace(/\$\{conversation_id\}/g, vars.conversation_id || '')
    .replace(/\$\{time\}/g, vars.time || '')
    .replace(/\$\{content\}/g, vars.content || '');

  console.log('[templateBuilder] Final template string:', templateString);

  try {
    const result = JSON.parse(templateString);
    console.log('[templateBuilder] Final parsed result:', result);
    return result;
  } catch (e) {
    console.error('[templateBuilder] Failed to parse final template:', e);
    return {};
  }
};

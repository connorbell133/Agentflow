import { message_format_config } from "@/types/message-format";
import { transformMessages } from "@/utils/formatters/message";

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
  template: any,
  vars: TemplateVariables,
  message_format_config: message_format_config
): any => {
  // Parse and transform messages
  let messagesValue: any = [];
  try {
    const parsedMessages = JSON.parse(vars.messages);
    // Transform messages using the current format configuration
    messagesValue = transformMessages(parsedMessages, message_format_config);
  } catch {
    messagesValue = vars.messages;
  }

  // Convert template to string for placeholder replacement
  let templateString = JSON.stringify(template || {});

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

  // Handle legacy single braces and quoted placeholders for backwards compatibility
  const messagesPlaceholder = '"${messages}"';
  if (templateString.includes(messagesPlaceholder)) {
    templateString = templateString.replace(
      new RegExp(escapeRegExp(messagesPlaceholder), 'g'),
      JSON.stringify(messagesValue)
    );
  }

  // Replace other legacy placeholders
  templateString = templateString
    .replace(/\$\{conversation_id\}/g, vars.conversation_id || '')
    .replace(/\$\{time\}/g, vars.time || '')
    .replace(/\$\{content\}/g, vars.content || '');

  try {
    return JSON.parse(templateString);
  } catch {
    return {};
  }
};
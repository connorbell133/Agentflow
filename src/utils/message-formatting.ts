import type { Message } from '@/lib/supabase/types';
import type { message_format_config, FieldMapping, RoleMapping } from '@/types/message-format';

/**
 * Sets a nested value in an object using dot notation
 * @param obj - The object to modify
 * @param path - The dot-separated path (e.g., 'message.content', 'metadata.timestamp')
 * @param value - The value to set
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  // Validate that path is a non-empty string
  if (!path || typeof path !== 'string' || path.trim() === '') {
    console.warn('setNestedValue: Invalid path provided:', path);
    return;
  }

  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((curr, key) => {
    if (!curr[key]) curr[key] = {};
    return curr[key];
  }, obj);
  target[lastKey] = value;
}

/**
 * Gets a value from a nested object using dot notation
 * @param obj - The object to read from
 * @param path - The dot-separated path
 */
export function getNestedValue(obj: any, path: string): any {
  // Validate that path is a non-empty string
  if (!path || typeof path !== 'string' || path.trim() === '') {
    console.warn('getNestedValue: Invalid path provided:', path);
    return undefined;
  }

  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

/**
 * Apply role mapping transformations to a role value
 * @param roleValue - The original role value
 * @param roleMapping - Array of role mapping rules
 */
function applyRoleMapping(roleValue: string, roleMapping?: RoleMapping[]): string {
  if (!roleMapping || !Array.isArray(roleMapping)) {
    return roleValue;
  }

  // Find the first matching role mapping
  const mapping = roleMapping.find(rm => rm.from === roleValue);
  return mapping ? mapping.to : roleValue;
}

/**
 * Gets the source value from a message based on the field mapping
 * @param message - The message object
 * @param mapping - The field mapping configuration
 */
function getSourceValue(message: Message, mapping: FieldMapping): any {
  if (mapping.source === 'literal') {
    return mapping.literalValue;
  }

  let value = message[mapping.source as keyof Message];

  // Apply transformations if specified
  if (mapping.transform === 'timestamp' && typeof value === 'string') {
    return new Date(value).toISOString();
  }

  // Apply role mapping if this is a role field with role mapping rules
  if (mapping.source === 'role' && mapping.roleMapping && typeof value === 'string') {
    value = applyRoleMapping(value, mapping.roleMapping);
  }

  return value;
}

/**
 * Transforms internal messages to the format expected by the external API
 * @param messages - Array of internal message objects
 * @param config - Message format configuration
 */
export function transformMessages(messages: Message[], config: message_format_config): any[] {
  return messages.map(msg => {
    const transformed: any = {};

    // Apply field mappings
    Object.entries(config.mapping).forEach(([fieldName, mapping]) => {
      // Skip invalid mappings
      if (
        !mapping ||
        !mapping.target ||
        typeof mapping.target !== 'string' ||
        mapping.target.trim() === ''
      ) {
        console.warn(`transformMessages: Invalid mapping for field '${fieldName}':`, mapping);
        return;
      }

      const value = getSourceValue(msg, mapping);
      setNestedValue(transformed, mapping.target, value);
    });

    // Add custom fields
    config.customFields?.forEach(field => {
      // Skip invalid custom fields
      if (!field || !field.name || typeof field.name !== 'string' || field.name.trim() === '') {
        console.warn('transformMessages: Invalid custom field:', field);
        return;
      }

      setNestedValue(transformed, field.name, field.value);
    });

    return transformed;
  });
}

/**
 * Validates that a message format configuration is valid
 * @param config - The configuration to validate
 */
export function validatemessage_format_config(config: message_format_config): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields - role and content mappings are recommended
  const requiredMappings = ['role', 'content'];
  requiredMappings.forEach(field => {
    if (!config.mapping[field]) {
      errors.push(`Missing required mapping for field: ${field}`);
    }
  });

  // Validate mapping targets
  Object.entries(config.mapping).forEach(([field, mapping]) => {
    if (!mapping.target || mapping.target.trim() === '') {
      errors.push(`Empty target path for field: ${field}`);
    }

    if (mapping.source === 'literal' && !mapping.literalValue) {
      errors.push(`Literal mapping for field '${field}' requires a literalValue`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a sample transformed message for preview purposes
 * @param sampleMessage - A sample internal message
 * @param config - The format configuration
 */
export function createSampleTransformedMessage(
  sampleMessage: Partial<Message>,
  config: message_format_config
): any {
  const defaultMessage: Message = {
    id: sampleMessage.id || 'sample-id',
    content: sampleMessage.content || 'Hello, this is a sample message',
    role: sampleMessage.role || 'user',
    ai_sdk_id: null,
    metadata: null,
    parts: null,
    created_at: sampleMessage.created_at || new Date().toISOString(),
    conversation_id: sampleMessage.conversation_id || 'sample-conversation-id',
  };

  return transformMessages([defaultMessage], config)[0];
}

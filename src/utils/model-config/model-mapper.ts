/**
 * Model Mapper Utility
 *
 * Handles transformation between database Model format and YAML ModelConfigYAML format
 */

import { Model } from '@/lib/supabase/types';
import { ModelConfigYAML } from '@/types/model-config';


/**
 * Convert database Model to YAML-friendly format
 */
export function mapDbModelToYAML(model: Model, apiKey?: string): ModelConfigYAML {
  const endpoint = model.endpoint || '';
  const method = 'POST';

  // Extract headers from model.headers
  const modelHeaders = model.headers as Record<string, any> | null;
  const headers = modelHeaders || {};

  // Convert headers to keys only (no values for security)
  const headerKeys: Record<string, string> = {};
  for (const key of Object.keys(headers)) {
    headerKeys[key] = ''; // Empty string for no value
  }

  // Extract body config
  const body_config = model.body_config as Record<string, any> | null;

  // Extract message format config
  const message_format_config = model.message_format_config as Record<string, any> | null;

  // AI SDK 6: Get endpoint type and stream config (cast model to any for new fields)
  const modelAny = model as any;
  const endpoint_type = (modelAny.endpoint_type || 'webhook') as 'webhook' | 'ai-sdk-stream' | 'sse';
  const stream_config = modelAny.stream_config as { contentPath?: string; doneSignal?: string } | null;

  const yamlConfig: ModelConfigYAML = {
    name: model.nice_name || model.model_id || 'Unnamed Model',
    model_id: model.model_id || undefined,
    description: model.description || undefined,
    endpoint,
    method: (model as any)?.method || method,
    headers: Object.keys(headerKeys).length > 0 ? headerKeys : undefined,
    endpoint_type,
    suggestion_prompts: model.suggestion_prompts || undefined,
    api_key: apiKey || undefined
  };

  // Add body_config if present
  if (body_config) {
    yamlConfig.body_config = body_config;
  }

  // Add stream_config for SSE endpoints
  if (endpoint_type === 'sse' && stream_config) {
    yamlConfig.stream_config = stream_config;
  }

  // Add legacy fields for webhook endpoints
  if (endpoint_type === 'webhook') {
    yamlConfig.request_schema = body_config || {};
    yamlConfig.response_path = model.response_path || '';
    yamlConfig.message_format = {
      mapping: message_format_config?.mapping || {} as Record<string, {
        source: string;
        target: string;
        transform?: string;
        roleMapping?: Array<{ from: string; to: string }>;
      }>,
      customFields: message_format_config?.customFields
    };
  }

  return yamlConfig;
}

/**
 * Convert YAML format to database Model format
 */
export function mapYAMLToDbModel(
  yaml: ModelConfigYAML,
  org_id: string
): Partial<Model> {
  const endpoint_type = yaml.endpoint_type || 'webhook';

  // Build base model (using any to bypass type checking for new fields)
  const model: any = {
    nice_name: yaml.name,
    model_id: yaml.model_id || yaml.name.toLowerCase().replace(/\s+/g, '-'),
    description: yaml.description,
    org_id: org_id,
    endpoint: yaml.endpoint,
    method: yaml.method || 'POST',
    headers: yaml.headers || {},
    endpoint_type,
    suggestion_prompts: yaml.suggestion_prompts || null
  };

  // Handle body_config (use body_config if present, otherwise fall back to request_schema)
  if (yaml.body_config) {
    model.body_config = yaml.body_config;
  } else if (yaml.request_schema) {
    model.body_config = yaml.request_schema;
  }

  // AI SDK 6: Add stream_config for SSE endpoints
  if (endpoint_type === 'sse' && yaml.stream_config) {
    model.stream_config = yaml.stream_config;
  }

  // Add legacy fields for webhook endpoints
  if (endpoint_type === 'webhook') {
    model.response_path = yaml.response_path;

    // Transform mapping to match FieldMapping type
    if (yaml.message_format) {
      const transformedMapping: Record<string, any> = {};
      for (const [key, value] of Object.entries(yaml.message_format.mapping)) {
        transformedMapping[key] = {
          source: value.source as any,
          target: value.target,
          transform: value.transform as any,
          roleMapping: value.roleMapping
        };
      }

      model.message_format_config = {
        mapping: transformedMapping,
        customFields: yaml.message_format.customFields
          ? yaml.message_format.customFields.map(field => ({
            ...field,
            value: typeof field.value === 'object'
              ? JSON.parse(JSON.stringify(field.value))
              : field.value
          }))
          : undefined
      };
    }
  }

  return model as Partial<Model>;
}

/**
 * Mask API key for security (show first 8 chars, mask the rest)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length <= 8) return '***';
  return apiKey.substring(0, 8) + '***';
}

/**
 * Sanitize model config for export (remove sensitive data)
 */
export function sanitizeConfigForExport(
  config: ModelConfigYAML,
  includeApiKey: boolean = false,
  maskKey: boolean = true
): ModelConfigYAML {
  const sanitized = { ...config };

  if (!includeApiKey || !sanitized.api_key) {
    delete sanitized.api_key;
  } else if (maskKey && sanitized.api_key) {
    sanitized.api_key = maskApiKey(sanitized.api_key);
  }

  return sanitized;
}

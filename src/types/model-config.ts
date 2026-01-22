/**
 * Model Configuration Types for YAML Import/Export
 *
 * This file defines the structure for model configurations that can be
 * exported as YAML files and imported back into the platform.
 */

import { z } from 'zod';

/**
 * YAML-friendly model configuration structure
 */
export interface ModelConfigYAML {
  name: string;
  model_id?: string;
  description?: string;
  endpoint: string;
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';

  headers?: Record<string, string>;

  // AI SDK 6: endpoint type determines routing strategy
  endpoint_type?: 'webhook' | 'ai-sdk-stream' | 'sse';

  // AI SDK 6: SSE stream configuration (only for endpoint_type: 'sse')
  stream_config?: {
    contentPath?: string;
    doneSignal?: string;
  };

  // Legacy fields (for webhook endpoint_type only)
  request_schema?: Record<string, any>;
  response_path?: string;
  message_format?: {
    mapping: Record<string, {
      source: string;
      target: string;
      transform?: string;
      roleMapping?: Array<{ from: string; to: string }>;
    }>;
    customFields?: Array<{
      name: string;
      value: string | object;
      type: 'string' | 'object' | 'array';
    }>;
  };

  // For all endpoint types: body configuration
  body_config?: Record<string, any>;

  suggestion_prompts?: string[];

  // Optional API key (masked by default for security)
  api_key?: string;
}

/**
 * Zod schema for validating YAML model configurations
 */
export const modelConfigYAMLSchema = z.object({
  name: z.string().min(1, 'Model name is required').max(100, 'Model name too long'),
  model_id: z.string().optional(),
  description: z.string().optional(),
  endpoint: z.string().url('Invalid endpoint URL'),
  method: z.enum(['POST', 'GET', 'PUT', 'DELETE']).default('POST'),

  headers: z.record(z.string(), z.string()).optional(),

  // AI SDK 6 fields
  endpoint_type: z.enum(['webhook', 'ai-sdk-stream', 'sse']).default('webhook').optional(),

  stream_config: z.object({
    contentPath: z.string().optional(),
    doneSignal: z.string().optional()
  }).optional(),

  // Legacy fields (now optional, required only for webhook)
  request_schema: z.record(z.string(), z.any()).optional(),

  response_path: z.string().optional(),

  message_format: z.object({
    mapping: z.record(z.string(), z.object({
      source: z.string(),
      target: z.string(),
      transform: z.string().optional(),
      roleMapping: z.array(z.object({
        from: z.string(),
        to: z.string()
      })).optional()
    })),
    customFields: z.array(z.object({
      name: z.string(),
      value: z.union([z.string(), z.record(z.string(), z.any())]),
      type: z.enum(['string', 'object', 'array'])
    })).optional()
  }).optional(),

  // Universal body config (replaces request_schema)
  body_config: z.record(z.string(), z.any()).optional(),

  suggestion_prompts: z.array(z.string()).optional(),

  api_key: z.string().optional()
}).refine(
  (data) => {
    // For webhook type, require legacy fields if body_config not provided
    if (data.endpoint_type === 'webhook' || !data.endpoint_type) {
      if (!data.body_config && !data.request_schema) {
        return false;
      }
      if (!data.response_path) {
        return false;
      }
    }
    // For SSE type, require stream_config
    if (data.endpoint_type === 'sse' && !data.stream_config) {
      return false;
    }
    return true;
  },
  {
    message: 'Invalid configuration: webhook requires body_config/request_schema and response_path; SSE requires stream_config'
  }
);

/**
 * Validation result type
 */
export interface ValidationResult {
  success: boolean;
  data?: ModelConfigYAML;
  errors?: {
    field: string;
    message: string;
  }[];
}

/**
 * Export options
 */
export interface ExportOptions {
  includeApiKey?: boolean;
  maskApiKey?: boolean;
}

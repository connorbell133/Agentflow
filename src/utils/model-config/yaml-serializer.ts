/**
 * YAML Serializer Utility
 *
 * Handles serialization of model configurations to YAML format
 */

import yaml from 'js-yaml';
import { Model } from '@/lib/supabase/types';
import { ModelConfigYAML, ExportOptions } from '@/types/model-config';
import {
  mapDbModelToYAML,
  sanitizeConfigForExport
} from './model-mapper';

/**
 * Serialize a Model to YAML string
 */
export function serializeModelToYAML(
  model: Model,
  options: ExportOptions = {}
): string {
  const { includeApiKey = false, maskApiKey = true } = options;

  // Convert model to YAML-friendly format
  const yamlConfig = mapDbModelToYAML(model);

  // Sanitize for export (handle API keys)
  const sanitized = sanitizeConfigForExport(
    yamlConfig,
    includeApiKey,
    maskApiKey
  );

  // Convert to YAML string with nice formatting
  const yamlString = yaml.dump(sanitized, {
    indent: 2,
    lineWidth: 100,
    noRefs: true,
    sortKeys: false
  });

  return yamlString;
}

/**
 * Serialize with API key from separate source
 */
export function serializeModelToYAMLWithKey(
  model: Model,
  apiKey?: string,
  options: ExportOptions = {}
): string {
  const { includeApiKey = false, maskApiKey = true } = options;

  // Convert model to YAML-friendly format with API key
  const yamlConfig = mapDbModelToYAML(model, apiKey);

  // Sanitize for export
  const sanitized = sanitizeConfigForExport(
    yamlConfig,
    includeApiKey,
    maskApiKey
  );

  // Convert to YAML string
  const yamlString = yaml.dump(sanitized, {
    indent: 2,
    lineWidth: 100,
    noRefs: true,
    sortKeys: false
  });

  return yamlString;
}

/**
 * Generate filename for export
 */
export function generateExportFilename(model: Model): string {
  const name = (model.nice_name || model.model_id || 'model')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  return `${name}-config-${timestamp}.yaml`;
}

/**
 * Create downloadable YAML blob
 */
export function createYAMLBlob(yamlString: string): Blob {
  return new Blob([yamlString], { type: 'application/x-yaml' });
}

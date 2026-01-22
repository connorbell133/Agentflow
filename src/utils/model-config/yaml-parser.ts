/**
 * YAML Parser Utility
 *
 * Handles parsing and validation of YAML model configurations
 */

import yaml from 'js-yaml';
import { ModelConfigYAML, modelConfigYAMLSchema, ValidationResult } from '@/types/model-config';
import { mapYAMLToDbModel } from './model-mapper';
import { Model } from '@/lib/supabase/types';

/**
 * Parse YAML string to ModelConfigYAML object
 */
export function parseYAML(yamlString: string): any {
  try {
    const parsed = yaml.load(yamlString);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid YAML: must be a valid object');
    }

    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`YAML parsing error: ${error.message}`);
    }
    throw new Error('Failed to parse YAML');
  }
}

/**
 * Validate YAML configuration against schema
 */
export function validateModelYAML(yamlString: string): ValidationResult {
  try {
    // First parse the YAML
    const parsed = parseYAML(yamlString);

    // Then validate against schema
    const validated = modelConfigYAMLSchema.parse(parsed);

    return {
      success: true,
      data: validated
    };
  } catch (error: any) {
    if (error && error.errors && Array.isArray(error.errors)) {
      return {
        success: false,
        errors: error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        errors: [
          {
            field: 'yaml',
            message: error.message
          }
        ]
      };
    }

    return {
      success: false,
      errors: [
        {
          field: 'unknown',
          message: 'An unknown error occurred during validation'
        }
      ]
    };
  }
}

/**
 * Parse and convert YAML to database Model format
 */
export function parseYAMLToModel(
  yamlString: string,
  org_id: string
): Partial<Model> {
  const validationResult = validateModelYAML(yamlString);

  if (!validationResult.success || !validationResult.data) {
    const errorMessage = validationResult.errors
      ?.map(err => `${err.field}: ${err.message}`)
      .join(', ') || 'Invalid configuration';

    throw new Error(`Validation failed: ${errorMessage}`);
  }

  return mapYAMLToDbModel(validationResult.data, org_id);
}

/**
 * Safely parse YAML and return result with error handling
 */
export function safeParseYAML(yamlString: string): {
  success: boolean;
  data?: ModelConfigYAML;
  error?: string;
} {
  try {
    const data = parseYAML(yamlString);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse YAML'
    };
  }
}

/**
 * Check if model config already exists by name
 */
export function extractmodel_identifier(yamlString: string): {
  name?: string;
  model_id?: string;
} {
  try {
    const parsed = parseYAML(yamlString);
    return {
      name: parsed.name,
      model_id: parsed.model_id
    };
  } catch {
    return {};
  }
}

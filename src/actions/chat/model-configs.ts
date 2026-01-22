"use server";

/**
 * Server Actions for Model Configuration Import/Export
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Model } from "@/lib/supabase/types";
import { createLogger } from "@/lib/infrastructure/logger";
import {
  serializeModelToYAMLWithKey,
  generateExportFilename
} from "@/utils/model-config/yaml-serializer";
import {
  validateModelYAML,
  parseYAMLToModel,
  extractmodel_identifier
} from "@/utils/model-config/yaml-parser";
import { ExportOptions, ValidationResult } from "@/types/model-config";
import { getModelData, getModelApiKey, addModel } from "./models";

const logger = createLogger("model-configs");

/**
 * Export a model configuration as YAML
 */
export async function exportModelAsYAML(
  model_id: string,
  options: ExportOptions = {}
): Promise<{
  success: boolean;
  yaml?: string;
  filename?: string;
  error?: string
}> {
  try {
    logger.info("Exporting model as YAML", { model_id, options });

    // Fetch model data with RLS permissions
    const model = await getModelData(model_id);

    if (!model) {
      return {
        success: false,
        error: "Model not found or access denied"
      };
    }

    // Optionally fetch API key if requested
    let apiKey: string | undefined;
    if (options.includeApiKey) {
      try {
        apiKey = await getModelApiKey(model_id);
      } catch (error) {
        logger.warn("Could not fetch API key for model", { model_id, error });
        // Continue without API key
      }
    }

    // Serialize to YAML
    const yamlString = serializeModelToYAMLWithKey(model, apiKey, options);
    const filename = generateExportFilename(model);

    logger.info("Model exported successfully", { model_id, filename });

    return {
      success: true,
      yaml: yamlString,
      filename
    };
  } catch (error) {
    logger.error("Error exporting model as YAML", { model_id, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export model"
    };
  }
}

/**
 * Validate YAML configuration
 */
export async function validateYAMLConfig(
  yamlContent: string
): Promise<ValidationResult> {
  try {
    logger.info("Validating YAML configuration");
    const result = validateModelYAML(yamlContent);

    if (result.success) {
      logger.info("YAML validation successful");
    } else {
      logger.warn("YAML validation failed", { errors: result.errors });
    }

    return result;
  } catch (error) {
    logger.error("Error validating YAML", { error });
    return {
      success: false,
      errors: [
        {
          field: 'unknown',
          message: error instanceof Error ? error.message : 'Validation error'
        }
      ]
    };
  }
}

/**
 * Import a model from YAML configuration
 */
export async function importModelFromYAML(
  yamlContent: string,
  org_id: string,
  options: {
    replaceIfExists?: boolean;
    importApiKey?: boolean;
  } = {}
): Promise<{
  success: boolean;
  model_id?: string;
  model?: Model;
  error?: string;
  warning?: string;
}> {
  try {
    logger.info("Importing model from YAML", { org_id, options });

    // First validate the YAML
    const validation = validateModelYAML(yamlContent);
    if (!validation.success) {
      const errorMessage = validation.errors
        ?.map(err => `${err.field}: ${err.message}`)
        .join(', ') || 'Invalid YAML configuration';

      return {
        success: false,
        error: errorMessage
      };
    }

    // Extract model identifier to check for duplicates
    const identifier = extractmodel_identifier(yamlContent);

    const supabase = await createSupabaseServerClient();

    // Check if model already exists
    let existingModel: Model | null = null;

    if (identifier.name) {
      const { data: existing, error } = await supabase
        .from('models')
        .select('*')
        .eq('nice_name', identifier.name)
        .eq('org_id', org_id)
        .limit(1);

      if (error) {
        logger.error("Error checking for existing model", { error, name: identifier.name, org_id });
        return {
          success: false,
          error: "Failed to check for existing model"
        };
      }

      if (existing && existing.length > 0) {
        existingModel = existing[0] as Model;
      }
    }

    if (existingModel && !options.replaceIfExists) {
      return {
        success: false,
        error: `A model named "${identifier.name}" already exists. Enable "Replace if exists" to update it.`
      };
    }

    // Parse YAML to model format
    const modelData = parseYAMLToModel(yamlContent, org_id);

    // Handle API key if present
    let apiKeyWarning: string | undefined;
    if (validation.data?.api_key) {
      if (!options.importApiKey) {
        apiKeyWarning = "API key found in config but was not imported. You'll need to add it manually.";
      } else {
        // NOTE: API keys should be stored in a separate model_keys table for better security
        // See: https://github.com/your-org/chat-platform/issues/[issue-number]
        apiKeyWarning = "API key import is not yet implemented. Please add the API key manually.";
      }
    }

    // Create or update the model
    let result;
    if (existingModel && options.replaceIfExists) {
      // Update existing model
      const { updateModel } = await import('./models');
      result = await updateModel({
        ...existingModel,
        ...modelData
      } as Model);
      logger.info("Model updated from YAML import", {
        model_id: existingModel.id,
        name: identifier.name
      });
    } else {
      // Create new model
      const { id, ...modelDataWithoutId } = modelData as any;
      result = await addModel({
        ...modelDataWithoutId,
        created_at: new Date().toISOString()
      } as Model);
      logger.info("Model created from YAML import", {
        name: identifier.name
      });
    }

    const importedModel = Array.isArray(result) ? result[0] : result;
    const modelWithId = importedModel as any;

    return {
      success: true,
      model_id: modelWithId?.id || '',
      model: modelWithId as Model,
      warning: apiKeyWarning
    };
  } catch (error) {
    logger.error("Error importing model from YAML", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to import model"
    };
  }
}

/**
 * Check if model name already exists in organization
 */
export async function checkModelExists(
  modelName: string,
  org_id: string
): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: existing, error } = await supabase
      .from('models')
      .select('id')
      .eq('nice_name', modelName)
      .eq('org_id', org_id)
      .limit(1);

    if (error) {
      logger.error("Error checking model existence", { error });
      return false;
    }

    return (existing?.length ?? 0) > 0;
  } catch (error) {
    logger.error("Error checking model existence", { error });
    return false;
  }
}

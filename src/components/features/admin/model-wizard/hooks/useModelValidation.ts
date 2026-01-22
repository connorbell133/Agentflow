import { useMemo } from "react";
import { WizardState } from "../wizard.types";
import { safeJsonParse } from "../utils/pathExtractor";
import { buildBodyFromTemplate } from "../utils/templateBuilder";

export interface ValidationResult {
  isValid: boolean;
  message: string;
  errors?: any;
}

export const useModelValidation = (wizardState: WizardState): ValidationResult => {
  return useMemo(() => {
    if (!wizardState.body_config) {
      return {
        isValid: false,
        message: "Missing body template."
      };
    }

    try {
      const parsedTemplate = safeJsonParse(wizardState.body_config) as any;

      // Build a test body from the template using current testVars
      buildBodyFromTemplate(parsedTemplate, wizardState.testVars, wizardState.message_format_config);

      return {
        isValid: true,
        message: "Template builds successfully"
      };
    } catch (err) {
      console.error("Validation error:", err);
      return {
        isValid: false,
        message: "An error occurred while building the template."
      };
    }
  }, [wizardState.body_config, wizardState.testVars, wizardState.message_format_config]);
};
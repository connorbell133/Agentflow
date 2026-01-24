/**
 * useFieldTracking Hook
 *
 * Manages field-level state tracking for the template-aware wizard.
 * Tracks which fields are FIXED, EDITABLE, or PLACEHOLDER and whether
 * users have modified them.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  FieldState,
  FieldMetadata,
  FieldTracking,
  FieldTrackingMap,
  TemplateFieldMetadataMap,
  RequirementStatus,
  FieldSource,
  FieldValidationResult,
} from '@/types/template-field-state';
import type { WizardState } from '@/types/ui/wizard.types';

interface UseFieldTrackingProps {
  /** Current wizard state */
  wizardState: WizardState;

  /** Field metadata from selected template */
  templateFieldMetadata?: TemplateFieldMetadataMap;

  /** Whether a template is selected */
  hasTemplate: boolean;
}

interface UseFieldTrackingReturn {
  /** Field tracking map */
  fieldTracking: FieldTrackingMap;

  /** Get tracking data for a specific field */
  getFieldTracking: (fieldPath: string) => FieldTracking | null;

  /** Get metadata for a specific field */
  getFieldMetadata: (fieldPath: string) => FieldMetadata | null;

  /** Get the state for a specific field */
  getFieldState: (fieldPath: string) => FieldState;

  /** Get requirement status for a field */
  getRequirementStatus: (fieldPath: string) => RequirementStatus;

  /** Mark a field as modified by user */
  markFieldModified: (fieldPath: string) => void;

  /** Unlock a FIXED field (converts to EDITABLE) */
  unlockField: (fieldPath: string) => void;

  /** Check if a field was unlocked */
  wasFieldUnlocked: (fieldPath: string) => boolean;

  /** Get all unlocked fields */
  getUnlockedFields: () => string[];

  /** Validate a specific field */
  validateField: (fieldPath: string, value: any) => FieldValidationResult;

  /** Check if all required fields are satisfied */
  areAllRequiredFieldsSatisfied: () => boolean;

  /** Get count of fields by requirement status */
  getFieldCounts: () => {
    total: number;
    required: number;
    satisfied: number;
    attention_required: number;
    locked: number;
    optional: number;
  };
}

export function useFieldTracking({
  wizardState,
  templateFieldMetadata = {},
  hasTemplate,
}: UseFieldTrackingProps): UseFieldTrackingReturn {
  // Track which fields have been unlocked from FIXED state
  const [unlockedFields, setUnlockedFields] = useState<Set<string>>(new Set());

  // Track which fields have been modified by the user
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(
    new Set(
      wizardState.templateModifiedFields
        ? Object.keys(wizardState.templateModifiedFields).filter(
            key => wizardState.templateModifiedFields![key]
          )
        : []
    )
  );

  /**
   * Get the value of a field from wizard state using dot notation
   */
  const getFieldValue = useCallback(
    (fieldPath: string): any => {
      const parts = fieldPath.split('.');
      let value: any = wizardState;

      for (const part of parts) {
        // Handle array indices (e.g., headersPairs.0.key)
        if (value && typeof value === 'object') {
          // Check if it's an array access like headersPairs.Authorization
          if (part.includes('Authorization') || part.includes('x-api-key')) {
            // Special handling for header pairs
            if (Array.isArray(value)) {
              const headerPair = value.find(
                pair => pair.key === part || pair.key === part.split('.').pop()
              );
              return headerPair?.value;
            }
          }
          value = value[part];
        } else {
          return undefined;
        }
      }

      return value;
    },
    [wizardState]
  );

  /**
   * Determine the source of a field's value
   */
  const getFieldSource = useCallback(
    (fieldPath: string): FieldSource => {
      if (!hasTemplate) return 'default';
      if (modifiedFields.has(fieldPath)) return 'user';
      return 'template';
    },
    [hasTemplate, modifiedFields]
  );

  /**
   * Get metadata for a field from the template
   */
  const getFieldMetadata = useCallback(
    (fieldPath: string): FieldMetadata | null => {
      if (!hasTemplate || !templateFieldMetadata) return null;
      return templateFieldMetadata[fieldPath] || null;
    },
    [hasTemplate, templateFieldMetadata]
  );

  /**
   * Get the state of a field (FIXED, EDITABLE, PLACEHOLDER)
   */
  const getFieldState = useCallback(
    (fieldPath: string): FieldState => {
      if (!hasTemplate) return 'EDITABLE' as FieldState;

      const metadata = getFieldMetadata(fieldPath);
      if (!metadata) return 'EDITABLE' as FieldState;

      // If field was unlocked, it becomes EDITABLE
      if (unlockedFields.has(fieldPath)) {
        return 'EDITABLE' as FieldState;
      }

      return metadata.state;
    },
    [hasTemplate, getFieldMetadata, unlockedFields]
  );

  /**
   * Determine requirement status for a field
   */
  const getRequirementStatus = useCallback(
    (fieldPath: string): RequirementStatus => {
      const state = getFieldState(fieldPath);
      const value = getFieldValue(fieldPath);
      const metadata = getFieldMetadata(fieldPath);

      // FIXED fields are always locked
      if (state === 'FIXED') {
        return 'locked';
      }

      // Check if field is required
      const isRequired = metadata?.validationRules?.required ?? false;

      if (!isRequired) {
        return 'optional';
      }

      // PLACEHOLDER fields that aren't filled need attention
      if (state === 'PLACEHOLDER') {
        const isEmpty =
          value === undefined ||
          value === null ||
          value === '' ||
          (typeof value === 'string' && (value.includes('{{') || value.includes('}}')));

        if (isEmpty || !modifiedFields.has(fieldPath)) {
          return 'attention_required';
        }
      }

      // Field is satisfied
      return 'satisfied';
    },
    [getFieldState, getFieldValue, getFieldMetadata, modifiedFields]
  );

  /**
   * Build complete field tracking map
   */
  const fieldTracking = useMemo<FieldTrackingMap>(() => {
    if (!hasTemplate || !templateFieldMetadata) return {};

    const tracking: FieldTrackingMap = {};

    for (const fieldPath in templateFieldMetadata) {
      const value = getFieldValue(fieldPath);
      const source = getFieldSource(fieldPath);
      const isModified = modifiedFields.has(fieldPath);
      const requirementStatus = getRequirementStatus(fieldPath);
      const wasUnlocked = unlockedFields.has(fieldPath);

      tracking[fieldPath] = {
        value,
        source,
        isModified,
        requirementStatus,
        wasUnlocked,
        errors: [], // Validation errors populated by validateField
      };
    }

    return tracking;
  }, [
    hasTemplate,
    templateFieldMetadata,
    getFieldValue,
    getFieldSource,
    getRequirementStatus,
    modifiedFields,
    unlockedFields,
  ]);

  /**
   * Get tracking data for a specific field
   */
  const getFieldTracking = useCallback(
    (fieldPath: string): FieldTracking | null => {
      return fieldTracking[fieldPath] || null;
    },
    [fieldTracking]
  );

  /**
   * Mark a field as modified
   */
  const markFieldModified = useCallback((fieldPath: string) => {
    setModifiedFields(prev => new Set(prev).add(fieldPath));
  }, []);

  /**
   * Unlock a FIXED field (convert to EDITABLE)
   */
  const unlockField = useCallback((fieldPath: string) => {
    setUnlockedFields(prev => new Set(prev).add(fieldPath));
    setModifiedFields(prev => new Set(prev).add(fieldPath));
  }, []);

  /**
   * Check if a field was unlocked
   */
  const wasFieldUnlocked = useCallback(
    (fieldPath: string): boolean => {
      return unlockedFields.has(fieldPath);
    },
    [unlockedFields]
  );

  /**
   * Get list of all unlocked fields
   */
  const getUnlockedFields = useCallback((): string[] => {
    return Array.from(unlockedFields);
  }, [unlockedFields]);

  /**
   * Validate a field against its validation rules
   */
  const validateField = useCallback(
    (fieldPath: string, value: any): FieldValidationResult => {
      const metadata = getFieldMetadata(fieldPath);
      if (!metadata?.validationRules) {
        return { isValid: true, errors: [] };
      }

      const rules = metadata.validationRules;
      const errors: string[] = [];

      // Required validation
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push('This field is required');
      }

      // Type validation
      if (value && rules.type) {
        switch (rules.type) {
          case 'url':
            try {
              new URL(value);
            } catch {
              errors.push('Must be a valid URL');
            }
            break;
          case 'email':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              errors.push('Must be a valid email address');
            }
            break;
          case 'number':
            if (isNaN(Number(value))) {
              errors.push('Must be a number');
            }
            break;
          case 'json':
            try {
              JSON.parse(value);
            } catch {
              errors.push('Must be valid JSON');
            }
            break;
        }
      }

      // Length validation
      if (value && typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`Must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`Must be at most ${rules.maxLength} characters`);
        }
      }

      // Numeric range validation
      if (value && typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`Must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`Must be at most ${rules.max}`);
        }
      }

      // Pattern validation
      if (value && rules.pattern) {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(String(value))) {
          errors.push('Invalid format');
        }
      }

      // Custom validation
      if (rules.custom) {
        const customResult = rules.custom(value);
        if (typeof customResult === 'string') {
          errors.push(customResult);
        } else if (customResult === false) {
          errors.push('Validation failed');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    },
    [getFieldMetadata]
  );

  /**
   * Check if all required fields are satisfied
   */
  const areAllRequiredFieldsSatisfied = useCallback((): boolean => {
    if (!hasTemplate) return true;

    for (const fieldPath in fieldTracking) {
      const tracking = fieldTracking[fieldPath];
      if (tracking.requirementStatus === 'attention_required') {
        return false;
      }
    }

    return true;
  }, [hasTemplate, fieldTracking]);

  /**
   * Get counts of fields by status
   */
  const getFieldCounts = useCallback(() => {
    const counts = {
      total: 0,
      required: 0,
      satisfied: 0,
      attention_required: 0,
      locked: 0,
      optional: 0,
    };

    for (const fieldPath in fieldTracking) {
      const tracking = fieldTracking[fieldPath];
      counts.total++;

      switch (tracking.requirementStatus) {
        case 'satisfied':
          counts.satisfied++;
          counts.required++;
          break;
        case 'attention_required':
          counts.attention_required++;
          counts.required++;
          break;
        case 'locked':
          counts.locked++;
          break;
        case 'optional':
          counts.optional++;
          break;
      }
    }

    return counts;
  }, [fieldTracking]);

  // Sync unlocked fields with wizard state
  useEffect(() => {
    if (wizardState.templateModifiedFields) {
      setModifiedFields(
        new Set(
          Object.keys(wizardState.templateModifiedFields).filter(
            key => wizardState.templateModifiedFields![key]
          )
        )
      );
    }
  }, [wizardState.templateModifiedFields]);

  return {
    fieldTracking,
    getFieldTracking,
    getFieldMetadata,
    getFieldState,
    getRequirementStatus,
    markFieldModified,
    unlockField,
    wasFieldUnlocked,
    getUnlockedFields,
    validateField,
    areAllRequiredFieldsSatisfied,
    getFieldCounts,
  };
}

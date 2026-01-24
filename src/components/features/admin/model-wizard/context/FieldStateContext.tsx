/**
 * FieldStateContext
 *
 * React Context that provides field state tracking throughout the wizard.
 * Wraps the wizard to make field tracking state available to all steps.
 */

'use client';

import React, { createContext, useContext, type ReactNode } from 'react';
import { useFieldTracking } from '../hooks/useFieldTracking';
import type {
  FieldState,
  FieldMetadata,
  FieldTracking,
  FieldTrackingMap,
  RequirementStatus,
  FieldValidationResult,
} from '@/types/template-field-state';
import type { WizardState } from '@/types/ui/wizard.types';

interface FieldStateContextValue {
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

  /** Whether template is active */
  hasTemplate: boolean;
}

const FieldStateContext = createContext<FieldStateContextValue | null>(null);

interface FieldStateProviderProps {
  children: ReactNode;
  wizardState: WizardState;
  templateFieldMetadata?: Record<string, FieldMetadata>;
}

export function FieldStateProvider({
  children,
  wizardState,
  templateFieldMetadata,
}: FieldStateProviderProps) {
  const hasTemplate = Boolean(
    wizardState.selectedTemplateId && wizardState.templateMode !== 'custom'
  );

  const fieldTrackingHook = useFieldTracking({
    wizardState,
    templateFieldMetadata,
    hasTemplate,
  });

  const value: FieldStateContextValue = {
    ...fieldTrackingHook,
    hasTemplate,
  };

  return <FieldStateContext.Provider value={value}>{children}</FieldStateContext.Provider>;
}

/**
 * Hook to access field state context
 */
export function useFieldState(): FieldStateContextValue {
  const context = useContext(FieldStateContext);

  if (!context) {
    throw new Error('useFieldState must be used within a FieldStateProvider');
  }

  return context;
}

/**
 * Hook to check if field state is available (returns null if not in provider)
 */
export function useFieldStateOptional(): FieldStateContextValue | null {
  return useContext(FieldStateContext);
}

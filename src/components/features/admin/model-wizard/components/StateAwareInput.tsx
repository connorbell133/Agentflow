/**
 * StateAwareInput Component
 *
 * Smart input wrapper that applies visual states based on field metadata from templates.
 * Handles FIXED, EDITABLE, and PLACEHOLDER states with appropriate visual indicators.
 */

'use client';

import React, { useCallback } from 'react';
import { cn } from '@/utils/shared/cn';
import { Input } from '@/components/ui/input';
import { useFieldState } from '../context/FieldStateContext';
import {
  LockIcon,
  RequiredBadge,
  TemplateDefaultIndicator,
  UserModifiedIndicator,
  UnlockButton,
  FieldHelpText,
} from './FieldStateIndicator';
import { FieldState } from '@/types/template-field-state';

interface StateAwareInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Path to the field in wizard state (e.g., 'endpoint', 'headersPairs.Authorization') */
  fieldPath: string;

  /** Label for the field (used in unlock dialog) */
  fieldLabel?: string;

  /** Custom input component (defaults to styled Input component) */
  as?: 'input' | 'textarea' | React.ComponentType<any> | typeof Input;

  /** Additional class names for the input */
  inputClassName?: string;

  /** Additional class names for the container */
  containerClassName?: string;

  /** Whether to show help text */
  showHelpText?: boolean;

  /** Whether to show unlock button for FIXED fields */
  showUnlockButton?: boolean;

  /** Custom onChange handler (called after field is marked as modified) */
  onValueChange?: (value: string) => void;
}

export function StateAwareInput({
  fieldPath,
  fieldLabel,
  as: Component = Input,
  inputClassName,
  containerClassName,
  showHelpText = true,
  showUnlockButton = true,
  onValueChange,
  className,
  ...inputProps
}: StateAwareInputProps) {
  const fieldState = useFieldState();

  // Get field metadata (safe even if no template)
  const metadata = fieldState.hasTemplate ? fieldState.getFieldMetadata(fieldPath) : undefined;
  const tracking = fieldState.hasTemplate ? fieldState.getFieldTracking(fieldPath) : undefined;
  const state = fieldState.hasTemplate ? fieldState.getFieldState(fieldPath) : undefined;
  const requirementStatus = fieldState.hasTemplate
    ? fieldState.getRequirementStatus(fieldPath)
    : undefined;

  // Destructure onChange to satisfy ESLint
  const { onChange: inputOnChange, ...restInputProps } = inputProps;

  // Handle input change - must be defined before early return
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      // Mark field as modified if we have a template
      if (fieldState.hasTemplate) {
        fieldState.markFieldModified(fieldPath);
      }

      // Call custom onChange handler if provided
      if (onValueChange) {
        onValueChange(e.target.value);
      }

      // Call original onChange if provided
      if (inputOnChange) {
        inputOnChange(e as any);
      }
    },
    [fieldPath, fieldState, onValueChange, inputOnChange]
  );

  // If not in a field state context, render normal input
  if (!fieldState.hasTemplate) {
    return (
      <div className={cn('field-state-container', containerClassName)}>
        <div className="field-state-input-wrapper">
          <Component
            {...restInputProps}
            onChange={handleChange}
            className={cn(className, inputClassName)}
          />
        </div>
      </div>
    );
  }

  // Determine input state classes
  const getInputStateClass = (): string => {
    if (state === FieldState.FIXED) {
      return 'input-locked';
    }

    if (state === FieldState.PLACEHOLDER && requirementStatus === 'attention_required') {
      return 'input-required-template';
    }

    if (state === FieldState.EDITABLE && tracking?.isModified) {
      return 'input-user-modified';
    }

    if (state === FieldState.EDITABLE && !tracking?.isModified) {
      return 'input-template-default';
    }

    return '';
  };

  // Determine if input should be disabled
  const isDisabled = state === FieldState.FIXED && !fieldState.wasFieldUnlocked(fieldPath);

  return (
    <div className={cn('field-state-container', containerClassName)}>
      <div className="field-state-input-wrapper">
        {/* Required Badge for PLACEHOLDER fields */}
        {state === FieldState.PLACEHOLDER && requirementStatus === 'attention_required' && (
          <RequiredBadge />
        )}

        {/* Input Element */}
        <Component
          {...restInputProps}
          onChange={handleChange}
          disabled={isDisabled}
          className={cn(
            className,
            inputClassName,
            getInputStateClass(),
            isDisabled && 'cursor-not-allowed',
            state === FieldState.FIXED && 'pr-8' // Make room for lock icon
          )}
        />

        {/* Lock Icon for FIXED fields */}
        {state === FieldState.FIXED && !fieldState.wasFieldUnlocked(fieldPath) && (
          <LockIcon helpText={metadata?.helpText} />
        )}
      </div>

      {/* Template Default Indicator */}
      {state === FieldState.EDITABLE &&
        !tracking?.isModified &&
        metadata?.defaultValue &&
        !fieldState.wasFieldUnlocked(fieldPath) && (
          <TemplateDefaultIndicator value={metadata.defaultValue} />
        )}

      {/* User Modified Indicator */}
      {tracking?.isModified && tracking?.wasUnlocked && <UserModifiedIndicator />}

      {/* Help Text */}
      {showHelpText && metadata?.helpText && state !== FieldState.FIXED && (
        <FieldHelpText text={metadata.helpText} variant="info" />
      )}

      {/* Unlock Button for FIXED fields */}
      {state === FieldState.FIXED &&
        showUnlockButton &&
        metadata?.canUnlock !== false &&
        !fieldState.wasFieldUnlocked(fieldPath) && (
          <div className="mt-2">
            <UnlockButton
              fieldPath={fieldPath}
              fieldLabel={fieldLabel}
              metadata={metadata ?? undefined}
              onUnlock={fieldState.unlockField}
            />
          </div>
        )}
    </div>
  );
}

/**
 * StateAwareTextarea - Textarea variant of StateAwareInput
 */
export function StateAwareTextarea(props: Omit<StateAwareInputProps, 'as'>) {
  return <StateAwareInput {...props} as="textarea" />;
}

/**
 * StateAwareSelect - For use with select elements (coming soon)
 */
interface StateAwareSelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'onChange'
> {
  fieldPath: string;
  fieldLabel?: string;
  containerClassName?: string;
  showHelpText?: boolean;
  showUnlockButton?: boolean;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function StateAwareSelect({
  fieldPath,
  fieldLabel,
  containerClassName,
  showHelpText = true,
  showUnlockButton = true,
  onValueChange,
  className,
  children,
  ...selectProps
}: StateAwareSelectProps) {
  const fieldState = useFieldState();

  // Get field metadata (safe even if no template)
  const metadata = fieldState.hasTemplate ? fieldState.getFieldMetadata(fieldPath) : undefined;
  const tracking = fieldState.hasTemplate ? fieldState.getFieldTracking(fieldPath) : undefined;
  const state = fieldState.hasTemplate ? fieldState.getFieldState(fieldPath) : undefined;
  const requirementStatus = fieldState.hasTemplate
    ? fieldState.getRequirementStatus(fieldPath)
    : undefined;

  // Handle select change - must be defined before early return
  // Note: onChange is omitted from StateAwareSelectProps, so we only use onValueChange
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      // Mark field as modified if we have a template
      if (fieldState.hasTemplate) {
        fieldState.markFieldModified(fieldPath);
      }

      if (onValueChange) {
        onValueChange(e.target.value);
      }
    },
    [fieldPath, fieldState, onValueChange]
  );

  // If not in a field state context, render normal select
  if (!fieldState.hasTemplate) {
    return (
      <div className={cn('field-state-container', containerClassName)}>
        <select {...selectProps} onChange={handleChange} className={className}>
          {children}
        </select>
      </div>
    );
  }

  const getSelectStateClass = (): string => {
    if (state === FieldState.FIXED) {
      return 'input-locked';
    }

    if (state === FieldState.PLACEHOLDER && requirementStatus === 'attention_required') {
      return 'input-required-template';
    }

    if (state === FieldState.EDITABLE && tracking?.isModified) {
      return 'input-user-modified';
    }

    if (state === FieldState.EDITABLE && !tracking?.isModified) {
      return 'input-template-default';
    }

    return '';
  };

  const isDisabled = state === FieldState.FIXED && !fieldState.wasFieldUnlocked(fieldPath);

  return (
    <div className={cn('field-state-container', containerClassName)}>
      <div className="field-state-input-wrapper">
        {state === FieldState.PLACEHOLDER && requirementStatus === 'attention_required' && (
          <RequiredBadge />
        )}

        <select
          {...selectProps}
          onChange={handleChange}
          disabled={isDisabled}
          className={cn(
            className,
            getSelectStateClass(),
            isDisabled && 'cursor-not-allowed',
            state === FieldState.FIXED && 'pr-8'
          )}
        >
          {children}
        </select>

        {state === FieldState.FIXED && !fieldState.wasFieldUnlocked(fieldPath) && (
          <LockIcon helpText={metadata?.helpText} />
        )}
      </div>

      {state === FieldState.EDITABLE &&
        !tracking?.isModified &&
        metadata?.defaultValue &&
        !fieldState.wasFieldUnlocked(fieldPath) && (
          <TemplateDefaultIndicator value={metadata.defaultValue} />
        )}

      {tracking?.isModified && tracking?.wasUnlocked && <UserModifiedIndicator />}

      {showHelpText && metadata?.helpText && state !== FieldState.FIXED && (
        <FieldHelpText text={metadata.helpText} variant="info" />
      )}

      {state === FieldState.FIXED &&
        showUnlockButton &&
        metadata?.canUnlock !== false &&
        !fieldState.wasFieldUnlocked(fieldPath) && (
          <div className="mt-2">
            <UnlockButton
              fieldPath={fieldPath}
              fieldLabel={fieldLabel}
              metadata={metadata ?? undefined}
              onUnlock={fieldState.unlockField}
            />
          </div>
        )}
    </div>
  );
}

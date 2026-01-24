/**
 * Template Field State Types
 *
 * Defines types for the template-aware wizard system that tracks
 * field-level states (FIXED, EDITABLE, PLACEHOLDER) and user modifications.
 */

/**
 * Field state determines how a field behaves in the template wizard
 */
export enum FieldState {
  /** System-defined value that cannot be edited (shows lock icon) */
  FIXED = 'FIXED',

  /** Pre-filled by template but user can change (shows template default indicator) */
  EDITABLE = 'EDITABLE',

  /** Required field with placeholder that must be filled (shows pulsing glow) */
  PLACEHOLDER = 'PLACEHOLDER',
}

/**
 * Validation rules for a field
 */
export interface FieldValidationRules {
  required?: boolean;
  type?: 'string' | 'number' | 'url' | 'email' | 'json';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string; // Regex pattern
  custom?: (value: any) => boolean | string; // Custom validation function
}

/**
 * Metadata for a single field in a template
 */
export interface FieldMetadata {
  /** The state of this field (FIXED, EDITABLE, PLACEHOLDER) */
  state: FieldState;

  /** Help text shown to the user */
  helpText?: string;

  /** Default value for the field */
  defaultValue?: any;

  /** Validation rules for the field */
  validationRules?: FieldValidationRules;

  /** Whether this field can be unlocked (for FIXED fields) */
  canUnlock?: boolean;

  /** Warning message shown when unlocking a FIXED field */
  unlockWarning?: string;
}

/**
 * Source of a field's value
 */
export type FieldSource = 'template' | 'user' | 'default';

/**
 * Requirement status for validation
 */
export type RequirementStatus = 'satisfied' | 'attention_required' | 'locked' | 'optional';

/**
 * Runtime tracking data for a field
 */
export interface FieldTracking {
  /** Current value of the field */
  value: any;

  /** Where the value came from */
  source: FieldSource;

  /** Whether the user has modified this field */
  isModified: boolean;

  /** Current validation/requirement status */
  requirementStatus: RequirementStatus;

  /** Whether this field was unlocked from FIXED state */
  wasUnlocked?: boolean;

  /** Validation errors for this field */
  errors?: string[];
}

/**
 * Complete field configuration combining metadata and tracking
 */
export interface FieldConfig {
  /** Field path (e.g., 'endpoint', 'headersPairs.Authorization') */
  path: string;

  /** Metadata from template */
  metadata: FieldMetadata;

  /** Runtime tracking data */
  tracking: FieldTracking;
}

/**
 * Template mode for the wizard
 */
export type TemplateMode = 'template' | 'custom' | 'modified';

/**
 * Template field metadata map (stored in database)
 */
export type TemplateFieldMetadataMap = Record<string, FieldMetadata>;

/**
 * Field tracking map (runtime state)
 */
export type FieldTrackingMap = Record<string, FieldTracking>;

/**
 * Extended model config preset with field metadata
 */
export interface TemplateFieldConfig {
  id: string;
  name: string;
  description?: string;
  category: 'openai' | 'anthropic' | 'langchain' | 'custom';
  event_mappings: any; // SSEEventMapperConfig
  field_metadata: TemplateFieldMetadataMap;
  template_version: number;
  is_system: boolean;
  org_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Helper type for field paths in wizard state
 */
export type WizardFieldPath =
  | 'nice_name'
  | 'description'
  | 'model_id'
  | 'schema'
  | 'endpoint'
  | 'method'
  | 'endpoint_type'
  | 'message_format_config.type'
  | 'body_config'
  | 'response_path'
  | 'temperature'
  | 'max_tokens'
  | `headersPairs.${string}`
  | `suggestion_prompts.${number}.prompt`
  | `stream_config.${string}`
  | `testVars.${string}`;

/**
 * Validation result for a field
 */
export interface FieldValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Step progress information
 */
export interface StepProgress {
  stepId: string;
  stepLabel: string;
  requiredFieldsCount: number;
  satisfiedFieldsCount: number;
  lockedFieldsCount: number;
  editableFieldsCount: number;
  completionPercentage: number;
  hasBlockingIssues: boolean;
  canProceed: boolean;
}

/**
 * Field unlock event
 */
export interface FieldUnlockEvent {
  fieldPath: string;
  previousState: FieldState;
  newState: FieldState;
  reason: string;
}

/**
 * Enhanced Wizard State Types with Configuration Modes
 *
 * This file defines the mode-based wizard system that allows users to:
 * - Start with presets
 * - Switch to custom configuration
 * - Access advanced visual mapper
 * - Edit presets without losing context
 */

import type { SSEEventMapperConfig } from '@/types/event-mapping';

/**
 * Configuration modes for SSE/AI SDK stream setup
 */
export type ConfigurationMode = 'preset' | 'custom' | 'advanced';

/**
 * Preset mode state - using a pre-configured template
 */
export interface PresetModeState {
  selectedPresetId: string | null;
  presetName: string | null;
  presetDescription: string | null;
  canEdit: boolean; // false for system presets, true for org presets
  isModified: boolean; // true if user has edited the preset
}

/**
 * Custom mode state - manual configuration
 */
export interface CustomModeState {
  basePresetId: string | null; // Track which preset this was based on
  basePresetName: string | null;
  hasChanges: boolean; // true if different from base preset
  // Simple fields (legacy format support)
  contentPath: string;
  doneSignal: string;
  errorPath: string;
}

/**
 * Advanced mode state - visual event mapper
 */
export interface AdvancedModeState {
  basePresetId: string | null;
  basePresetName: string | null;
  eventMappings: SSEEventMapperConfig;
  visualLayout: {
    order: number;
    collapsed: boolean;
    id: string;
  }[];
  hasChanges: boolean;
}

/**
 * Configuration state that tracks current mode and mode-specific data
 */
export interface ConfigurationState {
  currentMode: ConfigurationMode;
  preset: PresetModeState;
  custom: CustomModeState;
  advanced: AdvancedModeState;
}

/**
 * Test result from configuration testing
 */
export interface TestResult {
  id: string;
  timestamp: Date;
  success: boolean;
  testMessage: string;
  rawEvents: Array<{
    event: string;
    data: string;
    timestamp: number;
  }>;
  mappedEvents: Array<{
    type: string;
    data: any;
    timestamp: number;
    mappingIndex?: number;
  }>;
  unmappedEvents: Array<{
    event: string;
    data: string;
    reason: string;
  }>;
  errors: Array<{
    message: string;
    event?: string;
    timestamp: number;
  }>;
  stats: {
    totalEvents: number;
    mappedCount: number;
    unmappedCount: number;
    errorCount: number;
    duration: number;
    mappingOverhead: number;
  };
}

/**
 * Validation error with suggestions
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestions?: Array<{
    label: string;
    value: string;
    confidence: number;
  }>;
}

/**
 * Draft save state for auto-save functionality
 */
export interface DraftState {
  lastSaved: Date | null;
  isDirty: boolean;
  autoSaveEnabled: boolean;
  saveDraft: () => Promise<void>;
  loadDraft: () => Promise<void>;
  clearDraft: () => void;
}

/**
 * Mode switching context
 */
export interface ModeSwitchContext {
  from: ConfigurationMode;
  to: ConfigurationMode;
  preserveData: boolean;
  confirmationRequired: boolean;
}

/**
 * Helpers for mode transitions
 */
export interface ModeTransitionHelpers {
  canSwitchTo: (mode: ConfigurationMode) => boolean;
  switchTo: (mode: ConfigurationMode, context?: Partial<ModeSwitchContext>) => void;
  getModeData: (mode: ConfigurationMode) => PresetModeState | CustomModeState | AdvancedModeState;
  syncModeData: () => void; // Synchronize state across modes
}

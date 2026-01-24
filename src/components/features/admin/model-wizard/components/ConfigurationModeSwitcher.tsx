/**
 * Configuration Mode Switcher
 *
 * Allows users to switch between Preset, Custom, and Advanced configuration modes
 * with smooth transitions and data preservation.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import type { ConfigurationMode } from '@/types/ui/wizard-modes.types';

interface ConfigurationModeSwitcherProps {
  currentMode: ConfigurationMode;
  onModeChange: (mode: ConfigurationMode) => void;
  hasUnsavedChanges?: boolean;
  disabled?: boolean;
}

const MODE_CONFIG: Record<
  ConfigurationMode,
  {
    label: string;
    icon: string;
    description: string;
    color: string;
  }
> = {
  preset: {
    label: 'Preset',
    icon: '🎯',
    description: 'Start with a template',
    color: 'text-blue-600 dark:text-blue-400',
  },
  custom: {
    label: 'Custom',
    icon: '✏️',
    description: 'Build from scratch',
    color: 'text-purple-600 dark:text-purple-400',
  },
  advanced: {
    label: 'Advanced',
    icon: '🔧',
    description: 'Visual event mapper',
    color: 'text-orange-600 dark:text-orange-400',
  },
};

export const ConfigurationModeSwitcher: React.FC<ConfigurationModeSwitcherProps> = ({
  currentMode,
  onModeChange,
  hasUnsavedChanges = false,
  disabled = false,
}) => {
  const handleModeClick = (mode: ConfigurationMode) => {
    if (mode === currentMode || disabled) return;

    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Switching modes will preserve your configuration. Continue?'
      );
      if (!confirmed) return;
    }

    onModeChange(mode);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Configuration Mode</h3>
        {hasUnsavedChanges && (
          <span className="text-xs text-yellow-600 dark:text-yellow-400">• Unsaved changes</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(MODE_CONFIG) as ConfigurationMode[]).map(mode => {
          const config = MODE_CONFIG[mode];
          const isActive = currentMode === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => handleModeClick(mode)}
              disabled={disabled}
              className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                isActive
                  ? 'bg-primary/10 border-primary shadow-sm'
                  : 'hover:border-muted-foreground/50 hover:bg-muted/30 border-border'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} `}
            >
              {isActive && (
                <div className="absolute right-2 top-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                </div>
              )}

              <span className="text-2xl">{config.icon}</span>

              <div className="text-center">
                <div className={`text-sm font-medium ${isActive ? config.color : ''}`}>
                  {config.label}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{config.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        💡 You can switch modes at any time without losing your work
      </p>
    </div>
  );
};

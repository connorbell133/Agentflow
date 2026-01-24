/**
 * Field State Indicators
 *
 * Visual indicators and badges for template wizard field states.
 * Includes lock icons, required badges, template default labels, and unlock buttons.
 */

'use client';

import React, { useState } from 'react';
import { Lock, LockOpen, Check, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { FieldMetadata } from '@/types/template-field-state';

/* ========================================
   Lock Icon for FIXED Fields
   ======================================== */

interface LockIconProps {
  helpText?: string;
}

export function LockIcon({ helpText }: LockIconProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="lock-icon-container">
            <Lock className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="field-state-tooltip">
          <p>
            {helpText || 'This value is optimized for the selected template and cannot be changed.'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ========================================
   Required Badge for PLACEHOLDER Fields
   ======================================== */

export function RequiredBadge() {
  return (
    <span className="required-badge" aria-label="Required field">
      Required
    </span>
  );
}

/* ========================================
   Template Default Indicator
   ======================================== */

interface TemplateDefaultIndicatorProps {
  value?: string;
}

export function TemplateDefaultIndicator({ value }: TemplateDefaultIndicatorProps) {
  return (
    <div className="template-default-indicator">
      <Check className="h-3.5 w-3.5" />
      <span>Template Default{value ? `: ${value}` : ''}</span>
    </div>
  );
}

/* ========================================
   User Modified Indicator
   ======================================== */

export function UserModifiedIndicator() {
  return (
    <div className="mt-1 inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
      <AlertCircle className="h-3.5 w-3.5" />
      <span>Modified from template</span>
    </div>
  );
}

/* ========================================
   Unlock Button for FIXED Fields
   ======================================== */

interface UnlockButtonProps {
  fieldPath: string;
  fieldLabel?: string;
  metadata?: FieldMetadata;
  onUnlock: (fieldPath: string) => void;
}

export function UnlockButton({ fieldPath, fieldLabel, metadata, onUnlock }: UnlockButtonProps) {
  const [showDialog, setShowDialog] = useState(false);

  const handleUnlock = () => {
    onUnlock(fieldPath);
    setShowDialog(false);
  };

  const unlockWarning =
    metadata?.unlockWarning ||
    'Changing this field may break the template functionality. Are you sure you want to unlock it?';

  return (
    <>
      <button type="button" className="unlock-button" onClick={() => setShowDialog(true)}>
        <LockOpen className="h-3 w-3" />
        <span>Unlock</span>
      </button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Template Field?</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                You&apos;re about to unlock{' '}
                <span className="font-semibold">{fieldLabel || fieldPath}</span>.
              </p>
              <p className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{unlockWarning}</span>
              </p>
              {metadata?.helpText && (
                <p className="text-sm text-muted-foreground">{metadata.helpText}</p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleUnlock}>
              <LockOpen className="mr-2 h-4 w-4" />
              Unlock Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ========================================
   Field Help Text
   ======================================== */

interface FieldHelpTextProps {
  text: string;
  variant?: 'default' | 'info' | 'warning';
}

export function FieldHelpText({ text, variant = 'default' }: FieldHelpTextProps) {
  const variantStyles = {
    default: 'text-muted-foreground',
    info: 'text-blue-600 dark:text-blue-400',
    warning: 'text-amber-600 dark:text-amber-400',
  };

  return <p className={`mt-1 text-xs ${variantStyles[variant]}`}>{text}</p>;
}

/* ========================================
   Step Progress Indicators
   ======================================== */

export function StepAttentionDot() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="step-attention-dot" aria-label="Requires attention" />
        </TooltipTrigger>
        <TooltipContent>
          <p>This step has required fields that need your attention</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function StepCompletedIcon() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="step-completed-icon" aria-label="Completed">
            <Check className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>All required fields in this step are complete</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

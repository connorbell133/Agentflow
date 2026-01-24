/**
 * Step 2: Request Configuration
 *
 * Configure the JSON body template sent to the AI endpoint.
 * Messages are automatically formatted as {role, content} pairs.
 */

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { WizardState } from '@/types/ui/wizard.types';
import { buildBodyFromTemplate } from '../utils/templateBuilder';
import { safeJsonParse } from '../utils/pathExtractor';
import { useFieldStateOptional } from '../context/FieldStateContext';
import { FieldState } from '@/types/template-field-state';
import { UnlockButton } from '../components/FieldStateIndicator';

interface RequestConfigurationStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  validation?: any;
  [key: string]: any;
}

export const RequestConfigurationStep: React.FC<RequestConfigurationStepProps> = ({
  state,
  updateState,
  validation,
}) => {
  const fieldState = useFieldStateOptional();

  // Check if body_config is FIXED from template
  const bodyConfigFieldState = fieldState?.getFieldState('body_config');
  const isBodyConfigFixed = bodyConfigFieldState === FieldState.FIXED;
  const bodyConfigMetadata = fieldState?.getFieldMetadata('body_config');
  const wasBodyConfigUnlocked = fieldState?.wasFieldUnlocked?.('body_config') || false;

  // Field is disabled only if it's FIXED and hasn't been unlocked
  const isBodyConfigDisabled = isBodyConfigFixed && !wasBodyConfigUnlocked;

  // Build sample payload preview
  const samplePayload = useMemo(() => {
    try {
      console.log('[RequestConfigurationStep] body_config (raw string):', state.body_config);
      console.log('[RequestConfigurationStep] testVars:', state.testVars);

      // Don't parse yet - pass the string directly to the builder
      // The builder will handle variable substitution then parse
      const result = buildBodyFromTemplate(
        state.body_config,
        state.testVars,
        state.message_format_config
      );
      return JSON.stringify(result, null, 2);
    } catch (e) {
      console.error('[RequestConfigurationStep] Error building preview:', e);
      return '{}';
    }
  }, [state.body_config, state.testVars, state.message_format_config]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <p className="text-muted-foreground">
          Define the JSON structure sent to your endpoint. Messages are automatically formatted as{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            {'{role: "user", content: "..."}'}
          </code>{' '}
          pairs.
        </p>
      </div>

      {/* Request Body Template */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-4 text-base font-medium">Request Body Template</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Use variables like{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{'${messages}'}</code> to include
          dynamic content in your request.
        </p>

        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>JSON Template</Label>
              <div className="flex items-center gap-2">
                {isBodyConfigFixed && !wasBodyConfigUnlocked && (
                  <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                    🔒 Pre-configured by template
                  </span>
                )}
                {wasBodyConfigUnlocked && (
                  <span className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-600">
                    ⚠️ Template unlocked
                  </span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    try {
                      const formatted = JSON.stringify(JSON.parse(state.body_config), null, 2);
                      updateState({ body_config: formatted });
                    } catch {}
                  }}
                  disabled={isBodyConfigDisabled}
                >
                  Format
                </Button>
              </div>
            </div>
            <textarea
              value={state.body_config}
              onChange={e => {
                updateState({ body_config: e.target.value });
                // Mark as modified if field state tracking is available
                if (fieldState && !wasBodyConfigUnlocked) {
                  fieldState.markFieldModified?.('body_config');
                }
              }}
              disabled={isBodyConfigDisabled}
              className={`h-64 w-full rounded-md border border-input px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                isBodyConfigDisabled ? 'cursor-not-allowed bg-muted opacity-70' : 'bg-background'
              }`}
              placeholder={JSON.stringify(
                {
                  messages: '${messages}',
                  model: 'gpt-4',
                  temperature: 0.7,
                },
                null,
                2
              )}
            />
            {validation && !validation.isValid && (
              <p className="mt-2 text-sm text-red-600">
                {validation.errors?.[0]?.message || 'Invalid JSON template'}
              </p>
            )}

            {/* Unlock button for FIXED fields */}
            {isBodyConfigFixed &&
              !wasBodyConfigUnlocked &&
              fieldState?.unlockField &&
              bodyConfigMetadata?.canUnlock !== false && (
                <div className="mt-2">
                  <UnlockButton
                    fieldPath="body_config"
                    fieldLabel="Request Body Template"
                    metadata={bodyConfigMetadata ?? undefined}
                    onUnlock={fieldState.unlockField}
                  />
                </div>
              )}
          </div>

          <div className="bg-muted/50 rounded-md p-3">
            <h4 className="mb-2 text-sm font-medium">Available Variables</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <code className="rounded bg-background px-1.5 py-0.5">{'${messages}'}</code>
                <span className="ml-2 text-muted-foreground">Formatted conversation</span>
              </div>
              <div>
                <code className="rounded bg-background px-1.5 py-0.5">{'${conversation_id}'}</code>
                <span className="ml-2 text-muted-foreground">Current conversation</span>
              </div>
              <div>
                <code className="rounded bg-background px-1.5 py-0.5">{'${time}'}</code>
                <span className="ml-2 text-muted-foreground">ISO timestamp</span>
              </div>
              <div>
                <code className="rounded bg-background px-1.5 py-0.5">{'${content}'}</code>
                <span className="ml-2 text-muted-foreground">Current message</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-4 text-base font-medium">Live Preview</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          This is what will be sent to your endpoint with sample data:
        </p>
        <pre className="bg-muted/50 max-h-96 overflow-x-auto rounded-md p-4 text-xs">
          {samplePayload}
        </pre>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          <strong>Next step:</strong> Configure how to parse responses from the endpoint
        </p>
      </div>
    </div>
  );
};

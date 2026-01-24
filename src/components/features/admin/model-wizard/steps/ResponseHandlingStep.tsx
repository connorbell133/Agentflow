/**
 * Step 3: Response Handling
 *
 * Configure how to parse responses based on endpoint type.
 * - SSE: Event mapping with preset/custom/advanced modes
 * - Webhook: Response path extraction
 * - AI SDK Stream: No configuration needed (pass-through)
 */

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import HelpText from '@/components/ui/help-text';
import { WizardState } from '@/types/ui/wizard.types';
import { ConfigurationPreview } from '../components/ConfigurationPreview';
import { EventMappingEditor } from '../components/EventMappingEditor';
import { useFieldStateOptional } from '../context/FieldStateContext';
import { FieldState } from '@/types/template-field-state';
import type { SSEEventMapperConfig } from '@/types/event-mapping';

interface ResponseHandlingStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  [key: string]: any;
}

export const ResponseHandlingStep: React.FC<ResponseHandlingStepProps> = ({
  state,
  updateState,
}) => {
  const fieldState = useFieldStateOptional();

  // Check if stream_config.event_mappings is FIXED from template
  const eventMappingsFieldState = fieldState?.getFieldState('stream_config.event_mappings');
  const [isEventMappingsUnlocked, setIsEventMappingsUnlocked] = useState(false);
  const isEventMappingsFixed =
    eventMappingsFieldState === FieldState.FIXED && !isEventMappingsUnlocked;

  // Initialize default config if none exists and no template was selected
  useEffect(() => {
    if (state.endpoint_type === 'sse' && !state.stream_config && !isEventMappingsFixed) {
      // Set a default OpenAI-style event mapping config
      updateState({
        stream_config: {
          event_mappings: [
            {
              source_event_type: 'data',
              target_ui_event: 'text-delta' as const,
              field_mappings: {
                delta: 'choices[0].delta.content',
              },
            },
          ],
          done_signal: '[DONE]',
          error_path: 'error.message',
        },
      });
    }
  }, [state.endpoint_type, state.stream_config, isEventMappingsFixed, updateState]);

  // AI SDK Stream - No configuration needed
  if (state.endpoint_type === 'ai-sdk-stream') {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <div className="mb-4 text-4xl">✨</div>
          <h3 className="mb-2 text-lg font-medium">No Configuration Needed!</h3>
          <p className="text-muted-foreground">
            AI SDK Stream uses the native UIMessageStream protocol. Responses are automatically
            handled without any parsing configuration.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            This is the fastest option with zero overhead.
          </p>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            <strong>Next step:</strong> Test your configuration
          </p>
        </div>
      </div>
    );
  }

  // Webhook - Response path extraction
  if (state.endpoint_type === 'webhook') {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <p className="text-muted-foreground">
            Tell us how to extract the AI&apos;s response from the JSON payload.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-4 text-base font-medium">Response Extraction</h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="response_path">Response Path (JSONPath) *</Label>
              <Input
                id="response_path"
                placeholder="e.g. result.text or data.response"
                value={state.response_path}
                onChange={e => updateState({ response_path: e.target.value })}
                onKeyDown={e => {
                  // Prevent form submission on Enter key
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              />
              <HelpText>
                Path to the text response in the JSON. Examples: <code>result</code>,{' '}
                <code>data.message</code>, <code>response.text</code>
              </HelpText>
            </div>

            {state.responseValue && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/20">
                <p className="mb-2 text-sm font-medium text-green-900 dark:text-green-100">
                  ✓ Extracted Value:
                </p>
                <pre className="whitespace-pre-wrap text-xs text-green-700 dark:text-green-300">
                  {state.responseValue}
                </pre>
              </div>
            )}

            {state.responseError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/20">
                <p className="text-sm text-red-900 dark:text-red-100">❌ {state.responseError}</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            <strong>Next step:</strong> Test your configuration
          </p>
        </div>
      </div>
    );
  }

  // SSE - Event mapping configuration
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <p className="text-muted-foreground">
          Configure how to parse Server-Sent Events (SSE) from your streaming endpoint.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-medium">SSE Stream Parsing</h3>
          {isEventMappingsFixed && (
            <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
              🔒 Pre-configured by template
            </span>
          )}
        </div>

        {/* If event mappings are FIXED from template, show preview with edit option */}
        {isEventMappingsFixed ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This template includes pre-configured event mappings optimized for the selected
              provider.
            </p>
            <ConfigurationPreview
              config={state.stream_config as any}
              presetName="Template Configuration"
            />

            {/* Allow unlocking template to customize */}
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <div className="flex-1">
                  <p className="mb-2 text-sm font-medium text-amber-900 dark:text-amber-100">
                    Template Configuration Not Working?
                  </p>
                  <p className="mb-3 text-xs text-amber-700 dark:text-amber-300">
                    If the template configuration isn&apos;t working correctly with your endpoint,
                    you can customize it manually. This will allow you to adjust event mappings to
                    match your specific SSE format.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      // Mark as unlocked locally (we can't modify the FieldState context)
                      setIsEventMappingsUnlocked(true);
                    }}
                    className="rounded-md bg-amber-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-amber-700"
                  >
                    🔓 Unlock and Customize Configuration
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Show unlock success message if user unlocked template */}
            {isEventMappingsUnlocked && (
              <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/20">
                <p className="text-sm text-green-900 dark:text-green-100">
                  ✅ Template unlocked - You can now customize the configuration
                </p>
              </div>
            )}

            {/* Event Mapping Editor - always shown when not using fixed template */}
            <EventMappingEditor
              config={state.stream_config as SSEEventMapperConfig}
              onChange={newConfig => updateState({ stream_config: newConfig })}
            />

            {/* Configuration Preview */}
            <div className="mt-4">
              <ConfigurationPreview config={state.stream_config as SSEEventMapperConfig} />
            </div>
          </>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          <strong>Next step:</strong> Test your configuration
        </p>
      </div>
    </div>
  );
};

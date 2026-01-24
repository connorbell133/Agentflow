import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import HelpText from '@/components/ui/help-text';
import { WizardState } from '@/types/ui/wizard.types';
import { getValueAtPath } from '../utils/pathExtractor';

interface DefineOutputStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  [key: string]: any;
}

export const DefineOutputStep: React.FC<DefineOutputStepProps> = ({ state, updateState }) => {
  const handleGetValue = () => {
    if (!state.response) {
      updateState({ responseError: 'Please test the endpoint first to get a response.' });
      return;
    }
    try {
      const parsed = JSON.parse(state.response);
      const value = getValueAtPath(parsed, state.response_path);
      if (value === undefined) {
        throw new Error('Path not found in the JSON response.');
      }
      updateState({
        responseValue: JSON.stringify(value, null, 2),
        responseError: '',
      });
    } catch (err: any) {
      updateState({
        responseValue: '',
        responseError: err.message || 'Invalid path or JSON.',
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <p className="text-muted-foreground">
          Specify how to extract the desired value from the API response.
        </p>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-6">
        {/* Left Panel - Raw Response */}
        <div className="flex flex-col">
          <div className="mb-4">
            <Label className="text-base font-medium">Raw API Response</Label>
            <p className="text-xs text-muted-foreground">
              The complete response from your API endpoint
            </p>
          </div>
          <textarea
            readOnly
            className="w-full flex-1 resize-none rounded border bg-muted px-3 py-2 font-mono text-sm text-foreground"
            value={state.response}
            placeholder="Run the test first to see the API response here..."
          />
        </div>

        {/* Right Panel - Path Extraction */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="response_path">Response Path *</Label>
            <HelpText className="mb-2">
              Enter a dot/bracket notation path to extract the response text. For example:{' '}
              <code>choices[0].message.content</code> for OpenAI format
            </HelpText>
            <div className="flex gap-2">
              <Input
                id="response_path"
                placeholder="e.g. data[0].content"
                value={state.response_path}
                onChange={e => {
                  const newPath = e.target.value;
                  updateState({ response_path: newPath });

                  // Auto-extract value as user types
                  if (state.response && newPath.trim()) {
                    try {
                      const parsed = JSON.parse(state.response);
                      const value = getValueAtPath(parsed, newPath);
                      if (value !== undefined) {
                        updateState({
                          responseValue:
                            typeof value === 'string' ? value : JSON.stringify(value, null, 2),
                          responseError: '',
                        });
                      }
                    } catch (err: any) {
                      updateState({
                        responseValue: '',
                        responseError: err.message || 'Invalid path or JSON.',
                      });
                    }
                  } else if (!newPath.trim()) {
                    updateState({
                      responseValue: '',
                      responseError: '',
                    });
                  }
                }}
                data-testid="wizard-input-response-path"
              />
              <Button
                type="button"
                onClick={handleGetValue}
                disabled={!state.response || !state.response_path}
              >
                Extract
              </Button>
            </div>

            {state.responseError && (
              <p className="mt-2 text-sm text-destructive">{state.responseError}</p>
            )}
          </div>

          <div>
            <Label>Extracted Value Preview</Label>
            <p className="mb-2 text-xs text-muted-foreground">
              This updates in real-time as you modify the path
            </p>
            <textarea
              readOnly
              className={`h-32 w-full resize-none rounded border px-3 py-2 font-mono text-sm text-foreground focus:outline-none ${state.responseValue ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'bg-muted'}`}
              value={state.responseValue || 'No value extracted yet...'}
            />
          </div>

          <div className="pt-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
              <h5 className="mb-2 text-sm font-medium">Path Examples:</h5>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>
                  <code>choices[0].message.content</code> - OpenAI format
                </li>
                <li>
                  <code>content[0].text</code> - Anthropic format
                </li>
                <li>
                  <code>data.result</code> - Simple object
                </li>
                <li>
                  <code>items[0]</code> - First array item
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

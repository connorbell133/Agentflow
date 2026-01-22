import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import HelpText from "@/components/ui/help-text";
import { WizardState } from "../wizard.types";
import { getValueAtPath } from "../utils/pathExtractor";

interface DefineOutputStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  [key: string]: any;
}

export const DefineOutputStep: React.FC<DefineOutputStepProps> = ({ state, updateState }) => {
  const handleGetValue = () => {
    if (!state.response) {
      updateState({ responseError: "Please test the endpoint first to get a response." });
      return;
    }
    try {
      const parsed = JSON.parse(state.response);
      const value = getValueAtPath(parsed, state.response_path);
      if (value === undefined) {
        throw new Error("Path not found in the JSON response.");
      }
      updateState({
        responseValue: JSON.stringify(value, null, 2),
        responseError: ""
      });
    } catch (err: any) {
      updateState({
        responseValue: "",
        responseError: err.message || "Invalid path or JSON."
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <p className="text-muted-foreground">
          Specify how to extract the desired value from the API response.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-6">
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
            className="flex-1 border rounded w-full px-3 py-2 font-mono text-sm resize-none bg-muted text-foreground"
            value={state.response}
            placeholder="Run the test first to see the API response here..."
          />
        </div>

        {/* Right Panel - Path Extraction */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="response_path">Response Path *</Label>
            <HelpText className="mb-2">Enter a dot/bracket notation path to extract the response text. For example: <code>choices[0].message.content</code> for OpenAI format</HelpText>
            <div className="flex gap-2">
              <Input
                id="response_path"
                placeholder="e.g. data[0].content"
                value={state.response_path}
                onChange={(e) => {
                  const newPath = e.target.value;
                  updateState({ response_path: newPath });

                  // Auto-extract value as user types
                  if (state.response && newPath.trim()) {
                    try {
                      const parsed = JSON.parse(state.response);
                      const value = getValueAtPath(parsed, newPath);
                      if (value !== undefined) {
                        updateState({
                          responseValue: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
                          responseError: ""
                        });
                      }
                    } catch (err: any) {
                      updateState({
                        responseValue: "",
                        responseError: err.message || "Invalid path or JSON."
                      });
                    }
                  } else if (!newPath.trim()) {
                    updateState({
                      responseValue: "",
                      responseError: ""
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
              <p className="text-sm text-destructive mt-2">{state.responseError}</p>
            )}
          </div>

          <div>
            <Label>Extracted Value Preview</Label>
            <p className="text-xs text-muted-foreground mb-2">
              This updates in real-time as you modify the path
            </p>
            <textarea
              readOnly
              className={`border rounded w-full px-3 py-2 font-mono text-sm h-32 resize-none focus:outline-none text-foreground ${state.responseValue ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "bg-muted"}`}
              value={state.responseValue || "No value extracted yet..."}
            />
          </div>

          <div className="pt-4">
            <div className="p-4 border rounded-lg bg-blue-50/50 border-blue-200">
              <h5 className="font-medium text-sm mb-2">Path Examples:</h5>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><code>choices[0].message.content</code> - OpenAI format</li>
                <li><code>content[0].text</code> - Anthropic format</li>
                <li><code>data.result</code> - Simple object</li>
                <li><code>items[0]</code> - First array item</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
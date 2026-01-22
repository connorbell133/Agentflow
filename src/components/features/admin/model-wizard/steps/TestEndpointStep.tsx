import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlayIcon } from "lucide-react";
import { WizardState } from "../wizard.types";
import { ValidationResult } from "../hooks/useModelValidation";
import { EndpointTestingHook } from "../hooks/useEndpointTesting";
import { buildBodyFromTemplate } from "../utils/templateBuilder";
import { safeJsonParse } from "../utils/pathExtractor";

interface TestEndpointStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  validation: ValidationResult;
  endpointTesting: EndpointTestingHook;
  [key: string]: any;
}

export const TestEndpointStep: React.FC<TestEndpointStepProps> = ({
  state,
  updateState,
  validation,
  endpointTesting
}) => {
  const builtSamplePayload = useMemo(() => {
    try {
      const template = safeJsonParse(state.body_config) as any;
      return JSON.stringify(buildBodyFromTemplate(template, state.testVars, state.message_format_config), null, 2);
    } catch {
      return "{}";
    }
  }, [state.body_config, state.testVars, state.message_format_config]);

  const schemaValidated = validation.isValid;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <p className="text-muted-foreground">
          Execute a test call to validate your model configuration works correctly.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request Payload</CardTitle>
          <CardDescription>This is the payload that will be sent to your endpoint</CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            readOnly
            className="border rounded w-full px-3 py-2 font-mono text-sm h-48 resize-none bg-muted text-foreground"
            value={builtSamplePayload}
          />
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button
          onClick={() => endpointTesting.testEndpoint(state, updateState)}
          disabled={!schemaValidated || endpointTesting.isTesting}
          size="lg"
          className="min-w-32"
          data-testid="wizard-button-test-endpoint"
        >
          {endpointTesting.isTesting ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              Testing...
            </>
          ) : (
            <>
              <PlayIcon className="h-4 w-4 mr-2" />
              Run Test
            </>
          )}
        </Button>
      </div>

      {state.responseStatus && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">API Response</CardTitle>
              <Badge
                className={
                  state.responseStatus === "200"
                    ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                    : state.responseStatus === "Fetching..."
                      ? "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                      : state.responseStatus && /^[45]/.test(state.responseStatus)
                        ? "bg-red-100 text-red-800 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                        : ""
                }
                variant="outline"
              >
                {state.responseStatus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              readOnly
              className="border rounded w-full px-3 py-2 font-mono text-sm h-64 resize-none bg-muted text-foreground"
              value={state.response}
              placeholder="API response will appear here..."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
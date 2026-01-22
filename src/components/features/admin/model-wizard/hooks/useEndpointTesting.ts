import { useState, useCallback } from "react";
import { WizardState } from "../wizard.types";
import { safeParseJSON } from "../utils/pathExtractor";

export interface EndpointTestingHook {
  isTesting: boolean;
  testEndpoint: (wizardState: WizardState, updateState: (updates: Partial<WizardState>) => void) => void;
}

export const useEndpointTesting = (): EndpointTestingHook => {
  const [isTesting, setIsTesting] = useState(false);

  const testEndpoint = useCallback((
    wizardState: WizardState,
    updateState: (updates: Partial<WizardState>) => void
  ) => {
    setIsTesting(true);
    updateState({ responseStatus: "Fetching..." });

    const payload = {
      method: wizardState.method || "POST",
      endpoint: wizardState.endpoint,
      variables: wizardState.testVars,
      name: wizardState.nice_name,
      description: wizardState.description,
      schema: wizardState.schema,
      headers: wizardState.headersPairs.reduce((acc, { key, value }) => {
        if (key.trim() !== "") acc[key] = value;
        return acc;
      }, {} as Record<string, string>),
      body_config: safeParseJSON(wizardState.body_config),
    };

    fetch("/api/model", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        updateState({ responseStatus: res.status.toString() });

        // Try to parse response regardless of status
        const responseText = await res.text();
        let responseData;

        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch {
          // If not JSON, use the text directly
          responseData = { error: responseText || "Unknown error" };
        }

        if (res.ok && responseData) {
          updateState({ response: JSON.stringify(responseData, null, 2) });
        } else {
          // Format error response
          let errorMessage = "Model could not be tested";

          if (responseData) {
            if (responseData.error) {
              errorMessage = responseData.error;
              // Include additional details if available
              if (responseData.details) {
                errorMessage += "\n\nDetails:\n" + JSON.stringify(responseData.details, null, 2);
              }
            } else {
              // If there's no specific error field, show the whole response
              errorMessage = JSON.stringify(responseData, null, 2);
            }
          }

          updateState({ response: errorMessage });
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        updateState({
          response: `Network error: ${error.message || "Failed to connect to the server"}`,
          responseStatus: "Network Error"
        });
      })
      .finally(() => setIsTesting(false));
  }, []);

  return {
    isTesting,
    testEndpoint,
  };
};
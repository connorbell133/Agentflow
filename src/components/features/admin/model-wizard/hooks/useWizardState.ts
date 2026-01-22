import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { Model } from "@/lib/supabase/types";
import { useAdminModels } from "@/hooks/chat/use-models";
import { optimizedJsonStringify } from "@/utils/helpers/json-optimization";
import { MESSAGE_FORMAT_PRESETS } from "@/types/message-format";
import { WizardState, WizardStepDefinition, WizardHookReturn } from "../wizard.types";
import { safeJsonParse } from "../utils/pathExtractor";

export const useWizardState = (
  model: Model,
  org_id: string,
  isCreating = false,
  onModelAdded?: (model: Model) => void,
  onClose?: () => void
): WizardHookReturn => {
  const { handleUpdateModel, handleAddModel } = useAdminModels(org_id);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [wizardState, setWizardState] = useState<WizardState>({
    // Basic Info
    nice_name: model.nice_name || "",
    description: model.description || "",
    model_id: model.model_id || "",
    schema: model.schema || "",
    endpoint: (model as any)?.endpoint || "",
    method: (model as any)?.method || "POST",
    headersPairs: Object.entries((model.headers as Record<string, unknown>) || {}).map(([k, v]) => ({
      id: uuidv4(),
      key: k,
      value: String(v)
    })),
    suggestion_prompts: (model.suggestion_prompts || []).map((prompt: string) => ({
      id: uuidv4(),
      prompt
    })),

    // AI SDK 6 Routing
    endpoint_type: (model as any)?.endpoint_type || "webhook",
    stream_config: (model as any)?.stream_config || null,

    // Request Format
    message_format_config: typeof model.message_format_config === "string"
      ? (safeJsonParse(model.message_format_config) as any) || MESSAGE_FORMAT_PRESETS.openai
      : (model.message_format_config as any) || MESSAGE_FORMAT_PRESETS.openai,
    body_config: optimizedJsonStringify(
      (model.body_config as any) || {
        messages: "${messages}",
        conversation_id: "${conversation_id}",
        time: "${time}"
      },
      2,
      `body_config_${model.id}`
    ),

    // Test Variables
    testVars: {
      content: "Hello world",
      conversation_id: "preview",
      time: new Date().toISOString(),
      messages: optimizedJsonStringify([{ role: "user", content: "Hello world" }], 2, "test_messages"),
    },

    // Test Results
    response: "",
    responseStatus: "",

    // Output Definition
    response_path: model.response_path || "",
    responseValue: "",
    responseError: "",
  });

  // Dynamic steps based on endpoint type
  // AI SDK Stream doesn't need output step (pass-through)
  // SSE uses contentPath from stream_config instead of response_path
  const getSteps = (): WizardStepDefinition[] => {
    const baseSteps: WizardStepDefinition[] = [
      { id: "basic", title: "Basic Info", description: "Model details" },
      { id: "field-mapping", title: "Field Mapping", description: "Configure message format" },
      { id: "request-template", title: "Request Template", description: "Template & validation" },
      { id: "test", title: "Test Endpoint", description: "Validate API call" },
    ];

    // Only add output step for webhook (needs response_path)
    if (wizardState.endpoint_type === "webhook") {
      baseSteps.push({ id: "output", title: "Define Output", description: "Extract response data" });
    }

    return baseSteps;
  };

  const steps = getSteps();

  const updateState = useCallback((updates: Partial<WizardState>) => {
    setWizardState(prev => ({ ...prev, ...updates }));
  }, []);

  const next = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, steps.length]);

  const back = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const canProceed = useCallback((): boolean => {
    const currentStepDef = steps[currentStep];
    if (!currentStepDef) return false;

    switch (currentStepDef.id) {
      case "basic": // Basic Info
        // Validate basic info and suggestion prompts
        const hasValidBasicInfo = Boolean(wizardState.nice_name && wizardState.endpoint);
        const hasValidSuggestions = wizardState.suggestion_prompts.length === 0 ||
          wizardState.suggestion_prompts.every(sp => sp.prompt.trim().length > 0);
        // For SSE, also validate stream_config
        if (wizardState.endpoint_type === "sse") {
          const sseConfig = wizardState.stream_config as { contentPath?: string } | null;
          const hasValidSSEConfig = Boolean(sseConfig?.contentPath);
          return hasValidBasicInfo && hasValidSuggestions && hasValidSSEConfig;
        }
        return hasValidBasicInfo && hasValidSuggestions;
      case "field-mapping": // Request Format
        return true; // Field mapping is optional
      case "request-template": // Request Template
        return true; // Validation handled by hook
      case "test": // Test Endpoint
        return Boolean(wizardState.responseStatus && wizardState.responseStatus.startsWith('2'));
      case "output": // Define Output (webhook only)
        return wizardState.responseValue !== "";
      default:
        return false;
    }
  }, [currentStep, steps, wizardState]);

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedModel: Model = {
      id: isCreating ? uuidv4() : model.id,
      model_id: wizardState.model_id || wizardState.nice_name.replace(/\s+/g, "-").toLowerCase(),
      schema: wizardState.schema,
      description: wizardState.description,
      nice_name: wizardState.nice_name,
      org_id: org_id,
      endpoint: wizardState.endpoint,
      method: wizardState.method,
      response_path: wizardState.response_path,
      created_at: new Date().toISOString(),
      headers: wizardState.headersPairs.reduce((acc, { key, value }) => {
        if (key.trim() !== "") acc[key] = value;
        return acc;
      }, {} as Record<string, string>),
      body_config: safeJsonParse(wizardState.body_config) as any,
      message_format_config: wizardState.message_format_config as any,
      suggestion_prompts: wizardState.suggestion_prompts.map(sp => sp.prompt).filter(p => p.trim() !== ''),
      // AI SDK 6 Routing
      endpoint_type: wizardState.endpoint_type,
      stream_config: wizardState.stream_config as any,
    };

    setIsSubmitting(true);
    try {
      if (isCreating) {
        console.log("Model added:", updatedModel);
        if (onModelAdded) {
          await onModelAdded(updatedModel);
        } else {
          await handleAddModel(updatedModel);
        }
      } else {
        await handleUpdateModel(updatedModel);
        console.log("Model updated:", updatedModel);
      }

      // Close the wizard after successful save
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error saving model:", error);
      alert("Failed to save model. Please try again.");
      return;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    wizardState,
    isCreating,
    model.id,
    org_id,
    onModelAdded,
    handleAddModel,
    handleUpdateModel,
    onClose
  ]);

  return {
    state: wizardState,
    steps,
    currentStep,
    isSubmitting,
    next,
    back,
    submit,
    updateState,
    canProceed,
  };
};
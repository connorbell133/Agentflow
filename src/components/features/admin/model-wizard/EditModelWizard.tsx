import React from "react";
import { Model } from "@/lib/supabase/types";
import { useWizardState } from "./hooks/useWizardState";
import { useModelValidation } from "./hooks/useModelValidation";
import { useEndpointTesting } from "./hooks/useEndpointTesting";
import { WizardContainer } from "./components/WizardContainer";
import { WizardStepper } from "./components/WizardStepper";
import { WizardStepContent } from "./components/WizardStepContent";

interface EditModelWizardProps {
  setActiveModel: (model: Model | null) => void;
  org_id: string;
  model: Model;
  isCreating?: boolean;
  onModelAdded?: (model: Model) => void;
}

const EditModelWizard: React.FC<EditModelWizardProps> = ({
  setActiveModel,
  org_id,
  model,
  isCreating = false,
  onModelAdded,
}) => {
  const handleClose = () => {
    setActiveModel(null);
  };

  const wizard = useWizardState(model, org_id, isCreating, onModelAdded, handleClose);
  const validation = useModelValidation(wizard.state);
  const endpointTesting = useEndpointTesting();

  const handleExit = () => {
    const confirmClose = window.confirm("Discard your changes?");
    if (!confirmClose) return;
    setActiveModel(null);
  };

  const canProceed = (): boolean => {
    const currentStepDef = wizard.steps[wizard.currentStep];
    if (!currentStepDef) return false;

    switch (currentStepDef.id) {
      case "basic": // Basic Info
        const hasBasicInfo = Boolean(wizard.state.nice_name && wizard.state.endpoint);
        // For SSE, also validate stream_config
        if (wizard.state.endpoint_type === "sse") {
          const sseConfig = wizard.state.stream_config as { contentPath?: string } | null;
          return hasBasicInfo && Boolean(sseConfig?.contentPath);
        }
        return hasBasicInfo;
      case "field-mapping": // Field Mapping
        return true; // Field mapping is optional
      case "request-template": // Request Template
        return validation.isValid;
      case "test": // Test Endpoint
        return Boolean(wizard.state.responseStatus && wizard.state.responseStatus.startsWith('2'));
      case "output": // Define Output (webhook only)
        return wizard.state.responseValue !== "";
      default:
        return false;
    }
  };

  return (
    <WizardContainer onExit={handleExit}>
      <form onSubmit={wizard.submit} className="flex h-full w-full">
        <WizardStepper
          steps={wizard.steps}
          currentStep={wizard.currentStep}
          canProceed={canProceed()}
          isSubmitting={wizard.isSubmitting}
          isCreating={isCreating}
          onNext={wizard.next}
          onBack={wizard.back}
          onExit={handleExit}
        />

        <WizardStepContent
          steps={wizard.steps}
          currentStep={wizard.currentStep}
          state={wizard.state}
          updateState={wizard.updateState}
          validation={validation}
          endpointTesting={endpointTesting}
        />
      </form>
    </WizardContainer>
  );
};

export default EditModelWizard;
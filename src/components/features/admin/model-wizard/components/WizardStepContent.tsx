import React from "react";
import { WizardStepDefinition } from "../wizard.types";
import { BasicInfoStep } from "../steps/BasicInfoStep";
import { FieldMappingStep } from "../steps/FieldMappingStep";
import { RequestTemplateStep } from "../steps/RequestTemplateStep";
import { TestEndpointStep } from "../steps/TestEndpointStep";
import { DefineOutputStep } from "../steps/DefineOutputStep";

interface WizardStepContentProps {
  steps: WizardStepDefinition[];
  currentStep: number;
  [key: string]: any; // Allow passing through additional props
}

export const WizardStepContent: React.FC<WizardStepContentProps> = ({
  steps,
  currentStep,
  ...props
}) => {
  const renderStepContent = () => {
    // Pass through all props to step components with type casting
    switch (currentStep) {
      case 0:
        return <BasicInfoStep {...(props as any)} />;
      case 1:
        return <FieldMappingStep {...(props as any)} />;
      case 2:
        return <RequestTemplateStep {...(props as any)} />;
      case 3:
        return <TestEndpointStep {...(props as any)} />;
      case 4:
        return <DefineOutputStep {...(props as any)} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Content Header */}
      <div className="border-b px-8 py-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold" data-testid={`wizard-step-title-${steps[currentStep]?.id}`}>{steps[currentStep]?.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{steps[currentStep]?.description}</p>
          </div>
          <div className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {renderStepContent()}
      </div>
    </div>
  );
};
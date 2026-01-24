import React from 'react';
import { WizardStepDefinition } from '@/types/ui/wizard.types';
// Wizard steps
import TemplateSelectionStep from '../steps/TemplateSelectionStep';
import { ConnectionSetupStep } from '../steps/ConnectionSetupStep';
import { RequestConfigurationStep } from '../steps/RequestConfigurationStep';
import { ResponseHandlingStep } from '../steps/ResponseHandlingStep';
import { TestEndpointStepEnhanced } from '../steps/TestEndpointStepEnhanced';

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
    // Check current step ID to handle dynamic step flow
    const currentStepId = steps[currentStep]?.id;

    switch (currentStepId) {
      case 'template':
        return <TemplateSelectionStep {...(props as any)} />;
      case 'connection':
        return <ConnectionSetupStep {...(props as any)} />;
      case 'request':
        return <RequestConfigurationStep {...(props as any)} />;
      case 'response':
        return <ResponseHandlingStep {...(props as any)} />;
      case 'test':
        return <TestEndpointStepEnhanced {...(props as any)} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Content Header */}
      <div className="flex-shrink-0 border-b px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="text-xl font-semibold"
              data-testid={`wizard-step-title-${steps[currentStep]?.id}`}
            >
              {steps[currentStep]?.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{steps[currentStep]?.description}</p>
          </div>
          <div className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">{renderStepContent()}</div>
    </div>
  );
};

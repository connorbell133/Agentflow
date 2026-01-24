import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import Stepper from '@/components/ui/stepper';
import { WizardStepDefinition } from '@/types/ui/wizard.types';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PanelLeftClose,
  PanelLeft,
  CheckIcon,
} from 'lucide-react';

interface WizardStepperProps {
  steps: WizardStepDefinition[];
  currentStep: number;
  canProceed: boolean;
  isSubmitting: boolean;
  isCreating: boolean;
  onNext: () => void;
  onBack: () => void;
  onExit: () => void;
}

export const WizardStepper: React.FC<WizardStepperProps> = ({
  steps,
  currentStep,
  canProceed,
  isSubmitting,
  isCreating,
  onNext,
  onBack,
  onExit,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`${
        isCollapsed ? 'w-20' : 'w-80'
      } bg-muted/30 relative flex flex-shrink-0 flex-col border-r transition-all duration-300 ease-in-out`}
    >
      <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-4 py-6' : 'p-6'}`}>
        {/* Header section - only visible when expanded */}
        <div className="flex flex-row items-start justify-start">
          {!isCollapsed && (
            <div className="mb-6 pr-6">
              <h2 className="text-lg font-semibold">{isCreating ? 'Add Model' : 'Edit Model'}</h2>
              <p className="whitespace-nowrap text-sm text-muted-foreground">
                Configure your model step by step
              </p>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`z-10 transition-all duration-300`}
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Vertical Stepper */}
        <div className="relative mt-12">
          <Stepper
            steps={steps}
            currentStep={currentStep}
            orientation="vertical"
            className="w-full"
            isCollapsed={isCollapsed}
          />
        </div>

        {/* Navigation Buttons */}
        <div className={`mt-8 space-y-3`}>
          {currentStep > 0 && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onBack();
              }}
              data-testid="wizard-button-back"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              {isCollapsed ? '' : 'Back'}
            </Button>
          )}

          {currentStep < steps.length - 1 ? (
            <Button
              type="button"
              className="w-full"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onNext();
              }}
              disabled={!canProceed}
              data-testid="wizard-button-next"
            >
              {isCollapsed ? '' : 'Next Step'}
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              className="w-full"
              disabled={!canProceed || isSubmitting}
              data-testid="wizard-button-save"
            >
              {isSubmitting ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {isCreating ? 'Adding...' : 'Updating...'}
                </>
              ) : isCreating ? (
                'Add Model'
              ) : (
                'Update Model'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

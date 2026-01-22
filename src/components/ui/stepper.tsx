import React from "react";
import { cn } from "@/utils/cn";
import { CheckIcon } from "lucide-react";

export interface Step {
  id: string;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  allowStepClick?: boolean;
  className?: string;
  orientation?: "horizontal" | "vertical";
  isCollapsed?: boolean;
}

const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  allowStepClick = false,
  className,
  orientation = "horizontal",
  isCollapsed
}) => {
  if (orientation === "vertical") {
    return (
      <nav className={cn("w-full", className)} aria-label="Progress">
        <ol role="list" className="space-y-6">
          {steps.map((step, stepIndex) => {
            const isCurrent = stepIndex === currentStep;
            const isCompleted = stepIndex < currentStep;
            const isClickable = allowStepClick && onStepClick;

            return (
              <li key={step.id} className="relative">
                {stepIndex !== steps.length - 1 && (
                  <div className="absolute left-5 top-8 -ml-px h-8 w-0.5 transition-colors duration-300">
                    <div className={cn("h-full w-full", isCompleted ? "bg-primary" : "bg-gray-200")} />
                  </div>
                )}

                <div
                  className={cn(
                    "flex items-start pl-1",
                    isClickable && "cursor-pointer"
                  )}
                  onClick={isClickable ? () => onStepClick(stepIndex) : undefined}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-all duration-300 flex-shrink-0",
                      isCompleted
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : isCurrent
                          ? "border-primary bg-background text-primary ring-2 ring-primary/20"
                          : "border-gray-300 bg-background text-gray-500 hover:border-gray-400"
                    )}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {isCompleted ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      <span>{stepIndex + 1}</span>
                    )}
                  </div>

                  <div className={cn(
                    "ml-4 min-w-0 flex-1 overflow-hidden transition-all duration-300",
                    isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                  )}>
                    <span
                      className={cn(
                        "text-sm font-medium block whitespace-nowrap text-ellipsis overflow-hidden",
                        isCurrent ? "text-foreground" : isCompleted ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                    {step.description && (
                      <span className={cn("block text-xs mt-1 whitespace-nowrap text-ellipsis overflow-hidden",
                        isCurrent ? "text-muted-foreground" : "text-muted-foreground"
                      )}>
                        {step.description}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  // Horizontal layout (existing)
  return (
    <nav className={cn("w-full", className)} aria-label="Progress">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIndex) => {
          const isCurrent = stepIndex === currentStep;
          const isCompleted = stepIndex < currentStep;
          const isClickable = allowStepClick && onStepClick;

          return (
            <li key={step.id} className={cn("relative", stepIndex !== steps.length - 1 && "pr-8 sm:pr-20")}>
              {stepIndex !== steps.length - 1 && (
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className={cn("h-0.5 w-full transition-colors duration-300", isCompleted ? "bg-primary" : "bg-gray-200")} />
                </div>
              )}

              <div
                className={cn(
                  "relative flex items-center justify-center",
                  isClickable && "cursor-pointer"
                )}
                onClick={isClickable ? () => onStepClick(stepIndex) : undefined}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-all duration-300",
                    isCompleted
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : isCurrent
                        ? "border-primary bg-background text-primary ring-2 ring-primary/20"
                        : "border-gray-300 bg-background text-gray-500 hover:border-gray-400"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <span>{stepIndex + 1}</span>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="ml-3 min-w-0">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                    {step.description && (
                      <span className="block text-xs text-muted-foreground" title={step.description} >
                        {step.description}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Stepper;
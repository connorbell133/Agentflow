import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface WizardContainerProps {
  children: React.ReactNode;
  onExit: () => void;
}

export const WizardContainer: React.FC<WizardContainerProps> = ({ children, onExit }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" data-testid="wizard-container">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onExit} />
      <Card className="relative w-[90vw] h-[90vh] overflow-hidden flex">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="absolute top-4 right-4 z-10"
        >
          <X className="h-4 w-4" />
        </Button>
        {children}
      </Card>
    </div>
  );
};
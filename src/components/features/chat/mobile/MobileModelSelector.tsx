import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Check, Zap, Brain, Sparkles } from "lucide-react";
import { cn } from "@/utils/cn";
import { Model } from "@/lib/supabase/types";

interface MobileModelSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: Model[];
  selectedModel: Model | null;
  onSelectModel: (model: Model) => void;
}

const ModelCard = ({
  model,
  isSelected,
  onClick
}: {
  model: Model;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const getModelIcon = (modelName: string) => {
    if (modelName.toLowerCase().includes('fast')) return Zap;
    if (modelName.toLowerCase().includes('smart')) return Brain;
    return Sparkles;
  };

  const Icon = getModelIcon(model.nice_name || model.model_id || '');

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-lg border transition-all",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted/50"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            isSelected ? "bg-primary/10" : "bg-muted"
          )}>
            <Icon className={cn(
              "h-5 w-5",
              isSelected ? "text-primary" : "text-muted-foreground"
            )} />
          </div>

          <div className="text-left">
            <h3 className="font-medium text-[15px]">
              {model.nice_name || model.model_id}
            </h3>
            <p className="text-xs text-muted-foreground">
              {model.model_id?.split('-')[0] || 'AI'}
            </p>
          </div>
        </div>

        {isSelected && (
          <Check className="h-5 w-5 text-primary" />
        )}
      </div>

      {model.description && (
        <p className="text-sm text-muted-foreground text-left mb-3">
          {model.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {/* We can add additional model info here if needed */}
      </div>
    </button>
  );
};

const MobileModelSelector: React.FC<MobileModelSelectorProps> = ({
  open,
  onOpenChange,
  models,
  selectedModel,
  onSelectModel
}) => {
  // Group models by provider (extract from model_id)
  const groupedModels = models.reduce((acc, model) => {
    const provider = model.model_id?.split('-')[0] || "Other";
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {} as Record<string, Model[]>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] p-0">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle className="text-xl font-semibold">Select Model</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {Object.entries(groupedModels).map(([provider, providerModels]) => (
            <div key={provider} className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 capitalize">
                {provider}
              </h4>
              <div className="space-y-3">
                {providerModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    isSelected={selectedModel?.id === model.id}
                    onClick={() => onSelectModel(model)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(0)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}k`;
  }
  return tokens.toString();
}

export default MobileModelSelector;
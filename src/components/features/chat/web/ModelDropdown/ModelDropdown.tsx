import React from "react";
import { Model } from "@/lib/supabase/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLogger } from "@/lib/infrastructure/logger";
import { cn } from "@/utils/cn";

const logger = createLogger("ModelDropdown");

const ModelDropdown: React.FC<{
  models: Model[];
  selectedModel: Model | null;
  setSelectedModel: (model: Model) => void;
  newConversation: () => void;
  disabled?: boolean;
}> = ({ models, selectedModel, setSelectedModel, newConversation, disabled = false }) => {
  const handleModelChange = (model_id: string) => {
    const model = models.find(m => m.id === model_id);
    if (model) {
      setSelectedModel(model);
      newConversation();
    }
  };

  return (
    <div className="flex items-center">


      <Select
        value={selectedModel?.id || ""}
        onValueChange={handleModelChange}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            "w-fit min-w-[160px] bg-transparent border-none text-foreground font-medium focus:ring-2 focus:ring-primary",
            disabled && "opacity-60 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          <SelectValue placeholder="Select Model" />
        </SelectTrigger>
        <SelectContent className="bg-background/90 backdrop-blur-md border border-border">
          {models.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground whitespace-nowrap">
              No Models available
            </div>
          ) : (
            models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.nice_name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModelDropdown;

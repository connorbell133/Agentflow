import React, { useMemo } from "react";
import { Label } from "@/components/ui/label";
import MessageFormatMapper from "@/components/features/admin/management/AddModel/MessageFormatMapper";
import { WizardState } from "../wizard.types";
import { safeJsonParse } from "../utils/pathExtractor";

interface FieldMappingStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  [key: string]: any;
}

export const FieldMappingStep: React.FC<FieldMappingStepProps> = ({
  state,
  updateState
}) => {
  // Generate the before and after preview based on the mapping configuration
  const { beforeMessages, afterMessages } = useMemo(() => {
    const sampleMessages = [
      { role: "user", content: "Hello, how can you help me?" },
      { role: "assistant", content: "I'm here to assist you!" }
    ];

    // Before mapping (original format)
    const before = JSON.stringify(sampleMessages, null, 2);

    // After mapping (transformed format)
    let after = "{}";
    try {
      const mapped = sampleMessages.map(msg => {
        const result: any = {};

        // Apply mapping based on config
        const mapping = state.message_format_config.mapping || {};

        // Map role
        if (mapping.role) {
          const targetPath = mapping.role.target || 'role';
          result[targetPath] = msg.role;
        }

        // Map content
        if (mapping.content) {
          const targetPath = mapping.content.target || 'content';
          result[targetPath] = msg.content;
        }

        // Add any custom fields
        if (state.message_format_config.customFields) {
          state.message_format_config.customFields.forEach((field) => {
            if (field.name && field.value !== undefined) {
              result[field.name] = field.value;
            }
          });
        }

        return result;
      });

      after = JSON.stringify(mapped, null, 2);
    } catch (error) {
      console.error("Error generating preview:", error);
    }

    return { beforeMessages: before, afterMessages: after };
  }, [state.message_format_config]);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <p className="text-muted-foreground">
          Configure how messages are transformed when sent to the AI model.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-6">
        {/* Left Panel - Field Mapping Configuration */}
        <div className="space-y-4">
          <div>
            <h4 className="text-base font-medium mb-4">Field Mappings</h4>
            <MessageFormatMapper
              config={state.message_format_config}
              onChange={(config) => updateState({ message_format_config: config })}
            />
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="space-y-4">
          <h4 className="text-base font-medium">Message Transformation Preview</h4>

          <div className="space-y-4">
            {/* Before mapping */}
            <div className="space-y-2">
              <Label>Before Mapping</Label>
              <pre className="border rounded w-full px-3 py-2 font-mono text-sm bg-muted text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                {beforeMessages}
              </pre>
            </div>

            {/* After mapping */}
            <div className="space-y-2">
              <Label>After Mapping</Label>
              <pre className="border rounded w-full px-3 py-2 font-mono text-sm bg-card text-card-foreground overflow-x-auto whitespace-pre-wrap">
                {afterMessages}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
import React from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import HelpText from "@/components/ui/help-text";
import { WizardState } from "../wizard.types";
import type { EndpointType, SSEStreamConfig } from "@/lib/ai/router/types";

interface BasicInfoStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  [key: string]: any;
}

const ENDPOINT_TYPE_OPTIONS: { value: EndpointType; label: string; description: string }[] = [
  {
    value: "webhook",
    label: "Webhook (JSON)",
    description: "Standard JSON response - platform converts to streaming",
  },
  {
    value: "ai-sdk-stream",
    label: "AI SDK Stream",
    description: "Pass-through for AI SDK agents (UIMessageStream format)",
  },
  {
    value: "sse",
    label: "SSE (OpenAI-style)",
    description: "Server-Sent Events like OpenAI API - platform converts to streaming",
  },
];

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ state, updateState }) => {
  const handleEndpointTypeChange = (newType: EndpointType) => {
    // Reset stream_config when switching types
    let newStreamConfig = null;
    if (newType === "sse") {
      // Set default SSE config
      newStreamConfig = {
        contentPath: "choices[0].delta.content",
        doneSignal: "[DONE]",
        errorPath: "error.message",
      };
    }
    updateState({ endpoint_type: newType, stream_config: newStreamConfig });
  };

  const updateSSEConfig = (updates: Partial<SSEStreamConfig>) => {
    const currentConfig = (state.stream_config as SSEStreamConfig) || {};
    updateState({ stream_config: { ...currentConfig, ...updates } });
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <p className="text-muted-foreground">
          Provide the essential details for your model configuration.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            required
            placeholder="e.g. Sentiment Analyzer"
            value={state.nice_name}
            onChange={(e) => updateState({ nice_name: e.target.value })}
            data-testid="wizard-input-name"
          />
          <HelpText>A descriptive name that will be displayed in the model selection interface</HelpText>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model_id">Model ID (optional)</Label>
          <Input
            id="model_id"
            placeholder={state.nice_name.replace(/\s+/g, "-").toLowerCase()}
            value={state.model_id}
            onChange={(e) => updateState({ model_id: e.target.value })}
            data-testid="wizard-input-model-id"
          />
          <HelpText>Unique identifier for API calls. Will be auto-generated from the name if left empty</HelpText>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endpoint">Endpoint *</Label>
          <Input
            id="endpoint"
            type="url"
            required
            placeholder="https://api.example.com/analyze"
            value={state.endpoint}
            onChange={(e) => updateState({ endpoint: e.target.value })}
            data-testid="wizard-input-endpoint"
          />
          <HelpText>The complete URL where requests will be sent. Include protocol (https://)</HelpText>
        </div>

        <div className="space-y-3">
          <Label>Endpoint Type *</Label>
          <div className="grid gap-2">
            {ENDPOINT_TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  state.endpoint_type === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <input
                  type="radio"
                  name="endpoint_type"
                  value={option.value}
                  checked={state.endpoint_type === option.value}
                  onChange={() => handleEndpointTypeChange(option.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
          <HelpText>
            Choose how the endpoint responds. Webhook for JSON APIs, AI SDK Stream for AI SDK agents,
            SSE for OpenAI-compatible streaming APIs.
          </HelpText>
        </div>

        {/* SSE Configuration - only show when SSE is selected */}
        {state.endpoint_type === "sse" && (
          <div className="space-y-4 p-4 rounded-lg border border-dashed border-border bg-muted/30">
            <h4 className="font-medium text-sm">SSE Stream Configuration</h4>

            <div className="space-y-2">
              <Label htmlFor="contentPath">Content Path</Label>
              <Input
                id="contentPath"
                placeholder="choices[0].delta.content"
                value={(state.stream_config as SSEStreamConfig)?.contentPath || ""}
                onChange={(e) => updateSSEConfig({ contentPath: e.target.value })}
              />
              <HelpText>JSON path to extract content delta from each SSE event</HelpText>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doneSignal">Done Signal</Label>
              <Input
                id="doneSignal"
                placeholder="[DONE]"
                value={(state.stream_config as SSEStreamConfig)?.doneSignal || ""}
                onChange={(e) => updateSSEConfig({ doneSignal: e.target.value })}
              />
              <HelpText>Data value that signals stream completion</HelpText>
            </div>

            <div className="space-y-2">
              <Label htmlFor="errorPath">Error Path (optional)</Label>
              <Input
                id="errorPath"
                placeholder="error.message"
                value={(state.stream_config as SSEStreamConfig)?.errorPath || ""}
                onChange={(e) => updateSSEConfig({ errorPath: e.target.value })}
              />
              <HelpText>JSON path to extract error messages from events</HelpText>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="schema">Schema (optional)</Label>
          <Input
            id="schema"
            placeholder="Model schema identifier"
            value={state.schema}
            onChange={(e) => updateState({ schema: e.target.value })}
          />
          <HelpText>Optional schema version identifier. Useful for tracking API versions</HelpText>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={state.description}
            onChange={(e) => updateState({ description: e.target.value })}
            placeholder="Short description of what this model does..."
            data-testid="wizard-input-description"
          />
          <HelpText>Brief description explaining what this model does and when to use it</HelpText>
        </div>
      </div>

      <div>
        <h4 className="text-base font-medium mb-2">Request Headers</h4>
        <HelpText className="mb-4">Add HTTP headers required for authentication (like Authorization, API-Key) or content configuration. Sensitive values are automatically masked.</HelpText>

        <div className="space-y-3">
          {state.headersPairs.map((pair, idx) => {
            const isSecret = /authorization|api-key|x-api-key|secret/i.test(pair.key);
            return (
              <div key={pair.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <Input
                    placeholder="Key (e.g. Authorization)"
                    value={pair.key}
                    onChange={(e) => {
                      const next = [...state.headersPairs];
                      next[idx] = { ...pair, key: e.target.value };
                      updateState({ headersPairs: next });
                    }}
                    data-testid={`wizard-input-header-key-${idx}`}
                  />
                </div>
                <div className="col-span-6">
                  <Input
                    placeholder="Value"
                    type={isSecret ? "password" : "text"}
                    value={pair.value}
                    onChange={(e) => {
                      const next = [...state.headersPairs];
                      next[idx] = { ...pair, value: e.target.value };
                      updateState({ headersPairs: next });
                    }}
                    data-testid={`wizard-input-header-value-${idx}`}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      updateState({
                        headersPairs: state.headersPairs.filter((p) => p.id !== pair.id)
                      });
                    }}
                  >
                    ×
                  </Button>
                </div>
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateState({
              headersPairs: [...state.headersPairs, { id: uuidv4(), key: "", value: "" }]
            })}
            data-testid="wizard-button-add-header"
          >
            Add Header
          </Button>
        </div>
      </div>

      <div className="pt-4">
        <h4 className="text-base font-medium mb-2">Suggestion Prompts</h4>
        <HelpText className="mb-4">Add up to 3 suggested prompts that will appear in the chat interface for this model. These help users understand what they can ask.</HelpText>

        <div className="space-y-3">
          {state.suggestion_prompts.map((prompt, idx) => (
            <div key={prompt.id} className="flex gap-2 items-center">
              <div className="flex-1">
                <Input
                  placeholder={`Example: "${idx === 0 ? 'Analyze the sentiment of this text' : idx === 1 ? 'Summarize this document in 3 bullet points' : 'What are the key insights from this data?'}"`}
                  value={prompt.prompt}
                  onChange={(e) => {
                    const next = [...state.suggestion_prompts];
                    next[idx] = { ...prompt, prompt: e.target.value };
                    updateState({ suggestion_prompts: next });
                  }}
                  data-testid={`wizard-input-suggestion-prompt-${idx}`}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  updateState({
                    suggestion_prompts: state.suggestion_prompts.filter((p) => p.id !== prompt.id)
                  });
                }}
              >
                ×
              </Button>
            </div>
          ))}
          {state.suggestion_prompts.length < 3 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateState({
                suggestion_prompts: [...state.suggestion_prompts, { id: uuidv4(), prompt: "" }]
              })}
              data-testid="wizard-button-add-suggestion-prompt"
            >
              Add Suggestion Prompt
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
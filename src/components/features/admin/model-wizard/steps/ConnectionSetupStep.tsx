/**
 * Step 1: Connection Setup
 *
 * Clean, focused step for establishing the connection.
 * No configuration complexity - just "where and how to connect"
 */

import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import HelpText from '@/components/ui/help-text';
import { WizardState } from '@/types/ui/wizard.types';
import type { EndpointType } from '@/lib/ai/router/types';
import { StateAwareInput, StateAwareSelect } from '../components/StateAwareInput';
import { useFieldStateOptional } from '../context/FieldStateContext';

interface ConnectionSetupStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  [key: string]: any;
}

const ENDPOINT_TYPE_OPTIONS: { value: EndpointType; label: string; description: string }[] = [
  {
    value: 'webhook',
    label: 'Webhook (JSON)',
    description: 'Traditional REST API with JSON response',
  },
  {
    value: 'sse',
    label: 'SSE Stream',
    description: 'Server-Sent Events streaming (OpenAI, Anthropic, etc.)',
  },
  {
    value: 'ai-sdk-stream',
    label: 'AI SDK Stream',
    description: 'Native AI SDK UIMessageStream protocol',
  },
];

export const ConnectionSetupStep: React.FC<ConnectionSetupStepProps> = ({ state, updateState }) => {
  const fieldState = useFieldStateOptional();

  const handleEndpointTypeChange = (newType: EndpointType) => {
    updateState({ endpoint_type: newType });
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <p className="text-muted-foreground">
          Let&apos;s start by connecting to your AI endpoint. We&apos;ll configure how to format
          requests and parse responses in the next steps.
        </p>
      </div>

      {/* Model Identity */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <h3 className="text-base font-medium">Model Identity</h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name *</Label>
            <StateAwareInput
              id="name"
              fieldPath="nice_name"
              fieldLabel="Display Name"
              required
              placeholder="e.g. GPT-4 Turbo"
              value={state.nice_name}
              onValueChange={value => updateState({ nice_name: value })}
              onChange={e => updateState({ nice_name: e.target.value })}
              data-testid="wizard-input-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model_id">Model ID (optional)</Label>
            <StateAwareInput
              id="model_id"
              fieldPath="model_id"
              fieldLabel="Model ID"
              placeholder={state.nice_name.replace(/\s+/g, '-').toLowerCase() || 'gpt-4-turbo'}
              value={state.model_id}
              onValueChange={value => updateState({ model_id: value })}
              onChange={e => updateState({ model_id: e.target.value })}
              data-testid="wizard-input-model-id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <StateAwareInput
              id="description"
              fieldPath="description"
              fieldLabel="Description"
              value={state.description}
              onValueChange={value => updateState({ description: value })}
              onChange={e => updateState({ description: e.target.value })}
              placeholder="Brief description of capabilities..."
              data-testid="wizard-input-description"
            />
          </div>
        </div>
      </div>

      {/* Connection Details */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <h3 className="text-base font-medium">Connection Details</h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="endpoint">Endpoint URL *</Label>
            <StateAwareInput
              id="endpoint"
              fieldPath="endpoint"
              fieldLabel="Endpoint URL"
              type="url"
              required
              placeholder="https://api.openai.com/v1/chat/completions"
              value={state.endpoint}
              onValueChange={value => updateState({ endpoint: value })}
              onChange={e => updateState({ endpoint: e.target.value })}
              data-testid="wizard-input-endpoint"
            />
          </div>

          <div className="space-y-3">
            <Label>Response Type *</Label>
            <div className="grid gap-2">
              {ENDPOINT_TYPE_OPTIONS.map(option => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    state.endpoint_type === option.value
                      ? 'bg-primary/5 border-primary'
                      : 'hover:border-muted-foreground/50 border-border'
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
              How does the endpoint send responses? You&apos;ll configure parsing in Step 3.
            </HelpText>
          </div>
        </div>
      </div>

      {/* Authentication */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <h3 className="text-base font-medium">Authentication & Headers</h3>
        <HelpText className="mb-4">
          Add HTTP headers for authentication (API keys, tokens, etc). Sensitive values are
          automatically masked.
        </HelpText>

        <div className="space-y-3">
          {state.headersPairs.map((pair, idx) => {
            const isSecret = /authorization|api-key|x-api-key|secret|token/i.test(pair.key);
            // Use field path for state-aware inputs on important headers
            const fieldPath = pair.key ? `headersPairs.${pair.key}` : undefined;

            return (
              <div key={pair.id} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-5">
                  <Input
                    placeholder="Header name"
                    value={pair.key}
                    onChange={e => {
                      const next = [...state.headersPairs];
                      next[idx] = { ...pair, key: e.target.value };
                      updateState({ headersPairs: next });
                    }}
                    data-testid={`wizard-input-header-key-${idx}`}
                  />
                </div>
                <div className="col-span-6">
                  {fieldPath && fieldState?.hasTemplate ? (
                    <StateAwareInput
                      fieldPath={fieldPath}
                      fieldLabel={pair.key}
                      placeholder="Value"
                      type={isSecret ? 'password' : 'text'}
                      value={pair.value}
                      onValueChange={value => {
                        const next = [...state.headersPairs];
                        next[idx] = { ...pair, value };
                        updateState({ headersPairs: next });
                      }}
                      onChange={e => {
                        const next = [...state.headersPairs];
                        next[idx] = { ...pair, value: e.target.value };
                        updateState({ headersPairs: next });
                      }}
                      data-testid={`wizard-input-header-value-${idx}`}
                    />
                  ) : (
                    <Input
                      placeholder="Value"
                      type={isSecret ? 'password' : 'text'}
                      value={pair.value}
                      onChange={e => {
                        const next = [...state.headersPairs];
                        next[idx] = { ...pair, value: e.target.value };
                        updateState({ headersPairs: next });
                      }}
                      data-testid={`wizard-input-header-value-${idx}`}
                    />
                  )}
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      updateState({
                        headersPairs: state.headersPairs.filter(p => p.id !== pair.id),
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
            onClick={() =>
              updateState({
                headersPairs: [...state.headersPairs, { id: uuidv4(), key: '', value: '' }],
              })
            }
            data-testid="wizard-button-add-header"
          >
            + Add Header
          </Button>
        </div>
      </div>

      {/* Optional Metadata */}
      <div className="space-y-4">
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            ▶ Advanced Options (optional)
          </summary>
          <div className="mt-4 space-y-4 border-l-2 border-border pl-4">
            <div className="space-y-2">
              <Label htmlFor="schema">Schema/Version</Label>
              <Input
                id="schema"
                placeholder="v1, 2024-01, etc."
                value={state.schema}
                onChange={e => updateState({ schema: e.target.value })}
              />
              <HelpText>Track API version or schema identifier</HelpText>
            </div>

            <div className="space-y-2">
              <Label>Suggestion Prompts</Label>
              <HelpText className="mb-3">
                Quick-start prompts shown in chat interface (max 3)
              </HelpText>

              {state.suggestion_prompts.map((prompt, idx) => (
                <div key={prompt.id} className="flex items-center gap-2">
                  <Input
                    placeholder={`Suggestion ${idx + 1}`}
                    value={prompt.prompt}
                    onChange={e => {
                      const next = [...state.suggestion_prompts];
                      next[idx] = { ...prompt, prompt: e.target.value };
                      updateState({ suggestion_prompts: next });
                    }}
                    data-testid={`wizard-input-suggestion-prompt-${idx}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      updateState({
                        suggestion_prompts: state.suggestion_prompts.filter(
                          p => p.id !== prompt.id
                        ),
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
                  onClick={() =>
                    updateState({
                      suggestion_prompts: [
                        ...state.suggestion_prompts,
                        { id: uuidv4(), prompt: '' },
                      ],
                    })
                  }
                  data-testid="wizard-button-add-suggestion-prompt"
                >
                  + Add Suggestion
                </Button>
              )}
            </div>
          </div>
        </details>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          <strong>Next step:</strong> Configure how to format your requests (messages, parameters,
          etc.)
        </p>
      </div>
    </div>
  );
};

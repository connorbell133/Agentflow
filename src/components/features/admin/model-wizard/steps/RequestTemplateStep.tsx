import React, { useRef, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import HelpText from '@/components/ui/help-text';
import { WizardState } from '@/types/ui/wizard.types';
import { ValidationResult } from '../hooks/useModelValidation';
import { buildBodyFromTemplate } from '../utils/templateBuilder';
import { safeJsonParse } from '../utils/pathExtractor';

interface RequestTemplateStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  validation: ValidationResult;
  [key: string]: any;
}

export const RequestTemplateStep: React.FC<RequestTemplateStepProps> = ({
  state,
  updateState,
  validation,
}) => {
  const body_configRef = useRef<HTMLTextAreaElement | null>(null);

  const builtSamplePayload = useMemo(() => {
    try {
      const template = safeJsonParse(state.body_config) as any;
      return JSON.stringify(
        buildBodyFromTemplate(template, state.testVars, state.message_format_config),
        null,
        2
      );
    } catch {
      return '{}';
    }
  }, [state.body_config, state.testVars, state.message_format_config]);

  const schemaValidated = validation.isValid;

  const insertTokenAtCaret = (token: string) => {
    const el = body_configRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const next = state.body_config.slice(0, start) + token + state.body_config.slice(end);
    updateState({ body_config: next });
    setTimeout(() => {
      const pos = start + token.length;
      try {
        el.selectionStart = pos;
        el.selectionEnd = pos;
        el.focus();
      } catch {}
    }, 0);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <p className="text-muted-foreground">
          Define the request template used to build outgoing API calls.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
        {/* Request Template Section */}
        <div className="space-y-2">
          <Label htmlFor="body_config">Request Body Template</Label>
          <HelpText>
            Use variables like ${'{'}
            {`messages`}
            {'}'}, ${'{'}
            {`conversation_id`}
            {'}'}, ${'{'}
            {`time`}
            {'}'}, ${'{'}
            {`content`}
            {'}'}. The ${'{'}
            {`messages`}
            {'}'} variable contains the transformed message array from the field mappings.
          </HelpText>
          <div className="flex items-center gap-3">
            <Label className="text-sm">HTTP Method</Label>
            <select
              className="rounded border bg-card px-3 py-2 text-sm text-card-foreground"
              value={state.method}
              onChange={e => updateState({ method: e.target.value as any })}
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <textarea
            id="body_config"
            ref={body_configRef}
            className="h-48 w-full resize-none rounded border bg-card px-3 py-2 font-mono text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={state.body_config}
            onChange={e => updateState({ body_config: e.target.value })}
            placeholder='{"messages": "${messages}", "conversation_id": "${conversation_id}", "time": "${time}"}'
            data-testid="wizard-textarea-body-config"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => insertTokenAtCaret('${messages}')}
            >
              messages
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => insertTokenAtCaret('${content}')}
            >
              content
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => insertTokenAtCaret('${conversation_id}')}
            >
              conversation_id
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => insertTokenAtCaret('${time}')}
            >
              time
            </Button>
          </div>
        </div>

        <Separator />

        {/* Live Preview and Test Variables */}
        <Tabs defaultValue="payload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payload">Sample Payload</TabsTrigger>
            <TabsTrigger value="variables">Test Variables</TabsTrigger>
          </TabsList>

          <TabsContent value="payload" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Generated Payload</Label>
                <div className="flex items-center gap-2 text-xs">
                  {schemaValidated ? (
                    <span className="inline-flex items-center gap-1 text-green-500">
                      <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-500">
                      <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Invalid
                    </span>
                  )}
                </div>
              </div>

              <textarea
                readOnly
                className={`h-48 w-full resize-none rounded px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 ${schemaValidated ? 'border-green-500' : 'border-red-500'} bg-muted text-foreground`}
                value={builtSamplePayload}
              />

              <p className="text-xs text-muted-foreground">
                This payload updates in real-time as you modify the template and mappings.
              </p>

              {!schemaValidated && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-red-500 hover:text-red-700">
                    Show validation errors
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border bg-red-50 p-2 text-red-600 dark:bg-red-950/20">
                    {validation.message}
                    {validation.errors && JSON.stringify(validation.errors, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </TabsContent>

          <TabsContent value="variables" className="space-y-4">
            <div className="space-y-2">
              <Label>Test Variables</Label>
              <p className="text-xs text-muted-foreground">
                Modify these values to test different scenarios
              </p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs">content</Label>
                  <Input
                    className="h-8"
                    value={state.testVars.content}
                    onChange={e =>
                      updateState({
                        testVars: { ...state.testVars, content: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">conversation_id</Label>
                  <Input
                    className="h-8"
                    value={state.testVars.conversation_id}
                    onChange={e =>
                      updateState({
                        testVars: { ...state.testVars, conversation_id: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">messages (JSON)</Label>
                <textarea
                  className="h-24 w-full resize-none rounded border bg-card px-2 py-1 font-mono text-xs text-card-foreground focus:outline-none focus:ring-1"
                  value={state.testVars.messages}
                  onChange={e =>
                    updateState({
                      testVars: { ...state.testVars, messages: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

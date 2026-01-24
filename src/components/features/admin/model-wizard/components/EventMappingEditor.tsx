/**
 * Event Mapping Editor
 *
 * Visual editor for SSE event mappings that lets users configure
 * how SSE events are mapped to UI stream events.
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import HelpText from '@/components/ui/help-text';
import type { EventMapping, UIStreamEventType, SSEEventMapperConfig } from '@/types/event-mapping';
import { Button } from '@/components/ui/button';

interface EventMappingEditorProps {
  config: SSEEventMapperConfig;
  onChange: (config: SSEEventMapperConfig) => void;
  readonly?: boolean;
}

export const EventMappingEditor: React.FC<EventMappingEditorProps> = ({
  config,
  onChange,
  readonly = false,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const updateMapping = (index: number, updates: Partial<EventMapping>) => {
    const newMappings = [...config.event_mappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    onChange({ ...config, event_mappings: newMappings });
  };

  const updateFieldMapping = (mappingIndex: number, field: string, path: string) => {
    const newMappings = [...config.event_mappings];
    newMappings[mappingIndex] = {
      ...newMappings[mappingIndex],
      field_mappings: {
        ...newMappings[mappingIndex].field_mappings,
        [field]: path,
      },
    };
    onChange({ ...config, event_mappings: newMappings });
  };

  const removeFieldMapping = (mappingIndex: number, field: string) => {
    const newMappings = [...config.event_mappings];
    const { [field]: removed, ...rest } = newMappings[mappingIndex].field_mappings;
    newMappings[mappingIndex] = {
      ...newMappings[mappingIndex],
      field_mappings: rest,
    };
    onChange({ ...config, event_mappings: newMappings });
  };

  const addMapping = () => {
    const newMapping: EventMapping = {
      source_event_type: 'data',
      target_ui_event: 'text-delta',
      field_mappings: {
        delta: 'text',
      },
    };
    onChange({
      ...config,
      event_mappings: [...config.event_mappings, newMapping],
    });
    setExpandedIndex(config.event_mappings.length);
  };

  const removeMapping = (index: number) => {
    const newMappings = config.event_mappings.filter((_, i) => i !== index);
    onChange({ ...config, event_mappings: newMappings });
    if (expandedIndex === index) {
      setExpandedIndex(null);
    }
  };

  const getRequiredFields = (targetEvent: UIStreamEventType): string[] => {
    switch (targetEvent) {
      case 'text-delta':
        return ['delta'];
      case 'tool-invocation':
        return ['toolCallId', 'toolName', 'args'];
      case 'tool-result':
        return ['toolCallId', 'result'];
      case 'error':
        return ['error'];
      case 'finish':
        return [];
      default:
        return [];
    }
  };

  const getOptionalFields = (targetEvent: UIStreamEventType): string[] => {
    switch (targetEvent) {
      case 'text-delta':
        return ['id'];
      case 'finish':
        return ['finishReason'];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Event Mappings</h4>
        {!readonly && (
          <button
            type="button"
            onClick={addMapping}
            className="text-xs text-primary hover:underline"
          >
            + Add Mapping
          </button>
        )}
      </div>

      {config.event_mappings.length === 0 ? (
        <div className="bg-muted/20 rounded-lg border border-dashed border-border p-4">
          <p className="text-center text-sm text-muted-foreground">
            No event mappings configured. Click &quot;Add Mapping&quot; to create one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {config.event_mappings.map((mapping, index) => {
            const isExpanded = expandedIndex === index;
            const requiredFields = getRequiredFields(mapping.target_ui_event);
            const optionalFields = getOptionalFields(mapping.target_ui_event);

            return (
              <div key={index} className="overflow-hidden rounded-lg border border-border bg-card">
                {/* Header */}
                <div
                  className="bg-muted/30 hover:bg-muted/50 flex cursor-pointer items-center justify-between p-3 transition-colors"
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                >
                  <div className="flex flex-1 items-center gap-2">
                    <span className="bg-primary/10 rounded px-2 py-0.5 font-mono text-xs text-primary">
                      {mapping.source_event_type}
                    </span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="text-xs font-medium">{mapping.target_ui_event}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!readonly && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          removeMapping(index);
                        }}
                        className="px-2 py-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                    <span className="text-xs text-muted-foreground">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="space-y-4 p-4">
                    {/* Source Event Type */}
                    <div className="space-y-2">
                      <Label htmlFor={`source-${index}`}>SSE Event Type *</Label>
                      <Input
                        id={`source-${index}`}
                        value={mapping.source_event_type}
                        onChange={e => updateMapping(index, { source_event_type: e.target.value })}
                        placeholder="e.g., data, message_delta"
                        disabled={readonly}
                      />
                      <HelpText>
                        The SSE event type to match (from the <code>event:</code> line)
                      </HelpText>
                    </div>

                    {/* Target UI Event */}
                    <div className="space-y-2">
                      <Label htmlFor={`target-${index}`}>Target UI Event *</Label>
                      <select
                        id={`target-${index}`}
                        value={mapping.target_ui_event}
                        onChange={e =>
                          updateMapping(index, {
                            target_ui_event: e.target.value as UIStreamEventType,
                          })
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        disabled={readonly}
                      >
                        <option value="text-delta">text-delta (streaming text)</option>
                        <option value="tool-invocation">tool-invocation (function call)</option>
                        <option value="tool-result">tool-result (function response)</option>
                        <option value="finish">finish (stream complete)</option>
                        <option value="error">error (error message)</option>
                      </select>
                      <HelpText>The type of UI event to emit for this SSE event</HelpText>
                    </div>

                    {/* Conditional (optional) */}
                    <div className="space-y-2">
                      <Label htmlFor={`when-${index}`}>Condition (optional)</Label>
                      <Input
                        id={`when-${index}`}
                        value={mapping.when || ''}
                        onChange={e => updateMapping(index, { when: e.target.value || undefined })}
                        placeholder="e.g., type == 'content_block_delta'"
                        disabled={readonly}
                      />
                      <HelpText>
                        Optional JSONPath condition to filter events (only process if true)
                      </HelpText>
                    </div>

                    {/* Field Mappings */}
                    <div className="space-y-3">
                      <Label>Field Mappings</Label>
                      <div className="space-y-2">
                        {requiredFields.map(field => (
                          <div key={field} className="flex items-start gap-2">
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                {field} <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                value={mapping.field_mappings[field] || ''}
                                onChange={e => updateFieldMapping(index, field, e.target.value)}
                                placeholder={`JSONPath to ${field}`}
                                className="h-8 text-sm"
                                disabled={readonly}
                              />
                            </div>
                          </div>
                        ))}
                        {optionalFields.map(field => (
                          <div key={field} className="flex items-start gap-2">
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs text-muted-foreground">{field}</Label>
                              <Input
                                value={mapping.field_mappings[field] || ''}
                                onChange={e => updateFieldMapping(index, field, e.target.value)}
                                placeholder={`JSONPath to ${field} (optional)`}
                                className="h-8 text-sm"
                                disabled={readonly}
                              />
                            </div>
                            {!readonly && mapping.field_mappings[field] && (
                              <button
                                type="button"
                                onClick={() => removeFieldMapping(index, field)}
                                className="mt-6 text-xs text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <HelpText>
                        Map SSE event fields to UI event fields using JSONPath expressions
                      </HelpText>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Global Configuration */}
      <div className="space-y-4 border-t border-border pt-4">
        <h4 className="text-sm font-medium">Global Settings</h4>

        <div className="space-y-2">
          <Label htmlFor="event-type-path">Event Type Path (optional)</Label>
          <Input
            id="event-type-path"
            value={config.event_type_path || ''}
            onChange={e => onChange({ ...config, event_type_path: e.target.value || undefined })}
            placeholder="e.g., type, event_type, meta.type"
            disabled={readonly}
          />
          <HelpText>
            JSONPath to extract event type from JSON data. Use this when the SSE event type is in a
            field like <code>type</code> rather than the SSE <code>event:</code> line. Example:
            Anthropic uses <code>&quot;type&quot;: &quot;content_block_delta&quot;</code> in the
            data.
          </HelpText>
        </div>

        <div className="space-y-2">
          <Label htmlFor="done-signal">Done Signal</Label>
          <Input
            id="done-signal"
            value={config.done_signal || ''}
            onChange={e => onChange({ ...config, done_signal: e.target.value || undefined })}
            placeholder="e.g., [DONE] or message_stop"
            disabled={readonly}
          />
          <HelpText>
            Signal that indicates stream completion (can be a data value or event type)
          </HelpText>
        </div>

        <div className="space-y-2">
          <Label htmlFor="error-path">Error Path</Label>
          <Input
            id="error-path"
            value={config.error_path || ''}
            onChange={e => onChange({ ...config, error_path: e.target.value || undefined })}
            placeholder="e.g., error.message"
            disabled={readonly}
          />
          <HelpText>JSONPath to extract error messages from error events</HelpText>
        </div>
      </div>
    </div>
  );
};

/**
 * Configuration Preview Panel
 *
 * Shows what the current configuration does in plain English with visual indicators.
 * Helps users understand their SSE event mappings without reading JSON.
 */

import React, { useMemo } from 'react';
import type { SSEEventMapperConfig, EventMapping } from '@/types/event-mapping';

interface ConfigurationPreviewProps {
  config: SSEEventMapperConfig | null;
  presetName?: string | null;
  className?: string;
  expandable?: boolean;
}

export const ConfigurationPreview: React.FC<ConfigurationPreviewProps> = ({
  config,
  presetName,
  className = '',
  expandable = true,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const features = useMemo(() => {
    if (!config) return [];

    const result: Array<{ label: string; icon: string; color: string; details?: string }> = [];

    // Analyze event mappings
    const mappings = config.event_mappings || [];

    // Text streaming
    const textMapping = mappings.find(m => m.target_ui_event === 'text-delta');
    if (textMapping) {
      result.push({
        label: 'Text Streaming',
        icon: '✅',
        color: 'text-green-600 dark:text-green-400',
        details: `SSE event: "${textMapping.source_event_type}"`,
      });
    }

    // Tool calls
    const toolMapping = mappings.find(m => m.target_ui_event === 'tool-invocation');
    if (toolMapping) {
      result.push({
        label: 'Tool Calls',
        icon: '✅',
        color: 'text-green-600 dark:text-green-400',
        details: toolMapping.when
          ? `Conditional: ${toolMapping.when}`
          : `SSE event: "${toolMapping.source_event_type}"`,
      });
    }

    // Tool results
    const toolResultMapping = mappings.find(m => m.target_ui_event === 'tool-result');
    if (toolResultMapping) {
      result.push({
        label: 'Tool Results',
        icon: '✅',
        color: 'text-green-600 dark:text-green-400',
        details: `SSE event: "${toolResultMapping.source_event_type}"`,
      });
    }

    // Completion signals
    const finishMapping = mappings.find(m => m.target_ui_event === 'finish');
    if (finishMapping) {
      result.push({
        label: 'Stream Completion',
        icon: '✅',
        color: 'text-green-600 dark:text-green-400',
        details: `SSE event: "${finishMapping.source_event_type}"`,
      });
    } else if (config.done_signal) {
      result.push({
        label: 'Stream Completion',
        icon: '✅',
        color: 'text-green-600 dark:text-green-400',
        details: `Signal: ${config.done_signal}`,
      });
    }

    // Error handling
    const errorMapping = mappings.find(m => m.target_ui_event === 'error');
    if (errorMapping) {
      result.push({
        label: 'Error Handling',
        icon: '✅',
        color: 'text-green-600 dark:text-green-400',
        details: `SSE event: "${errorMapping.source_event_type}"`,
      });
    } else if (config.error_path) {
      result.push({
        label: 'Error Handling',
        icon: '✅',
        color: 'text-green-600 dark:text-green-400',
        details: `Extract: ${config.error_path}`,
      });
    }

    return result;
  }, [config]);

  if (!config) {
    return (
      <div className={`bg-muted/20 rounded-lg border border-dashed border-border p-4 ${className}`}>
        <p className="text-center text-sm text-muted-foreground">
          No configuration set. Select a preset or configure manually.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-border bg-card ${className}`}>
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">
            {presetName ? `📖 ${presetName}` : '👁️  Configuration Preview'}
          </h4>
          {expandable && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {isExpanded ? '▲ Collapse' : '▼ Expand'}
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Event Type Path info */}
        {config.event_type_path && (
          <div className="mb-4 border-b border-border pb-4">
            <div className="flex items-start gap-3">
              <span className="text-lg">🔍</span>
              <div className="flex-1">
                <p className="text-sm font-medium">Event Type Detection</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Extracting event type from:{' '}
                  <code className="rounded bg-muted px-1 py-0.5">{config.event_type_path}</code>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The mapper will look for the event type in the JSON data field instead of the SSE{' '}
                  <code>event:</code> line
                </p>
              </div>
            </div>
          </div>
        )}

        {features.length > 0 ? (
          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className={`text-lg ${feature.color}`}>{feature.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{feature.label}</p>
                  {feature.details && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{feature.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No event mappings configured yet.</p>
        )}

        {isExpanded && (
          <details className="mt-4 border-t border-border pt-4">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              View raw configuration
            </summary>
            <pre className="bg-muted/50 mt-2 overflow-x-auto rounded p-3 text-xs">
              {JSON.stringify(config, null, 2)}
            </pre>
          </details>
        )}
      </div>

      {presetName && (
        <div className="px-4 pb-4">
          <p className="text-xs text-green-600 dark:text-green-400">
            SSE stream configuration is ready. Click &quot;Next&quot; to continue.
          </p>
        </div>
      )}
    </div>
  );
};

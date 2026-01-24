/**
 * Enhanced Test Endpoint Step
 *
 * Features:
 * - Live SSE event viewer with side-by-side comparison
 * - Real-time validation feedback
 * - Unmapped event warnings with suggestions
 * - Performance metrics
 * - Save test cases
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import HelpText from '@/components/ui/help-text';
import { WizardState } from '@/types/ui/wizard.types';
import { LiveSSEViewer } from '../components/LiveSSEViewer';
import { buildBodyFromTemplate } from '../utils/templateBuilder';
import { safeJsonParse } from '../utils/pathExtractor';

interface TestEndpointStepEnhancedProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  validation?: any;
  endpointTesting?: any;
  [key: string]: any;
}

interface SSEEvent {
  id: string;
  timestamp: number;
  event: string;
  data: string;
  raw: string;
}

interface MappedEvent {
  id: string;
  timestamp: number;
  type: string;
  data: any;
  mappingIndex?: number;
  success: boolean;
  error?: string;
}

export const TestEndpointStepEnhanced: React.FC<TestEndpointStepEnhancedProps> = ({
  state,
  updateState,
}) => {
  const [testMessage, setTestMessage] = useState('What is 2+2? Explain step by step.');
  const [isTesting, setIsTesting] = useState(false);
  const [rawEvents, setRawEvents] = useState<SSEEvent[]>([]);
  const [mappedEvents, setMappedEvents] = useState<MappedEvent[]>([]);
  const [finalResponse, setFinalResponse] = useState('');
  const [testError, setTestError] = useState<string | null>(null);
  const [testStats, setTestStats] = useState<{
    duration: number;
    mappingOverhead: number;
    apiResponseTime: number;
  } | null>(null);

  const handleTest = useCallback(async () => {
    if (!state.endpoint || !testMessage.trim()) {
      setTestError('Please provide an endpoint and test message');
      return;
    }

    setIsTesting(true);
    setTestError(null);
    setRawEvents([]);
    setMappedEvents([]);
    setFinalResponse('');
    setTestStats(null);

    const startTime = performance.now();
    let apiStartTime = startTime;
    let firstEventTime: number | null = null;
    let mappingTime = 0; // Track actual mapping execution time

    try {
      // Prepare headers
      const headers: Record<string, string> = {};
      state.headersPairs.forEach(pair => {
        if (pair.key && pair.value) {
          headers[pair.key] = pair.value;
        }
      });

      // Prepare body using the configured template (same as Live Preview)
      const testVars = {
        ...state.testVars,
        content: testMessage,
        messages: JSON.stringify([{ role: 'user', content: testMessage }]),
      };

      const bodyTemplate = safeJsonParse(state.body_config) as any;
      console.log('[Test] Body template:', bodyTemplate);
      console.log('[Test] Test vars:', testVars);

      const requestBody = buildBodyFromTemplate(
        bodyTemplate,
        testVars,
        state.message_format_config
      );

      console.log('[Test] Built request body:', requestBody);

      apiStartTime = performance.now();

      // Use server-side proxy to avoid CSP restrictions
      const response = await fetch('/api/test-model-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: state.endpoint,
          method: state.method,
          headers,
          body: requestBody,
          stream: state.endpoint_type === 'sse',
          stream_config: state.stream_config, // Pass stream config for event mapping
          endpoint_type: state.endpoint_type, // Pass endpoint type
        }),
      });

      if (!response.ok) {
        // Try to get error details from response
        const errorData = await response.json().catch(() => null);
        let errorMessage = response.statusText;

        if (errorData) {
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData.error) {
            errorMessage =
              typeof errorData.error === 'string'
                ? errorData.error
                : JSON.stringify(errorData.error);
          } else {
            errorMessage = JSON.stringify(errorData);
          }
        }

        throw new Error(`HTTP ${response.status}: ${errorMessage}`);
      }

      // Update state with successful response
      updateState({
        response: '',
        responseStatus: `${response.status} ${response.statusText}`,
      });

      if (state.endpoint_type === 'sse' && response.body) {
        // Stream SSE events
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let responseText = '';
        const events: SSEEvent[] = [];
        const mapped: MappedEvent[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (!firstEventTime) {
            firstEventTime = performance.now();
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event:') || line.startsWith('data:') || line === '') {
              const eventMatch = line.match(/^event:\s*(.+)$/);
              const dataMatch = line.match(/^data:\s*(.+)$/);

              if (dataMatch) {
                const eventData = dataMatch[1];
                const newEvent: SSEEvent = {
                  id: `event-${events.length}`,
                  timestamp: Date.now(),
                  event: 'data',
                  data: eventData,
                  raw: line,
                };
                events.push(newEvent);
                setRawEvents([...events]);

                // Parse UI stream events (already transformed by server)
                try {
                  const mappingStart = performance.now();

                  if (eventData !== '[DONE]') {
                    const parsed = JSON.parse(eventData);

                    // The stream is already in UI format from SSEEventMapper
                    if (parsed.type === 'text-delta' && parsed.delta) {
                      responseText += parsed.delta;
                      const mappedEvent: MappedEvent = {
                        id: parsed.id || `mapped-${mapped.length}`,
                        timestamp: Date.now(),
                        type: 'text-delta',
                        data: { delta: parsed.delta },
                        success: true,
                        mappingIndex: 0,
                      };
                      mapped.push(mappedEvent);
                      setMappedEvents([...mapped]);
                    } else if (parsed.type === 'finish') {
                      const mappedEvent: MappedEvent = {
                        id: `mapped-${mapped.length}`,
                        timestamp: Date.now(),
                        type: 'stream-end',
                        data: { finishReason: parsed.finishReason },
                        success: true,
                      };
                      mapped.push(mappedEvent);
                      setMappedEvents([...mapped]);
                    } else if (parsed.type === 'error') {
                      const mappedEvent: MappedEvent = {
                        id: `mapped-${mapped.length}`,
                        timestamp: Date.now(),
                        type: 'error',
                        data: { error: parsed.error },
                        success: false,
                        error: parsed.error,
                      };
                      mapped.push(mappedEvent);
                      setMappedEvents([...mapped]);
                    } else if (parsed.type === 'tool-invocation') {
                      const mappedEvent: MappedEvent = {
                        id: parsed.toolCallId || `mapped-${mapped.length}`,
                        timestamp: Date.now(),
                        type: 'tool-invocation',
                        data: parsed,
                        success: true,
                      };
                      mapped.push(mappedEvent);
                      setMappedEvents([...mapped]);
                    } else if (parsed.type === 'tool-result') {
                      const mappedEvent: MappedEvent = {
                        id: parsed.toolCallId || `mapped-${mapped.length}`,
                        timestamp: Date.now(),
                        type: 'tool-result',
                        data: parsed,
                        success: true,
                      };
                      mapped.push(mappedEvent);
                      setMappedEvents([...mapped]);
                    }
                    // Skip other event types like 'start', 'text-start' (info only)
                  } else {
                    // Done signal
                    const mappedEvent: MappedEvent = {
                      id: `mapped-${mapped.length}`,
                      timestamp: Date.now(),
                      type: 'stream-end',
                      data: {},
                      success: true,
                    };
                    mapped.push(mappedEvent);
                    setMappedEvents([...mapped]);
                  }

                  mappingTime += performance.now() - mappingStart;
                } catch (err) {
                  const mappingStart = performance.now();

                  // Failed to parse UI event
                  const mappedEvent: MappedEvent = {
                    id: `mapped-${mapped.length}`,
                    timestamp: Date.now(),
                    type: 'unknown',
                    data: {},
                    success: false,
                    error: err instanceof Error ? err.message : 'Parsing failed',
                  };
                  mapped.push(mappedEvent);
                  setMappedEvents([...mapped]);

                  mappingTime += performance.now() - mappingStart;
                }
              }
            }
          }
        }

        setFinalResponse(responseText);
      } else {
        // Webhook/Non-streaming response
        const text = await response.text();
        let parsedResponse: any = null;
        let extractedValue: string = '';
        let extractionError: string = '';
        let rawResponseText = text;

        // Try to parse as JSON
        try {
          parsedResponse = JSON.parse(text);

          // Check if this is the wrapped test endpoint response
          // Test endpoint returns: {status, statusText, headers, body, responseTime}
          if (parsedResponse.body !== undefined && parsedResponse.status !== undefined) {
            // This is the wrapped test response, extract the actual body
            rawResponseText = parsedResponse.body;

            // Try to parse the actual body as JSON
            let actualBody: any;
            try {
              actualBody = JSON.parse(rawResponseText);
            } catch {
              // Body is plain text, wrap it for path extraction
              actualBody = { response: rawResponseText };
            }

            parsedResponse = actualBody;
          }

          // If we have a response_path, try to extract the value
          if (state.response_path && state.response_path.trim()) {
            try {
              const { getValueAtPath } = await import('../utils/pathExtractor');
              const extracted = getValueAtPath(parsedResponse, state.response_path);
              extractedValue =
                typeof extracted === 'string' ? extracted : JSON.stringify(extracted, null, 2);

              // Update wizard state with extracted value
              updateState({
                response:
                  typeof parsedResponse === 'string'
                    ? rawResponseText
                    : JSON.stringify(parsedResponse, null, 2),
                responseValue: extractedValue,
                responseError: '',
              });
            } catch (err) {
              extractionError = err instanceof Error ? err.message : 'Failed to extract value';
              updateState({
                response:
                  typeof parsedResponse === 'string'
                    ? rawResponseText
                    : JSON.stringify(parsedResponse, null, 2),
                responseValue: '',
                responseError: extractionError,
              });
            }
          } else {
            // No response_path configured, just show the raw response
            updateState({
              response:
                typeof parsedResponse === 'string'
                  ? rawResponseText
                  : JSON.stringify(parsedResponse, null, 2),
            });
            extractedValue =
              typeof parsedResponse === 'string'
                ? rawResponseText
                : JSON.stringify(parsedResponse, null, 2);
          }
        } catch {
          // Not JSON, just use the text as-is
          updateState({ response: text });
          extractedValue = text;
        }

        // Store the final response (extracted value if available, otherwise raw)
        setFinalResponse(extractedValue || rawResponseText);
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const apiResponseTime = firstEventTime ? firstEventTime - apiStartTime : totalDuration;

      setTestStats({
        duration: totalDuration,
        mappingOverhead: mappingTime, // Actual time spent in mapping code
        apiResponseTime,
      });
    } catch (error) {
      console.error('Test failed:', error);
      setTestError(error instanceof Error ? error.message : 'Unknown error occurred');
      updateState({
        responseStatus: 'Error',
        response: error instanceof Error ? error.message : 'Test failed',
      });
    } finally {
      setIsTesting(false);
    }
  }, [state, testMessage, updateState]);

  const handleClear = useCallback(() => {
    setRawEvents([]);
    setMappedEvents([]);
    setFinalResponse('');
    setTestError(null);
    setTestStats(null);
  }, []);

  const unmappedCount = rawEvents.length - mappedEvents.filter(e => e.success).length;
  const hasUnmappedEvents = unmappedCount > 0;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h3 className="mb-2 text-lg font-medium">Test Your Configuration</h3>
        <p className="text-muted-foreground">
          Send a test message to verify your endpoint configuration and event mappings.
        </p>
      </div>

      {/* Test Message Input */}
      <div className="space-y-2">
        <Label htmlFor="testMessage">Test Message</Label>
        <Input
          id="testMessage"
          value={testMessage}
          onChange={e => setTestMessage(e.target.value)}
          placeholder="What is 2+2? Explain step by step."
          disabled={isTesting}
        />
        <HelpText>The message that will be sent to your AI endpoint</HelpText>
      </div>

      {/* Test Button */}
      <div className="flex gap-3">
        <Button type="button" onClick={handleTest} disabled={isTesting || !state.endpoint}>
          {isTesting ? (
            <>
              <span className="mr-2 animate-spin">⏳</span>
              Testing...
            </>
          ) : (
            <>
              <span className="mr-2">▶️</span>
              Send Test
            </>
          )}
        </Button>

        {(rawEvents.length > 0 || finalResponse) && (
          <Button type="button" variant="outline" onClick={handleClear} disabled={isTesting}>
            🔄 Clear Results
          </Button>
        )}
      </div>

      {/* Error Display */}
      {testError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg text-red-600 dark:text-red-400">❌</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">Test Failed</p>
              <p className="mt-1 text-xs text-red-700 dark:text-red-300">{testError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Live SSE Viewer */}
      {state.endpoint_type === 'sse' && rawEvents.length > 0 && (
        <LiveSSEViewer
          isStreaming={isTesting}
          rawEvents={rawEvents}
          mappedEvents={mappedEvents}
          onClear={handleClear}
        />
      )}

      {/* Unmapped Events Warning */}
      {hasUnmappedEvents && !isTesting && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg text-yellow-600 dark:text-yellow-400">⚡</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Warning: {unmappedCount} events had no mapping
              </p>
              <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                These events were ignored. You may want to add mappings for them.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => alert('Advanced mode with mapping editor coming soon!')}
              >
                + Add Missing Mappings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Response Display */}
      {state.endpoint_type === 'webhook' && state.response && !isTesting && (
        <div className="space-y-4">
          {/* Raw JSON Response */}
          <div className="space-y-2">
            <Label>Raw JSON Response</Label>
            <div className="rounded-lg border border-border bg-card p-4">
              <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(state.response), null, 2);
                  } catch {
                    return state.response;
                  }
                })()}
              </pre>
            </div>
          </div>

          {/* Extracted Value */}
          {state.response_path && state.response_path.trim() && (
            <div className="space-y-2">
              <Label>
                Extracted Value
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (using path:{' '}
                  <code className="rounded bg-muted px-1 py-0.5">{state.response_path}</code>)
                </span>
              </Label>
              {state.responseValue ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
                  <p className="whitespace-pre-wrap font-mono text-sm">{state.responseValue}</p>
                </div>
              ) : state.responseError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
                  <p className="text-sm text-red-600 dark:text-red-400">❌ {state.responseError}</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Final Response (for display) */}
          {finalResponse && (
            <div className="space-y-2">
              <Label>Final Response</Label>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="whitespace-pre-wrap text-sm">{finalResponse}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SSE Final Response Display */}
      {state.endpoint_type === 'sse' && finalResponse && !isTesting && (
        <div className="space-y-2">
          <Label>Final Response</Label>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="whitespace-pre-wrap text-sm">{finalResponse}</p>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {testStats && !isTesting && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="mb-3 text-sm font-medium">📊 Performance Metrics</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">API Response Time</div>
              <div className="font-medium">{testStats.apiResponseTime.toFixed(0)}ms</div>
            </div>
            <div>
              <div className="text-muted-foreground">Mapping Overhead</div>
              <div className="font-medium">{testStats.mappingOverhead.toFixed(0)}ms</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Duration</div>
              <div className="font-medium">{testStats.duration.toFixed(0)}ms</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

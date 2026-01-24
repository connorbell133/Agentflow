/**
 * Live SSE Viewer Component
 *
 * Shows side-by-side comparison of:
 * - Raw SSE events (left panel)
 * - Mapped UI events (right panel)
 *
 * Helps users debug and understand their event mappings in real-time.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

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

interface LiveSSEViewerProps {
  isStreaming: boolean;
  rawEvents: SSEEvent[];
  mappedEvents: MappedEvent[];
  onClear?: () => void;
  className?: string;
}

export const LiveSSEViewer: React.FC<LiveSSEViewerProps> = ({
  isStreaming,
  rawEvents,
  mappedEvents,
  onClear,
  className = '',
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const rawPanelRef = useRef<HTMLDivElement>(null);
  const mappedPanelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive (unless paused)
  useEffect(() => {
    if (isPaused) return;

    if (rawPanelRef.current) {
      rawPanelRef.current.scrollTop = rawPanelRef.current.scrollHeight;
    }
    if (mappedPanelRef.current) {
      mappedPanelRef.current.scrollTop = mappedPanelRef.current.scrollHeight;
    }
  }, [rawEvents, mappedEvents, isPaused]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const formatData = (data: string | object): string => {
    if (typeof data === 'string') {
      try {
        return JSON.stringify(JSON.parse(data), null, 2);
      } catch {
        return data;
      }
    }
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium">📡 Live Stream Viewer</h3>
          {isStreaming && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-xs text-green-600 dark:text-green-400">Streaming...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)}>
            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </Button>
          {onClear && (
            <Button type="button" variant="outline" size="sm" onClick={onClear}>
              🗑️ Clear
            </Button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Raw Events: {rawEvents.length}</span>
        <span>•</span>
        <span>Mapped: {mappedEvents.filter(e => e.success).length}</span>
        <span>•</span>
        <span className="text-yellow-600 dark:text-yellow-400">
          Unmapped: {rawEvents.length - mappedEvents.filter(e => e.success).length}
        </span>
        <span>•</span>
        <span className="text-red-600 dark:text-red-400">
          Errors: {mappedEvents.filter(e => e.error).length}
        </span>
      </div>

      {/* Side-by-Side Panels */}
      <div className="grid grid-cols-2 gap-4 overflow-hidden rounded-lg border border-border">
        {/* Raw SSE Events Panel */}
        <div className="flex flex-col">
          <div className="border-b border-border bg-muted px-3 py-2">
            <h4 className="text-sm font-medium">Raw SSE Events</h4>
          </div>
          <div
            ref={rawPanelRef}
            className="flex-1 space-y-2 overflow-y-auto bg-card p-3"
            style={{ maxHeight: '400px' }}
          >
            {rawEvents.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Waiting for events...
              </div>
            ) : (
              rawEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                  className={`cursor-pointer rounded border p-2 font-mono text-xs transition-colors ${
                    selectedEventId === event.id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:border-muted-foreground/50 border-border'
                  } `}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {formatTimestamp(event.timestamp)}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400">
                      event: {event.event || 'data'}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap break-all text-foreground">{event.data}</pre>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mapped UI Events Panel */}
        <div className="flex flex-col">
          <div className="border-b border-border bg-muted px-3 py-2">
            <h4 className="text-sm font-medium">Mapped UI Events</h4>
          </div>
          <div
            ref={mappedPanelRef}
            className="flex-1 space-y-2 overflow-y-auto bg-card p-3"
            style={{ maxHeight: '400px' }}
          >
            {mappedEvents.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No mapped events yet...
              </div>
            ) : (
              mappedEvents.map(event => (
                <div
                  key={event.id}
                  className={`rounded border p-2 text-xs ${
                    event.success
                      ? 'border-green-500/30 bg-green-500/5'
                      : event.error
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-yellow-500/30 bg-yellow-500/5'
                  } `}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {formatTimestamp(event.timestamp)}
                    </span>
                    <span
                      className={`font-medium ${
                        event.success
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      } `}
                    >
                      {event.success ? '✓' : '✗'} {event.type}
                    </span>
                  </div>

                  {event.success ? (
                    <pre className="whitespace-pre-wrap break-all font-mono text-foreground">
                      {formatData(event.data)}
                    </pre>
                  ) : (
                    <p className="text-red-600 dark:text-red-400">
                      {event.error || 'Failed to map event'}
                    </p>
                  )}

                  {event.mappingIndex !== undefined && (
                    <div className="mt-1 text-muted-foreground">
                      Mapping #{event.mappingIndex + 1}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      {rawEvents.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-start gap-2 p-3">
            {mappedEvents.filter(e => e.success).length === rawEvents.length ? (
              <>
                <span className="text-lg text-green-600 dark:text-green-400">✅</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Test Passed
                  </p>
                  <p className="mt-0.5 text-xs text-green-700 dark:text-green-300">
                    All {rawEvents.length} events mapped successfully (100%)
                  </p>
                </div>
              </>
            ) : (
              <>
                <span className="text-lg text-yellow-600 dark:text-yellow-400">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    Partial Success
                  </p>
                  <p className="mt-0.5 text-xs text-yellow-700 dark:text-yellow-300">
                    {mappedEvents.filter(e => e.success).length}/{rawEvents.length} events mapped (
                    {Math.round(
                      (mappedEvents.filter(e => e.success).length / rawEvents.length) * 100
                    )}
                    %)
                  </p>
                  <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                    {rawEvents.length - mappedEvents.filter(e => e.success).length} unmapped events
                    detected
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Collapsible Unmapped Events Section */}
          {rawEvents.length > mappedEvents.filter(e => e.success).length && (
            <Collapsible>
              <CollapsibleTrigger className="bg-muted/50 w-full border-t border-border text-left text-xs text-yellow-900 dark:text-yellow-100">
                View Unmapped Events (
                {rawEvents.length - mappedEvents.filter(e => e.success).length})
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="max-h-60 space-y-2 overflow-y-auto">
                  {rawEvents
                    .filter(rawEvent => {
                      // Check if this raw event has a successful mapping
                      return !mappedEvents.some(
                        mappedEvent => mappedEvent.id === rawEvent.id && mappedEvent.success
                      );
                    })
                    .map(event => (
                      <div
                        key={event.id}
                        className="rounded border border-yellow-500/30 bg-yellow-500/5 p-2 font-mono text-xs"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-muted-foreground">
                            {formatTimestamp(event.timestamp)}
                          </span>
                          <span className="text-yellow-600 dark:text-yellow-400">
                            event: {event.event || 'data'}
                          </span>
                        </div>
                        <pre className="whitespace-pre-wrap break-all text-foreground">
                          {event.data}
                        </pre>
                      </div>
                    ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * ChatBoxAI Component
 *
 * AI SDK 6 compatible chat box that renders UIMessage parts.
 * Supports text, tool-invocation, and reasoning parts.
 */

import React, { memo, useMemo, useState, useTransition, useRef, useEffect } from 'react';
import { type UIMessage } from 'ai';
import MarkdownContent from '@/components/features/chat/shared/content/MarkdownContent/MarkdownContent';
import TypingIndicator from '@/components/shared/loading/TypingIndicator';
import { Copy, ThumbsUp, ThumbsDown, MessageSquare, Wrench, Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { submitMessageFeedback } from '@/actions/chat/feedback';
import { cn } from '@/utils/cn';

// Props for ChatBoxAI
export interface ChatBoxAIProps {
  messages: UIMessage[];
  isLoading: boolean;
  conversationId?: string;
  model_id?: string;
  modelName?: string;
}

// Empty state component
const EmptyMessagesState = memo(() => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
      <div className="relative">
        <svg
          width="80"
          height="80"
          viewBox="0 0 100 100"
          className="text-muted-foreground/30"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 30C20 23.3726 25.3726 18 32 18H68C74.6274 18 80 23.3726 80 30V55C80 61.6274 74.6274 67 68 67H45L32 75V67C25.3726 67 20 61.6274 20 55V30Z"
            stroke="currentColor"
            strokeWidth="3"
            fill="currentColor"
            fillOpacity="0.1"
          />
          <circle cx="40" cy="42" r="3" fill="currentColor" opacity="0.4" />
          <circle cx="50" cy="42" r="3" fill="currentColor" opacity="0.4" />
          <circle cx="60" cy="42" r="3" fill="currentColor" opacity="0.4" />
        </svg>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-muted-foreground">No messages yet</h3>
        <p className="text-sm text-muted-foreground/80 max-w-sm">
          Start a conversation by sending your first message below.
        </p>
      </div>
    </div>
  );
});
EmptyMessagesState.displayName = 'EmptyMessagesState';

// Component to render a text part
interface TextPartProps {
  text: string;
}

const TextPart = memo<TextPartProps>(({ text }) => {
  if (!text) return null;
  return <MarkdownContent markdown={text} />;
});
TextPart.displayName = 'TextPart';

// Component to render a tool invocation part
interface ToolInvocationPartProps {
  toolInvocation: {
    toolCallId: string;
    toolName: string;
    args: unknown;
    state: 'partial-call' | 'call' | 'result';
    result?: unknown;
  };
}

const ToolInvocationPart = memo<ToolInvocationPartProps>(({ toolInvocation }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toolName, state, args, result } = toolInvocation;

  const stateColor = useMemo(() => {
    switch (state) {
      case 'partial-call':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'call':
        return 'text-blue-600 dark:text-blue-400';
      case 'result':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-muted-foreground';
    }
  }, [state]);

  const stateLabel = useMemo(() => {
    switch (state) {
      case 'partial-call':
        return 'Preparing...';
      case 'call':
        return 'Executing...';
      case 'result':
        return 'Complete';
      default:
        return state;
    }
  }, [state]);

  return (
    <div className="my-2 border border-border rounded-lg overflow-hidden bg-muted/30">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="font-medium text-sm">{toolName}</span>
        <span className={cn('text-xs ml-auto', stateColor)}>{stateLabel}</span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {args != null && (
            <div className="text-xs">
              <span className="text-muted-foreground">Arguments:</span>
              <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {state === 'result' && result !== undefined && (
            <div className="text-xs">
              <span className="text-muted-foreground">Result:</span>
              <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
ToolInvocationPart.displayName = 'ToolInvocationPart';

// Component to render a reasoning part
interface ReasoningPartProps {
  reasoning: string;
}

const ReasoningPart = memo<ReasoningPartProps>(({ reasoning }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!reasoning) return null;

  return (
    <div className="my-2 border border-border rounded-lg overflow-hidden bg-purple-50 dark:bg-purple-900/20">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
        )}
        <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
        <span className="font-medium text-sm text-purple-700 dark:text-purple-300">Reasoning</span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3">
          <div className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap">
            {reasoning}
          </div>
        </div>
      )}
    </div>
  );
});
ReasoningPart.displayName = 'ReasoningPart';

// Component to render message parts
interface MessagePartsProps {
  parts: UIMessage['parts'];
}

const MessageParts = memo<MessagePartsProps>(({ parts }) => {
  if (!parts || parts.length === 0) {
    return null;
  }

  return (
    <>
      {parts.map((part, index) => {
        // Handle text parts
        if (part.type === 'text') {
          return <TextPart key={`text-${index}`} text={part.text} />;
        }

        // Handle tool invocation parts - AI SDK v6 uses tool-${toolName} format
        // Also support legacy tool-invocation format for backwards compatibility
        if (part.type === 'tool-invocation' && 'toolInvocation' in part) {
          // Legacy format
          return (
            <ToolInvocationPart
              key={`tool-${(part as any).toolInvocation.toolCallId}`}
              toolInvocation={(part as any).toolInvocation}
            />
          );
        }

        // Handle AI SDK v6 tool parts (tool-${toolName} format)
        // Check if part type starts with 'tool-' (e.g., 'tool-listOrders', 'tool-getWeather')
        if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
          const toolName = part.type.replace('tool-', '');
          const toolCallId = (part as any).toolCallId;
          const state = (part as any).state || 'call';
          const input = (part as any).input;
          const output = (part as any).output;
          
          console.log('🔧 [MessageParts] Rendering tool part:', {
            toolName,
            toolCallId,
            state,
            hasInput: !!input,
            hasOutput: !!output,
            partType: part.type,
          });
          
          return (
            <ToolInvocationPart
              key={`tool-${toolCallId || index}`}
              toolInvocation={{
                toolCallId: toolCallId || `unknown-${index}`,
                toolName: toolName,
                args: input || {},
                state: state === 'output-available' ? 'result' : state === 'input-available' ? 'call' : 'partial-call',
                result: output,
              }}
            />
          );
        }

        // Handle dynamic tools (tools without schemas)
        if (part.type === 'dynamic-tool') {
          const toolName = (part as any).toolName || 'Unknown Tool';
          const toolCallId = (part as any).toolCallId;
          const state = (part as any).state || 'call';
          const input = (part as any).input;
          const output = (part as any).output;
          
          return (
            <ToolInvocationPart
              key={`tool-${toolCallId || index}`}
              toolInvocation={{
                toolCallId: toolCallId || `unknown-${index}`,
                toolName: toolName,
                args: input || {},
                state: state === 'output-available' ? 'result' : state === 'input-available' ? 'call' : 'partial-call',
                result: output,
              }}
            />
          );
        }

        // Handle reasoning parts
        if (part.type === 'reasoning' && 'reasoning' in part) {
          return <ReasoningPart key={`reasoning-${index}`} reasoning={(part as any).reasoning} />;
        }

        // Log unknown part types for debugging
        console.log('⚠️ [MessageParts] Unknown part type:', part.type, part);
        
        // Unknown part type - render nothing
        return null;
      })}
    </>
  );
});
MessageParts.displayName = 'MessageParts';

// Message item component
interface MessageItemAIProps {
  message: UIMessage;
  conversationId?: string;
  model_id?: string;
  modelName?: string;
}

const MessageItemAI = memo<MessageItemAIProps>(({ message, conversationId, model_id, modelName }) => {
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState('');
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();

  // Extract text content for copy functionality
  const textContent = useMemo(() => {
    if (!message.parts) return '';
    return message.parts
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join('\n');
  }, [message.parts]);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const messageClassName = cn(
    'flex my-2',
    isUser ? 'justify-end' : 'justify-start',
    isAssistant ? 'mb-10' : ''
  );

  const contentClassName = cn(
    isUser
      ? 'bg-primary/30 text-right rounded-xl w-fit px-3 py-1 leading-6 md:leading-7 border border-primary/40'
      : 'text-left p-4 leading-6 md:leading-7'
  );

  const handleCopy = async () => {
    if (textContent) {
      await navigator.clipboard.writeText(textContent);
    }
  };

  const handleThumbsUp = () => {
    if (!conversationId || !model_id) return;
    const newFeedback = feedback === true ? null : true;
    setFeedback(newFeedback);

    startTransition(async () => {
      await submitMessageFeedback(message.id, conversationId, model_id, newFeedback, comment || undefined);
    });
  };

  const handleThumbsDown = () => {
    if (!conversationId || !model_id) return;
    const newFeedback = feedback === false ? null : false;
    setFeedback(newFeedback);

    startTransition(async () => {
      await submitMessageFeedback(message.id, conversationId, model_id, newFeedback, comment || undefined);
    });
  };

  const handleCommentSubmit = () => {
    if (!comment.trim() || !conversationId || !model_id) return;

    startTransition(async () => {
      await submitMessageFeedback(message.id, conversationId, model_id, feedback, comment);
      setComment('');
      setShowCommentInput(false);
    });
  };

  return (
    <div className={messageClassName}>
      <div className="relative group">
        {isAssistant && modelName && (
          <div className="text-xs text-muted-foreground mb-1 px-1">{modelName}</div>
        )}
        <div className={contentClassName}>
          <MessageParts parts={message.parts} />
        </div>

        {/* Feedback buttons - only for assistant messages */}
        {isAssistant && (
          <div className="absolute -bottom-9 right-0 flex items-stretch justify-between gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
            {/* Copy button */}
            <div className="relative group/tooltip">
              <button
                onClick={handleCopy}
                className="inline-flex items-center justify-center relative shrink-0 select-none h-8 w-8 rounded-md
                           text-muted-foreground hover:text-foreground hover:bg-muted/50
                           transition-all duration-300 ease-smooth
                           active:scale-95"
                type="button"
              >
                <Copy className="h-5 w-5" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-popover text-popover-foreground
                            opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap
                            shadow-md border border-border">
                Copy message
              </div>
            </div>

            {/* Thumbs up button */}
            <div className="relative group/tooltip">
              <button
                onClick={handleThumbsUp}
                className={cn(
                  'inline-flex items-center justify-center relative shrink-0 select-none h-8 w-8 rounded-md transition-all duration-300 ease-smooth active:scale-95',
                  feedback === true
                    ? 'text-green-600 dark:text-green-400 bg-green-100/50 dark:bg-green-900/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
                type="button"
              >
                <ThumbsUp className="h-4 w-4" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-popover text-popover-foreground
                            opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap
                            shadow-md border border-border">
                Good response
              </div>
            </div>

            {/* Thumbs down button */}
            <div className="relative group/tooltip">
              <button
                onClick={handleThumbsDown}
                className={cn(
                  'inline-flex items-center justify-center relative shrink-0 select-none h-8 w-8 rounded-md transition-all duration-300 ease-smooth active:scale-95',
                  feedback === false
                    ? 'text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-900/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
                type="button"
              >
                <ThumbsDown className="h-4 w-4" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-popover text-popover-foreground
                            opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap
                            shadow-md border border-border">
                Poor response
              </div>
            </div>

            {/* Comment button */}
            <button
              onClick={() => setShowCommentInput(!showCommentInput)}
              className="inline-flex items-center justify-center relative shrink-0 select-none h-8 rounded-md px-3 min-w-[4rem]
                         text-muted-foreground hover:text-foreground hover:bg-muted/50
                         transition-all duration-300 ease-smooth
                         active:scale-[0.985] whitespace-nowrap text-xs font-base gap-1"
              title="Add comment"
              type="button"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Comment</span>
            </button>
          </div>
        )}

        {/* Comment input */}
        {showCommentInput && isAssistant && (
          <div className="absolute -bottom-12 right-0 z-10 bg-background rounded-lg shadow-lg border border-border p-2 w-64">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
              placeholder="Add feedback comment..."
              className="w-full px-2 py-1 text-sm bg-muted rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <div className="flex justify-end mt-1 gap-1">
              <button
                onClick={() => {
                  setShowCommentInput(false);
                  setComment('');
                }}
                className="text-xs px-2 py-0.5 text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleCommentSubmit}
                className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Submit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
MessageItemAI.displayName = 'MessageItemAI';

// Main ChatBoxAI component
const ChatBoxAI = memo<ChatBoxAIProps>(
  ({ messages, isLoading, conversationId, model_id, modelName }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on initial load
    useEffect(() => {
      if (messages.length > 0 && containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, [messages.length]);

    // Auto-scroll for new messages (smooth)
    useEffect(() => {
      if (messages.length > 0 && containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, [messages]);

    // Memoize message elements
    const messageElements = useMemo(
      () =>
        messages.map((message) => (
          <MessageItemAI
            key={message.id}
            message={message}
            conversationId={conversationId}
            model_id={model_id}
            modelName={modelName}
          />
        )),
      [messages, conversationId, model_id, modelName]
    );

    // Memoize loading indicator
    const loadingIndicator = useMemo(
      () =>
        isLoading ? (
          <div className="flex justify-start p-4">
            <div className="rounded-lg p-3 max-w-xs flex items-center space-x-2">
              <TypingIndicator />
            </div>
          </div>
        ) : null,
      [isLoading]
    );

    return (
      <div
        ref={containerRef}
        className="p-4 text-sm md:text-l min-h-[60%] overflow-y-auto text-foreground scrollbar-hide"
      >
        {messages.length === 0 && !isLoading ? (
          <EmptyMessagesState />
        ) : (
          <>
            {messageElements}
            {loadingIndicator}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.messages === nextProps.messages && prevProps.isLoading === nextProps.isLoading;
  }
);

ChatBoxAI.displayName = 'ChatBoxAI';

export default ChatBoxAI;

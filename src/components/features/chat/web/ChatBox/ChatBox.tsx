import React, { memo, useMemo, useState, useTransition, useRef, useEffect } from "react";
import MarkdownContent from "@/components/features/chat/shared/content/MarkdownContent/MarkdownContent";
import { ChatBoxProps } from "./ChatBox.types";
import { Message } from "@/lib/supabase/types";
import TypingIndicator from "@/components/shared/loading/TypingIndicator";
import { Copy, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { submitMessageFeedback } from "@/actions/chat/feedback";

// Helper to extract text from message parts (handles Json type from database)
function extractTextFromMessageParts(message: Message): string {
  if (!message.parts || !Array.isArray(message.parts)) {
    return message.content || '';
  }
  
  return message.parts
    .filter((p: any): p is { type: 'text'; text: string } => 
      typeof p === 'object' && p !== null && 'type' in p && p.type === 'text'
    )
    .map((p: { type: 'text'; text: string }) => p.text)
    .join('');
}

// Memoized empty state component
const EmptyMessagesState = memo(() => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
      {/* Simple chat bubble logo */}
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

      {/* Message */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-muted-foreground">
          No messages yet
        </h3>
        <p className="text-sm text-muted-foreground/80 max-w-sm">
          Start a conversation by sending your first message below.
        </p>
      </div>
    </div>
  );
});
EmptyMessagesState.displayName = "EmptyMessagesState";

// Memoized message item component to prevent re-renders
interface MessageItemProps {
  message: Message;
  conversationId?: string;
  model_id?: string;
}

const MessageItem = memo<MessageItemProps & { modelName?: string }>(({ message, conversationId, model_id, modelName }) => {
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();

  const messageClassName = useMemo(() =>
    `flex my-2 ${message.role === "user" ? "justify-end" : "justify-start"} ${message.role === "assistant" ? "mb-10" : ""}`,
    [message.role]
  );

  const contentClassName = useMemo(() =>
    message.role === "user"
      ? "bg-primary/30 text-right rounded-xl w-fit px-3 py-1 leading-6 md:leading-7 border border-primary/40"
      : "text-left p-4 leading-6 md:leading-7",
    [message.role]
  );

  const handleCopy = async () => {
    const text = extractTextFromMessageParts(message);
    
    if (text) {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleThumbsUp = () => {
    if (!conversationId || !model_id) return;

    const newFeedback = feedback === true ? null : true;
    setFeedback(newFeedback);

    startTransition(async () => {
      await submitMessageFeedback(
        message.id,
        conversationId,
        model_id,
        newFeedback,
        comment || undefined
      );
    });
  };

  const handleThumbsDown = () => {
    if (!conversationId || !model_id) return;

    const newFeedback = feedback === false ? null : false;
    setFeedback(newFeedback);

    startTransition(async () => {
      await submitMessageFeedback(
        message.id,
        conversationId,
        model_id,
        newFeedback,
        comment || undefined
      );
    });
  };

  const handleCommentSubmit = () => {
    if (!comment.trim() || !conversationId || !model_id) return;

    startTransition(async () => {
      await submitMessageFeedback(
        message.id,
        conversationId,
        model_id,
        feedback,
        comment
      );
      setComment("");
      setShowCommentInput(false);
    });
  };

  return (
    <div className={messageClassName}>
      <div className="relative group">
        {/* Show model name for assistant messages */}
        {message.role === "assistant" && modelName && (
          <div className="text-xs text-muted-foreground mb-1 px-1">
            {modelName}
          </div>
        )}
        <div className={contentClassName}>
          <MarkdownContent 
            markdown={extractTextFromMessageParts(message)} 
          />
        </div>

        {/* Feedback buttons - only show for assistant messages */}
        {message.role === "assistant" && (
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
                className={`inline-flex items-center justify-center relative shrink-0 select-none h-8 w-8 rounded-md 
                           transition-all duration-300 ease-smooth
                           active:scale-95 ${feedback === true
                    ? "text-green-600 dark:text-green-400 bg-green-100/50 dark:bg-green-900/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
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
                className={`inline-flex items-center justify-center relative shrink-0 select-none h-8 w-8 rounded-md 
                           transition-all duration-300 ease-smooth
                           active:scale-95 ${feedback === false
                    ? "text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-900/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
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
        {showCommentInput && message.role === "assistant" && (
          <div className="absolute -bottom-12 right-0 z-10 bg-background rounded-lg shadow-lg border border-border p-2 w-64">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit()}
              placeholder="Add feedback comment..."
              className="w-full px-2 py-1 text-sm bg-muted rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <div className="flex justify-end mt-1 gap-1">
              <button
                onClick={() => {
                  setShowCommentInput(false);
                  setComment("");
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
MessageItem.displayName = "MessageItem";

// Main ChatBox component with memoization
const ChatBox = memo<ChatBoxProps & { modelName?: string }>(({ messages, isLoading, conversationId, model_id, modelName }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on initial load and when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && containerRef.current) {
      // Instant scroll to bottom without animation
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages.length]); // Trigger when message count changes (initial load)

  // Auto-scroll for each new message (smooth animation)
  useEffect(() => {
    if (messages.length > 0 && containerRef.current) {
      // Smooth scroll to bottom for new messages
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]); // Trigger when messages array changes (new messages)

  // Memoize the message elements to prevent unnecessary re-renders
  const messageElements = useMemo(() =>
    messages.map((message) => (
      <MessageItem
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
  const loadingIndicator = useMemo(() =>
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
    <div ref={containerRef} className="p-4 text-sm md:text-l min-h-[60%] overflow-y-auto text-foreground scrollbar-hide">
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
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  // Only re-render if messages array reference changes or loading state changes
  return prevProps.messages === nextProps.messages &&
    prevProps.isLoading === nextProps.isLoading;
});

ChatBox.displayName = "ChatBox";

export default ChatBox;

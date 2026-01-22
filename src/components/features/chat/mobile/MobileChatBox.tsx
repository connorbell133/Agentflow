import React, { memo, useState } from "react";
import { Message } from "@/lib/supabase/types";
import MarkdownContent from "@/components/features/chat/shared/content/MarkdownContent/MarkdownContent";
import TypingIndicator from "@/components/shared/loading/TypingIndicator";
import { Copy, ThumbsUp, ThumbsDown, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/utils/cn";
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

interface MobileChatBoxProps {
  messages: Message[];
  isLoading?: boolean;
  conversationId?: string;
  model_id?: string;
  modelName?: string;
}

const MessageBubble = memo<{
  message: Message;
  conversationId?: string;
  model_id?: string;
  modelName?: string;
}>(({ message, conversationId, model_id, modelName }) => {
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState("");
  const isUser = message.role === "user";

  const handleCopy = async () => {
    const text = extractTextFromMessageParts(message);
    await navigator.clipboard.writeText(text);
  };

  const handleFeedback = async (isPositive: boolean) => {
    if (!conversationId || !model_id) return;

    const newFeedback = feedback === isPositive ? null : isPositive;
    setFeedback(newFeedback);

    await submitMessageFeedback(
      message.id,
      conversationId,
      model_id,
      newFeedback,
      undefined
    );
  };

  return (
    <div className={cn(
      "relative px-4",
      isUser ? "bg-background" : "bg-background"
    )}>
      <div className="max-w-[680px] mx-auto w-full py-6">
        {isUser ? (
          // User message - with sandy tan background
          <div className="text-foreground text-[15px] leading-[1.8] bg-primary/30 border border-primary/40 rounded-xl px-5 py-3 w-fit ml-auto">
            {extractTextFromMessageParts(message)}
          </div>
        ) : (
          // Assistant message
          <div>
            {/* AI label */}
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-primary rounded">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-foreground text-sm font-medium">{modelName || "AI Assistant"}</span>
            </div>

            {/* Message content */}
            <div className="text-foreground text-[15px] leading-[1.8] prose-mobile">
              <MarkdownContent 
                markdown={extractTextFromMessageParts(message)} 
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4 -ml-1">
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-muted rounded-lg transition-colors group"
                title="Copy"
              >
                <Copy className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </button>

              <div className="flex items-center ml-auto gap-2">
                <button
                  onClick={() => handleFeedback(true)}
                  className={cn(
                    "p-2 rounded-lg transition-colors group",
                    feedback === true
                      ? "bg-green-500/10 text-green-400"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                  title="Good response"
                >
                  <ThumbsUp className="h-4 w-4" />
                </button>

                <button
                  onClick={() => handleFeedback(false)}
                  className={cn(
                    "p-2 rounded-lg transition-colors group",
                    feedback === false
                      ? "bg-red-500/10 text-red-400"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                  title="Poor response"
                >
                  <ThumbsDown className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setShowCommentInput(!showCommentInput)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors group"
                  title="Add comment"
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </button>
              </div>
            </div>

            {/* Comment input */}
            {showCommentInput && (
              <div className="mt-2 bg-muted rounded-lg p-3">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add feedback comment..."
                  className="w-full px-3 py-2 text-sm bg-background rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <div className="flex justify-end mt-2 gap-2">
                  <button
                    onClick={() => {
                      setShowCommentInput(false);
                      setComment("");
                    }}
                    className="text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (comment.trim() && conversationId && model_id) {
                        await submitMessageFeedback(
                          message.id,
                          conversationId,
                          model_id,
                          feedback,
                          comment
                        );
                        setComment("");
                        setShowCommentInput(false);
                      }
                    }}
                    className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

const MobileChatBox = memo<MobileChatBoxProps>(({
  messages,
  isLoading,
  conversationId,
  model_id,
  modelName
}) => {
  // Group messages by time
  const groupedMessages = messages.reduce((acc, message, index) => {
    const prevMessage = messages[index - 1];
    const currentTime = message.created_at ? new Date(message.created_at) : new Date();
    const prevTime = prevMessage && prevMessage.created_at ? new Date(prevMessage.created_at) : null;

    // Show time if it's the first message or more than 5 minutes apart
    const showTime = !prevTime ||
      (currentTime.getTime() - prevTime.getTime()) > 5 * 60 * 1000;

    if (showTime) {
      acc.push({
        type: 'time',
        time: currentTime,
        id: `time-${index}`
      });
    }

    acc.push({
      type: 'message',
      message,
      id: message.id
    });

    return acc;
  }, [] as any[]);

  return (
    <div className="flex-1 overflow-y-auto pb-4">
      {groupedMessages.map((item) => {
        if (item.type === 'time') {
          return (
            <div key={item.id} className="text-center py-3">
              <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                {formatTime(item.time)}
              </span>
            </div>
          );
        }

        return (
          <MessageBubble
            key={item.id}
            message={item.message}
            conversationId={conversationId}
            model_id={model_id}
            modelName={modelName}
          />
        );
      })}

      {isLoading && (
        <div className="flex gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-medium text-primary">AI</span>
          </div>
          <div className="bg-muted/50 rounded-2xl px-4 py-3">
            <TypingIndicator />
          </div>
        </div>
      )}
    </div>
  );
});

MobileChatBox.displayName = "MobileChatBox";

// Helper function to format time
function formatTime(date: Date) {
  if (!date || isNaN(date.getTime())) {
    return '';
  }
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

export default MobileChatBox;
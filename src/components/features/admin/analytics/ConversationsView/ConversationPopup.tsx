import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Profile, Model, Conversation, Message } from "@/lib/supabase/types"
import ChatBox from "@/components/features/chat/web/ChatBox/ChatBox";
import { getConversationFeedback } from "@/actions/chat/feedback";
import { ThumbsUp, ThumbsDown, MessageSquare, User as UserIcon, Calendar, Bot, Clock } from "lucide-react";

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

interface ConversationPopupProps {
  activeConversation: Conversation | null;
  setActiveConversation: (conversation_id: string | null) => void;
  activeConvoMessages: Message[];
  getUserById: (user_id: string) => Profile | undefined;
  getModelById: (model_id: string) => Model | undefined;
}

interface MessageFeedback {
  id: string;
  message_id: string;
  conversation_id: string;
  model_id: string;
  user_id: string;
  positive: boolean | null;
  comment: string | null;
  created_at: string;
}

const ConversationPopup: React.FC<ConversationPopupProps> = ({
  activeConversation,
  setActiveConversation,
  activeConvoMessages,
  getUserById,
  getModelById,
}) => {
  const [feedbackData, setFeedbackData] = useState<MessageFeedback[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    async function fetchFeedback() {
      if (activeConversation?.id) {
        setLoadingFeedback(true);
        try {
          const feedback = await getConversationFeedback(activeConversation.id);
          setFeedbackData(feedback as MessageFeedback[]);
        } catch (error) {
          console.error("Error fetching feedback:", error);
        } finally {
          setLoadingFeedback(false);
        }
      }
    }

    fetchFeedback();
  }, [activeConversation?.id]);

  // Group feedback by message
  // Need to match by BOTH database UUID and ai_sdk_id since frontend uses ai_sdk_id as the ID
  const feedbackByMessage = useMemo(() => {
    return feedbackData.reduce((acc, feedback) => {
      if (!acc[feedback.message_id]) {
        acc[feedback.message_id] = [];
      }
      acc[feedback.message_id].push(feedback);
      return acc;
    }, {} as Record<string, MessageFeedback[]>);
  }, [feedbackData]);

  // Helper to get feedback for a message (handles both UUID and ai_sdk_id)
  const getFeedbackForMessage = useCallback((message: Message): MessageFeedback[] => {
    // Try direct match first (if message ID is the database UUID)
    if (feedbackByMessage[message.id]) {
      return feedbackByMessage[message.id];
    }

    // Try matching by ai_sdk_id
    // Find the actual database message that matches this frontend message
    const dbMessage = activeConvoMessages.find(m =>
      m.ai_sdk_id === message.id || m.id === message.id
    );

    if (dbMessage && feedbackByMessage[dbMessage.id]) {
      return feedbackByMessage[dbMessage.id];
    }

    return [];
  }, [feedbackByMessage, activeConvoMessages]);

  // Get message index for positioning
  const getMessageIndex = (messageId: string) => {
    return activeConvoMessages.findIndex(m => m.id === messageId);
  };

  // Debug: Log to help diagnose matching issues
  useEffect(() => {
    if (feedbackData.length > 0 && activeConvoMessages.length > 0) {
      console.log('🔍 [ConversationPopup] Feedback matching debug:', {
        feedbackCount: feedbackData.length,
        feedbackMessageIds: feedbackData.map(f => f.message_id).slice(0, 3),
        messageCount: activeConvoMessages.length,
        messageIds: activeConvoMessages.map(m => ({ id: m.id, ai_sdk_id: m.ai_sdk_id })).slice(0, 3),
        matchingMessages: activeConvoMessages.filter(m => getFeedbackForMessage(m).length > 0).length,
      });
    }
  }, [feedbackData, activeConvoMessages, getFeedbackForMessage]);

  // If no conversation is active, don't render the popup at all
  if (!activeConversation) return null;

  return (
    <div className="relative bg-background rounded-2xl shadow-2xl border border-border p-0 overflow-hidden h-[90vh] w-[95vw] max-w-7xl flex animate-fadeIn">
      {/* Left Column - Details & Feedback */}
      <div className="w-[400px] border-r border-border flex flex-col bg-muted/30">
        {/* Header with close button */}
        <div className="relative p-6 border-b border-border">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-foreground">Conversation Details</h3>
            <button
              onClick={() => setActiveConversation(null)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Conversation Details */}
        <div className="p-6 space-y-4">
          {/* User Info */}
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <UserIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">User</p>
              <p className="text-sm text-muted-foreground">{getUserById(activeConversation.user)?.email}</p>
            </div>
          </div>

          {/* Model Info */}
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Bot className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Model</p>
              <p className="text-sm text-muted-foreground">{getModelById(activeConversation?.model ?? "")?.nice_name || "Unknown"}</p>
            </div>
          </div>

          {/* Date Info */}
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Created</p>
              <p className="text-sm text-muted-foreground">
                {new Date(activeConversation.created_at!).toLocaleString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Duration Info */}
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Duration</p>
              <p className="text-sm text-muted-foreground">{activeConvoMessages.length} messages</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="px-6">
          <div className="h-px bg-border" />
        </div>

        {/* Feedback Section */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-6 pb-3">
            <h3 className="text-lg font-semibold text-foreground">Message Feedback</h3>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {loadingFeedback ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : feedbackData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No feedback received yet
              </div>
            ) : (
              <div className="space-y-6">
                {activeConvoMessages
                  .filter(message => getFeedbackForMessage(message).length > 0)
                  .map((message, index) => {
                    const messageFeedback = getFeedbackForMessage(message);

                    return (
                      <div key={message.id} className="space-y-3">
                        {/* Message preview */}
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-sm text-muted-foreground mb-1">
                            Message #{getMessageIndex(message.id) + 1} - {message.role}
                          </p>
                          <p className="text-sm line-clamp-2">
                            {extractTextFromMessageParts(message)}
                          </p>
                        </div>

                        {/* Feedback items */}
                        <div className="pl-4 space-y-2">
                          {messageFeedback.map((feedback) => {
                            const user = getUserById(feedback.user_id);

                            return (
                              <div
                                key={feedback.id}
                                className="border rounded-lg p-3 bg-background hover:bg-muted/20 transition-colors"
                              >
                                {/* User info */}
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                      <UserIcon className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">
                                        {user?.email || "Unknown User"}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(feedback.created_at).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Feedback type */}
                                  <div className="flex items-center gap-1">
                                    {feedback.positive !== null && (
                                      feedback.positive ? (
                                        <ThumbsUp className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <ThumbsDown className="h-4 w-4 text-red-600" />
                                      )
                                    )}
                                  </div>
                                </div>

                                {/* Comment */}
                                {feedback.comment && (
                                  <div className="mt-2 flex items-start gap-2">
                                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                    <p className="text-sm text-foreground">{feedback.comment}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column - Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-border bg-muted/10">
          <h3 className="text-lg font-semibold text-foreground">{activeConversation.title || "Untitled Conversation"}</h3>
          <p className="text-sm text-muted-foreground">ID: {activeConversation.id}</p>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto bg-background">
          <ChatBox messages={activeConvoMessages} isLoading={false} />
        </div>
      </div>
    </div>
  );
};

export default ConversationPopup;

'use client';

import React, { useEffect, useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThumbsUp, ThumbsDown, MessageSquare, User } from "lucide-react";
import { getConversationFeedback } from "@/actions/chat/feedback";
import { getAllMessages } from "@/actions/chat/conversations";
import { Message } from "@/lib/supabase/types";

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

interface MessageFeedbackItem {
  id: string;
  message_id: string;
  conversation_id: string;
  model_id: string;
  user_id: string;
  positive: boolean | null;
  comment: string | null;
  created_at: string;
}

interface FeedbackPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string;
  messages: Message[]; // Kept for backwards compatibility but will fetch from DB
  getUserProfile?: (userId: string) => Promise<{ fullName?: string | null; email: string }> | { fullName?: string | null; email: string } | undefined;
}

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  open,
  onOpenChange,
  conversationId,
  getUserProfile
}) => {
  const [feedbackData, setFeedbackData] = useState<MessageFeedbackItem[]>([]);
  const [dbMessages, setDbMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, { fullName?: string | null; email: string }>>({});

  useEffect(() => {
    async function fetchData() {
      if (conversationId && open) {
        setLoading(true);
        try {
          // Fetch both feedback and database messages in parallel
          const [feedback, messages] = await Promise.all([
            getConversationFeedback(conversationId),
            getAllMessages(conversationId)
          ]);

          setFeedbackData(feedback);
          setDbMessages(messages);

          // Fetch user profiles for all unique user IDs in feedback
          if (getUserProfile) {
            const uniqueUserIds = Array.from(new Set(feedback.map(f => f.user_id)));
            const profilePromises = uniqueUserIds.map(async (userId) => {
              try {
                const result = getUserProfile(userId);
                const profile = result instanceof Promise ? await result : result;
                return { userId, profile: profile || { email: userId, fullName: null } };
              } catch (error) {
                console.error(`Error fetching profile for user ${userId}:`, error);
                return { userId, profile: { email: userId, fullName: null } };
              }
            });

            const profiles = await Promise.all(profilePromises);
            const profilesMap = profiles.reduce((acc, { userId, profile }) => {
              acc[userId] = profile;
              return acc;
            }, {} as Record<string, { fullName?: string | null; email: string }>);

            setUserProfiles(profilesMap);
          }
        } catch (error) {
          console.error("Error fetching feedback:", error);
        } finally {
          setLoading(false);
        }
      }
    }

    fetchData();
  }, [conversationId, open, getUserProfile]);

  // Group feedback by message
  // Need to match by BOTH database UUID and ai_sdk_id since frontend uses ai_sdk_id as the ID
  const feedbackByMessage = feedbackData.reduce((acc, feedback) => {
    if (!acc[feedback.message_id]) {
      acc[feedback.message_id] = [];
    }
    acc[feedback.message_id].push(feedback);
    return acc;
  }, {} as Record<string, MessageFeedbackItem[]>);

  // Helper to get feedback for a message - now using database messages
  const getFeedbackForMessage = useCallback((message: Message): MessageFeedbackItem[] => {
    // Direct match on database UUID (feedback.message_id === message.id)
    return feedbackByMessage[message.id] || [];
  }, [feedbackByMessage]);

  // Get message index for positioning
  const getMessageIndex = (messageId: string) => {
    return dbMessages.findIndex(m => m.id === messageId);
  };

  // Debug: Log to help diagnose matching issues
  useEffect(() => {
    if (feedbackData.length > 0 && dbMessages.length > 0) {
      console.log('🔍 [FeedbackPanel] Feedback matching debug:', {
        feedbackCount: feedbackData.length,
        feedbackMessageIds: feedbackData.map(f => f.message_id).slice(0, 3),
        messageCount: dbMessages.length,
        messageIds: dbMessages.map(m => ({ id: m.id, ai_sdk_id: m.ai_sdk_id })).slice(0, 3),
        matchingMessages: dbMessages.filter(m => getFeedbackForMessage(m).length > 0).length,
      });
    }
  }, [feedbackData, dbMessages, getFeedbackForMessage]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Message Feedback</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
          {loading || dbMessages.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : feedbackData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No feedback received yet
            </div>
          ) : (
            <div className="space-y-6">
              {dbMessages
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
                          const user = userProfiles[feedback.user_id] || { email: feedback.user_id, fullName: null };

                          return (
                            <div
                              key={feedback.id}
                              className="border rounded-lg p-3 bg-background hover:bg-muted/20 transition-colors"
                            >
                              {/* User info */}
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">
                                      {user?.fullName || user?.email || "Unknown User"}
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
      </SheetContent>
    </Sheet>
  );
}
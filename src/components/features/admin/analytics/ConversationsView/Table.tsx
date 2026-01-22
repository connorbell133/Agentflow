"use client";

import React from "react";
import GenericTable from "@/components/shared/tables/BaseTable";
import { Group, GroupMap, Organization, Conversation, Profile, Model } from "@/lib/supabase/types"
import { useAdminData } from "@/contexts/AdminDataContext";
import ConversationPopup from "./ConversationPopup";
import LoadingButton from "@/components/shared/buttons/LoadingButton";
import { TableSkeleton } from "@/components/shared/loading/SkeletonLoader";
import { useState, useEffect } from "react";
import { getConversationWithMessages } from "@/actions/chat/conversations";
import { getConversationsFeedbackSummary } from "@/actions/chat/feedback";
import { createLogger } from "@/lib/infrastructure/logger";
import { ConversationFiltersComponent } from "./ConversationFilters";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";

const logger = createLogger('ConversationTable');

interface ConversationTableProps {
  users: Profile[];
  groups: Group[];
  org: Organization;
  userGroups: GroupMap[];
  updateUserGroup: (user_id: string, group: string) => void;
  models?: Model[];
}


const ConversationTable: React.FC<ConversationTableProps> = ({ users, org }) => {
  // Use centralized admin data
  const { conversations, models, isLoading, loadMoreConversations, conversationFilters, setConversationFilters } = useAdminData();

  // Helper to get model by ID
  const getModelById = (id: string) => models.find((model) => model.id === id);

  // Debug logging
  logger.debug('ConversationTable Debug:', {
    org_id: org.id,
    conversationsCount: conversations.data.length,
    isLoading,
    usersCount: users.length
  });

  // Use the passed users instead of calling the hook again
  const getUserById = (id: string) => users.find(user => user.id === id);
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());

  // Feedback summary state
  const [feedbackSummary, setFeedbackSummary] = useState<Record<string, {
    totalCount: number;
    positiveCount: number;
    negativeCount: number;
    commentCount: number;
  }>>({});

  // Conversation selection state
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [currentConversationMessages, setCurrentConversationMessages] = useState<any[]>([]);

  // Fetch feedback summary when conversations change
  useEffect(() => {
    async function fetchFeedbackSummary() {
      if (conversations.data.length > 0) {
        const conversationIds = conversations.data.map(c => c.id);
        const summary = await getConversationsFeedbackSummary(conversationIds);

        console.log('Feedback summary received:', summary);

        const summaryMap: Record<string, any> = {};
        summary.forEach(item => {
          summaryMap[item.conversationId] = {
            totalCount: item.totalCount,
            positiveCount: item.positiveCount,
            negativeCount: item.negativeCount,
            commentCount: item.commentCount
          };
        });

        console.log('Feedback summary map:', summaryMap);
        setFeedbackSummary(summaryMap);
      }
    }

    fetchFeedbackSummary();
  }, [conversations.data]);

  const handleSelectConversation = async (conversationId: string) => {
    setLoadingDetails(prev => new Set(prev).add(conversationId));
    try {
      // Find the conversation and set it as current
      const conversation = conversations.data.find(c => c.id === conversationId);
      if (conversation) {
        setCurrentConversation(conversation);

        const messages = await getConversationWithMessages(conversationId);
        logger.debug('messages', messages);
        setCurrentConversationMessages(messages.messages);
      }
    } finally {
      setLoadingDetails(prev => {
        const newSet = new Set(prev);
        newSet.delete(conversationId);
        return newSet;
      });
    }
  };

  const renderRow = (
    conversation: Conversation,
    index: number,
    toggleSelect: (id: string) => void
  ) => {
    const feedback = feedbackSummary[conversation.id] || {
      totalCount: 0,
      positiveCount: 0,
      negativeCount: 0,
      commentCount: 0
    };

    return (
      <tr key={conversation.id}>
        <td className="py-4 px-6">{getUserById(conversation.user)?.email}</td>
        <td className="py-4 px-6">
          {new Date(conversation.created_at).toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </td>
        <td className="py-4 px-6">{conversation.title}</td>
        <td className="py-4 px-6">
          {getModelById(conversation.model || '')?.nice_name || "Unknown"}
        </td>
        <td className="py-4 px-6">
          <div className="flex items-center justify-center">
            {feedback.negativeCount > 0 ? (
              <ThumbsDown className="h-4 w-4 text-red-600" />
            ) : feedback.positiveCount > 0 ? (
              <ThumbsUp className="h-4 w-4 text-green-600" />
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </td>
        <td className="py-4 px-6">
          <LoadingButton
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
            onClick={() => handleSelectConversation(conversation.id)}
            loading={loadingDetails.has(conversation.id)}
            loadingText="Loading..."
          >
            Details
          </LoadingButton>
        </td>
      </tr>
    );
  };

  if (isLoading && conversations.data.length === 0) {
    return <TableSkeleton rows={5} cols={5} />;
  }

  return (
    <>
      <ConversationFiltersComponent
        users={users}
        models={models}
        filters={conversationFilters}
        onFiltersChange={setConversationFilters}
      />
      {/* Show empty state when no conversations exist */}
      {!isLoading && conversations.data.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground border rounded-lg">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground">No conversations found</h3>
          <p className="mt-2 text-sm">
            {Object.keys(conversationFilters).length > 0
              ? "No conversations match the selected filters. Try adjusting your filter criteria."
              : "Organization members haven't started any conversations yet. Conversations will appear here once users begin chatting with AI models."}
          </p>
        </div>
      ) : (
        <GenericTable
          data={conversations.data}
          headers={["User", "Date", "First Message", "Model", "Feedback", "Actions"]}
          renderRow={renderRow}
          getId={(user) => user.id}
        />
      )}
      {/* Load more button for pagination */}
      {conversations.hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMoreConversations}
            disabled={conversations.isLoading}
            className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50"
          >
            {conversations.isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
      {currentConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <ConversationPopup
            activeConversation={currentConversation}
            setActiveConversation={(id) => setCurrentConversation(id ? conversations.data.find(c => c.id === id) || null : null)}
            activeConvoMessages={currentConversationMessages}
            getUserById={getUserById}
            getModelById={getModelById}
          />
        </div>
      )}
    </>
  );
};

export default ConversationTable;

import React from "react";
import { cn } from "@/utils/cn";
import { groupConversations } from "@/services/conversation/grouping";
import { Conversation } from "@/lib/supabase/types"
import { ConversationListProps } from "./ConversationList.types";
import { EmptyState } from "@/components/shared/EmptyState/EmptyState";
import { ChatEmptyIcon } from "@/components/shared/EmptyState/ChatEmptyIcon";
import { IconPlus } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import LoadingSpinner from "@/components/shared/loading/LoadingSpinner";


interface ConvoListObjectProps {
  conversation: Conversation;
  setConversation: (conversationId: string | null) => void;
  selectedConversation: Conversation | null | undefined;
  groupName: string;
  index: number;
}
const ConvoListObject: React.FC<ConvoListObjectProps> = ({
  conversation,
  setConversation,
  selectedConversation,
  groupName,
  index,
}) => {
  return (
    <li
      className={cn(
        "relative group rounded-lg active:opacity-90",
        selectedConversation?.id === conversation.id
          ? "bg-sidebar-accent"
          : "bg-sidebar/50 hover:bg-sidebar-accent/50"
      )}
    >
      <button
        onClick={() => setConversation(conversation.id)}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 w-full text-left",
          selectedConversation?.id === conversation.id
            ? "text-sidebar-foreground"
            : conversation.title
              ? "text-sidebar-foreground/50"
              : "text-sidebar-foreground/30"
        )}
      >
        <div
          className="relative grow overflow-hidden whitespace-nowrap text-ellipsis"
          dir="auto"
          title={conversation.title || "Untitled"}
        >
          <span className="text-sm h-fit truncate block">
            {conversation.title || "Untitled"}
          </span>
        </div>
      </button>
    </li>
  );
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  setConversation,
  selectedConversation,
  newConversation,
  isLoading,
  hasModels = true,
}) => {
  const groupedConversations = groupConversations(conversations);

  if (isLoading) {
    return (
      <div className="flex-1 min-h-[400px] px-2 py-2">
        <div className="flex items-center gap-2 px-2 py-2 text-xs text-sidebar-foreground/70">
          <LoadingSpinner size="sm" className="border-muted-foreground/30 border-t-primary" />
          <span>Loading conversations…</span>
        </div>
        <ol className="flex flex-col gap-px">
          {Array.from({ length: 6 }).map((_, idx) => (
            <li key={idx} className="rounded-lg bg-sidebar/50">
              <div className="flex items-center gap-2 px-2 py-1.5 w-full">
                <Skeleton className="h-4 w-8 shrink-0 rounded-sm bg-primary/10" />
                <Skeleton className="h-4 w-40 md:w-52 lg:w-64 bg-primary/10" />
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <EmptyState
          icon={<ChatEmptyIcon className="w-20 h-20 sm:w-24 sm:h-24 text-sidebar-foreground/40" />}
          title={hasModels ? "Start your first conversation" : "No models available"}
          description={hasModels
            ? "Begin exploring AI capabilities by creating a new chat"
            : "You need access to AI models to start chatting"}
          action={
            newConversation && hasModels && (
              <button
                onClick={newConversation}
                className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <IconPlus className="w-4 h-4" />
                New Chat
              </button>
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {Object.entries(groupedConversations)
        .filter(([groupName, groupConvos]) => groupConvos.length > 0)
        .map(([groupName, groupConvos]: [string, Conversation[]]) => (
          <div key={groupName} className="first:mt-0">
            <div className="sticky bg-sidebar top-0 z-20">
              <span className="flex h-9 items-center">
                <h2 className="px-2 text-xs font-semibold text-ellipsis overflow-hidden break-all text-sidebar-foreground/70">
                  {groupName}
                </h2>
              </span>
            </div>
            <ol className="flex flex-col gap-px">
              {groupConvos.map((conversation, index) => (
                <ConvoListObject
                  key={conversation.id}
                  conversation={conversation}
                  setConversation={setConversation ?? (() => { })}
                  selectedConversation={selectedConversation ?? null}
                  groupName={groupName}
                  index={index}
                />
              ))}
            </ol>
          </div>
        )
        )}
    </div>
  );
};

export default ConversationList;

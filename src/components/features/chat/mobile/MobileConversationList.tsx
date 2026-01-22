import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Search, Settings, HelpCircle, LogOut, User } from "lucide-react";
import { cn } from "@/utils/cn";
import { Conversation, Message } from "@/lib/supabase/types";
import { useUser } from "@/hooks/auth/use-user";
import { useClerk } from "@clerk/nextjs";
import { DarkModeToggle } from "@/components/shared/theme/DarkModeToggle";
import Image from "next/image";

interface MobileConversationListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
  hasNoModels?: boolean;
}

const ConversationItem = ({
  conversation,
  isActive,
  onClick,
  lastMessage
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  lastMessage?: Message;
}) => {
  const formatDate = (date: string | Date | null) => {
    if (!date) return "";
    const now = new Date();
    const diffTime = now.getTime() - new Date(date).getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return new Date(date).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return new Date(date).toLocaleDateString([], { weekday: 'short' });
    } else {
      return new Date(date).toLocaleDateString([], {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 text-left transition-colors relative",
        isActive
          ? "bg-primary/10 border-l-3 border-l-primary"
          : "hover:bg-muted/50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium text-[15px] truncate pr-2">
              {conversation.title || "New Chat"}
            </h3>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatDate(conversation.created_at)}
            </span>
          </div>

          {lastMessage && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {lastMessage.role === "user" ? "You: " : "AI: "}
              {lastMessage.content}
            </p>
          )}
        </div>
      </div>

      {/* Unread indicator */}
      {/* <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" /> */}
    </button>
  );
};

const MobileConversationList: React.FC<MobileConversationListProps> = ({
  open,
  onOpenChange,
  conversations,
  currentConversation,
  onSelectConversation,
  onNewConversation,
  hasNoModels = false
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const { user, profile } = useUser();
  const { signOut } = useClerk();

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group conversations by date
  const groupedConversations = filteredConversations.reduce((acc, conv) => {
    const date = new Date(conv.created_at!);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let group = "Older";
    if (date.toDateString() === today.toDateString()) {
      group = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      group = "Yesterday";
    } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      group = "This Week";
    }

    if (!acc[group]) acc[group] = [];
    acc[group].push(conv);
    return acc;
  }, {} as Record<string, Conversation[]>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[85%] sm:w-[400px] p-0 bg-card border-r border-border">
        {/* User Profile Section */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center relative overflow-hidden">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name || "User"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="font-medium text-foreground">
                  {profile?.full_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {profile?.email}
                </div>
              </div>
            </div>
            <DarkModeToggle />
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-lg text-sm 
                         focus:outline-none focus:ring-1 focus:ring-ring text-foreground
                         placeholder-muted-foreground"
            />
          </div>
        </div>

        {/* New Chat Button */}
        <div className="px-4 pb-3">
          <Button
            onClick={onNewConversation}
            disabled={hasNoModels}
            className={cn(
              "w-full justify-start gap-3",
              hasNoModels
                ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
            title={hasNoModels ? "You need access to models to start a new chat" : undefined}
          >
            <Plus className="h-5 w-5" />
            New Chat
          </Button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {Object.entries(groupedConversations).map(([group, convs]) => (
            <div key={group}>
              <h4 className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {group}
              </h4>
              {convs.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={currentConversation?.id === conv.id}
                  onClick={() => onSelectConversation(conv)}
                />
              ))}
            </div>
          ))}

          {filteredConversations.length === 0 && (
            <div className="text-center py-12 px-4">
              <p className="text-muted-foreground text-sm">
                {searchQuery ? "No conversations found" : "No conversations yet"}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-border p-4 space-y-2">
          <button className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-lg transition-colors text-foreground">
            <Settings className="h-4 w-4" />
            <span className="text-sm">Settings</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-lg transition-colors text-foreground">
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm">Help & Support</span>
          </button>
          <button
            onClick={async () => await signOut({ redirectUrl: '/' })}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-lg transition-colors text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileConversationList;
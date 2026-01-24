import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Search, Settings, HelpCircle, LogOut, User } from 'lucide-react';
import { cn } from '@/utils/shared/cn';
import { Conversation, Message } from '@/lib/supabase/types';
import { useUser } from '@/hooks/auth/use-user';
import { signOut } from '@/lib/auth/client-helpers';
import { DarkModeToggle } from '@/components/common/theme/DarkModeToggle';
import Image from 'next/image';

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
  lastMessage,
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  lastMessage?: Message;
}) => {
  const formatDate = (date: string | Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diffTime = now.getTime() - new Date(date).getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return new Date(date).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return new Date(date).toLocaleDateString([], { weekday: 'short' });
    } else {
      return new Date(date).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full p-4 text-left transition-colors',
        isActive ? 'bg-primary/10 border-l-3 border-l-primary' : 'hover:bg-muted/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="truncate pr-2 text-[15px] font-medium">
              {conversation.title || 'New Chat'}
            </h3>
            <span className="flex-shrink-0 text-xs text-muted-foreground">
              {formatDate(conversation.created_at)}
            </span>
          </div>

          {lastMessage && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {lastMessage.role === 'user' ? 'You: ' : 'AI: '}
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
  hasNoModels = false,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const { user, profile } = useUser();

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group conversations by date
  const groupedConversations = filteredConversations.reduce(
    (acc, conv) => {
      const date = new Date(conv.created_at!);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let group = 'Older';
      if (date.toDateString() === today.toDateString()) {
        group = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        group = 'Yesterday';
      } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
        group = 'This Week';
      }

      if (!acc[group]) acc[group] = [];
      acc[group].push(conv);
      return acc;
    },
    {} as Record<string, Conversation[]>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[85%] border-r border-border bg-card p-0 sm:w-[400px]">
        {/* User Profile Section */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name || 'User'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="font-medium text-foreground">{profile?.full_name}</div>
                <div className="text-xs text-muted-foreground">{profile?.email}</div>
              </div>
            </div>
            <DarkModeToggle />
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-muted py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* New Chat Button */}
        <div className="px-4 pb-3">
          <Button
            onClick={onNewConversation}
            disabled={hasNoModels}
            className={cn(
              'w-full justify-start gap-3',
              hasNoModels
                ? 'cursor-not-allowed bg-muted text-muted-foreground opacity-50'
                : 'hover:bg-primary/90 bg-primary text-primary-foreground'
            )}
            title={hasNoModels ? 'You need access to models to start a new chat' : undefined}
          >
            <Plus className="h-5 w-5" />
            New Chat
          </Button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {Object.entries(groupedConversations).map(([group, convs]) => (
            <div key={group}>
              <h4 className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group}
              </h4>
              {convs.map(conv => (
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
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="space-y-2 border-t border-border p-4">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-foreground transition-colors hover:bg-muted">
            <Settings className="h-4 w-4" />
            <span className="text-sm">Settings</span>
          </button>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-foreground transition-colors hover:bg-muted">
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm">Help & Support</span>
          </button>
          <button
            onClick={async () => await signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-foreground transition-colors hover:bg-muted"
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

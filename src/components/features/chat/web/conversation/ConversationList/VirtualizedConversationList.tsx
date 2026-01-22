import React, { memo, useMemo, useCallback } from 'react';
import { VariableSizeList as List } from 'react-window';
import { Conversation } from '@/lib/supabase/types';
import { cn } from '@/utils/cn';

interface VirtualizedConversationListProps {
  conversations: Conversation[];
  groupedConversations: { [key: string]: Conversation[] };
  currentConversation: Conversation | null;
  onSelectConversation: (conversationId: string) => void;
  height: number;
  width?: number | string;
}

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  style: React.CSSProperties;
}

// Memoized conversation item to prevent re-renders
const ConversationItem = memo<ConversationItemProps>(({
  conversation,
  isSelected,
  onClick,
  style
}) => {
  return (
    <div style={style}>
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left px-3 py-2 rounded-lg transition-colors duration-200",
          "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
          isSelected && "bg-accent"
        )}
      >
        <h3 className="font-medium text-sm truncate">
          {conversation.title || "New Conversation"}
        </h3>
        <p className="text-xs text-muted-foreground truncate mt-1">
          {conversation.created_at ? new Date(conversation.created_at).toLocaleDateString() : ''}
        </p>
      </button>
    </div>
  );
});
ConversationItem.displayName = 'ConversationItem';

// Section header component
const SectionHeader = memo<{ title: string; style: React.CSSProperties }>(({
  title,
  style
}) => (
  <div style={style} className="px-3 py-1">
    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {title}
    </h2>
  </div>
));
SectionHeader.displayName = 'SectionHeader';

export const VirtualizedConversationList: React.FC<VirtualizedConversationListProps> = memo(({
  conversations,
  groupedConversations,
  currentConversation,
  onSelectConversation,
  height,
  width = '100%'
}) => {
  // Flatten grouped conversations into a single array with headers
  const flattenedItems = useMemo(() => {
    const items: Array<{ type: 'header' | 'conversation'; data: any; id: string }> = [];

    Object.entries(groupedConversations).forEach(([groupName, convos]) => {
      if (convos.length > 0) {
        // Add section header
        items.push({
          type: 'header',
          data: groupName,
          id: `header-${groupName}`
        });

        // Add conversations
        convos.forEach(conv => {
          items.push({
            type: 'conversation',
            data: conv,
            id: conv.id
          });
        });
      }
    });

    return items;
  }, [groupedConversations]);

  // Calculate item heights
  const getItemSize = useCallback((index: number) => {
    const item = flattenedItems[index];
    return item.type === 'header' ? 28 : 60; // Headers are 28px, conversations are 60px
  }, [flattenedItems]);

  // Row renderer
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = flattenedItems[index];

    if (item.type === 'header') {
      return <SectionHeader title={item.data} style={style} />;
    }

    const conversation = item.data as Conversation;
    const isSelected = currentConversation?.id === conversation.id;

    return (
      <ConversationItem
        conversation={conversation}
        isSelected={isSelected}
        onClick={() => onSelectConversation(conversation.id)}
        style={style}
      />
    );
  }, [flattenedItems, currentConversation, onSelectConversation]);

  // If no conversations, show empty state
  if (flattenedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <p className="text-sm text-muted-foreground">No conversations yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Start a new conversation to get started
        </p>
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={flattenedItems.length}
      itemSize={getItemSize}
      width={width}
      overscanCount={5} // Render 5 items outside of visible area for smoother scrolling
      className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
    >
      {Row}
    </List>
  );
});

VirtualizedConversationList.displayName = 'VirtualizedConversationList';

// Export a hook to calculate the list height dynamically
export const useConversationListHeight = () => {
  const [height, setHeight] = React.useState(600);

  React.useEffect(() => {
    const calculateHeight = () => {
      // Calculate based on viewport height minus header and other UI elements
      const viewportHeight = window.innerHeight;
      const headerHeight = 64; // Approximate header height
      const inputAreaHeight = 120; // Approximate input area height
      const padding = 32; // Additional padding

      setHeight(viewportHeight - headerHeight - inputAreaHeight - padding);
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);

    return () => window.removeEventListener('resize', calculateHeight);
  }, []);

  return height;
};
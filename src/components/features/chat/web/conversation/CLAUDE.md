# Conversation Management Components

Components for managing and displaying chat conversations.

## Component Structure
- ConversationList/ - Sidebar list of all user conversations
- ConversationItem - Individual conversation preview
- ConversationSearch - Search and filter functionality
- ConversationActions - Bulk actions and management tools

## Core Features
- Real-time conversation updates
- Unread message indicators
- Last message preview
- Conversation pinning and archiving
- Search by title or content

## Component Details

### ConversationList
- Virtualized scrolling for performance
- Grouped by date (Today, Yesterday, This Week, etc.)
- Drag-and-drop for organization
- Keyboard navigation support
- Empty state for new users

### ConversationItem
```typescript
interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  unreadCount: number;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
}
```

## State Management
- Conversation context for active selection
- Optimistic updates for better UX
- Local storage for user preferences
- WebSocket integration for real-time updates

## Data Fetching
```typescript
// Conversation hook usage
const {
  conversations,
  loading,
  error,
  refetch,
  markAsRead,
  deleteConversation
} = useConversations({
  userId: currentUser.id,
  org_id: organization.id,
  includeArchived: showArchived
});
```

## Search Implementation
- Debounced full-text search
- Filters for date range, model, status
- Search highlighting in results
- Recent searches history
- Export search results

## Performance Optimizations
- Lazy loading of conversation messages
- Incremental search with pagination
- Memoized conversation items
- Batch operations for bulk updates
- Efficient re-render prevention

## Keyboard Shortcuts
- `↑/↓` - Navigate conversations
- `Enter` - Select conversation
- `Cmd/Ctrl + K` - Quick search
- `Cmd/Ctrl + N` - New conversation
- `Delete` - Archive conversation

## Conversation Actions
```typescript
// Common conversation operations
const conversationActions = {
  pin: async (id: string) => {
    await updateConversation(id, { pinned: true });
  },
  archive: async (id: string) => {
    await updateConversation(id, { archived: true });
  },
  delete: async (id: string) => {
    if (confirm('Delete this conversation?')) {
      await deleteConversation(id);
    }
  },
  duplicate: async (id: string) => {
    const conv = await getConversation(id);
    await createConversation({ ...conv, title: `${conv.title} (Copy)` });
  }
};
```

## Styling Patterns
- Hover states for interactive elements
- Active conversation highlighting
- Unread badge styling
- Smooth transitions for list updates
- Dark mode support

## Accessibility
- ARIA labels for screen readers
- Keyboard navigation support
- Focus management
- High contrast mode support
- Announce conversation updates

## Testing
```bash
# Run conversation component tests
npm test src/components/features/chat/conversation

# Test specific features
npm test ConversationList.test.tsx
npm test ConversationSearch.test.tsx
```

## Common Commands
```bash
npm run dev                    # Start development server
npm test                      # Run tests
npm run storybook            # View components in isolation
npm run type-check           # TypeScript validation
```
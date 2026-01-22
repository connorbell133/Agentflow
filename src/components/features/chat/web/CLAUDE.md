# Chat Messaging Components

This directory contains the core messaging UI components for the chat platform.

## Component Structure
- ChatBox/ - Message display and rendering with optimized scrolling
- ModelDropdown/ - AI model selection with permissions checking
- TextBox/ - User input handling with file upload support

## Common Patterns
- All components use React.memo for performance optimization
- Messages are typed using `Message` interface from @/db/types
- Empty states are handled with dedicated memoized components
- Real-time updates via conversation hooks from @/hooks/chat

## Component Details

### ChatBox
- Renders message history with markdown support
- Implements virtual scrolling for large conversations
- Shows typing indicators for AI responses
- Handles empty message states gracefully

### ModelDropdown
- Displays available AI models based on user permissions
- Persists model selection per conversation
- Shows model capabilities and pricing info
- Integrates with model permissions from group settings

### TextBox
- Multi-line input with auto-resize
- File upload support with drag-and-drop
- Keyboard shortcuts (Cmd/Ctrl+Enter to send)
- Input validation and character limits

## Testing
```bash
# Run all messaging component tests
npm test src/components/features/chat/messaging

# Run specific component tests
npm test ChatBox.test.tsx
npm test ModelDropdown.test.tsx
```

## Security Considerations
- All user content is sanitized before rendering
- Markdown is processed with DOMPurify to prevent XSS
- File uploads are validated for type and size
- Model selection respects organization permissions

## Performance Optimizations
- Message components are memoized to prevent unnecessary re-renders
- Virtual scrolling for conversations with 100+ messages
- Debounced input handling for real-time features
- Lazy loading of message attachments

## Common Commands
```bash
npm run dev                    # Start development server
npm test                      # Run tests
npm run type-check           # TypeScript validation
npm run lint                 # ESLint checks
```
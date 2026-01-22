# Chat Feature Components

Core chat functionality components for the platform.

## Subdirectory References
See @messaging/CLAUDE.md for messaging UI components
See @content/CLAUDE.md for content rendering components
See @conversation/CLAUDE.md for conversation management
See @invite/CLAUDE.md for user invitation flows

## Architecture Overview
The chat feature is organized into logical subdomains:
- **Messaging** - Input/output UI for chat interactions
- **Content** - Rendering various message formats safely
- **Conversation** - Managing conversation lifecycle
- **Invite** - User invitation and onboarding

## State Management
- Conversation context provides active chat state
- Message optimistic updates for instant feedback
- Model selection persisted per conversation
- Real-time sync via WebSocket connections

## Data Flow
```typescript
// Typical chat data flow
User Input (TextBox) 
  → Send Message Action 
  → Optimistic Update 
  → API Call 
  → Model Processing 
  → Response Stream 
  → Message Render (ChatBox)
```

## Common Hooks
```typescript
import { useConversation } from '@/hooks/chat/useConversation';
import { useMessages } from '@/hooks/chat/useMessages';
import { useModels } from '@/hooks/chat/useModels';
import { useStreamResponse } from '@/hooks/chat/useStreamResponse';
```

## Performance Considerations
- Virtual scrolling for long conversations
- Message component memoization
- Debounced typing indicators
- Lazy loading of historical messages
- Progressive enhancement for features

## Security Model
- All content sanitized before display
- Model permissions enforced server-side
- File upload validation and scanning
- Rate limiting on message sending
- XSS prevention in all renderers

## Feature Flags
```typescript
const CHAT_FEATURES = {
  VOICE_INPUT: process.env.NEXT_PUBLIC_ENABLE_VOICE === 'true',
  FILE_UPLOAD: process.env.NEXT_PUBLIC_ENABLE_FILES === 'true',
  MARKDOWN: true,
  CODE_HIGHLIGHTING: true,
  LINK_PREVIEWS: true
};
```

## Integration Points
- Clerk authentication for user identity
- Stripe for usage billing
- OpenAI/Anthropic APIs for AI models
- Upstash for rate limiting
- PostgreSQL for persistence

## Testing Strategy
```bash
# Run all chat feature tests
npm test src/components/features/chat

# Run integration tests
npm run test:integration -- --grep "chat"

# Component testing in isolation
npm run storybook
```

## Common Patterns
- Error boundaries for graceful failures
- Loading states with skeletons
- Empty states with helpful actions
- Responsive design breakpoints
- Accessibility-first approach

## Styling Guidelines
- Tailwind CSS for utility classes
- CSS modules for component styles
- Theme variables for consistency
- Mobile-first responsive design
- Dark mode support throughout

## Common Commands
```bash
npm run dev                    # Start development
npm test                      # Run tests
npm run lint                  # Code quality
npm run type-check           # Type safety
npm run build                # Production build
```
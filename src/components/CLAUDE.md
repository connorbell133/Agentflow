# Component Architecture

The component library for the Agentflow application.

## Directory Structure References

See @features/CLAUDE.md for feature-specific components
See @common/CLAUDE.md for shared, reusable components
See @ui/CLAUDE.md for base UI primitives
See @layout/CLAUDE.md for page layout components

## Organization Principles

### Component Categories

1. **UI Components** (`/ui`)
   - Base primitives built on Radix UI
   - Stateless, presentational components
   - Design system implementation
   - Maximum reusability

2. **Common Components** (`/common`)
   - Shared across features
   - Business-agnostic
   - Examples: tables, modals, loading states

3. **Feature Components** (`/features`)
   - Business logic implementation
   - Feature-specific state
   - Composed from UI and Common

4. **Layout Components** (`/layout`)
   - Page structure
   - Navigation elements
   - Responsive containers

## Import Patterns

```typescript
// Absolute imports preferred
import { Button } from '@/components/ui/button';
import { UserTable } from '@/components/features/admin/management/UserTable';
import { BaseTable } from '@/components/common/tables/BaseTable';

// Type imports
import type { ButtonProps } from '@/types/ui';
import type { Profile } from '@/lib/supabase/types';
```

## Component Guidelines

### Naming Conventions

- PascalCase for components: `UserProfile.tsx`
- Descriptive names: `ConversationList` not `List`
- Index files for clean imports
- Test files as `ComponentName.test.tsx`

### File Structure

```typescript
// Standard component structure
ComponentName/
  ├── ComponentName.tsx      // Main component
  ├── ComponentName.test.tsx // Tests
  ├── ComponentName.types.ts // TypeScript types
  ├── ComponentName.module.css // Styles (if needed)
  └── index.ts              // Export barrel
```

### Component Template

```typescript
import React, { memo } from 'react';
import { cn } from '@/utils/cn';

interface ComponentNameProps {
  // Props definition
  className?: string;
}

export const ComponentName = memo<ComponentNameProps>(({
  className,
  ...props
}) => {
  // Component logic

  return (
    <div className={cn('base-styles', className)} {...props}>
      {/* Component JSX */}
    </div>
  );
});

ComponentName.displayName = 'ComponentName';
```

## State Management Patterns

### Local State

```typescript
// Use for UI-only state
const [isOpen, setIsOpen] = useState(false);
```

### Global State

```typescript
// Use contexts for cross-component state
const { user } = useAuth();
const { theme } = useTheme();
```

### Server State

```typescript
// Use server actions and hooks
const { data, loading } = useQuery();
```

## Performance Optimizations

### Memoization

- Use `React.memo` for expensive components
- `useMemo` for computed values
- `useCallback` for stable function references

### Code Splitting

```typescript
// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

### Virtual Rendering

- Use react-window for long lists
- Implement pagination for tables
- Infinite scroll for feeds

## Styling Approach

### Tailwind CSS

```typescript
// Utility-first approach
<div className="flex items-center gap-4 p-4 rounded-lg bg-white shadow-sm">
```

### CSS Variables

```css
/* Theme variables in globals.css */
:root {
  --primary: 220 90% 56%;
  --secondary: 260 85% 63%;
}
```

### Dark Mode

```typescript
// Automatic dark mode support
<div className="bg-white dark:bg-gray-800">
```

## Accessibility Requirements

### ARIA Labels

```typescript
<button aria-label="Close dialog" onClick={onClose}>
  <X className="h-4 w-4" />
</button>
```

### Keyboard Navigation

- Tab order management
- Focus trapping in modals
- Keyboard shortcuts

### Screen Reader Support

- Semantic HTML usage
- Proper heading hierarchy
- Live regions for updates

## Testing Strategy

### Unit Tests

```typescript
// Component testing with React Testing Library
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
```

### Integration Tests

- Test component interactions
- Mock external dependencies
- Verify data flow

### Visual Testing

```bash
# Storybook for component development
npm run storybook
```

## Common Utilities

```typescript
// Class name merging
import { cn } from '@/utils/cn';

// Date formatting
import { formatDate, formatTimeAgo } from '@/utils/formatters/date';

// Validation
import { validateEmail, validateUrl } from '@/utils/validators';
```

## Component Documentation

- Use JSDoc comments
- Document complex props
- Provide usage examples
- Link to Storybook stories

## Common Commands

```bash
npm run dev                    # Development server
npm test components          # Run component tests
npm run storybook           # Component playground
npm run lint                # Code quality checks
npm run type-check          # TypeScript validation
npm run build              # Production build
```

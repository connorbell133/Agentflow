# Admin Management Components

Administrative UI components for managing users, groups, and AI models.

## Component Organization
- UserTable/ - User management with invites, status tracking, and role assignment
- GroupTable/ - Role and permission group management  
- ModelTable/ - AI model configuration, permissions, and API settings
- AddModel/ - Multi-step wizard for adding new AI providers
- ModelCard - Compact model display component

## Data Flow Patterns
- Uses server actions from @/actions/admin for data mutations
- Real-time updates through custom hooks in @/hooks/organization
- All table components extend BaseTable from @/components/common/tables
- Form validation with Zod schemas

## Component Details

### UserTable
- Display users with avatars, roles, and last activity
- Invite system with email validation
- Bulk actions for user management
- Status indicators (active, pending, inactive)
- Edit modal for user profile updates

### GroupTable
- CRUD operations for permission groups
- Role-based access control configuration
- Model access permissions per group
- Description and metadata management

### ModelTable
- AI model configuration interface
- API key management (encrypted)
- Model-specific settings (temperature, tokens, etc.)
- Provider integration status
- Usage statistics and costs

### AddModel Wizard
- Step-by-step model configuration
- Provider selection (OpenAI, Anthropic, etc.)
- Advanced API configuration with JSON schema validation
- Message format mapping for different providers
- Test connection functionality

## State Management
- Optimistic updates for better UX
- Error handling with user-friendly messages
- Loading states with skeleton components
- Form state persistence during navigation

## Testing
```bash
# Run all management component tests
npm test src/components/features/admin/management

# Run specific component tests
npm test UserTable.test.tsx
npm test ModelTable.test.tsx
npm test GroupTable.test.tsx
```

## Security Considerations
- Admin role verification on all operations
- Organization-scoped data access only
- API keys stored encrypted in database
- Audit logging for sensitive operations
- Input sanitization on all forms

## Common Patterns
```typescript
// Server action usage
import { updateUserProfile } from "@/actions/auth/users";

// Hook usage for data fetching
const { users, loading, error } = useUsers(org_id);

// Table configuration
const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'role', label: 'Role', filterable: true }
];
```

## Performance Optimizations
- Pagination for large datasets
- Debounced search inputs
- Memoized table rows
- Lazy loading of user avatars
- Cached permission checks

## Common Commands
```bash
npm run dev                    # Start development server
npm test                      # Run tests
npm run type-check           # TypeScript validation
npm run db:studio            # View database tables
```
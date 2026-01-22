# Admin Feature Components

Administrative interface components for platform management.

## Subdirectory References
See @management/CLAUDE.md for user, group, and model management
See @analytics/CLAUDE.md for analytics dashboards
See @layout/CLAUDE.md for admin layout structure
See @modals/CLAUDE.md for admin modal components
See @model-wizard/CLAUDE.md for model configuration wizard
See @org_management/CLAUDE.md for organization settings
See @selectors/CLAUDE.md for selection components
See @tabs/CLAUDE.md for tabbed interfaces

## Architecture Overview
Admin features follow a hierarchical permission model:
- **Super Admin** - Full platform access
- **Organization Admin** - Org-wide management
- **Group Admin** - Group-level permissions
- **Model Admin** - Model configuration only

## Permission Checking
```typescript
// Standard permission pattern
import { useAuth } from '@/hooks/auth/useAuth';

const AdminComponent = () => {
  const { user, hasRole } = useAuth();
  
  if (!hasRole('admin')) {
    return <AccessDenied />;
  }
  
  // Admin UI here
};
```

## Common Admin Patterns
- Server-side permission validation
- Audit logging for all changes
- Bulk operations with confirmations
- Export functionality for data
- Real-time updates via webhooks

## Data Management
```typescript
// Admin data operations
import { 
  getOrganizationUsers,
  updateUserRole,
  bulkDeleteUsers,
  exportUserData 
} from '@/actions/admin';
```

## UI Components
- Tables with sorting, filtering, pagination
- Forms with validation and error handling
- Modals for confirmations and editing
- Charts for visual analytics
- Status indicators and badges

## Admin-Specific Hooks
```typescript
import { useAdminAuth } from '@/hooks/admin/useAdminAuth';
import { useOrganizationStats } from '@/hooks/admin/useOrganizationStats';
import { useAuditLog } from '@/hooks/admin/useAuditLog';
import { useBulkOperations } from '@/hooks/admin/useBulkOperations';
```

## Security Considerations
- All admin routes require authentication
- Organization-scoped data access
- Sensitive operations require 2FA
- API keys encrypted at rest
- Session timeout for idle users

## Performance Optimizations
- Lazy loading of admin modules
- Cached permission checks
- Debounced search operations
- Virtualized tables for large datasets
- Background jobs for bulk operations

## Admin Dashboard Features
- Real-time usage statistics
- User activity monitoring
- System health indicators
- Cost tracking and budgets
- Compliance reporting

## Configuration Management
```typescript
// Organization settings
const ORG_SETTINGS = {
  features: {
    sso: boolean,
    customBranding: boolean,
    advancedAnalytics: boolean,
  },
  limits: {
    maxUsers: number,
    maxGroups: number,
    maxModels: number,
  },
  billing: {
    plan: 'enterprise' | 'team' | 'starter',
    cycle: 'monthly' | 'annual',
  }
};
```

## Testing Admin Features
```bash
# Run admin component tests
npm test src/components/features/admin

# Test with admin fixtures
npm run test:admin

# E2E admin flow tests
npm run test:e2e -- --grep "admin"
```

## Common Admin Tasks
- User provisioning and deprovisioning
- Model configuration and testing
- Usage monitoring and reporting
- Security audit reviews
- Billing and subscription management

## Styling Patterns
- Professional, data-dense layouts
- Clear visual hierarchy
- Consistent spacing and alignment
- Accessible color contrasts
- Print-friendly report views

## Common Commands
```bash
npm run dev                    # Development server
npm run test:admin           # Admin-specific tests
npm run db:studio            # Database management
npm run generate:types       # TypeScript types
npm run lint:fix            # Fix code issues
```
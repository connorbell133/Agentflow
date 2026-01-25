# Row-Level Security (RLS) Implementation Guide

## Overview

Agentflow implements a comprehensive Row-Level Security (RLS) system that provides centralized, database-agnostic authorization for all database operations. This system ensures proper tenant isolation, prevents unauthorized data access, and maintains enterprise-grade security standards.

## Architecture

### Core Components

```
src/middleware/rls/
├── types.ts              # Core type definitions
├── engine.ts             # Rule evaluation engine
├── helpers.ts            # Authorization helper functions
├── cache.ts              # LRU caching implementation
├── audit.ts              # Audit logging and violation tracking
├── middleware.ts          # HTTP middleware wrapper
├── db-wrapper.ts          # Database query wrapper
├── index.ts              # Main entry point and exports
├── tables/               # Table-specific RLS rules
│   ├── profiles.ts
│   ├── organizations.ts
│   ├── conversations.ts
│   ├── messages.ts
│   ├── groups.ts
│   ├── models.ts
│   ├── invites.ts
│   └── index.ts
└── README.md             # Comprehensive documentation
```

### Key Features

- **Database Agnostic**: Works with any database system
- **Performance Optimized**: Multi-layer caching with configurable TTLs
- **Type Safe**: Full TypeScript support with compile-time checks
- **Audit Trail**: Complete logging of all access attempts
- **Fail Secure**: Defaults to deny when uncertain

## Security Rules Implemented

### Critical Tables Protected

| Table             | Security Level | Description                           |
| ----------------- | -------------- | ------------------------------------- |
| **conversations** | HIGH           | Prevents cross-user data leakage      |
| **messages**      | HIGH           | Immutable, conversation-scoped access |
| **organizations** | HIGH           | Multi-tenant isolation                |
| **profiles**      | MEDIUM         | User data protection                  |
| **groups**        | MEDIUM         | Permission group management           |
| **models**        | MEDIUM         | AI model access control               |
| **invites**       | MEDIUM         | Invitation access control             |

### Access Patterns

1. **Ownership-based**: Users can only access their own resources
2. **Organization-scoped**: Data isolated by organization
3. **Role-based**: Admins have elevated permissions
4. **Immutable data**: Messages cannot be modified
5. **System-only operations**: Critical operations restricted

## Usage Examples

### API Route Protection

```typescript
import { withRLS, getRLSQuery } from '@/middleware/rls';
import { Action } from '@/middleware/rls/types';

// Option 1: Using withRLS wrapper
export const GET = withRLS(
  {
    tableName: 'conversations',
    action: Action.LIST,
    getResource: async req => {
      const { searchParams } = new URL(req.url);
      return { org_id: searchParams.get('org_id') };
    },
  },
  async (req: NextRequest) => {
    const rlsQuery = await getRLSQuery('conversations');
    const data = await rlsQuery.findMany(conversations);
    return NextResponse.json({ data });
  }
);

// Option 2: Manual RLS check
export async function GET(req: NextRequest) {
  const rlsQuery = await getRLSQuery('conversations');

  try {
    const data = await rlsQuery.findMany(conversations);
    return NextResponse.json({ data });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    throw error;
  }
}
```

### Server Actions

```typescript
import { getRLSQuery } from '@/middleware/rls';

export async function getConversations(userId: string) {
  const rlsQuery = await getRLSQuery('conversations');
  return await rlsQuery.findMany(conversations);
}

export async function createConversation(data: CreateConversationData) {
  const rlsQuery = await getRLSQuery('conversations');
  return await rlsQuery.create(conversations, data);
}
```

### React Components

```tsx
import { RLSGuard, Action } from '@/hooks/useRLS';

function ConversationList() {
  return (
    <RLSGuard tableName="conversations" action={Action.READ}>
      <div>
        {/* This content only renders if user has read access */}
        <ConversationItems />
      </div>
    </RLSGuard>
  );
}
```

## Performance Characteristics

- **< 5ms overhead** per authorization check (with caching)
- **> 90% cache hit rate** expected in production
- **Zero database queries** for cached checks
- **Automatic cache invalidation** on resource changes

### Caching Strategy

1. **Auth Context Cache**: 1-minute TTL for user authentication data
2. **Permission Cache**: 5-minute TTL for authorization results
3. **Query Result Cache**: 30-second TTL for database query results

## Migration Guide

### Before RLS Implementation

```typescript
// ❌ INSECURE: Direct database access
import { db } from '@/db/connection';

const data = await db.select().from(conversations).where(eq(conversations.org_id, org_id)); // Manual filtering - can be bypassed
```

### After RLS Implementation

```typescript
// ✅ SECURE: RLS-protected access
import { withRLS, getRLSQuery } from '@/middleware/rls';

export const GET = withRLS(
  { tableName: 'conversations', action: Action.LIST },
  async (req: NextRequest) => {
    const rlsQuery = await getRLSQuery('conversations');

    // RLS automatically applies tenant filters
    // Cannot access other org's data even if org_id is manipulated
    const data = await rlsQuery.db.select().from(conversations);

    return NextResponse.json({ data });
  }
);
```

### Migration Checklist

For each API route:

- [ ] Remove `import { db } from '@/db/connection'`
- [ ] Add `import { withRLS, getRLSQuery } from '@/middleware/rls'`
- [ ] Identify the table name and action type
- [ ] Wrap handler with `withRLS` or use `getRLSQuery`
- [ ] Remove manual authorization checks
- [ ] Test with different user roles
- [ ] Verify cross-org access is blocked
- [ ] Check audit logs are generated

## Testing Strategy

### Critical Test Cases

1. **Cross-Org Access Prevention**

   ```typescript
   // User from Org A trying to access Org B's conversation
   // Should return 403 Forbidden
   ```

2. **Admin Role Verification**

   ```typescript
   // Non-admin trying to access admin analytics
   // Should return 403 Forbidden
   ```

3. **Invite Hijacking Prevention**

   ```typescript
   // User trying to accept invite meant for someone else
   // Should return 403 Forbidden
   ```

4. **Message Access Control**
   ```typescript
   // User trying to access messages from conversation they don't own
   // Should return 404 Not Found
   ```

### Test Commands

```bash
# Run all tests
npm test

# Test specific routes
npm test src/app/api/admin
npm test src/app/api/conversations
npm test src/app/api/invites

# Test server actions
npm test src/actions/chat/conversations
```

## Security Benefits

### 1. Centralized Authorization

- All access control logic in one place
- No more scattered permission checks
- Consistent security across the application

### 2. Prevents Cross-Tenant Data Leaks

- Admin from Org A cannot access Org B's data
- Automatic filtering based on user context
- Impossible to bypass with URL manipulation

### 3. Automatic Audit Logging

- All RLS violations are logged
- Complete audit trail of access attempts
- Compliance-ready

### 4. Performance Optimized

- Built-in permission caching
- Reduces database queries
- Maintains existing cache strategies

### 5. Developer Experience

- Simpler code - less boilerplate
- TypeScript type safety maintained
- Clear error messages

## Troubleshooting

### Common Issues

1. **"No rules defined - default deny"**
   - Check if table RLS rules are registered in `src/middleware/rls/tables/index.ts`
   - Verify the table name matches exactly

2. **"Must be organization member"**
   - Check if `buildAuthContext` is correctly determining user's organization
   - Verify user is properly added to organization

3. **"Can only read own invites or be org admin"**
   - Check if `checkOrgAdmin` recognizes organization owners
   - Verify invite field names match schema

4. **Performance Issues**
   - Check cache hit rates in logs
   - Verify caching is enabled and working
   - Monitor database query patterns

### Debug Mode

Enable debug logging to troubleshoot RLS issues:

```bash
DEBUG=RLS:* npm run dev
```

This will show detailed logs of:

- Rule evaluation process
- Cache hits/misses
- Authorization decisions
- Database queries

## Best Practices

1. **Always use RLS**: Never bypass RLS for "convenience"
2. **Test thoroughly**: Verify cross-tenant access is blocked
3. **Monitor logs**: Watch for unexpected authorization failures
4. **Keep rules simple**: Complex rules are harder to debug
5. **Document exceptions**: Any special cases should be well documented

## Future Enhancements

1. **Add more granular permissions**: Resource-level access control
2. **Implement role-based access within orgs**: Fine-grained permissions
3. **Add resource-level permissions**: Individual resource access control
4. **Performance optimization**: Index optimization for RLS queries
5. **Query result caching**: Advanced caching strategies
6. **Batch authorization checks**: Optimize multiple permission checks

## Support

For questions or issues with RLS implementation:

1. Check this documentation first
2. Review the audit logs for authorization failures
3. Enable debug mode for detailed troubleshooting
4. Check the test suite for examples
5. Contact the development team for complex issues

---

_Last Updated: January 2025_
_Version: 1.0_

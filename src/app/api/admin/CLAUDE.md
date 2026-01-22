# Admin API Routes

Administrative API endpoints for platform management.

## Subdirectory References
See @analytics/CLAUDE.md for analytics data endpoints
See @users/CLAUDE.md for user management endpoints

## Route Structure
```
/api/admin/
├── analytics/          # Data analytics and reporting
│   └── conversations/  # Conversation-specific metrics
├── users/             # User management operations
│   ├── add/          # Add users to organization
│   └── remove/       # Remove users from organization
```

## Authentication Pattern
All admin routes require:
1. Valid Clerk authentication
2. Organization membership
3. Admin role verification

```typescript
// Standard auth check
import { auth } from '@clerk/nextjs';
import { isAdmin } from '@/lib/auth/permissions';

export async function GET(req: NextRequest) {
  const { userId, org_id } = auth();
  
  if (!userId || !org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!await isAdmin(userId, org_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Admin logic here
}
```

## Request Validation
```typescript
import { z } from 'zod';

// Define schema
const requestSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['add', 'remove', 'update']),
  data: z.record(z.any()).optional()
});

// Validate request
const body = await req.json();
const validation = requestSchema.safeParse(body);

if (!validation.success) {
  return NextResponse.json({
    error: 'Validation failed',
    issues: validation.error.issues
  }, { status: 400 });
}
```

## Response Standards
```typescript
// Success response
{
  success: true,
  data: {
    // Response data
  },
  metadata: {
    timestamp: string,
    requestId: string
  }
}

// Error response
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

## Error Handling
```typescript
try {
  const result = await performAdminAction(data);
  return NextResponse.json({ success: true, data: result });
} catch (error) {
  console.error('[Admin API]', error);
  
  if (error instanceof ValidationError) {
    return NextResponse.json({ 
      error: { code: 'VALIDATION_ERROR', message: error.message }
    }, { status: 400 });
  }
  
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ 
      error: { code: 'UNAUTHORIZED', message: 'Insufficient permissions' }
    }, { status: 403 });
  }
  
  return NextResponse.json({ 
    error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
  }, { status: 500 });
}
```

## Rate Limiting
```typescript
import { rateLimit } from '@/lib/rate-limit';

// Apply rate limiting
const { success } = await rateLimit.admin.limit(userId);

if (!success) {
  return NextResponse.json({ 
    error: 'Too many requests' 
  }, { status: 429 });
}
```

## Audit Logging
```typescript
// Log admin actions
import { auditLog } from '@/lib/audit';

await auditLog.create({
  userId,
  action: 'USER_ROLE_UPDATED',
  resourceType: 'user',
  resourceId: targetUserId,
  changes: { oldRole, newRole },
  ip: req.ip,
  userAgent: req.headers.get('user-agent')
});
```

## Webhook Notifications
```typescript
// Notify external systems
import { webhookClient } from '@/lib/webhooks';

await webhookClient.send('admin.action', {
  action: 'user.updated',
  actor: userId,
  target: targetUserId,
  timestamp: new Date().toISOString()
});
```

## Performance Patterns
- Response caching for read operations
- Database connection pooling
- Pagination for large datasets
- Field selection to reduce payload
- Background jobs for heavy operations

## Security Headers
```typescript
// Apply security headers
const headers = new Headers({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000',
  'Content-Security-Policy': "default-src 'self'"
});
```

## Testing
```bash
# Test admin endpoints
npm test src/app/api/admin

# Test with fixtures
npm run test:api -- --grep "admin"

# Load testing
npm run test:load -- /api/admin/analytics
```

## Common Commands
```bash
npm run dev                    # Start dev server
npm run test                  # Run tests
npm run db:migrate           # Run migrations
npm run type-check           # TypeScript check
```
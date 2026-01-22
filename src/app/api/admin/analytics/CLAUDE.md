# Analytics API Routes

Server-side analytics data processing and aggregation endpoints.

## Route Structure
- conversations/daily/ - Daily conversation counts and trends
- conversations/daily-v2/ - Optimized version with improved query performance
- conversations/debug/ - Development debugging endpoints for data inspection

## Common Patterns

### Request Validation
```typescript
import { z } from 'zod';

// Standard query schema
const querySchema = z.object({
  org_id: z.string().uuid('Invalid organization ID'),
  days: z.coerce.number().min(1).max(365).default(90).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Validate in route
const validation = querySchema.safeParse(params);
if (!validation.success) {
  return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
}
```

### Database Queries
```typescript
// Date aggregation with Supabase
const dailyStats = await db
  .select({
    date: sql<string>`DATE(${conversations.created_at})::text`,
    count: sql<number>`count(*)`,
    uniqueUsers: sql<number>`count(DISTINCT ${conversations.user})`
  })
  .from(conversations)
  .where(and(
    eq(conversations.org_id, org_id),
    gte(conversations.created_at, startDate)
  ))
  .groupBy(sql`DATE(${conversations.created_at})`)
  .orderBy(asc(sql`DATE(${conversations.created_at})`));
```

## Route Details

### /daily
- Returns daily conversation counts
- Supports date range filtering
- Aggregates by calendar date (UTC)
- Includes zero-count days for complete charts

### /daily-v2
- Improved performance with indexed queries
- Adds unique user counts
- Supports custom aggregation periods
- Better handling of large datasets

### /debug
- Development-only endpoint
- Raw query inspection
- Performance metrics
- Data validation tools

## Security Implementation
```typescript
// Authentication check
import { auth } from '@clerk/nextjs';

const { userId, org_id } = auth();
if (!userId || !org_id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Admin role verification
const user = await getUserWithRole(userId);
if (user.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Performance Optimizations
- Query result caching with Redis
- Database indexes on commonly filtered columns
- Pagination for large result sets
- Response compression for large payloads

## Error Handling
```typescript
try {
  const data = await fetchAnalytics(params);
  return NextResponse.json({ data });
} catch (error) {
  console.error('[Analytics API Error]', error);
  
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}
```

## Response Formats
```typescript
// Success response
{
  data: {
    daily: Array<{ date: string; count: number; }>,
    summary: {
      total: number;
      average: number;
      trend: 'up' | 'down' | 'stable';
    }
  }
}

// Error response
{
  error: string;
  details?: Record<string, any>;
}
```

## Date Handling
- All dates stored in UTC
- Client timezone conversion handled frontend
- DATE() SQL function for day grouping
- ISO 8601 format for API responses

## Testing
```bash
# Test analytics endpoints
npm test src/app/api/admin/analytics

# Test with different date ranges
curl http://localhost:3000/api/admin/analytics/conversations/daily?org_id=xxx&days=30
curl http://localhost:3000/api/admin/analytics/conversations/daily-v2?org_id=xxx&startDate=2024-01-01
```

## Common Commands
```bash
npm run dev                    # Start development server
npm run db:studio            # Inspect database data
npm run type-check           # Validate TypeScript
npm test                     # Run route tests
```
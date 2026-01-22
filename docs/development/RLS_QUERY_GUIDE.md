# RLS Query Implementation Guide

## Overview
This guide explains how to add new queries to database tables using the Row-Level Security (RLS) system.

## Query Patterns

### Pattern A: RLS Helper Methods (Recommended)
```typescript
const rlsQuery = await getRLSQuery('conversations');
const data = await rlsQuery.findById(conversations, id);
const data = await rlsQuery.findMany(conversations, [filters]);
const data = await rlsQuery.create(conversations, data);
const data = await rlsQuery.update(conversations, id, data);
await rlsQuery.delete(conversations, id);
```

### Pattern B: Raw DB Access with RLS Context
```typescript
const rlsQuery = await getRLSQuery('conversations');
const data = await rlsQuery.db
  .select()
  .from(conversations)
  .where(complexConditions);
```

### Pattern C: Tenant-Aware Database
```typescript
const { getTenantDb } = await import('@/lib/db/tenant-db');
const tenantDb = await getTenantDb();
const data = await tenantDb.conversations.findByCustomCriteria(criteria);
```

## Example: Adding New Conversation Query

```typescript
// Add to src/actions/chat/conversations.ts
import { getRLSQuery } from "@/middleware/rls";
import { conversations } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { withCache } from "@/lib/core/cache";
import { withQueryTracking } from "@/utils/helpers/query";
import { createLogger } from "@/lib/infrastructure/logger";

const logger = createLogger("conversations-actions");

export async function getConversationsByModel(
  model_id: string,
  userId: string,
  limit: number = 20
): Promise<Conversation[]> {
  return withCache(
    `conversations:model:${model_id}:${userId}:${limit}`,
    () => withQueryTracking('getConversationsByModel', async () => {
      try {
        const rlsQuery = await getRLSQuery('conversations');
        
        const data = await rlsQuery.findMany(conversations, [
          eq(conversations.model, model_id),
          eq(conversations.user, userId)
        ]);

        logger.debug('Fetched conversations by model', { 
          model_id, userId, count: data.length 
        });

        return data as Conversation[];
      } catch (error) {
        logger.error('Error fetching conversations by model', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          model_id, userId 
        });
        throw error;
      }
    }),
    2 * 60 * 1000 // 2 minutes TTL
  );
}
```

## Security Features

### ✅ Automatic RLS Protection
- **Tenant Isolation**: Users only see data from their organization
- **Ownership Checks**: Users can only access their own resources
- **Admin Access**: Org admins can access for audit purposes
- **Authentication**: All queries require valid authentication

### ⚠️ Manual Considerations
- **Input Validation**: Validate parameters before querying
- **Error Handling**: Proper error messages and logging
- **Rate Limiting**: Consider for expensive queries
- **Caching Strategy**: Choose appropriate cache TTL

## Best Practices

1. **Always use `getRLSQuery('tableName')`** - Never direct DB access
2. **Use RLS methods when possible** - `findById`, `findMany`, `create`, `update`, `delete`
3. **Add proper error handling** - Log errors and provide meaningful messages
4. **Include caching** - Use `withCache` for performance
5. **Add query tracking** - Use `withQueryTracking` for monitoring
6. **Validate inputs** - Check parameters before querying
7. **Maintain backward compatibility** - Return expected data structures

## File Structure

```
src/actions/chat/conversations.ts     # Query functions
src/middleware/rls/tables/            # RLS rules per table
src/middleware/rls/db-wrapper.ts      # RLS query builder
src/middleware/rls/engine.ts          # RLS evaluation engine
```

## Testing

```typescript
export async function testNewQuery() {
  try {
    const conversations = await getConversationsByModel('model-123', 'user-456');
    console.log('Found conversations:', conversations.length);
  } catch (error) {
    console.error('Query failed:', error);
  }
}
```

## Component Usage

```typescript
import { getConversationsByModel } from '@/actions/chat/conversations';

export function ConversationList({ model_id, userId }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  useEffect(() => {
    getConversationsByModel(model_id, userId)
      .then(setConversations)
      .catch(console.error);
  }, [model_id, userId]);
  
  return (
    <div>
      {conversations.map(conv => (
        <div key={conv.id}>{conv.title}</div>
      ))}
    </div>
  );
}
```

## Common Patterns

### Simple Query
```typescript
const data = await rlsQuery.findMany(table, [eq(table.field, value)]);
```

### Complex Query with Joins
```typescript
const data = await rlsQuery.db
  .select()
  .from(table1)
  .leftJoin(table2, eq(table1.id, table2.foreignId))
  .where(conditions);
```

### Search Query
```typescript
const data = await rlsQuery.findMany(table, [
  eq(table.userId, userId),
  sql`${table.title} ILIKE ${`%${searchTerm}%`}`
]);
```

### Aggregation Query
```typescript
const data = await rlsQuery.db
  .select({
    field: table.field,
    count: sql<number>`count(*)`
  })
  .from(table)
  .where(conditions)
  .groupBy(table.field);
```

This guide ensures your queries are **secure**, **performant**, and **maintainable**! 🚀

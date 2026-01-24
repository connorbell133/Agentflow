# Server Actions

Next.js server actions for data mutations and server-side operations.

## Directory Structure

- auth/ - Authentication and user management actions
- admin/ - Administrative operations
- chat/ - Chat and conversation actions
- organization/ - Organization management

## Server Action Patterns

### Basic Structure

```typescript
'use server';

import { auth } from '@/lib/auth/server';
import { createClient } from '@/lib/auth/supabase-server';
import { revalidatePath } from 'next/cache';

export async function actionName(formData: FormData) {
  // 1. Authentication check
  const { userId, org_id } = auth();
  if (!userId) throw new Error('Unauthorized');

  // 2. Input validation
  const data = Object.fromEntries(formData);
  const validated = schema.parse(data);

  // 3. Authorization check
  const hasPermission = await checkPermission(userId, 'action.name');
  if (!hasPermission) throw new Error('Forbidden');

  // 4. Business logic
  const result = await performAction(validated);

  // 5. Revalidate cache
  revalidatePath('/relevant-path');

  return result;
}
```

### Form Integration

```typescript
// In component
import { actionName } from '@/actions/module/actionName';

export function MyForm() {
  return (
    <form action={actionName}>
      <input name="field" required />
      <button type="submit">Submit</button>
    </form>
  );
}
```

### With useFormStatus

```typescript
'use client';

import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button disabled={pending}>
      {pending ? 'Loading...' : 'Submit'}
    </button>
  );
}
```

## Authentication Actions

### User Management

```typescript
// actions/auth/users.ts
export async function updateUserProfile(userId: string, data: ProfileUpdate) {
  const { userId: currentUser } = auth();

  // Check if user can update profile
  if (currentUser !== userId && !isAdmin(currentUser)) {
    throw new Error('Unauthorized');
  }

  return db.update(profiles).set(data).where(eq(profiles.id, userId));
}
```

### Session Management

```typescript
export async function refreshSession() {
  const { userId } = auth();

  await db.update(profiles).set({ lastActiveAt: new Date() }).where(eq(profiles.id, userId));

  revalidatePath('/');
}
```

## Chat Actions

### Message Operations

```typescript
// actions/chat/conversations.ts
export async function sendMessage(conversationId: string, content: string, model_id: string) {
  const { userId } = auth();

  // Validate user has access
  const conversation = await getConversation(conversationId);
  if (conversation.userId !== userId) {
    throw new Error('Unauthorized');
  }

  // Create message
  const message = await db.insert(messages).values({
    conversationId,
    content,
    role: 'user',
    userId,
  });

  // Trigger AI response
  await triggerAIResponse(conversationId, content, model_id);

  revalidatePath(`/chat/${conversationId}`);

  return message;
}
```

### Conversation Management

```typescript
export async function createConversation(title?: string) {
  const { userId, org_id } = auth();

  const [conversation] = await db
    .insert(conversations)
    .values({
      userId,
      org_id,
      title: title || 'New Chat',
    })
    .returning();

  revalidatePath('/chat');
  redirect(`/chat/${conversation.id}`);
}
```

## Admin Actions

### User Administration

```typescript
// actions/admin/users.ts
export async function bulkUpdateUserRoles(updates: Array<{ userId: string; role: string }>) {
  const { userId } = auth();

  // Verify admin permissions
  const isUserAdmin = await isAdmin(userId);
  if (!isUserAdmin) {
    throw new Error('Admin access required');
  }

  // Batch update in transaction
  await db.transaction(async tx => {
    for (const update of updates) {
      await tx.update(profiles).set({ role: update.role }).where(eq(profiles.id, update.userId));
    }
  });

  revalidatePath('/admin/users');
}
```

## Error Handling

### Action Error Types

```typescript
export class ActionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
  }
}

export class ValidationError extends ActionError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class AuthorizationError extends ActionError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 403);
  }
}
```

### Error Handling Pattern

```typescript
export async function safeAction<T>(fn: () => Promise<T>): Promise<{ data?: T; error?: string }> {
  try {
    const data = await fn();
    return { data };
  } catch (error) {
    console.error('[Action Error]', error);

    if (error instanceof ActionError) {
      return { error: error.message };
    }

    return { error: 'An unexpected error occurred' };
  }
}
```

## Validation

### Using Zod

```typescript
import { z } from 'zod';

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  bio: z.string().max(500).optional(),
});

export async function updateProfile(formData: FormData) {
  const data = Object.fromEntries(formData);

  const validated = updateProfileSchema.parse(data);
  // Use validated data
}
```

## Rate Limiting

```typescript
import { rateLimit } from '@/lib/rate-limit';

export async function rateLimitedAction() {
  const { userId } = auth();

  const { success } = await rateLimit.check(userId, 'action-name');
  if (!success) {
    throw new Error('Too many requests');
  }

  // Perform action
}
```

## Testing Server Actions

```typescript
// __tests__/actions/chat.test.ts
import { createConversation } from '@/actions/chat/conversations';
import { auth } from '@clerk/nextjs';

jest.mock('@clerk/nextjs');

describe('Chat Actions', () => {
  test('createConversation requires auth', async () => {
    (auth as jest.Mock).mockReturnValue({ userId: null });

    await expect(createConversation()).rejects.toThrow('Unauthorized');
  });
});
```

## Performance Tips

- Use database transactions for consistency
- Implement proper caching strategies
- Batch operations when possible
- Use revalidatePath sparingly
- Consider background jobs for heavy tasks

## Common Commands

```bash
npm test actions            # Test server actions
npm run type-check         # TypeScript validation
npm run lint              # Code quality
```

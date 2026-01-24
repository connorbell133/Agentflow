# Supabase Client Library

This directory contains Supabase client configurations for authentication and database access.
All clients use Supabase Auth for authentication and Row Level Security (RLS) for data isolation.

## Supabase Auth Integration

The integration uses Supabase Auth for authentication:

1. Supabase Auth manages user sessions via HTTP-only cookies
2. RLS policies use `auth.uid()` to access the authenticated user ID
3. All queries are automatically filtered based on the authenticated user
4. Session tokens are automatically refreshed by middleware

## Files

### `client.ts` - Browser Client

Used in client-side React components and hooks. Automatically uses the current Supabase Auth session.

```typescript
'use client';
import { createClient } from '@/lib/auth/supabase-client';

function MyComponent() {
  const supabase = createClient();
  // Queries now respect RLS policies based on authenticated user
  const { data } = await supabase.from('conversations').select();
}
```

### `server.ts` - Server Client

Used in Server Components, Server Actions, and API Routes. Automatically uses the current Supabase Auth session.

```typescript
import { createClient } from '@/lib/auth/supabase-server';

const supabase = await createClient();
// RLS automatically filters by the authenticated user
const { data } = await supabase.from('conversations').select();
```

### `admin.ts` - Admin Client (Service Role)

Used for operations that bypass RLS (cron jobs, admin operations, system tasks).

```typescript
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const supabase = getSupabaseAdminClient()
await supabase.from('profiles').upsert({ id: userId, ... })
```

### `types.ts` - TypeScript Types

Database types generated from schema for type-safe queries.

### `index.ts` - Barrel Export

Central export point for all clients and types.

## Usage Patterns

### Client Components

```typescript
'use client';
import { createClient } from '@/lib/auth/supabase-client';
import { useEffect, useState } from 'react';

function MyComponent() {
  const supabase = createClient();
  const [data, setData] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from('conversations').select();
      setData(data || []);
    }
    fetchData();
  }, []);
}
```

### Server Actions

```typescript
'use server';
import { createClient } from '@/lib/auth/supabase-server';

export async function myAction() {
  const supabase = await createClient();
  // RLS automatically filters by authenticated user
  const { data, error } = await supabase.from('conversations').select('*');
  return { data, error };
}
```

### API Routes

```typescript
import { createClient } from '@/lib/auth/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  // RLS enforced - only returns data the user can access
  const { data } = await supabase.from('profiles').select();
  return NextResponse.json(data);
}
```

### Admin Operations (bypasses RLS)

```typescript
import { getSupabaseAdminClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const supabase = getSupabaseAdminClient() // Bypasses RLS
  await supabase.from('profiles').upsert({...})
}
```

## Environment Variables

Required in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-side only
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## RLS Policies

RLS policies use Supabase Auth's `auth.uid()` function:

```sql
-- Example: Users can only view their own conversations
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
TO authenticated
USING (auth.uid() = "user");
```

## Security Notes

1. **Never expose `SUPABASE_SERVICE_ROLE_KEY`** to the client
2. **RLS is enforced** via Supabase Auth sessions
3. **Admin client bypasses RLS** - use only for system operations (cron, admin)
4. **Session required** - Client components require an active Supabase Auth session
5. **Server uses auth()** - Automatically gets session from Supabase Auth middleware
6. **Automatic refresh** - Sessions are automatically refreshed by middleware

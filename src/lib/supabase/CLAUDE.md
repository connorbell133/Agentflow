# Supabase Client Library with Clerk Integration

This directory contains Supabase client configurations that integrate with Clerk for authentication.
All clients use Clerk session tokens to enable Row Level Security (RLS) based on the Clerk user ID.

## Clerk + Supabase Integration

The integration uses Clerk as a third-party auth provider for Supabase:
1. Clerk session tokens contain the user ID in the `sub` claim
2. Supabase RLS policies use `auth.jwt()->>'sub'` to access the Clerk user ID
3. All queries are automatically filtered based on the authenticated user

## Files

### `client.ts` - Browser Client with Clerk Auth
Used in client-side React components and hooks. Requires Clerk session.

```typescript
'use client'
import { useSession } from '@clerk/nextjs'
import { createClerkSupabaseClient } from '@/lib/supabase/client'

function MyComponent() {
  const { session } = useSession()
  const supabase = createClerkSupabaseClient(() => session?.getToken() ?? null)
  // Queries now respect RLS policies based on Clerk user ID
  const { data } = await supabase.from('conversations').select()
}
```

### `server.ts` - Server Client with Clerk Auth
Used in Server Components, Server Actions, and API Routes. Automatically uses Clerk's `auth()`.

```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server'

const supabase = await createSupabaseServerClient()
// RLS automatically filters by the authenticated Clerk user
const { data } = await supabase.from('conversations').select()
```

### `admin.ts` - Admin Client (Service Role)
Used for operations that bypass RLS (webhooks, cron jobs, admin operations).

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
'use client'
import { useSession, useUser } from '@clerk/nextjs'
import { createClerkSupabaseClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

function MyComponent() {
  const { user } = useUser()
  const { session } = useSession()
  const [data, setData] = useState([])

  const supabase = createClerkSupabaseClient(() => session?.getToken() ?? null)

  useEffect(() => {
    if (!user) return

    async function fetchData() {
      const { data } = await supabase.from('conversations').select()
      setData(data || [])
    }
    fetchData()
  }, [user])
}
```

### Server Actions
```typescript
'use server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function myAction() {
  const supabase = await createSupabaseServerClient()
  // RLS automatically filters by authenticated user
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
  return { data, error }
}
```

### API Routes
```typescript
import { createSupabaseServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  // RLS enforced - only returns data the user can access
  const { data } = await supabase.from('profiles').select()
  return NextResponse.json(data)
}
```

### Webhooks (Admin - bypasses RLS)
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
```

## RLS Policies

RLS policies use Clerk's user ID from the JWT token:
```sql
-- Example: Users can only view their own conversations
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
TO authenticated
USING ((SELECT auth.jwt()->>'sub') = "user");
```

## Security Notes

1. **Never expose `SUPABASE_SERVICE_ROLE_KEY`** to the client
2. **RLS is enforced** via Clerk session tokens
3. **Admin client bypasses RLS** - use only for system operations (webhooks, cron)
4. **Session required** - Client components must have an active Clerk session
5. **Server uses auth()** - Automatically gets token from Clerk middleware

# Supabase Auth Setup Guide

**Last Updated:** January 22, 2026

---

## Overview

AgentFlow uses **Supabase Auth** for authentication and session management. This guide covers setup, configuration, and usage patterns.

## Prerequisites

- Supabase project (local or cloud)
- Node.js 18+
- Basic understanding of Next.js App Router

---

## 🚀 Quick Setup

### 1. Environment Variables

Add these to your `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321  # Local dev
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Getting your keys:**

- **Local:** Run `supabase start` and copy from output
- **Cloud:** Supabase Dashboard → Settings → API

### 2. Enable Email Auth

**In Supabase Dashboard:**

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email settings:
   - **Enable email confirmations:** OFF (for dev) or ON (for production)
   - **Site URL:** `http://localhost:3000` (dev) or your production URL
   - **Redirect URLs:** Add `http://localhost:3000/auth/callback`

### 3. Apply RLS Migration

The RLS migration configures Row-Level Security policies for Supabase Auth.

```bash
# Local development
supabase db reset

# Production
supabase db push
```

This creates policies using `auth.uid()` to automatically filter data by the authenticated user.

### 4. Test Authentication

```bash
npm run dev
```

Visit:

- **Sign up:** http://localhost:3000/sign-up
- **Sign in:** http://localhost:3000/sign-in

---

## 📖 Usage Patterns

### Server-Side (Server Components, Server Actions, API Routes)

```typescript
import { auth } from '@/lib/auth/server'

export default async function Page() {
  const { userId, user, org_id } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return <div>Hello {user.email}</div>
}
```

**API Route Example:**

```typescript
import { auth } from '@/lib/auth/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Your logic here
  return NextResponse.json({ data: 'Protected data' });
}
```

### Client-Side (React Components)

```typescript
'use client'

import { useSession, signOut } from '@/lib/auth/client-helpers'

export function MyComponent() {
  const { data: session, isPending } = useSession()
  const user = session?.user

  if (isPending) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>Not signed in</div>
  }

  return (
    <div>
      <p>Welcome {user.email}</p>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  )
}
```

### Using Supabase Client Directly

**Server-side:**

```typescript
import { createClient } from '@/lib/auth/supabase-server';

const supabase = await createClient();

// Get user
const {
  data: { user },
} = await supabase.auth.getUser();

// Query with automatic RLS filtering
const { data } = await supabase.from('conversations').select();
// RLS automatically filters to current user's conversations
```

**Client-side:**

```typescript
'use client';

import { createClient } from '@/lib/auth/supabase-client';

const supabase = createClient();

// Sign in
const { error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// Sign out
await supabase.auth.signOut();

// Listen for auth changes
useEffect(() => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event, session);
  });

  return () => subscription.unsubscribe();
}, []);
```

---

## 🔐 Security Features

### Row-Level Security (RLS)

All database tables are protected by RLS policies that automatically filter data based on the authenticated user:

```sql
-- Example policy (automatically applied)
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
TO authenticated
USING (auth.uid() = "user");
```

**Benefits:**

- ✅ No manual user ID filtering needed
- ✅ Prevents data leaks at the database level
- ✅ Works with all Supabase client libraries
- ✅ Enforced even for admin users (unless using service role)

### User Metadata

Store custom data in `user_metadata`:

```typescript
// During sign up
const { error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: {
      full_name: 'John Doe',
      org_id: 'org_123',
      role: 'member',
    },
  },
});

// Access later
const {
  data: { user },
} = await supabase.auth.getUser();
const orgId = user?.user_metadata?.org_id;
const role = user?.user_metadata?.role;
```

### Session Management

Sessions are automatically managed via HTTP-only cookies:

- **Middleware** refreshes sessions on every request
- **Duration:** 7 days (configurable in Supabase Dashboard)
- **Refresh:** Automatic when user is active

---

## 🎨 Customization

### Custom Sign-In Page

The sign-in page is at `src/app/(auth)/sign-in/page.tsx`:

```typescript
// Customize styling, add OAuth, etc.
const { error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

### Email Templates

Configure in **Supabase Dashboard** → **Authentication** → **Email Templates**:

- Confirmation email
- Password reset email
- Magic link email

### OAuth Providers

To add OAuth (Google, GitHub, etc.):

1. **Enable provider** in Supabase Dashboard → Authentication → Providers
2. **Configure credentials** (Client ID, Secret)
3. **Update sign-in page:**

```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

---

## 🧪 Testing

### Test User Creation

```bash
# Via sign-up page
open http://localhost:3000/sign-up
```

Or programmatically:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, serviceRoleKey);

await supabase.auth.admin.createUser({
  email: 'test@example.com',
  password: 'password123',
  email_confirm: true,
});
```

### Verify RLS Policies

```sql
-- In Supabase Studio SQL Editor
SELECT * FROM conversations;
-- Should only return your conversations
```

---

## 🚨 Troubleshooting

### "Email not confirmed" error

**Solution:**

1. Disable email confirmation: Dashboard → Auth → Email → Disable "Enable email confirmations"
2. Or check email for confirmation link

### Session not persisting

**Solution:**

- Check that middleware is running (`src/middleware.ts`)
- Verify cookies are being set (check browser DevTools)
- Ensure `NEXT_PUBLIC_APP_URL` matches your domain

### RLS blocking queries

**Solution:**

- Verify you're authenticated: `const { user } = await supabase.auth.getUser()`
- Check RLS policies in Supabase Dashboard → Database → Policies
- For admin operations, use service role key (bypasses RLS)

---

## 📚 Additional Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [RLS Policies Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Auth Patterns](https://nextjs.org/docs/app/building-your-application/authentication)

---

## 🎯 Next Steps

1. ✅ Complete this setup
2. 📖 Read [Multi-Tenant Guide](./MULTI_TENANT.md)
3. 🔐 Review [Security Best Practices](./SECURITY.md)
4. 🚀 Deploy to production

---

**Need help?** Check the troubleshooting section above or open an issue on GitHub.

# Supabase Auth Migration - Current Status

**Last Updated:** 2026-01-22
**Status:** 60% Complete - Core infrastructure ready, need to complete remaining files

---

## ✅ Completed Tasks

### Phase 1: Removed Better-Auth

- [x] Deleted all Better-Auth files
- [x] Removed Better-Auth packages from package.json
- [x] Updated .env.example

### Phase 2: Created Supabase Auth Infrastructure

- [x] Created `src/lib/auth/supabase-server.ts` - Server client with @supabase/ssr
- [x] Created `src/lib/auth/supabase-client.ts` - Browser client
- [x] Updated `src/lib/auth/server.ts` - Auth helpers (auth(), requireAuth())
- [x] Updated `src/middleware.ts` - Now uses Supabase Auth session checking
- [x] Created `src/app/auth/callback/route.ts` - Email confirmation handler

### Phase 3: Authentication Pages

- [x] Updated `src/app/(auth)/sign-up/page.tsx` - Uses Supabase Auth
- [x] Updated `src/app/(auth)/sign-in/page.tsx` - Needs update (currently partially done)

---

## 🚧 Remaining Work

### Critical Files to Update (blocks everything else)

#### 1. Complete Sign-In Page

File: `src/app/(auth)/sign-in/page.tsx`

Change line 6 from:

```typescript
import { signIn } from '@/lib/auth/better-auth-client';
```

To:

```typescript
import { createClient } from '@/lib/auth/supabase-client';
```

Then update the handleSubmit function (lines 18-40) to:

```typescript
const supabase = createClient();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message || 'Sign in failed');
    } else {
      router.push(redirect);
      router.refresh();
    }
  } catch (err: any) {
    setError(err?.message || 'An unexpected error occurred');
  } finally {
    setLoading(false);
  }
};
```

#### 2. Update Supabase Client Files

These files currently reference Better-Auth in comments/docs:

- `src/lib/supabase/server.ts` - Update comments and implementation
- `src/lib/supabase/client.ts` - Update to use Supabase Auth properly

#### 3. Create RLS Migration

File: `supabase/migrations/20260122_supabase_auth_rls.sql`

This is CRITICAL - updates all RLS policies from `auth.jwt()->>'sub'` to `auth.uid()`.

```sql
-- Drop and recreate all RLS policies to use auth.uid()
-- See .tmp/SUPABASE_AUTH_MIGRATION_PLAN.md Phase 7 for full migration
```

### Important Files to Update (medium priority)

#### Hooks (7 files)

1. `src/hooks/auth/use-user.ts` - Currently uses Clerk/Better-Auth
2. `src/hooks/chat/use-ai-chat.ts`
3. `src/hooks/chat/use-chat-data.ts`
4. `src/hooks/chat/use-conversations.ts`
5. `src/hooks/organization/use-invites.ts`
6. `src/hooks/organization/use-pending-invites.ts`

Pattern to follow in `use-user.ts`:

```typescript
'use client';
import { createClient } from '@/lib/auth/supabase-client';
import { useEffect, useState } from 'react';

export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
```

#### API Routes & Server Actions (~35 files)

Replace this pattern:

```typescript
// OLD
import { auth } from '@/lib/auth/better-auth';
const { userId } = await auth();
```

With:

```typescript
// NEW
import { auth } from '@/lib/auth/server';
const { userId, user, org_id } = await auth();
```

Files to update:

- `src/app/api/admin/**` (6 files)
- `src/app/api/chat/route.ts`
- `src/app/api/conversations/**` (2 files)
- `src/app/api/messages/route.ts`
- `src/app/api/response/route.ts`
- `src/app/api/models/route.ts`
- `src/app/api/model/route.ts`
- `src/app/api/invites/**` (2 files)
- `src/app/api/groups/[id]/leave/route.ts`
- `src/app/api/user/**` (2 files)
- `src/app/api/bug-report/route.ts`
- `src/actions/auth/users.ts`
- `src/actions/chat/feedback.ts`
- `src/actions/organization/organizations.ts`
- `src/actions/organization/temp-org-requests.ts`

#### Components (~13 files)

- `src/components/shared/menus/UserMenu.tsx` - Sign out logic
- `src/components/shared/modals/ProfileModal.tsx`
- `src/components/features/onboarding/**` (3 files)
- `src/components/features/chat/**` (3 files)
- `src/components/features/admin/**` (4 files)

---

## 📋 Quick Completion Commands

Run these after updating all files above:

```bash
# 1. Install clean dependencies
rm -rf node_modules package-lock.json
npm install

# 2. Create the RLS migration
supabase migration new supabase_auth_rls

# 3. Apply migrations
supabase db reset

# 4. Test build
npm run type-check
npm run build

# 5. Start dev
npm run dev
```

---

## 🎯 Verification Checklist

Before considering migration complete:

- [ ] No Better-Auth imports anywhere (`grep -r "better-auth" src/`)
- [ ] No Better-Auth packages in package.json
- [ ] All auth pages work (sign-up, sign-in)
- [ ] Middleware redirects work
- [ ] RLS policies updated to `auth.uid()`
- [ ] All API routes use new auth pattern
- [ ] All hooks use Supabase Auth
- [ ] All components render without errors
- [ ] TypeScript compilation passes
- [ ] Production build succeeds

---

## 🚀 Next Immediate Steps

1. **Update sign-in page** (5 mins) - Change from Better-Auth to Supabase client
2. **Update Supabase client files** (10 mins) - Clean up Better-Auth references
3. **Create RLS migration** (30 mins) - Critical for database access
4. **Update use-user hook** (10 mins) - Foundation for all other hooks
5. **Batch update API routes** (1 hour) - Find/replace pattern
6. **Batch update remaining hooks** (30 mins)
7. **Update components** (1 hour)
8. **Test and verify** (30 mins)

**Total Remaining: ~3-4 hours of focused work**

---

## 📝 Notes

- The core infrastructure (middleware, auth helpers) is DONE and working
- Main blocker is updating ~50 files to use new auth pattern
- Most changes are simple find/replace
- RLS migration is critical - must be done carefully
- After RLS migration, test thoroughly before marking complete

---

**Ready to complete! See .tmp/SUPABASE_AUTH_MIGRATION_PLAN.md for detailed instructions.**

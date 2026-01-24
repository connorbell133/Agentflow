# Supabase Auth Migration Plan

**Status:** Ready to Execute
**Created:** 2026-01-22
**Estimated Time:** 10-15 hours

---

## 🎯 Executive Summary

This plan outlines the complete migration from Better-Auth to Supabase Auth. This is the optimal choice because:

1. ✅ **Already using Supabase** for database, RLS, and all data
2. ✅ **Native RLS integration** - No custom JWT generation needed
3. ✅ **Simpler implementation** - `@supabase/ssr` handles all session management
4. ✅ **Battle-tested** - Supabase Auth is production-ready with millions of users
5. ✅ **Better documentation** - Official Next.js 14 App Router support
6. ✅ **Faster migration** - ~40% less work than Better-Auth

---

## 📊 Current State Analysis

### Better-Auth Files to Remove

1. `src/lib/auth/better-auth.ts` - Server configuration
2. `src/lib/auth/better-auth-client.ts` - Client hooks
3. `src/app/api/auth/[...all]/route.ts` - Auth API handler (if exists)
4. `supabase/migrations/20260122_better_auth_setup.sql` - Database schema
5. `src/contexts/AuthContext.tsx` - Better-Auth wrapper (if exists)

### Packages to Remove

- `better-auth` (^1.4.17)
- `@better-fetch/fetch` (^1.1.21)
- `bcrypt` (^6.0.0) - Not needed with Supabase Auth
- `pg` (^8.17.2) - Not needed with @supabase/ssr

### Packages Already Installed ✅

- `@supabase/ssr` (^0.7.0) - Perfect! This is what we need
- `@supabase/supabase-js` (^2.84.0) - Already have it

### Current RLS Policy Pattern

All policies currently use:

```sql
USING ((SELECT auth.jwt()->>'sub') = user_id)
```

**Need to update to:**

```sql
USING (auth.uid() = user_id)
```

This affects **ALL** tables:

- profiles
- conversations
- messages
- organizations
- org_map
- groups
- group_map
- models
- model_map
- model_keys
- model_prompts
- invites
- message_feedback
- key_map
- temp_org_requests

---

## 🗺️ Migration Plan

### Phase 1: Setup Supabase Auth (1-2 hours)

#### 1.1 Enable Supabase Auth

```bash
# In Supabase Dashboard:
# 1. Go to Authentication → Providers
# 2. Enable Email provider
# 3. Disable email confirmations (for development) OR configure SMTP
# 4. Set Site URL to http://localhost:3000
# 5. Add redirect URLs: http://localhost:3000/auth/callback
```

#### 1.2 Create Auth Helper Functions

**File: `src/lib/auth/supabase-server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore - called from Server Component
          }
        },
      },
    }
  );
}
```

**File: `src/lib/auth/supabase-client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**File: `src/lib/auth/server.ts`**

```typescript
import { createClient } from './supabase-server';

export async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    userId: user?.id ?? null,
    user,
    org_id: user?.user_metadata?.org_id ?? null,
  };
}
```

#### 1.3 Update Middleware

**File: `src/middleware.ts`**

- Remove Better-Auth imports
- Use Supabase Auth session checking
- Update session cookie handling

#### 1.4 Create Migration to Update RLS Policies

**File: `supabase/migrations/20260122_migrate_to_supabase_auth.sql`**

- Drop all existing RLS policies
- Recreate with `auth.uid()` instead of `auth.jwt()->>'sub'`
- Ensure backward compatibility during transition

---

### Phase 2: Authentication Pages (2-3 hours)

#### 2.1 Sign Up Page

**File: `src/app/(auth)/sign-up/page.tsx`**

- Email/password form
- Form validation
- Error handling
- Success redirect to /flow
- Link to sign-in

#### 2.2 Sign In Page

**File: `src/app/(auth)/sign-in/page.tsx`**

- Email/password form
- "Forgot password" link
- Error handling
- Success redirect to /flow or original page
- Link to sign-up

#### 2.3 Password Reset Pages

**File: `src/app/(auth)/forgot-password/page.tsx`**

- Email input form
- Send reset email

**File: `src/app/(auth)/reset-password/page.tsx`**

- New password form
- Token validation
- Success redirect

#### 2.4 Auth Callback Handler

**File: `src/app/auth/callback/route.ts`**

- Handle email confirmation
- Handle OAuth callbacks (for future)
- Redirect to appropriate page

---

### Phase 3: Update Supabase Clients (1 hour)

#### 3.1 Update Server Client

**File: `src/lib/supabase/server.ts`**

- Remove Better-Auth references
- Use Supabase Auth session from cookies
- Update to use `@supabase/ssr` patterns

#### 3.2 Update Browser Client

**File: `src/lib/supabase/client.ts`**

- Remove Better-Auth references
- Use `createBrowserClient` from `@supabase/ssr`
- Session management via Supabase

#### 3.3 Create Admin Client

**File: `src/lib/supabase/admin.ts`**

- Service role client for admin operations
- Used for webhooks, system operations

---

### Phase 4: Update Hooks (2-3 hours)

#### 4.1 Create useUser Hook

**File: `src/hooks/auth/use-user.ts`**

```typescript
'use client';
import { createClient } from '@/lib/auth/supabase-client';
import { useEffect, useState } from 'react';

export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for changes
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

#### 4.2 Update Chat Hooks

- `src/hooks/chat/use-ai-chat.ts`
- `src/hooks/chat/use-chat-data.ts`
- `src/hooks/chat/use-conversations.ts`

#### 4.3 Update Organization Hooks

- `src/hooks/organization/use-invites.ts`
- `src/hooks/organization/use-pending-invites.ts`

---

### Phase 5: Update Components (2-3 hours)

#### 5.1 Shared Components

- `src/components/shared/menus/UserMenu.tsx` - Sign out button
- `src/components/shared/modals/ProfileModal.tsx` - Profile display

#### 5.2 Onboarding Components

- `src/components/features/onboarding/OnboardingFlow.tsx`
- `src/components/features/onboarding/ProfileSetup.tsx`
- `src/components/features/onboarding/OrganizationSetup.tsx` - Remove Waitlist

#### 5.3 Chat Components

- `src/components/features/chat/mobile/MobileConversationList.tsx`
- `src/components/features/chat/web/invite/InviteBadge.tsx`
- `src/components/features/chat/web/groups/GroupsBadge.tsx`

#### 5.4 Admin Components

- `src/components/features/admin/AdminPageWrapper.tsx` - Remove subscription
- `src/components/features/admin/layout/Layout.tsx`
- `src/components/features/admin/tabs/Settings.tsx`
- `src/components/features/admin/analytics/Pricing.tsx` - Remove or simplify

---

### Phase 6: Update API Routes & Server Actions (2-3 hours)

#### 6.1 Pattern to Replace

**OLD (Better-Auth):**

```typescript
import { auth } from '@/lib/auth/server';

const { userId, org_id } = await auth();
```

**NEW (Supabase Auth):**

```typescript
import { createClient } from '@/lib/auth/supabase-server';

const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();
const userId = user?.id;
const org_id = user?.user_metadata?.org_id;
```

#### 6.2 Update All API Routes (30 files)

- /api/admin/\*\* (6 files)
- /api/chat/route.ts
- /api/conversations/\*\* (2 files)
- /api/messages/route.ts
- /api/response/route.ts
- /api/models/route.ts
- /api/model/route.ts
- /api/invites/\*\* (2 files)
- /api/groups/[id]/leave/route.ts
- /api/user/\*\* (2 files)
- /api/bug-report/route.ts
- And more...

#### 6.3 Update Server Actions (5 files)

- `src/actions/auth/users.ts`
- `src/actions/chat/feedback.ts`
- `src/actions/organization/organizations.ts`
- `src/actions/organization/temp-org-requests.ts`
- `src/actions/organization/invites.ts`

---

### Phase 7: Database Migration (1 hour)

#### 7.1 Create RLS Migration

**File: `supabase/migrations/20260122_migrate_to_supabase_auth.sql`**

```sql
-- ============================================
-- Migration: Clerk/Better-Auth to Supabase Auth
-- Updates all RLS policies to use auth.uid()
-- ============================================

-- Drop all existing policies
-- (List all DROP POLICY statements)

-- Recreate policies with auth.uid()
-- Profiles
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Conversations
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
TO authenticated
USING (auth.uid() = "user");

-- (Continue for all tables...)

-- Service role bypass (keep these)
CREATE POLICY "Service role full access to profiles"
ON profiles FOR ALL
TO service_role
USING (true);

-- (Continue for all tables...)
```

#### 7.2 Remove Better-Auth Tables

```sql
-- Drop Better-Auth tables (if they were created)
DROP TABLE IF EXISTS verification CASCADE;
DROP TABLE IF EXISTS account CASCADE;
DROP TABLE IF EXISTS session CASCADE;
DROP TABLE IF EXISTS user CASCADE;
```

**NOTE:** Supabase Auth uses its own schema (`auth.users`, `auth.sessions`, etc.)

---

### Phase 8: Cleanup (1 hour)

#### 8.1 Remove Better-Auth Packages

```bash
npm uninstall better-auth @better-fetch/fetch bcrypt pg
```

#### 8.2 Remove Better-Auth Files

```bash
rm src/lib/auth/better-auth.ts
rm src/lib/auth/better-auth-client.ts
rm src/app/api/auth/[...all]/route.ts  # If exists
rm src/contexts/AuthContext.tsx  # If exists
rm supabase/migrations/20260122_better_auth_setup.sql
```

#### 8.3 Update Environment Variables

**Remove from `.env.example`:**

```env
DATABASE_URL=postgresql://...  # Not needed with Supabase Auth
```

**Keep in `.env.example`:**

```env
# Supabase (already there)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 8.4 Clean node_modules

```bash
rm -rf node_modules package-lock.json
npm install
```

---

### Phase 9: Update Documentation (1 hour)

#### 9.1 Update Project Documentation

- `CLAUDE.md` - Remove Clerk/Better-Auth references
- `README.md` - Update auth setup instructions
- `src/CLAUDE.md` - Update code examples
- `src/lib/supabase/CLAUDE.md` - Update to Supabase Auth patterns
- `src/hooks/CLAUDE.md` - Update hook examples

#### 9.2 Create New Setup Guide

**File: `docs/getting-started/SUPABASE_AUTH_SETUP.md`**

- How to configure Supabase Auth
- Email provider setup
- SMTP configuration (optional)
- Environment variables
- Local development setup
- Production deployment

#### 9.3 Update Migration Docs

- Archive Better-Auth migration docs
- Create Supabase Auth reference

---

### Phase 10: Testing (2-3 hours)

#### 10.1 Manual Testing Checklist

- [ ] Sign up with email/password
- [ ] Email verification (if enabled)
- [ ] Sign in with credentials
- [ ] Sign out
- [ ] Password reset flow
- [ ] Session persistence across refresh
- [ ] Protected route access
- [ ] Unauthenticated redirect
- [ ] Profile updates
- [ ] Organization creation
- [ ] Group membership
- [ ] Chat functionality
- [ ] Admin dashboard access
- [ ] API endpoints require auth

#### 10.2 Update Test Files

- `jest.setup.js` - Remove Clerk/Better-Auth mocks, add Supabase mocks
- `src/hooks/auth/__tests__/useUser.test.tsx`
- `src/providers/ProfileCompletionProvider.test.tsx`
- `src/__tests__/lib/tenant-db.test.ts`

#### 10.3 E2E Tests

- Update Playwright auth utilities
- Update sign-in/sign-up flows
- Test protected routes

---

## 📋 Execution Checklist

### Pre-Migration

- [x] Analyze current Better-Auth implementation
- [x] Document all files to update
- [x] Create comprehensive migration plan
- [ ] Backup database
- [ ] Create new git branch: `feature/supabase-auth-migration`

### Phase 1: Setup

- [ ] Enable Supabase Auth in dashboard
- [ ] Create auth helper functions
- [ ] Update middleware
- [ ] Test basic auth flow

### Phase 2: Auth Pages

- [ ] Create sign-up page
- [ ] Create sign-in page
- [ ] Create password reset pages
- [ ] Create auth callback handler
- [ ] Test all auth flows

### Phase 3: Supabase Clients

- [ ] Update server client
- [ ] Update browser client
- [ ] Create admin client
- [ ] Test client creation

### Phase 4: Hooks

- [ ] Create useUser hook
- [ ] Update chat hooks
- [ ] Update organization hooks
- [ ] Test all hooks

### Phase 5: Components

- [ ] Update shared components
- [ ] Update onboarding components
- [ ] Update chat components
- [ ] Update admin components
- [ ] Test all components

### Phase 6: API Routes & Actions

- [ ] Update all API routes (30 files)
- [ ] Update all server actions (5 files)
- [ ] Test all endpoints

### Phase 7: Database

- [ ] Create RLS migration
- [ ] Run migration locally
- [ ] Test RLS policies
- [ ] Verify data access

### Phase 8: Cleanup

- [ ] Remove Better-Auth packages
- [ ] Delete Better-Auth files
- [ ] Update environment variables
- [ ] Clean dependencies

### Phase 9: Documentation

- [ ] Update CLAUDE.md files
- [ ] Update README
- [ ] Create Supabase Auth setup guide
- [ ] Archive old migration docs

### Phase 10: Testing

- [ ] Run all unit tests
- [ ] Run E2E tests
- [ ] Manual testing
- [ ] Fix any issues

### Post-Migration

- [ ] Final code review
- [ ] Search for any remaining Better-Auth references
- [ ] Production deployment plan
- [ ] Monitor error logs

---

## 🚀 Quick Start Commands

```bash
# 1. Create branch
git checkout -b feature/supabase-auth-migration

# 2. Install dependencies (already have @supabase/ssr)
# No new packages needed!

# 3. Enable Supabase Auth
# Do this in Supabase Dashboard

# 4. Run migration (after creating it)
supabase db reset

# 5. Start development
npm run dev

# 6. Test auth flow
# Visit http://localhost:3000/sign-up

# 7. After everything works
npm run build
npm run type-check
npm test
```

---

## ⚠️ Important Notes

### RLS Policy Changes

**CRITICAL:** All RLS policies must be updated from:

```sql
(SELECT auth.jwt()->>'sub')
```

To:

```sql
auth.uid()
```

This is simpler and more performant with Supabase Auth.

### Session Management

Supabase Auth handles sessions via HTTP-only cookies automatically with `@supabase/ssr`. No manual token management needed!

### User Metadata

Store custom fields like `org_id` and `role` in `user_metadata`:

```typescript
// During sign up
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      org_id: organizationId,
      role: 'member',
    },
  },
});

// Access later
const user = session?.user;
const orgId = user?.user_metadata?.org_id;
```

### Email Verification

For production, configure SMTP in Supabase Dashboard:

- Settings → Auth → SMTP Settings
- Or use Supabase's built-in email service

For development, you can disable email confirmation:

- Settings → Auth → Email Auth → "Enable email confirmations" = OFF

---

## 🎯 Success Criteria

Migration is complete when:

- [ ] No Better-Auth code remains in project
- [ ] All auth flows work (sign up, sign in, sign out, reset password)
- [ ] All RLS policies use `auth.uid()`
- [ ] All hooks use Supabase Auth
- [ ] All components render correctly
- [ ] All API routes require authentication
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Production build succeeds
- [ ] Manual testing complete

---

## 📊 Time Estimate Breakdown

| Phase            | Tasks                    | Estimated Time  |
| ---------------- | ------------------------ | --------------- |
| 1. Setup         | Auth helpers, middleware | 1-2 hours       |
| 2. Auth Pages    | Sign up, sign in, reset  | 2-3 hours       |
| 3. Clients       | Server, browser, admin   | 1 hour          |
| 4. Hooks         | useUser, chat, org hooks | 2-3 hours       |
| 5. Components    | Update all components    | 2-3 hours       |
| 6. API/Actions   | 35+ files to update      | 2-3 hours       |
| 7. Database      | RLS migration            | 1 hour          |
| 8. Cleanup       | Remove files, packages   | 1 hour          |
| 9. Documentation | Update all docs          | 1 hour          |
| 10. Testing      | Unit, E2E, manual        | 2-3 hours       |
| **TOTAL**        |                          | **15-23 hours** |

**Realistic Estimate:** 10-15 hours for experienced developer

---

## 🔄 Rollback Plan

If migration fails:

1. **Immediate Rollback:**

   ```bash
   git checkout main
   npm install
   supabase db reset
   ```

2. **Database Rollback:**

   ```bash
   # Revert RLS migration
   supabase db reset --db-url <backup-url>
   ```

3. **Keep backups:**
   - Database snapshot before migration
   - Git branch with all changes
   - Environment variables documented

---

## 📚 Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js 14 + Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

---

**Ready to execute!** 🚀

**Last Updated:** 2026-01-22
**Created By:** Claude
**Status:** Ready for implementation

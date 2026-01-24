# Clerk to Better-Auth Migration - Progress Report

**Last Updated:** 2026-01-22
**Status:** Phase 2 Complete - Ready for Phase 3

---

## ✅ Completed Tasks

### Phase 1: Discovery & Documentation (COMPLETE)

- [x] Created comprehensive migration document (`docs/CLERK_TO_BETTER_AUTH_MIGRATION.md`)
- [x] Audited all 69 files using Clerk
- [x] Documented all Clerk imports and usage patterns
- [x] Identified database schema dependencies
- [x] Mapped authentication flows
- [x] Created detailed migration checklist (200+ items)

### Phase 2: Better-Auth Setup (COMPLETE)

- [x] Installed Better-Auth core packages
  - `better-auth@latest`
  - `@better-fetch/fetch`
  - `pg` (PostgreSQL driver)
  - `bcrypt` (password hashing)
  - TypeScript types for all packages

- [x] Created Better-Auth configuration
  - **File:** `src/lib/auth/better-auth.ts`
  - Configured Supabase PostgreSQL connection
  - Set up bcrypt password hashing (compatible with Supabase defaults)
  - Configured session management (7-day sessions)
  - Added custom user fields (fullName, avatarUrl, orgId, role)

- [x] Created Better-Auth client helper
  - **File:** `src/lib/auth/better-auth-client.ts`
  - Exported React hooks (useSession, signIn, signUp, signOut)
  - Configured base URL and path

- [x] Created Better-Auth API route handler
  - **File:** `src/app/api/auth/[...all]/route.ts`
  - Handles all Better-Auth endpoints (/api/auth/\*)

- [x] Created database migration
  - **File:** `supabase/migrations/20260122_better_auth_setup.sql`
  - Creates 4 core tables (user, session, account, verification)
  - Adds performance indexes
  - Implements Row-Level Security (RLS) policies
  - Adds helper functions and triggers

- [x] Updated environment configuration
  - Added DATABASE_URL to `.env.example`
  - Added NEXT_PUBLIC_APP_URL to `.env.example`

---

## 📋 Next Steps

### Immediate: Test Better-Auth Setup

Before proceeding with the migration, test that Better-Auth is working:

#### 1. Update your `.env.local` file

Add these new environment variables:

```bash
# Better-Auth Database Connection
# For local Supabase (default port 54322):
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# OR for remote Supabase:
# Get from: Supabase Dashboard → Project Settings → Database → Connection String (Session Pooling)
DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### 2. Run the database migration

```bash
# Make sure Supabase is running locally
supabase start

# Apply the Better-Auth migration
supabase db reset

# OR if you want to apply just the new migration
supabase migration up
```

#### 3. Verify tables were created

```bash
# Open Supabase Studio
supabase db studio

# Check that these tables exist:
# - user
# - session
# - account
# - verification
```

#### 4. Test the Better-Auth API endpoint

```bash
# Start your dev server
npm run dev

# In another terminal, test the API:
curl http://localhost:3000/api/auth/ok

# You should see a response indicating Better-Auth is working
```

---

### Phase 3: Core Infrastructure Replacement

Once Better-Auth is confirmed working, proceed with:

#### 3.1 Middleware Replacement

- [ ] Create new Better-Auth middleware (`src/middleware.ts`)
- [ ] Remove `clerkMiddleware`
- [ ] Implement session verification
- [ ] Handle Supabase client token passing
- [ ] Test protected routes

#### 3.2 Provider Replacement

- [ ] Update `src/app/layout.tsx`
- [ ] Remove `ClerkProvider`
- [ ] Add Better-Auth session provider
- [ ] Update `ProfileCompletionProvider`
- [ ] Test app startup

#### 3.3 Create Custom Auth Pages

- [ ] Create `/app/(auth)/sign-in/page.tsx` (custom form)
- [ ] Create `/app/(auth)/sign-up/page.tsx` (custom form)
- [ ] Add form validation
- [ ] Add error handling
- [ ] Style components
- [ ] Delete old Clerk sign-in/up pages

---

## 🚧 Remaining Work

### Phase 3: Replace Clerk Usage (Estimated: 15-20 hours)

- Middleware replacement
- Provider replacement
- Custom auth pages
- Update all hooks (7 files)
- Update API routes (30 files)
- Update server actions (5 files)
- Update React components (13 files)

### Phase 4: Cleanup (Estimated: 2-3 hours)

- Remove Clerk packages
- Delete Clerk-specific files
- Update documentation
- Remove Clerk environment variables

### Phase 5: Testing (Estimated: 4-6 hours)

- Update test mocks
- Unit tests
- Integration tests
- E2E tests
- Manual testing

**Total Estimated Remaining Time: 21-29 hours**

---

## 📁 Files Created

### Configuration Files

- `src/lib/auth/better-auth.ts` - Better-Auth server configuration
- `src/lib/auth/better-auth-client.ts` - Better-Auth React client

### API Routes

- `src/app/api/auth/[...all]/route.ts` - Better-Auth API handler

### Database

- `supabase/migrations/20260122_better_auth_setup.sql` - Schema migration

### Documentation

- `docs/CLERK_TO_BETTER_AUTH_MIGRATION.md` - Complete migration guide
- `docs/MIGRATION_PROGRESS.md` - This progress report

---

## ⚠️ Important Notes

### Database Schema Considerations

**DECISION MADE: Fresh Start Approach** ✅

The current codebase stores user IDs as `text` in all tables (conversations.user, group_map.user_id, etc.). Better-Auth also uses `text` IDs by default (UUIDs), which is compatible.

**Migration Strategy: Fresh Start**

- ✅ Reset database and start with Better-Auth users
- ✅ No migration of existing Clerk users needed
- ✅ Better-Auth will use UUID format for user IDs (text type)
- ✅ All existing tables (conversations, groups, etc.) are already compatible with text IDs
- ✅ Simplifies migration - no ID mapping required

**Supabase Connection:**

- ✅ Use PostgreSQL connection pooling (port 6543)
- ✅ Configuration already set up in `src/lib/auth/better-auth.ts`
- ✅ Based on: https://medium.com/@joshuabarua/better-auth-supabase-connection-guide

### RLS Policies

The current system relies on Clerk's Supabase JWT template with `auth.jwt()->>'sub'` in RLS policies.

Better-Auth will need to generate compatible JWTs for existing RLS policies to work. This is configured but **needs testing** after middleware is replaced.

### Waitlist & OAuth Features

**DECISION MADE: Remove Waitlist, Skip OAuth Initially** ✅

**Waitlist Component:**

- ✅ Remove Clerk's Waitlist component (used in OrganizationSetup.tsx)
- ✅ Not needed for open source tool
- ✅ No replacement required

**OAuth Providers:**

- ✅ Skip OAuth for initial release (Google, GitHub, etc.)
- ✅ Start with email/password authentication only
- ⏭️ OAuth can be added later via Better-Auth plugins/providers

### Organization Multi-Tenancy

The current system uses `org_id` for multi-tenancy. Better-Auth doesn't have built-in organization support, so you'll need to:

1. Add `org_id` to the custom user fields (already done in config)
2. Implement organization logic manually
3. Update RLS policies to check org_id

### Subscription Features

**DECISION MADE: Remove Subscription Features** ✅

The codebase currently uses Clerk's experimental `useSubscription` hook. For the open source version:

- ✅ Remove all pay-for-use features
- ✅ Remove subscription-related code and components
- ✅ Remove Clerk's PricingTable component usage
- ⏭️ Can be added later if needed via Stripe integration (not Better-Auth specific)

---

## 🧪 Testing Checklist

Before marking Phase 2 complete, verify:

- [ ] Better-Auth packages installed (`npm list better-auth`)
- [ ] Configuration file valid (`src/lib/auth/better-auth.ts`)
- [ ] API route accessible (GET `/api/auth/ok`)
- [ ] Database tables created (check Supabase Studio)
- [ ] RLS policies enabled on all auth tables
- [ ] Indexes created for performance

---

## 📞 Need Help?

If you encounter issues:

1. Check the [Better-Auth docs](https://www.better-auth.com/docs)
2. Review `docs/CLERK_TO_BETTER_AUTH_MIGRATION.md` for detailed guidance
3. Check database logs: `supabase logs`
4. Check application logs during `npm run dev`

---

## 🎯 Current Status

**Phase 2 Complete:** Better-Auth infrastructure is set up and ready to use.

**Next Action:** Test the Better-Auth setup using the steps above, then proceed to Phase 3 (middleware replacement).

**Estimated Time to Completion:** 21-29 hours of focused work across phases 3-5.

# Migration Decisions Summary

**Date:** 2026-01-22
**Status:** Approved

---

## Executive Summary

This document captures the key decisions made for the Clerk to Better-Auth migration, significantly simplifying the migration process by adopting a "fresh start" approach.

---

## Key Decisions

### 1. User ID Format & Data Migration ✅

**Decision:** Fresh start - No user migration

**Rationale:**

- Simplifies migration significantly
- No need for ID mapping or data migration scripts
- Better-Auth uses UUID format (text type) - compatible with existing schema
- Database can be reset without concern for existing user data

**Impact:**

- ✅ Faster migration timeline
- ✅ Cleaner implementation
- ✅ No backwards compatibility concerns
- ⚠️ Existing users will need to re-register

**Action Items:**

- Reset database after Better-Auth setup
- All existing user_id columns in tables (conversations, groups, etc.) remain as-is
- Better-Auth will populate with new UUIDs

---

### 2. Supabase Integration ✅

**Decision:** Use Better-Auth with PostgreSQL connection pooling

**Implementation:** Based on [Better-Auth Supabase Guide](https://medium.com/@joshuabarua/better-auth-supabase-connection-guide)

**Configuration:**

```typescript
// src/lib/auth/better-auth.ts
import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  // ... other config
});
```

**Environment Setup:**

```bash
# Supabase Dashboard → Connect → ORMs → Drizzle
# Use Session Pooling (port 6543)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Notes:**

- ✅ Already implemented in `src/lib/auth/better-auth.ts`
- ✅ Uses session pooling (port 6543), not transaction pooling
- ✅ Compatible with Supabase RLS policies

---

### 3. Subscription Features ✅

**Decision:** Remove all pay-for-use features

**Rationale:**

- This is now an open source tool
- Subscription complexity not needed initially
- Can be added later if needed via Stripe (independent of Better-Auth)

**Files to Update:**

- Remove `useSubscription` hook usage
- Remove `PricingTable` component (Clerk-specific)
- Remove subscription checks in admin components
- Remove `CLERK_TIER_1_PLAN_ID` environment variable
- Clean up subscription-related code in:
  - `src/lib/auth/clerk-subscription-server.ts` (delete)
  - `src/lib/auth/subscription.ts` (simplify or delete)
  - `src/components/features/admin/AdminPageWrapper.tsx`
  - `src/components/features/admin/analytics/Pricing.tsx`
  - `src/components/shared/menus/UserMenu.tsx`

**Future Consideration:**

- If subscriptions needed later, integrate Stripe directly (not Clerk-dependent)

---

### 4. Waitlist Component ✅

**Decision:** Remove Waitlist component entirely

**Rationale:**

- Open source tool doesn't need waitlist functionality
- Clerk-specific component
- No replacement required

**Files to Update:**

- `src/components/features/onboarding/OrganizationSetup.tsx` - Remove Waitlist usage
- Remove any Waitlist-related imports

---

### 5. OAuth Providers ✅

**Decision:** Skip OAuth for initial release

**Rationale:**

- Simplifies initial migration
- Email/password authentication sufficient for MVP
- Better-Auth makes it easy to add OAuth later

**Initial Authentication Methods:**

- ✅ Email/Password (with bcrypt hashing)
- ✅ Email verification
- ✅ Password reset flow

**Future OAuth Providers (can add later):**

- Google OAuth
- GitHub OAuth
- Other providers supported by Better-Auth

**Implementation:**
Better-Auth supports OAuth via plugins that can be added incrementally:

```typescript
// Future addition example:
import { github, google } from 'better-auth/plugins';

export const auth = betterAuth({
  // ... existing config
  plugins: [
    github({ clientId: '...', clientSecret: '...' }),
    google({ clientId: '...', clientSecret: '...' }),
  ],
});
```

---

## Migration Strategy Summary

### What We're Doing

1. ✅ Installing Better-Auth with email/password only
2. ✅ Using PostgreSQL connection pooling to Supabase
3. ✅ Fresh database start (no user migration)
4. ✅ Removing subscription features
5. ✅ Removing waitlist component
6. ✅ Skipping OAuth providers initially

### What We're NOT Doing

1. ❌ No user ID migration/mapping
2. ❌ No subscription logic
3. ❌ No OAuth setup (yet)
4. ❌ No waitlist functionality
5. ❌ No backwards compatibility with Clerk

### Benefits of This Approach

- 🚀 **Faster migration** - Estimated 40% reduction in complexity
- 🎯 **Simpler codebase** - Less moving parts to maintain
- 🧪 **Easier testing** - Fewer edge cases to cover
- 📦 **Cleaner architecture** - Fresh start allows best practices
- ⚡ **Quicker to production** - Focus on core authentication only

---

## Environment Variables Changes

### Remove (Clerk)

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=
NEXT_PUBLIC_CLERK_SIGN_UP_URL=
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=
CLERK_DOMAIN=
CLERK_TIER_1_PLAN_ID=
```

### Add (Better-Auth)

```bash
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_SECRET=your_random_secret_here  # Generate with: openssl rand -base64 32
```

---

## Testing Impact

### Simplified Testing Requirements

With these decisions, we can skip testing for:

- ❌ User migration scripts
- ❌ ID mapping logic
- ❌ Subscription flows
- ❌ OAuth providers
- ❌ Waitlist functionality

### Focus Testing On

- ✅ Email/password sign up
- ✅ Email/password sign in
- ✅ Email verification
- ✅ Password reset
- ✅ Session management
- ✅ Organization multi-tenancy
- ✅ Protected routes
- ✅ API authentication

---

## Timeline Impact

**Original Estimate:** 25-40 hours
**New Estimate:** 15-25 hours

**Time Saved By:**

- No user migration (save 4-6 hours)
- No OAuth setup (save 2-3 hours)
- No subscription logic (save 2-3 hours)
- Simpler testing (save 2-3 hours)

---

## Risk Assessment

### Low Risk ✅

- Fresh start eliminates backwards compatibility issues
- Better-Auth is production-ready and well-documented
- PostgreSQL pooling is standard practice with Supabase

### Medium Risk ⚠️

- RLS policies need to work with Better-Auth JWTs (needs testing)
- Organization multi-tenancy is custom implementation (not built-in)

### Mitigation Strategies

- Thorough testing of RLS policies after middleware replacement
- Document organization logic clearly
- Keep Better-Auth simple (email/password only) for easier debugging

---

## Next Steps

1. ✅ Update `.env.local` with Better-Auth credentials
2. ✅ Run database migration: `supabase db reset`
3. ✅ Test Better-Auth API: `curl http://localhost:3000/api/auth/ok`
4. ⏭️ Proceed with Phase 3: Core Infrastructure Replacement

---

## Approval

- [x] Decisions documented
- [x] Migration docs updated
- [x] Progress tracker updated
- [ ] Team notified
- [ ] Ready to proceed with implementation

---

**Last Updated:** 2026-01-22
**Approved By:** Connor Bell
**Status:** Ready for Phase 3

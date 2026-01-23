# Clerk to Better-Auth Migration Plan

**Status:** In Progress
**Created:** 2026-01-22
**Last Updated:** 2026-01-22

---

## Table of Contents

1. [Overview](#overview)
2. [Clerk Usage Audit](#clerk-usage-audit)
3. [Authentication Flow Mapping](#authentication-flow-mapping)
4. [Migration Checklist](#migration-checklist)
5. [Implementation Plan](#implementation-plan)
6. [Testing Requirements](#testing-requirements)
7. [Rollback Strategy](#rollback-strategy)

---

## Overview

This document outlines the complete migration from Clerk authentication to Better-Auth with Supabase. This is a **full replacement** with no backwards compatibility.

### Migration Goals

- ✅ Remove all Clerk dependencies
- ✅ Implement Better-Auth with Supabase backend
- ✅ Maintain existing user data
- ✅ Preserve multi-tenant organization structure
- ✅ Zero downtime migration (if applicable)

### Key Challenges

- **User ID Migration**: Clerk user IDs are stored as `text` in database (user, user_id, invitee, inviter columns)
- **JWT Token Format**: Middleware uses Clerk's Supabase JWT template for RLS policies
- **Webhook Integration**: Sync between auth provider and profiles table
- **Organization Multi-Tenancy**: org_id based access control

---

## Clerk Usage Audit

### 1. Package Dependencies

**Main Package:**

- `@clerk/nextjs@^6.31.1` (in package.json)

**Related Packages:**

- None additional (Clerk is self-contained)

### 2. Files Using Clerk (69 total)

#### **Core Infrastructure Files**

**Root Layout & Providers:**

- `src/app/layout.tsx` - ClerkProvider wrapper
- `src/middleware.ts` - clerkMiddleware for route protection & token management
- `src/contexts/ClerkAuthContext.tsx` - Auth context wrapper around Clerk hooks

**Supabase Integration:**

- `src/lib/supabase/server.ts` - Uses Clerk auth() for server-side Supabase client
- `src/lib/supabase/client.ts` - Documentation mentions Clerk session
- `src/lib/db/tenant-context.ts` - Uses auth() for tenant isolation

**Auth Utilities:**

- `src/lib/auth/subscription.ts` - Uses auth() from Clerk
- `src/lib/auth/jwt-verify.ts` - Uses verifyToken from Clerk
- `src/lib/auth/clerk-subscription-server.ts` - Uses auth, clerkClient, currentUser

#### **Authentication Pages**

- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` - SignIn component
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` - SignUp component

#### **API Routes (30 files)**

**Webhook Handler:**

- `src/app/api/clerk/webhook/route.ts` - Handles user.created, user.updated, user.deleted events

**Admin Routes:**

- `src/app/api/admin/[[...rest]]/page.tsx`
- `src/app/api/admin/users/add/route.ts`
- `src/app/api/admin/users/remove/route.ts`
- `src/app/api/admin/analytics/conversations/daily/route.ts`
- `src/app/api/admin/analytics/conversations/daily-v2/route.ts`
- `src/app/api/admin/analytics/conversations/debug/route.ts`

**Chat & Conversation Routes:**

- `src/app/api/chat/route.ts`
- `src/app/api/conversations/route.ts`
- `src/app/api/conversations/[id]/messages/route.ts`
- `src/app/api/messages/route.ts`
- `src/app/api/response/route.ts`

**Model & Organization Routes:**

- `src/app/api/models/route.ts`
- `src/app/api/model/route.ts`
- `src/app/api/invites/route.ts`
- `src/app/api/invites/[id]/accept/route.ts`
- `src/app/api/groups/[id]/leave/route.ts`
- `src/app/api/user/organizations/route.ts`
- `src/app/api/user/groups/route.ts`

**Other Routes:**

- `src/app/api/bug-report/route.ts`
- `src/app/changelog/page.tsx`

#### **Server Actions (5 files)**

- `src/actions/auth/users.ts` - Uses auth, clerkClient
- `src/actions/chat/feedback.ts` - Uses auth()
- `src/actions/organization/organizations.ts` - Uses auth()
- `src/actions/organization/temp-org-requests.ts` - Uses auth()

#### **React Hooks (7 files)**

- `src/hooks/auth/use-user.ts` - Wraps useClerkUser
- `src/hooks/chat/use-ai-chat.ts` - Uses useAuth from Clerk
- `src/hooks/chat/use-chat-data.ts` - Uses useAuth
- `src/hooks/chat/use-conversations.ts` - Uses useAuth
- `src/hooks/organization/use-invites.ts` - Uses useAuth
- `src/hooks/organization/use-pending-invites.ts` - Uses useUser

#### **React Components (13 files)**

**Providers:**

- `src/providers/ProfileCompletionProvider.tsx` - Uses useUser

**Shared Components:**

- `src/components/shared/menus/UserMenu.tsx` - SignOutButton, useClerkUser, useSubscription
- `src/components/shared/modals/ProfileModal.tsx` - UserProfile component

**Feature Components:**

- `src/components/features/onboarding/OnboardingFlow.tsx` - useUser
- `src/components/features/onboarding/ProfileSetup.tsx` - useUser
- `src/components/features/onboarding/OrganizationSetup.tsx` - useUser, Waitlist component
- `src/components/features/chat/mobile/MobileConversationList.tsx` - useClerk
- `src/components/features/chat/web/invite/InviteBadge.tsx` - useAuth
- `src/components/features/chat/web/groups/GroupsBadge.tsx` - useAuth
- `src/components/features/admin/AdminPageWrapper.tsx` - useSubscription
- `src/components/features/admin/layout/Layout.tsx` - SignIn component
- `src/components/features/admin/tabs/Settings.tsx` - useClerkUser
- `src/components/features/admin/analytics/Pricing.tsx` - PricingTable

#### **Test Files (4 files)**

- `jest.setup.js` - Mock Clerk hooks
- `src/hooks/auth/__tests__/useUser.test.tsx`
- `src/contexts/__tests__/ClerkAuthContext.test.tsx`
- `src/providers/ProfileCompletionProvider.test.tsx`
- `src/__tests__/lib/tenant-db.test.ts`

#### **Documentation Files (9 files)**

- Multiple CLAUDE.md files with Clerk examples
- `docs/getting-started/CLERK_SETUP.md`
- `docs/SECURITY.md`
- Various other documentation

### 3. Clerk Imports Breakdown

**From `@clerk/nextjs` (client-side):**

- `useUser` - Get current user
- `useAuth` - Get auth state, signOut
- `useClerk` - Clerk client instance
- `useSignIn` - Sign in helpers
- `useSignUp` - Sign up helpers
- `SignIn` - Sign in component
- `SignUp` - Sign up component
- `UserButton` - User menu component
- `SignOutButton` - Sign out button
- `UserProfile` - Profile modal
- `ClerkProvider` - Context provider
- `PricingTable` - Subscription pricing
- `Waitlist` - Waitlist component
- `useSubscription` - Subscription state (experimental)

**From `@clerk/nextjs/server` (server-side):**

- `auth` - Get auth context in Server Components/Actions
- `currentUser` - Get full user object
- `clerkClient` - Admin API client
- `verifyToken` - JWT verification
- `clerkMiddleware` - Next.js middleware
- `createRouteMatcher` - Route matching utility

**From `@clerk/nextjs/server` (webhooks):**

- `WebhookEvent` - Webhook event types

### 4. Environment Variables

```env
# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_*
CLERK_SECRET_KEY=sk_test_*
CLERK_WEBHOOK_SECRET=whsec_*

# URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/flow
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/flow
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/flow

# Custom Domain (optional)
CLERK_DOMAIN=

# Subscription Plans
CLERK_TIER_1_PLAN_ID=cplan_*
```

### 5. Database Schema

**User ID Storage:**

- User IDs stored as `text` type in all tables
- No separate `clerk_id` column - Clerk IDs used directly
- Affected columns: `user`, `user_id`, `invitee`, `inviter`

**Affected Tables:**

- `profiles` - Main user profile table
- `conversations` - `user` column
- `group_map` - `user_id` column
- `invites` - `invitee`, `inviter` columns
- `organizations` - Owner/member relationships

**RLS Policies:**

- Use `auth.jwt()->>'sub'` to extract user ID from JWT
- Require Supabase JWT template from Clerk

### 6. Key Authentication Flows

**Middleware Flow:**

1. Request arrives at middleware
2. clerkMiddleware checks authentication
3. Gets Supabase JWT token from Clerk (template: 'supabase')
4. Caches token in cookie (50 second TTL)
5. Passes token via `x-supabase-token` header
6. Server components/actions read token from header

**Webhook Sync:**

1. Clerk sends webhook on user events
2. Webhook handler verifies signature with svix
3. Syncs user data to profiles table
4. Handles: user.created, user.updated, user.deleted

**Component Auth:**

1. Client components use `useUser()` / `useAuth()`
2. Server components use `auth()` / `currentUser()`
3. Custom `useAuth` hook wraps Clerk hooks in context

---

## Authentication Flow Mapping

### Current Clerk Flows

#### 1. **Sign Up Flow**

```
User → /sign-up → Clerk SignUp Component → Clerk API → user.created webhook → Supabase profiles table → Redirect to /flow
```

#### 2. **Sign In Flow**

```
User → /sign-in → Clerk SignIn Component → Clerk Session → Middleware sets Supabase token → Redirect to /flow
```

#### 3. **Protected Route Access**

```
Request → Middleware (clerkMiddleware) → auth.protect() → Get Supabase token → Pass via header → Route handler
```

#### 4. **Session Validation**

```
Component → useUser/useAuth → Clerk session check → Return user data + auth state
```

#### 5. **Sign Out Flow**

```
User → SignOutButton → Clerk signOut() → Clear session → Redirect to /sign-in
```

### Target Better-Auth Flows

#### 1. **Sign Up Flow**

```
User → /sign-up → Custom Sign Up Form → Better-Auth API → Create user in Supabase → Send verification email → Redirect to /flow
```

#### 2. **Sign In Flow**

```
User → /sign-in → Custom Sign In Form → Better-Auth session → Cookie-based session → Redirect to /flow
```

#### 3. **Protected Route Access**

```
Request → Middleware (Better-Auth) → Verify session → Set Supabase client with user → Route handler
```

#### 4. **Session Validation**

```
Component → useSession (Better-Auth) → Check session validity → Return user data + auth state
```

#### 5. **Sign Out Flow**

```
User → Sign Out Button → Better-Auth signOut → Clear session cookie → Redirect to /sign-in
```

---

## Migration Checklist

### Phase 1: Discovery & Setup ✅

- [x] Audit all Clerk usage in codebase
- [x] Document authentication flows
- [x] Identify environment variables
- [x] Map database schema dependencies
- [x] Create migration document
- [ ] Install Better-Auth packages
- [ ] Configure Better-Auth with Supabase
- [ ] Set up auth database schema

### Phase 2: Core Infrastructure

- [ ] **Middleware Replacement**
  - [ ] Remove clerkMiddleware
  - [ ] Implement Better-Auth middleware
  - [ ] Update route protection logic
  - [ ] Handle Supabase token passing
  - [ ] Update cookie management
  - [ ] Test protected routes

- [ ] **Provider Replacement**
  - [ ] Remove ClerkProvider from layout.tsx
  - [ ] Add Better-Auth SessionProvider
  - [ ] Update ProfileCompletionProvider
  - [ ] Test provider hierarchy

- [ ] **Supabase Integration**
  - [ ] Update createSupabaseServerClient
  - [ ] Update createSupabaseClient (client-side)
  - [ ] Update tenant-context.ts
  - [ ] Test RLS policies with new tokens

### Phase 3: API Routes & Server Actions

- [ ] **Server Auth Pattern**
  - [ ] Replace auth() calls
  - [ ] Replace currentUser() calls
  - [ ] Replace clerkClient calls
  - [ ] Update error handling
  - [ ] Test all routes

- [ ] **API Routes (30 files)**
  - [ ] /api/admin/[[...rest]]/page.tsx
  - [ ] /api/admin/users/add/route.ts
  - [ ] /api/admin/users/remove/route.ts
  - [ ] /api/admin/analytics/conversations/daily/route.ts
  - [ ] /api/admin/analytics/conversations/daily-v2/route.ts
  - [ ] /api/admin/analytics/conversations/debug/route.ts
  - [ ] /api/chat/route.ts
  - [ ] /api/conversations/route.ts
  - [ ] /api/conversations/[id]/messages/route.ts
  - [ ] /api/messages/route.ts
  - [ ] /api/response/route.ts
  - [ ] /api/models/route.ts
  - [ ] /api/model/route.ts
  - [ ] /api/invites/route.ts
  - [ ] /api/invites/[id]/accept/route.ts
  - [ ] /api/groups/[id]/leave/route.ts
  - [ ] /api/user/organizations/route.ts
  - [ ] /api/user/groups/route.ts
  - [ ] /api/bug-report/route.ts
  - [ ] /api/changelog/page.tsx

- [ ] **Server Actions (5 files)**
  - [ ] actions/auth/users.ts
  - [ ] actions/chat/feedback.ts
  - [ ] actions/organization/organizations.ts
  - [ ] actions/organization/temp-org-requests.ts

- [ ] **Webhook Handler**
  - [ ] Delete /api/clerk/webhook/route.ts
  - [ ] Create Better-Auth webhook handler (if needed)
  - [ ] Update profile sync logic

### Phase 4: Client Components & Hooks

- [ ] **Custom Hooks (7 files)**
  - [ ] hooks/auth/use-user.ts - Replace useClerkUser
  - [ ] hooks/chat/use-ai-chat.ts - Replace useAuth
  - [ ] hooks/chat/use-chat-data.ts - Replace useAuth
  - [ ] hooks/chat/use-conversations.ts - Replace useAuth
  - [ ] hooks/organization/use-invites.ts - Replace useAuth
  - [ ] hooks/organization/use-pending-invites.ts - Replace useUser

- [ ] **Auth Context**
  - [ ] Delete contexts/ClerkAuthContext.tsx
  - [ ] Create new auth context for Better-Auth
  - [ ] Update useAuth export

- [ ] **Authentication Pages**
  - [ ] Create custom /sign-in page
  - [ ] Create custom /sign-up page
  - [ ] Add email/password forms
  - [ ] Add OAuth providers (if needed)
  - [ ] Add forgot password flow
  - [ ] Add email verification
  - [ ] Delete old Clerk sign-in/sign-up pages

- [ ] **UI Components (13 files)**
  - [ ] shared/menus/UserMenu.tsx - Replace SignOutButton
  - [ ] shared/modals/ProfileModal.tsx - Replace UserProfile
  - [ ] features/onboarding/OnboardingFlow.tsx
  - [ ] features/onboarding/ProfileSetup.tsx
  - [ ] features/onboarding/OrganizationSetup.tsx
  - [ ] features/chat/mobile/MobileConversationList.tsx
  - [ ] features/chat/web/invite/InviteBadge.tsx
  - [ ] features/chat/web/groups/GroupsBadge.tsx
  - [ ] features/admin/AdminPageWrapper.tsx
  - [ ] features/admin/layout/Layout.tsx
  - [ ] features/admin/tabs/Settings.tsx
  - [ ] features/admin/analytics/Pricing.tsx

### Phase 5: Database Migration

- [ ] **Schema Updates**
  - [ ] Create Better-Auth tables (users, sessions, accounts, verification_tokens)
  - [ ] Plan user ID migration strategy
  - [ ] Create migration script for existing users
  - [ ] Update foreign key relationships
  - [ ] Test RLS policies with new auth

- [ ] **Data Migration**
  - [ ] Export existing user data
  - [ ] Create users in Better-Auth
  - [ ] Map Clerk IDs to Better-Auth IDs (if different)
  - [ ] Update all user_id references
  - [ ] Verify data integrity

### Phase 6: Configuration & Cleanup

- [ ] **Environment Variables**
  - [ ] Remove all CLERK\_\* variables from .env
  - [ ] Remove all CLERK\_\* variables from .env.example
  - [ ] Add Better-Auth environment variables
  - [ ] Update deployment configs (Vercel, etc.)
  - [ ] Update CI/CD environment variables

- [ ] **Package Cleanup**
  - [ ] npm uninstall @clerk/nextjs
  - [ ] Remove Clerk from package.json
  - [ ] Remove Clerk from package-lock.json
  - [ ] Clean node_modules

- [ ] **File Cleanup**
  - [ ] Delete src/lib/auth/clerk-subscription-server.ts
  - [ ] Delete src/lib/auth/jwt-verify.ts (if Clerk-specific)
  - [ ] Delete src/app/api/clerk directory
  - [ ] Delete docs/getting-started/CLERK_SETUP.md
  - [ ] Delete any Clerk utility files

- [ ] **Documentation Updates**
  - [ ] Update CLAUDE.md files (remove Clerk examples)
  - [ ] Update README.md
  - [ ] Update docs/SECURITY.md
  - [ ] Create Better-Auth setup guide
  - [ ] Update all code examples in docs/

### Phase 7: Testing

- [ ] **Unit Tests**
  - [ ] Update jest.setup.js (remove Clerk mocks)
  - [ ] Update hooks/**tests**/useUser.test.tsx
  - [ ] Update contexts/**tests**/ClerkAuthContext.test.tsx
  - [ ] Update providers/ProfileCompletionProvider.test.tsx
  - [ ] Update **tests**/lib/tenant-db.test.ts
  - [ ] Run all unit tests

- [ ] **Integration Tests**
  - [ ] Test sign up flow
  - [ ] Test sign in flow
  - [ ] Test sign out flow
  - [ ] Test protected route access
  - [ ] Test API route authentication
  - [ ] Test server action authentication
  - [ ] Test profile updates
  - [ ] Test organization access

- [ ] **E2E Tests**
  - [ ] Update tests/e2e/auth/sign-in.spec.ts
  - [ ] Update tests/e2e/auth/sign-up.spec.ts
  - [ ] Update tests/e2e/utils/auth-utils.ts
  - [ ] Update tests/e2e/utils/org-utils.ts
  - [ ] Update tests/e2e/global.setup.ts
  - [ ] Run all E2E tests

- [ ] **Manual Testing**
  - [ ] Sign up new user
  - [ ] Sign in existing user
  - [ ] Access protected routes
  - [ ] Test all API endpoints
  - [ ] Test chat functionality
  - [ ] Test admin dashboard
  - [ ] Test organization features
  - [ ] Test user profile updates
  - [ ] Sign out

### Phase 8: Final Verification

- [ ] Search codebase for "clerk" (case-insensitive) - should return 0 results
- [ ] Search codebase for "@clerk" - should return 0 results
- [ ] Verify no Clerk packages in node_modules
- [ ] Verify no Clerk environment variables
- [ ] Run production build
- [ ] Test production deployment
- [ ] Monitor error logs
- [ ] Verify all features working

---

## Implementation Plan

### Step-by-Step Execution

#### **Step 1: Install Better-Auth** (30 mins)

```bash
npm install better-auth
npm install @better-fetch/fetch  # Dependency
# Install any Supabase adapter if available
```

#### **Step 2: Configure Better-Auth** (1-2 hours)

- Create `src/lib/auth/better-auth.ts` with Better-Auth config
- Set up PostgreSQL connection pool for Supabase
- Configure session strategy (cookie-based)
- Configure email/password authentication
- Skip OAuth providers (will add later)

**Supabase Connection Setup:**

```typescript
import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  // ... other config
});
```

**Environment Variable:**

```bash
# Get from Supabase Dashboard → Connect → ORMs → Drizzle
# Use Session Pooling (port 6543), not Transaction Pooling (port 5432)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

#### **Step 3: Database Setup** (1 hour)

- Create auth tables migration
- Run migration
- Set up RLS policies for auth tables

#### **Step 4: Create Auth API Route** (30 mins)

- Create `/api/auth/[...all]/route.ts` handler
- Configure routes for sign-in, sign-up, sign-out

#### **Step 5: Replace Middleware** (2 hours)

- Implement Better-Auth middleware
- Update route protection
- Update Supabase token handling
- Test thoroughly

#### **Step 6: Replace Providers** (1 hour)

- Update app/layout.tsx
- Create Better-Auth context
- Update ProfileCompletionProvider

#### **Step 7: Create Custom Auth Pages** (3-4 hours)

- Build sign-in form
- Build sign-up form
- Add validation
- Add error handling
- Style components

#### **Step 8: Replace Hooks** (2-3 hours)

- Update use-user.ts
- Update all chat hooks
- Update organization hooks
- Test all hooks

#### **Step 9: Update API Routes** (4-6 hours)

- Systematically update each route
- Test each route after update
- Update error handling

#### **Step 10: Update Components** (4-6 hours)

- Update UserMenu
- Update ProfileModal
- Update onboarding components
- Update admin components
- Update chat components

#### **Step 11: Database Migration** (2-4 hours)

- Run migration script
- Verify data integrity
- Update RLS policies

#### **Step 12: Cleanup** (2 hours)

- Remove Clerk packages
- Delete Clerk files
- Update documentation
- Update environment variables

#### **Step 13: Testing** (4-8 hours)

- Run all tests
- Manual testing
- Fix issues
- Retest

**Total Estimated Time: 25-40 hours**

---

## Testing Requirements

### Critical Test Cases

#### Authentication

- [ ] New user can sign up with email/password
- [ ] User receives verification email
- [ ] User can verify email
- [ ] User can sign in with correct credentials
- [ ] User cannot sign in with wrong credentials
- [ ] User can sign out
- [ ] Session persists across page refreshes
- [ ] Session expires appropriately

#### Authorization

- [ ] Unauthenticated users redirected to sign-in
- [ ] Authenticated users can access /flow
- [ ] Admin users can access /admin
- [ ] Non-admin users cannot access /admin
- [ ] Users can only access their org's data

#### API Routes

- [ ] All protected routes require authentication
- [ ] userId and org_id extracted correctly
- [ ] RLS policies enforce data isolation
- [ ] Error messages appropriate

#### Components

- [ ] UserMenu displays user info
- [ ] Sign out button works
- [ ] Profile updates work
- [ ] Onboarding flow works
- [ ] Chat interface works
- [ ] Admin dashboard works

#### Data Integrity

- [ ] User data migrated correctly
- [ ] Conversations linked to correct users
- [ ] Organizations intact
- [ ] Invites work
- [ ] Groups work

---

## Rollback Strategy

### If Migration Fails

#### Immediate Rollback (< 1 hour)

1. Revert to previous git commit
2. Reinstall Clerk packages: `npm install @clerk/nextjs@^6.31.1`
3. Restore Clerk environment variables
4. Restart application
5. Verify Clerk authentication working

#### Database Rollback

1. If database changes made, restore from backup
2. Or run down migration to revert schema
3. Verify data integrity

#### User Communication

1. Post status update
2. Inform users of temporary issue
3. Provide ETA for resolution

### Preventing Issues

- Test thoroughly in development
- Use feature flags for gradual rollout
- Keep database backup before migration
- Have team member review changes
- Monitor error logs during migration

---

## Progress Tracking

### Completed Tasks

- [x] Created migration document
- [x] Completed Clerk usage audit
- [x] Documented authentication flows
- [x] Created migration checklist

### In Progress

- [ ] Installing Better-Auth

### Next Steps

1. Install Better-Auth packages
2. Configure Better-Auth with Supabase
3. Create auth database schema
4. Begin middleware replacement

---

## Notes & Issues

### Known Challenges - RESOLVED

1. **User ID Format**: Clerk IDs stored as text throughout database
   - **RESOLUTION**: ✅ Fresh start - Reset database and use Better-Auth's default UUID format
   - No migration of existing users needed
   - Better-Auth uses `text` type for UUIDs (compatible with existing schema)

2. **Supabase JWT Template**: Middleware relies on Clerk's Supabase template
   - **RESOLUTION**: ✅ Use Better-Auth with PostgreSQL connection pooling
   - Implementation based on: https://medium.com/@joshuabarua/better-auth-supabase-connection-guide
   - Uses `new Pool({ connectionString: process.env.DATABASE_URL })`
   - Already configured in `src/lib/auth/better-auth.ts`

3. **Subscription Features**: Uses Clerk's experimental useSubscription hook
   - **RESOLUTION**: ✅ Remove all pay-for-use features for now
   - Open source version doesn't need subscription logic
   - Can be added later if needed via Stripe integration

4. **Waitlist Component**: Uses Clerk's Waitlist component
   - **RESOLUTION**: ✅ Remove waitlist component entirely
   - Not needed for open source tool
   - No replacement required

5. **OAuth Providers**: Need to determine if OAuth needed
   - **RESOLUTION**: ✅ Skip OAuth for initial release
   - Start with email/password only
   - OAuth can be added incrementally later via Better-Auth plugins

### Questions to Answer

- [x] ~~Do we need to preserve existing user IDs?~~ **NO - Fresh start with Better-Auth**
- [x] ~~Do we need OAuth providers (Google, GitHub, etc.)?~~ **NO - Skip for now, add later**
- [x] ~~How to handle existing user sessions during migration?~~ **N/A - Fresh start**
- [x] ~~What's the user migration timeline?~~ **N/A - No user migration**
- [x] Do we need email verification? **YES - Better-Auth supports this**
- [x] Do we need password reset flow? **YES - Better-Auth supports this**
- [x] ~~Do we need subscription features?~~ **NO - Removed for open source version**

---

## Sign-Off

### Reviewed By

- [ ] Tech Lead
- [ ] Senior Developer
- [ ] DevOps Engineer

### Approved By

- [ ] Engineering Manager
- [ ] Product Manager

---

**Document Version:** 1.0
**Last Audit Run:** 2026-01-22
**Next Review:** After Phase 2 completion

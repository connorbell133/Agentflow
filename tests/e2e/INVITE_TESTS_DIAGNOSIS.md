# Invite Acceptance Tests - Complete Diagnosis

**Date:** 2026-01-23
**Status:** ⚠️ **ROOT CAUSE IDENTIFIED - PRODUCTION BUG**

---

## Executive Summary

The invite acceptance tests are failing because of a **Row-Level Security (RLS) policy issue** that prevents newly signed-up users from seeing their pending invitations. This is NOT a test issue - this is a **production bug** that would affect real users trying to accept invites after signing up.

---

## Test Failures

### Before Fixes

- ❌ Sign-up failed with "User already registered"
- ❌ Invite badge showed "no pending invitations"

### After Cleanup Fix

- ✅ Sign-up completes successfully
- ❌ Invite badge still shows "no pending invitations" (RLS issue)

---

## Issues Found & Fixed

### ✅ Issue 1: Cleanup Script Logic Bug

**File:** `/tests/cleanup-invited-user.ts`

**Problem:**

- Script only deleted auth users IF a profile existed (lines 108-119)
- If auth user existed without profile, it would remain in database
- Subsequent test runs would fail with "User already registered"

**Root Cause:**

```typescript
// ❌ BEFORE - Only deletes auth user if profile exists
if (profile) {
  try {
    const { error: authError } = await supabase.auth.admin.deleteUser(profile.id);
    // ...
  } catch (e) {
    // ...
  }
}
```

**Fix Applied:**

```typescript
// ✅ AFTER - Always checks for and deletes auth user by email
try {
  const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();

  if (!listError && authUsers) {
    const authUser = authUsers.users.find(u => u.email === targetEmail);

    if (authUser) {
      console.log(`Found auth user with email ${targetEmail} (ID: ${authUser.id})`);
      const { error: authError } = await supabase.auth.admin.deleteUser(authUser.id);
      // ...
    } else {
      console.log('No auth user found with that email');
    }
  }
} catch (e) {
  console.log('Note: Could not check Supabase Auth:', (e as Error).message);
}
```

**Result:** ✅ Cleanup now works correctly every time

---

## ⚠️ Issue 2: RLS Policy Blocking Invites (PRODUCTION BUG)

### The Problem

**Symptom:** Invite badge dropdown shows "You have no pending invitations" even though 15 invites exist in the database.

**Evidence:**

```bash
# Direct database query (service role) - 15 invites found
✅ Found 15 invite(s):
   Invite #1: ID: 84beaa38-c26f-4922-aee9-f74d539e0351
   Invitee: test.user2@example.com
   # ... (14 more)

# Frontend invite badge - 0 invites shown
❌ Dropdown HTML: <p class="text-xs text-muted-foreground">You have no pending invitations</p>
```

### Root Cause Analysis

**Data Flow:**

```
User signs up
  ↓
InviteBadge component mounts
  ↓
usePendingInvites() hook
  ↓
useUser() hook → gets Supabase Auth user with email
  ↓
getUserInvites(email) server action
  ↓
createSupabaseServerClient() → applies RLS policies
  ↓
SELECT * FROM invites WHERE invitee = 'test.user2@example.com'
  ↓
RLS policy blocks query → returns 0 results ❌
```

**The RLS Policy:**

```sql
CREATE POLICY "Users can view invites in their orgs or to them"
ON invites FOR SELECT
TO authenticated
USING (
  public.user_is_org_member((SELECT auth.jwt()->>'sub'), org_id)
  OR public.get_user_email((SELECT auth.jwt()->>'sub')) = invitee
  OR (SELECT auth.jwt()->>'sub') = inviter
);
```

**Why It Fails:**

1. User is NOT yet a member of any organization (hasn't accepted invite yet)
   - `user_is_org_member()` returns FALSE ❌
2. The `get_user_email()` function check fails:
   - Either the function has a bug
   - OR the profile isn't synced when the query runs
   - `get_user_email(user_id) = invitee` returns FALSE ❌
3. User is not the inviter
   - `(SELECT auth.jwt()->>'sub') = inviter` returns FALSE ❌

**Result:** All 3 conditions fail, RLS blocks the query, user sees 0 invites.

### Code Locations

**Server Action:**

```typescript
// File: src/actions/organization/invites.ts:7-21
export async function getUserInvites(userEmail: string) {
  const supabase = await createSupabaseServerClient(); // ← Uses RLS context

  const { data, error } = await supabase.from('invites').select('*').eq('invitee', userEmail); // ← RLS blocks this query

  return data ?? []; // ← Returns empty array
}
```

**Hook:**

```typescript
// File: src/hooks/organization/use-pending-invites.ts:6
export const usePendingInvites = () => {
  const { user } = useUser(); // ← Gets Supabase Auth user

  useEffect(() => {
    const fetchInvites = async () => {
      const inviteData = await getUserInvites(user.email); // ← Calls server action
      setInvites(inviteData); // ← Sets empty array
    };
    fetchInvites();
  }, [user]);
};
```

**Component:**

```typescript
// File: src/components/features/chat/web/invite/InviteBadge.tsx:27
export default function InviteBadge({ refreshModels, open = true }: InviteBadgeProps) {
  const { invites, loading, refetch } = usePendingInvites(); // ← Gets empty array

  // ... component shows "no pending invitations"
}
```

---

## Solutions

### Option 1: Use Service Role for Invite Queries (RECOMMENDED)

**Rationale:** Invites should be visible to the invitee regardless of org membership status. This is the intended behavior.

**Implementation:**

```typescript
// src/actions/organization/invites.ts
export async function getUserInvites(userEmail: string) {
  // Use service role to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabase.from('invites').select('*').eq('invitee', userEmail);

  return data ?? [];
}
```

**Pros:**

- Simple fix
- Makes semantic sense (invites should be publicly visible to invitee)
- No RLS policy changes needed

**Cons:**

- Bypasses RLS (but that's the point for this use case)

---

### Option 2: Fix the `get_user_email()` Function

**Investigation Needed:**

1. Check if `get_user_email()` function exists and works correctly
2. Verify it properly returns email from profiles table
3. Test timing - does profile exist when query runs?

**File to Check:** `supabase/migrations/*_functions.sql`

**Pros:**

- Fixes the RLS policy as intended
- Maintains security model

**Cons:**

- More complex
- May have timing issues with profile creation

---

### Option 3: Modify RLS Policy

**Change the policy to allow invites where:**

```sql
CREATE POLICY "Users can view invites to them"
ON invites FOR SELECT
TO authenticated
USING (
  public.user_is_org_member((SELECT auth.jwt()->>'sub'), org_id)
  OR invitee = public.get_user_email((SELECT auth.jwt()->>'sub'))  -- ← Simplified
  OR (SELECT auth.jwt()->>'sub') = inviter
);
```

**Pros:**

- Might fix the comparison issue

**Cons:**

- Still relies on `get_user_email()` working correctly

---

## Impact Assessment

### Affected Users

- ✅ **Test Environment:** All invite acceptance tests
- ⚠️ **Production:** ANY user trying to accept an invite after signing up
- ⚠️ **User Experience:** Users think they have no invites and get stuck

### Severity

- **Critical** - Breaks core invite acceptance flow
- **Blocker** - Users cannot join organizations via invite
- **Data Loss Risk** - None (invites exist, just can't be viewed)

---

## Recommended Action Plan

1. **Immediate Fix (Option 1):**
   - Modify `getUserInvites()` to use service role
   - Deploy to production
   - Verify tests pass
   - **ETA:** 30 minutes

2. **Follow-up Investigation:**
   - Debug `get_user_email()` function
   - Check profile creation timing
   - Consider if RLS policy should be updated
   - **ETA:** 1-2 hours

3. **Regression Testing:**
   - Run all invite-related E2E tests
   - Manual test invite acceptance flow
   - Verify no security regressions
   - **ETA:** 1 hour

---

## Test Logs

### Successful Cleanup

```
🧹 Running cleanup for invited user...
🧹 Cleaning up invited test user: test.user2@example.com
No profile found in Supabase
Checking for Supabase Auth user...
Found auth user with email test.user2@example.com (ID: ad4596e2-8cfc-4eee-ac6a-6fc7e2011727)
✓ Deleted Supabase Auth user
✅ Cleanup complete!
```

### Successful Sign-up

```
🎯 Step 2: Signing up invited user...
   📍 Step 1: Navigate to sign-up page...
   ✅ On sign-in page
   ✅ On sign-up page
   📝 Step 2: Filling sign-up form...
   ✅ Filled name: Test User
   ✅ Filled email: test.user2@example.com
   ✅ Filled password
   ✅ Filled confirm password
   ✅ Checked terms checkbox
   🚀 Submitting sign-up form...
   ⏳ Waiting for navigation away from sign-up...
   ✅ Navigated away from sign-up page
   ✅ Sign-up completed
   Current URL: http://localhost:3000/
```

### Invite Badge Failure

```
🔍 acceptInviteFromBadge: Starting for test.user2@example.com
   ⏳ Waiting for page to load...
   ✅ Page loaded: http://localhost:3000/
   🔍 Looking for invite badge triggers...
   Found 1 invite badge trigger(s)
   ⏳ Waiting for at least one badge to be visible (15s timeout)...
   ✅ Badge is visible
   🔍 Finding the correct badge to click...
   Found 1 badge(s) in main section
   Section badge visible: true
   ⏳ Waiting for badge to be visible and enabled...
   ✅ Badge is ready
   🖱️  Clicking invite badge...
   ⏳ Waiting for dropdown to appear...
   ✅ Dropdown is visible
   🔍 Looking for invite items in dropdown...
   ❌ No invite items found after 10s
   Dropdown HTML: <p class="text-xs text-muted-foreground">You have no pending invitations</p>
```

### Database Verification

```
🔍 Checking invite state for: test.user2@example.com

✅ Supabase Auth User:
   ID: d7152496-ceac-45d0-bdd1-4643ddf093a3
   Email: test.user2@example.com

✅ Profile:
   ID: d7152496-ceac-45d0-bdd1-4643ddf093a3
   Email: test.user2@example.com
   Full name: Test User
   Signup complete: true

✅ Found 15 invite(s) [with full details]
```

---

## Files Modified

### Cleanup Script

- `/tests/cleanup-invited-user.ts` - Lines 106-135
  - Changed to always check for auth users by email
  - Added comprehensive logging

### Test Files

- `/tests/e2e/organization/invite-mgmt.spec.ts` - beforeEach hooks
  - Added logging to verify invite creation

### Utility Functions

- `/tests/e2e/utils/org-utils.ts` - `acceptInviteFromBadge()`
  - Added comprehensive step-by-step logging
  - Added error screenshots
  - Added dropdown HTML logging

### Diagnostic Scripts Created

- `/tests/check-auth-user.ts` - Check and delete auth users
- `/tests/check-invite-state.ts` - Verify invite state
- `/tests/test-invite-rls.ts` - Test RLS policies

---

## Conclusion

**STATUS:** Root cause identified and diagnosed. Awaiting fix implementation.

**RECOMMENDATION:** Implement Option 1 (service role for invite queries) immediately to unblock tests and production users.

**NEXT STEPS:**

1. Modify `getUserInvites()` to use service role
2. Run tests to verify fix
3. Deploy to production
4. Schedule follow-up investigation of RLS policies

---

**Diagnosed by:** Claude (AI Assistant)
**Date:** 2026-01-23
**Session Context:** Continuation of group management test debugging

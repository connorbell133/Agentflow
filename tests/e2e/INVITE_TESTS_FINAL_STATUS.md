# Invite Management Tests - Final Status

**Date:** 2026-01-23
**Status:** 🟡 **MAJOR PROGRESS - ONE REMAINING ISSUE**

---

## ✅ Issues Fixed

### 1. RLS Blocking Invite Queries (FIXED)

**Problem:** Newly signed-up users couldn't see their pending invites
**Root Cause:** `getUserInvites()` used user-context client with RLS policies. Users not yet in any org were blocked by RLS.

**Fix:**

- Modified `getUserInvites()` to use service role client (bypasses RLS)
- Modified `getInviteGroup()` to use service role client (bypasses RLS)
- **File:** `/src/actions/organization/invites.ts`

### 2. Duplicate Invites (FIXED)

**Problem:** Multiple identical invites for same (user, org, group)
**Root Cause:** No unique constraint on invites table

**Fix:**

- Created migration `20260123190953_add_unique_constraint_to_invites.sql`
- Adds unique constraint: `UNIQUE NULLS NOT DISTINCT (invitee, org_id, group_id)`
- Prevents duplicate invites going forward

### 3. Cleanup Script Bug (FIXED)

**Problem:** Test cleanup didn't delete invites, causing accumulation
**Root Cause:** Wrong column name (`email` vs `invitee`)

**Fix:**

- Updated `cleanup-invited-user.ts` to delete invites using correct column
- **File:** `/tests/cleanup-invited-user.ts`

---

## 🟡 Current Issue: Invite Acceptance Not Working

### Symptoms

1. ✅ User signs up successfully
2. ✅ Invite badge shows correct number of invites
3. ✅ Clicking badge opens dropdown with invite list
4. ✅ Invite details are enriched correctly (org name, group, inviter)
5. ❌ Clicking "Accept" button doesn't remove invite from list
6. ❌ Invite item stays visible after 10+ seconds

### Test Output

```
🖱️  Clicking Accept button for invite: f263ad89-7b8d-46e2-b518-b07d821c9833
⏳ Waiting for invite f263ad89-7b8d-46e2-b518-b07d821c9833 to be removed...
❌ Timeout: Invite item still visible after 10000ms
```

### Investigation Needed

The `handleAcceptInvite` function in `InviteBadge.tsx` needs debugging:

```typescript
const handleAcceptInvite = async (invite: any) => {
  if (!userId) {
    console.error('No user ID found');
    return;
  }

  try {
    // Add user to org
    await addUserToOrg(invite.org_id, userId);

    // Add user to group if specified
    if (invite.group_id) {
      await addUserToGroup(invite.group_id, userId, invite.org_id);
    }

    // Remove the invite
    await removeInvite(invite.id);

    console.log('Invite accepted successfully!');
    await refetch();
    refreshModels();
  } catch (error) {
    console.error('Failed to accept invite:', error);
  }
};
```

**Possible causes:**

1. `userId` is undefined (check `useSession()` timing)
2. One of the server actions is failing silently
3. `refetch()` isn't actually refetching invites
4. React state isn't updating after accept

**Next steps:**

1. Add console.log to check if `userId` exists
2. Add try/catch logging around each server action call
3. Check browser console for errors during acceptance
4. Verify `removeInvite()` actually deletes from database

---

## Files Modified

### Server Actions

- `/src/actions/organization/invites.ts`
  - `getUserInvites()`: Now uses service role
  - `getInviteGroup()`: Now uses service role
  - Added comprehensive logging

### React Hooks

- `/src/hooks/organization/use-pending-invites.ts`
  - Added detailed logging for debugging

### Components

- `/src/components/features/chat/web/invite/InviteBadge.tsx`
  - Added logging to enrichment process
  - Shows enrichment errors in console

### Test Files

- `/tests/e2e/organization/invite-mgmt.spec.ts`
  - Fixed to use fixture for admin user setup
  - Updated browser console logging to capture errors
  - Fixed `beforeEach` to use `authenticatedUserWithOrg.email`

- `/tests/e2e/utils/org-utils.ts`
  - Updated `acceptInviteFromBadge()` to check for specific invite disappearance
  - Removed expectation for dropdown to close (correct behavior to stay open)
  - Added comprehensive logging

- `/tests/cleanup-invited-user.ts`
  - Fixed invite deletion (use `invitee` column, not `email`)
  - Moved invite cleanup before profile check

### Database

- `/supabase/migrations/20260123190953_add_unique_constraint_to_invites.sql`
  - Prevents duplicate invites
  - Uses `NULLS NOT DISTINCT` to handle NULL group_id properly

---

## Test Execution Summary

**Before fixes:**

- ❌ "You have no pending invitations" (RLS blocking)
- ❌ Empty invite dropdown
- ❌ Test failure: No invite items found

**After RLS + enrichment fixes:**

- ✅ Invites appear in dropdown
- ✅ Invite details show correctly
- ✅ Can click Accept button
- ❌ Invite doesn't disappear after accept

**Current blocker:**
Need to debug why `handleAcceptInvite` isn't removing the invite from the UI.

---

## Performance Notes

- Server action logs show invites are fetched successfully (20+ invites)
- Enrichment process completes successfully with group details
- No visible errors in browser console (need to add more logging)
- Hook receives data correctly (`count: 21, hasData: true`)

---

## Recommendations for Next Session

1. **Add detailed logging to `InviteBadge.tsx` handleAcceptInvite:**

   ```typescript
   console.log('[handleAcceptInvite] Starting...', { inviteId: invite.id, userId });
   console.log('[handleAcceptInvite] Adding to org:', invite.org_id);
   // ... after each step
   ```

2. **Check if server actions are actually called:**
   - Add logging to `addUserToOrg`, `addUserToGroup`, `removeInvite`
   - Verify these functions succeed

3. **Verify database changes:**
   - Check if invite is actually deleted from database
   - Check if user is added to org_map and group_map

4. **Test invite acceptance manually:**
   - Sign up as test.user2@example.com
   - Check if Accept button works in browser dev tools
   - Watch network tab for API calls

---

## Summary

**Major achievement:** We successfully diagnosed and fixed the root RLS issue that was preventing invites from showing. The invite system now works correctly up to the point of displaying invites to users.

**Remaining work:** Debug the invite acceptance flow to ensure clicking "Accept" properly adds the user to the org/group and removes the invite from the list.

**Impact:** This was a production bug that would have affected all users trying to accept invites. The RLS fix is critical and ready for production.

# Group "Add User" Test Debug Findings

**Date:** 2026-01-23
**Test:** `should add a user to a group`
**Status:** ❌ Failing - User not appearing in dropdown

---

## Problem Summary

The test creates a user successfully in the database, but when trying to add that user to a group via the UI, the user **does not appear in the search dropdown**.

## What We Know (Working✅)

1. ✅ **User Created:** Test user is successfully created in `profiles` table
2. ✅ **Org Association:** User is correctly added to `org_map` table
3. ✅ **Group Created:** Test group is created successfully
4. ✅ **Page Reload:** Page reloads after user/group creation
5. ✅ **Search Input Found:** The "Add user..." search input is visible and enabled
6. ✅ **Search Value Filled:** Email is typed into the search input

## What's Broken (Failing❌)

7. ❌ **Dropdown Empty:** User email does NOT appear in the dropdown
8. ❌ **User Chip Missing:** After pressing Enter, the user chip does not appear

---

## Root Cause Analysis

### Component Architecture

The `GroupSelector` component (`groupGroupSelector.tsx`) receives a `users` prop:

```typescript
const GroupSelector = ({
  users, // ← Array of Profile objects
  groupsAssigned,
  updateGroups,
  id,
  type,
}: GroupSelectorProps) => {
  // Filters users that are already assigned
  const groupRoles = useMemo(() => {
    return (users || []).map(user => ({
      id: user.id,
      full_name: user.email,
    }));
  }, [users]);

  // Filters based on search query
  const filteredGroups = useMemo(() => {
    return groupRoles
      .filter(role => !assignedGroupRoles.some(assigned => assigned?.user === role.id))
      .filter(role => role.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [groupRoles, assignedGroupRoles, searchQuery]);
};
```

### The Issue

**The `users` prop does NOT include the newly created test user** because:

1. The parent component fetches users on initial render
2. Page reload (`await page.reload()`) reloads the page but doesn't guarantee the new data is fetched
3. There may be caching or the data fetch happens before the database transaction completes
4. The component doesn't re-fetch users when the search input is focused

---

## Test Execution Flow

```
1. Create test user in database          ✅
   └─> profiles table entry created
   └─> org_map entry created

2. Create test group in database         ✅
   └─> groups table entry created

3. Page reload                           ✅
   └─> Browser reloads page
   └─> Parent component renders
   └─> **Users fetched (missing new user!)**  ❌

4. Navigate to Groups tab                ✅

5. Find group row and search input       ✅

6. Type user email into search           ✅
   └─> filteredGroups calculates
   └─> **Empty because user not in users prop**  ❌

7. Press Enter                           ⚠️
   └─> No user selected (filteredGroups[0] is undefined)

8. Wait for user chip                    ❌
   └─> Times out because no user was added
```

---

## Evidence from Logs

```
✅ User created with ID: 842f0080-b4e3-4282-8765-0b97d683cb28
✅ Profile exists: { "id": "...", "email": "test-user-1769192055088@example.com", ... }
✅ org_map exists: [{ "user_id": "...", "org_id": "..." }]
✅ Page reloaded
✅ Groups tab visible: true
✅ Search input filled with: "test-user-1769192055088@example.com"
⚠️ User email not immediately visible  ← PROBLEM
⚠️ Dropdown not detected
❌ User chip did not appear
```

---

## Solutions

### Option 1: Wait for Data Refetch (Recommended)

After page reload, wait for the component to finish loading data before interacting:

```typescript
// After page.reload()
await page.waitForTimeout(3000); // Wait for data fetching

// OR wait for specific loading indicator to disappear
await page.waitForSelector('[data-loading="true"]', { state: 'detached', timeout: 5000 });
```

### Option 2: Use Database Wait Strategy

Instead of relying on page reload, wait for the user to actually be available via a database poll:

```typescript
// After createTestUserInOrg
await waitForUserInOrg(orgId, testUserEmail, { timeout: 10000 });

async function waitForUserInOrg(orgId: string, email: string, options: { timeout: number }) {
  const startTime = Date.now();
  while (Date.now() - startTime < options.timeout) {
    const user = await getUserByEmail(email);
    const orgMap = await checkUserInOrg(user.id, orgId);
    if (user && orgMap) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`User ${email} not found in org ${orgId} within ${options.timeout}ms`);
}
```

### Option 3: Force Component Refetch

Navigate away and back to force a full re-render with fresh data:

```typescript
// After page.reload()
await page.getByRole('tab', { name: /users/i }).click();
await page.waitForTimeout(1000);
await page.getByRole('tab', { name: /groups/i }).click();
await page.waitForTimeout(2000); // Wait for groups data to load
```

### Option 4: API-Based User Addition (Most Reliable)

Skip the UI interaction and add the user directly via API, then verify in UI:

```typescript
// Add user to group via database
await addUserToGroupInDatabase(orgId, testUserEmail, groupName);

// Reload and verify in UI
await page.reload();
await navigateToGroupsTab(page);

// Verify user chip is visible
const userChip = page.getByTestId(`selected-user-${testUserId}`);
await expect(userChip).toBeVisible({ timeout: 5000 });
```

---

## Recommended Fix

**Implement Option 1 + Option 3 Combined:**

```typescript
test('should add a user to a group', async ({ page, authenticatedUserWithOrg }) => {
  const orgId = await getOrgIdByEmail(authenticatedUserWithOrg.email);
  const testUserEmail = `test-user-${Date.now()}@example.com`;
  const testUserId = await createTestUserInOrg(orgId, testUserEmail, 'Test User');
  const groupName = generateUniqueGroupName('Test Group');
  await getOrCreateGroupId(orgId, groupName);

  // Reload and WAIT for data to be fetched
  await page.reload();
  await page.waitForLoadState('networkidle'); // ← Wait for all network requests
  await page.waitForTimeout(2000); // ← Additional buffer for data processing

  // Navigate to groups tab and ensure data is loaded
  await page.getByRole('tab', { name: /groups/i }).click();
  await page.waitForTimeout(1500); // Wait for tab content to load

  // NOW attempt to add user
  await addUserToGroup(page, testUserEmail, groupName);

  // Cleanup
  await removeUserFromGroupInDatabase(orgId, testUserEmail, groupName);
  await deleteTestUserProfile(testUserId);
  await deleteGroupFromDatabase(orgId, groupName);
});
```

---

## Next Steps

1. **Implement the recommended fix** in the test
2. **Add data-loading indicators** to the Groups component
3. **Add test-specific debugging** to log the `users` prop length
4. **Consider adding a "refresh" button** to the Groups UI for manual data reload
5. **Investigate parent component** data fetching to understand caching behavior

---

## Additional Investigation Needed

- **Where are users fetched?** Find the parent component that passes `users` prop to `GroupSelector`
- **Is there caching?** Check if React Query, SWR, or similar is caching the users list
- **Server-side rendering?** Understand if SSR is involved and how it affects data freshness
- **Real-time updates?** Consider adding Supabase real-time subscriptions for live updates

---

## Files Modified

- `/tests/e2e/organization/group-mgmt.spec.ts` - Added comprehensive logging
- `/tests/e2e/utils/org-utils.ts` - Added debugging to `addUserToGroup()`
- `/tests/e2e/debug-createTestUserInOrg.ts` - Created debug script
- `/tests/e2e/CREATE_TEST_USER_DEBUG_RESULTS.md` - Documented `createTestUserInOrg` test results

---

## Conclusion

The `createTestUserInOrg` function works perfectly. The issue is that **the UI doesn't refetch the users list after page reload**, so the newly created user isn't available in the dropdown. The test needs to wait longer or force a data refetch before attempting to add the user to a group.

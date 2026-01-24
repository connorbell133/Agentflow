# Test Reorganization Summary

## What Changed

### Before (Confusing)

```
tests/e2e/
├── auth/
│   └── onboarding.spec.ts          # Onboarding + some invite acceptance
└── organization/
    └── invite-mgmt.spec.ts         # Invite CRUD + invite acceptance
```

**Problems:**

- Invite acceptance tests scattered across multiple files
- Hard to see what acceptance scenarios are covered
- Mixing admin and user perspectives
- Duplication risks

### After (Clear)

```
tests/e2e/
├── auth/
│   └── onboarding.spec.ts          # ONLY onboarding (profile + org setup)
└── organization/
    ├── invite-mgmt.spec.ts         # ONLY invite management (create, revoke, list)
    └── invite-accept.spec.ts       # ALL invite acceptance scenarios
```

**Benefits:**

- All acceptance tests in one place
- Clear what each file does
- Separate admin vs user perspectives
- No duplication

---

## File Purposes

### auth/onboarding.spec.ts

**Tests:**

- Profile setup form
- Organization creation during onboarding
- Skipping organization setup
- Navigation between onboarding steps

**Does NOT test:** Accepting invites (moved to `invite-accept.spec.ts`)

---

### organization/invite-mgmt.spec.ts

**Tests (Admin perspective):**

- Creating new invites
- Revoking pending invites
- Listing pending invites
- Preventing duplicate invites

**Does NOT test:** Accepting invites (moved to `invite-accept.spec.ts`)

---

### organization/invite-accept.spec.ts ✨ NEW

**Tests (User perspective):**

**Implemented:**

- ✅ Accept invite during onboarding
- ✅ Accept invite from notification badge
- ✅ Show invite details before accepting
- ✅ Display notification badge with count

**Planned:**

- 🔜 Accept invite with existing organization
- 🔜 Handle expired invites
- 🔜 Handle already accepted invites
- 🔜 Handle revoked invites

---

## Migration Details

### What Was Moved

**From `invite-mgmt.spec.ts` to `invite-accept.spec.ts`:**

- `test.describe('Organization Invites - Accept During Onboarding')`
  - `should accept an invite during onboarding after signup`
- `test.describe('Organization Invites - Accept From Badge')`
  - `should accept an invite from notification badge after sign up`

**What Stayed in `invite-mgmt.spec.ts`:**

- `test.describe('Organization Invites - Basic Operations')`
  - `should invite a user to the organization`
  - `should revoke a pending invite`

**What Stayed in `onboarding.spec.ts`:**

- All pure onboarding tests (profile setup, org creation, skip)

---

## Key Organizational Principle

**Group tests by FEATURE, not UI LOCATION**

✅ **Good**: All "accept invite" tests in `invite-accept.spec.ts`
❌ **Bad**: "Accept from onboarding" in `onboarding.spec.ts`, "Accept from badge" in `dashboard.spec.ts`

---

## Quick Reference

| I want to test...             | File to use             |
| ----------------------------- | ----------------------- |
| Creating an invite            | `invite-mgmt.spec.ts`   |
| Revoking an invite            | `invite-mgmt.spec.ts`   |
| Accepting an invite (any way) | `invite-accept.spec.ts` |
| Onboarding flow               | `onboarding.spec.ts`    |
| Sign-up flow                  | `sign-up.spec.ts`       |
| Managing groups               | `group-mgmt.spec.ts`    |

---

## Verification Checklist

To verify the reorganization is correct:

- [ ] All "accept invite" tests are in `invite-accept.spec.ts`
- [ ] `invite-mgmt.spec.ts` only has admin operations
- [ ] `onboarding.spec.ts` only has pure onboarding flows
- [ ] No test duplication across files
- [ ] File names clearly indicate what they test
- [ ] Test describe blocks are organized by scenario, not UI location

---

## Future Improvements

When adding new tests, follow these guidelines:

1. **Adding new invite acceptance scenario?**
   → Add to `invite-accept.spec.ts`, even if the button is in a new location

2. **Adding new invite management feature?**
   → Add to `invite-mgmt.spec.ts`

3. **Adding new onboarding step?**
   → Add to `onboarding.spec.ts`

4. **Not sure where it goes?**
   → Read `TEST_ORGANIZATION_GUIDE.md`

---

## Related Documentation

- [`TEST_ORGANIZATION_GUIDE.md`](./TEST_ORGANIZATION_GUIDE.md) - Comprehensive guide to test organization
- [`FAST_USER_CREATION_GUIDE.md`](./FAST_USER_CREATION_GUIDE.md) - Guide to fast user creation for tests
- [`README.md`](./README.md) - General E2E testing documentation

---

## Questions?

**Q: Why not keep acceptance tests in onboarding.spec.ts if they happen during onboarding?**

A: Because onboarding is WHERE it happens, not WHAT is being tested. We test the FEATURE (invite acceptance), not the LOCATION (onboarding page).

**Q: What if I have a test that involves multiple features?**

A: Put it in the file for the PRIMARY feature being tested. Use descriptive test names to clarify.

**Q: When should I create a new test file?**

A: When testing a new feature OR when a file gets too large (>500 lines). Split by sub-feature, not by UI location.

---

## Summary

**Old approach:** Tests organized by where buttons are
**New approach:** Tests organized by what they test

This makes it:

- ✅ Easier to find relevant tests
- ✅ Clearer what scenarios are covered
- ✅ Simpler to maintain
- ✅ Harder to duplicate tests

**Golden rule:** If you can't tell what a test file does from its name, reorganize it!

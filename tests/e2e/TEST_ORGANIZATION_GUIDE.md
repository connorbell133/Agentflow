# E2E Test Organization Guide

## Overview

This guide explains how E2E tests are organized in this project. Tests are grouped **by feature/capability**, not by UI location.

## Organizational Principle

✅ **DO**: Group tests by what they test (feature)
❌ **DON'T**: Group tests by where buttons are located (UI location)

### Example

**Bad organization (by UI location):**

```
tests/
├── onboarding/
│   ├── accept-invite-in-onboarding.spec.ts
│   ├── create-org-in-onboarding.spec.ts
│   └── skip-onboarding.spec.ts
└── dashboard/
    └── accept-invite-from-badge.spec.ts
```

**Good organization (by feature):**

```
tests/
├── auth/
│   └── onboarding.spec.ts              # All onboarding flows
└── organization/
    ├── invite-mgmt.spec.ts             # Managing invites
    └── invite-accept.spec.ts           # Accepting invites (all scenarios)
```

---

## Directory Structure

```
tests/e2e/
├── auth/
│   ├── sign-in.spec.ts                 # Sign-in flows
│   ├── sign-up.spec.ts                 # Sign-up flows
│   ├── onboarding.spec.ts              # Onboarding flows
│   └── verify-session.spec.ts          # Session validation
│
├── organization/
│   ├── invite-mgmt.spec.ts             # CRUD operations for invites
│   ├── invite-accept.spec.ts           # All invite acceptance scenarios
│   ├── group-mgmt.spec.ts              # Managing groups
│   └── model-mgmt.spec.ts              # Managing models
│
├── chat/
│   └── conversation.spec.ts            # Chat/conversation flows
│
├── fixtures/
│   └── test-fixtures.ts                # Shared test fixtures
│
└── utils/
    ├── auth-factories.ts               # Fast user creation
    ├── auth-helpers.ts                 # Auth utilities
    ├── org-utils.ts                    # Org utilities
    └── test-factories.ts               # Test data generators
```

---

## File Responsibilities

### auth/onboarding.spec.ts

**Purpose**: Test the onboarding flow itself (profile + org setup)

**Tests**:

- Display profile setup form
- Require full name before proceeding
- Proceed to org setup after profile
- Create organization during onboarding
- Skip organization setup
- Save profile data

**Does NOT test**: Accepting invites (even if it happens during onboarding)

---

### organization/invite-mgmt.spec.ts

**Purpose**: Test MANAGING invites (CRUD operations from admin perspective)

**Tests**:

- Create new invite
- Revoke pending invite
- Display pending invites list
- Prevent duplicate invites
- View invite details

**Does NOT test**: Accepting invites (that's the invited user's perspective)

---

### organization/invite-accept.spec.ts

**Purpose**: Test ALL invite acceptance scenarios (from invited user's perspective)

**Tests**:

- ✅ Accept invite during onboarding
- ✅ Accept invite from notification badge
- ✅ Show invite details before accepting
- ✅ Display notification badge with count
- 🔜 Accept invite with existing organization
- 🔜 Handle expired invites
- 🔜 Handle already accepted invites
- 🔜 Handle revoked invites

**Key point**: All "accept invite" tests are together, regardless of WHERE the acceptance button is in the UI.

---

## Why This Organization?

### 1. Clear Test Coverage

When all invite acceptance tests are in one file, you can immediately see:

- ✅ What scenarios are covered
- ❌ What scenarios are missing
- 🔄 What scenarios are duplicated

**Example**: Looking at `invite-accept.spec.ts`, you can instantly see you're missing tests for expired invites.

### 2. Prevents Duplication

**Bad**:

```
onboarding.spec.ts:
  - test('accept invite during onboarding')

dashboard.spec.ts:
  - test('accept invite from badge')

profile.spec.ts:
  - test('accept invite from notifications')
```

Are these testing the same thing? Do we need all three?

**Good**:

```
invite-accept.spec.ts:
  - test('accept invite during onboarding')
  - test('accept invite from notification badge')
```

Clear that these are different scenarios!

### 3. Easier Maintenance

When the invite acceptance logic changes, you only need to update ONE file (`invite-accept.spec.ts`), not hunt through multiple test files.

### 4. Better Test Names

**Unclear**: `onboarding.spec.ts > should accept invite`

- Accept invite? What kind? Where?

**Clear**: `invite-accept.spec.ts > Accept During Onboarding > should accept invite`

- Immediately clear this is about accepting an invite during onboarding

---

## Test Naming Conventions

### File Names

- Use kebab-case: `invite-accept.spec.ts`
- Be specific: `invite-accept.spec.ts` not `invites.spec.ts`
- Group related tests: `invite-mgmt.spec.ts` and `invite-accept.spec.ts` are clearly related

### Describe Blocks

```typescript
// Level 1: Feature/Capability
test.describe('Invite Acceptance', () => {
  // Level 2: Scenario
  test.describe('During Onboarding', () => {
    // Level 3: Specific test
    test('should accept invite and join organization', async () => {
      // ...
    });
  });
});
```

**Output:**

```
Invite Acceptance
  During Onboarding
    ✓ should accept invite and join organization
```

---

## When to Create a New Test File

Create a new test file when:

1. **Testing a different feature**
   - `invite-accept.spec.ts` vs `group-mgmt.spec.ts`

2. **Different perspective/role**
   - `invite-mgmt.spec.ts` (admin managing invites)
   - `invite-accept.spec.ts` (user accepting invites)

3. **File is getting too large**
   - Split by sub-feature
   - Example: `model-mgmt.spec.ts` → `model-create.spec.ts` + `model-configure.spec.ts`

Don't create a new file when:

1. **Just different UI locations**
   - Keep all acceptance tests together even if buttons are in different places

2. **Similar test scenarios**
   - Use `test.describe()` blocks to organize instead

---

## Migration Checklist

When reorganizing tests:

- [ ] Identify the core feature being tested
- [ ] Group all tests for that feature in one file
- [ ] Remove duplicates across files
- [ ] Update test names to be clear without file context
- [ ] Add comments explaining what the file does NOT test
- [ ] Update this documentation

---

## Common Patterns

### Testing Flows vs Operations

**Flow tests** (sequential steps):

```typescript
// onboarding.spec.ts
test('should complete onboarding flow', async ({ page }) => {
  // 1. Fill profile
  // 2. Navigate to org setup
  // 3. Create organization
  // 4. Verify completion
});
```

**Operation tests** (discrete actions):

```typescript
// invite-mgmt.spec.ts
test('should create invite', async ({ page }) => {
  // Just test creating the invite
  // Don't test what happens after
});
```

### Testing Happy Path vs Error Cases

Group error cases together:

```typescript
test.describe('Invite Acceptance - Happy Path', () => {
  test('should accept invite during onboarding', ...);
  test('should accept invite from badge', ...);
});

test.describe('Invite Acceptance - Error Cases', () => {
  test('should reject expired invite', ...);
  test('should reject revoked invite', ...);
  test('should reject already accepted invite', ...);
});
```

---

## Quick Reference

| Feature           | File                                 | What it tests                 |
| ----------------- | ------------------------------------ | ----------------------------- |
| Sign in           | `auth/sign-in.spec.ts`               | Sign-in flow                  |
| Sign up           | `auth/sign-up.spec.ts`               | Sign-up flow                  |
| Onboarding        | `auth/onboarding.spec.ts`            | Profile + org setup           |
| Managing invites  | `organization/invite-mgmt.spec.ts`   | Create, revoke, list          |
| Accepting invites | `organization/invite-accept.spec.ts` | All acceptance scenarios      |
| Managing groups   | `organization/group-mgmt.spec.ts`    | Create, edit, delete groups   |
| Managing models   | `organization/model-mgmt.spec.ts`    | Add, configure, remove models |
| Chat              | `chat/conversation.spec.ts`          | Messaging and conversations   |

---

## Anti-Patterns to Avoid

### ❌ Don't: Organize by Page/Route

```
tests/
├── admin-page.spec.ts          # Everything on /admin
├── dashboard-page.spec.ts      # Everything on /
└── onboarding-page.spec.ts     # Everything on /onboarding
```

**Problem**: Tests for the same feature are scattered across files.

### ❌ Don't: Have "Misc" or "Other" Files

```
tests/
├── invite-tests.spec.ts
├── more-invite-tests.spec.ts
└── invite-misc.spec.ts         # ← What is this?
```

**Problem**: Unclear what's in "misc", leads to duplication.

### ❌ Don't: Mix Perspectives

```typescript
// invite-tests.spec.ts
test('admin creates invite', ...);        // Admin perspective
test('user accepts invite', ...);         // User perspective
test('admin revokes invite', ...);        // Admin perspective
test('user sees invite badge', ...);      // User perspective
```

**Problem**: Mixing admin and user tests makes it hard to understand test scope.

**Fix**: Split into `invite-mgmt.spec.ts` (admin) and `invite-accept.spec.ts` (user).

---

## Examples of Good Organization

### Example 1: Invite Tests

```
organization/
├── invite-mgmt.spec.ts           # Admin: create, revoke, list
└── invite-accept.spec.ts         # User: accept, reject, view
```

Clear separation of concerns!

### Example 2: Model Configuration

```
organization/
├── model-mgmt.spec.ts            # Add, remove, list models
└── model-wizard.spec.ts          # Configure model settings
```

Management vs configuration!

### Example 3: Group Management

```
organization/
├── group-mgmt.spec.ts            # Create, delete, edit groups
└── group-membership.spec.ts      # Add/remove users from groups
```

CRUD vs membership operations!

---

## Summary

**Golden Rule**: Group tests by **what they test** (feature), not **where they test it** (UI location).

**Benefits**:

- Clear test coverage
- No duplication
- Easier maintenance
- Better test names
- Faster to find relevant tests

**Remember**: If you can't immediately tell what a test file does from its name, the organization needs improvement!

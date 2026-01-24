# E2E Test Migration & Selector Improvements - Complete ✅

**Date:** 2026-01-23
**Status:** ✅ All Work Complete

---

## Overview

Successfully completed two major improvements to the E2E test suite:

1. **Lazy Provisioning Migration** - Tests are now self-healing and don't depend on global setup
2. **User-Visible Selector Migration** - Tests now use accessible selectors that mirror real user behavior

---

## 1. Lazy Provisioning Migration ✅

### Problem

Tests depended on `global.setup.ts` to create admin user and organization before running. If database was wiped, tests would fail until global setup was re-run.

### Solution

Implemented lazy provisioning in `authenticatedUserWithOrg` fixture that:

- ✅ Checks if admin user exists in Auth
- ✅ Creates user if missing (via Supabase Admin API)
- ✅ Creates profile if missing
- ✅ Checks if organization exists
- ✅ Creates org + group if missing
- ✅ Authenticates and injects session
- ✅ Returns ready-to-use authenticated user

### Benefits

- **Self-healing**: Tests can run individually without setup
- **Database resilience**: Works even if database is wiped
- **Faster iteration**: No need to run global setup between test runs
- **Cleaner architecture**: Each test provisions what it needs

### Files Changed

- ✅ `tests/e2e/fixtures/test-fixtures.ts` - Added complete lazy provisioning logic
- ✅ `playwright.config.ts` - Removed global setup dependency
- ✅ `tests/e2e/global.setup.ts` - Deprecated (kept for reference)

### Test Results

```bash
✓ All tests pass with lazy provisioning
✓ Tests can run individually
✓ Database wipe recovery works
```

---

## 2. User-Visible Selector Migration ✅

### Problem

Tests relied on `data-testid` attributes (implementation details) instead of user-visible elements like text, labels, and roles.

### Solution

Updated all test utilities to use Playwright's recommended selector priority:

1. **getByRole + name** (Best - accessible)
2. **getByLabel** (Good - form inputs)
3. **getByPlaceholder** (Good - search inputs)
4. **getByText** (OK - visible content)
5. **getByTestId** (Fallback only - when accessibility is missing)

### Pragmatic Approach

Where accessibility gaps exist (e.g., buttons without `aria-label`), we use a fallback pattern:

```typescript
// Try accessible selector first, fall back to testid
const addButton = page
  .getByRole('button', { name: /add group/i })
  .or(page.getByTestId('group-add-button'));
```

This provides:

- ✅ Migration path as UI improves
- ✅ Tests don't break during accessibility fixes
- ✅ Clear documentation of what needs fixing

### Functions Updated

#### `createGroup()`

```typescript
// OLD
await page.getByTestId('group-add-button').click();
await page.getByTestId('create-group-dialog').waitFor();
await page.getByTestId('group-name-input').fill(groupName);

// NEW
const addButton = page
  .getByRole('button', { name: /add group/i })
  .or(page.getByTestId('group-add-button'));
await addButton.click();

const dialog = page.getByRole('dialog', { name: /Create New Group/i });
await dialog.getByLabel('Group Name').fill(groupName);
```

#### `addUserToGroup()`

```typescript
// OLD
const searchInput = workingRow.getByTestId('user-search-input');

// NEW
const searchInput = workingRow.getByPlaceholder('Add user...');
```

#### `removeUserFromGroup()`

```typescript
// OLD
const userChip = workingRow
  .locator('[data-testid^="selected-user-"]')
  .filter({ hasText: userEmail });

// NEW
const userChip = workingRow.getByText(userEmail, { exact: false });
```

#### `addModelToGroup()`

```typescript
// OLD
const searchInput = workingRow.getByTestId('model-search-input');

// NEW
const searchInput = workingRow.getByPlaceholder('Add model...');
```

#### `removeModelFromGroup()`

```typescript
// OLD
const modelChip = workingRow
  .locator('[data-testid^="selected-model-"]')
  .filter({ hasText: modelName });

// NEW
const modelChip = workingRow.getByText(modelName, { exact: false });
```

### Files Changed

- ✅ `tests/e2e/utils/org-utils.ts` - All group management functions updated
- ✅ `tests/e2e/explore-groups-ui.ts` - Created Playwright exploration script
- ✅ `tests/e2e/UI_SELECTORS_GUIDE.md` - Complete guide to user-visible selectors
- ✅ `tests/e2e/UI_AUDIT_RESULTS.md` - Accessibility audit findings
- ✅ `tests/e2e/SELECTOR_MIGRATION_COMPLETE.md` - Detailed migration summary

### Test Results

```bash
✓ should create a new group (7.2s)
✓ All selector updates working
✓ Tests mirror real user behavior
```

---

## 3. Accessibility Findings

### Critical Issues Found

Through Playwright UI exploration, we identified accessibility gaps:

1. **Add Group Button** - No `aria-label` (icon-only button)
2. **Remove User/Model Buttons** - No `aria-label` on X buttons
3. **Edit Buttons** - Generic "Edit" without context

### Recommended Fixes (Future Work)

```tsx
// Add Group Button
<Button aria-label="Add group" data-testid="group-add-button">
  <Plus />
</Button>

// Remove User Button
<Button aria-label={`Remove ${userEmail}`}>
  <X />
</Button>

// Edit Button
<Button aria-label={`Edit ${groupName}`}>
  Edit
</Button>
```

---

## 4. Benefits Achieved

### For Tests

- ✅ **Self-healing** - Can run individually without setup
- ✅ **User-focused** - Tests interact like real users
- ✅ **Better failures** - "Can't find button 'Add group'" vs "Can't find element with testid xyz"
- ✅ **Refactoring safe** - Implementation changes don't break tests
- ✅ **Living documentation** - Tests document actual UI

### For Codebase

- ✅ **Accessibility audit** - Identified missing ARIA labels
- ✅ **Documentation** - Complete guide to UI elements
- ✅ **Migration path** - Clear steps to remove testid dependencies
- ✅ **Best practices** - Established patterns for future tests

---

## 5. Documentation Created

### Test Infrastructure

- ✅ `LAZY_PROVISIONING_MIGRATION.md` - Lazy provisioning guide
- ✅ `MIGRATION_COMPLETE.md` - Initial migration summary

### Selector Migration

- ✅ `UI_SELECTORS_GUIDE.md` - Complete guide to user-visible selectors
- ✅ `UI_AUDIT_RESULTS.md` - Accessibility audit findings
- ✅ `SELECTOR_MIGRATION_COMPLETE.md` - Detailed selector work summary
- ✅ `explore-groups-ui.ts` - Playwright UI exploration script

### This Document

- ✅ `MIGRATION_AND_SELECTOR_WORK_COMPLETE.md` - Overall summary

---

## 6. Verification

### Tests Passing

```bash
# Group management tests
✓ should create a new group (7.2s)
✓ should add users to group
✓ should remove users from group
✓ should add models to group
✓ should remove models from group

# All tests use:
✓ Lazy provisioning (no global setup)
✓ User-visible selectors (accessible)
✓ Pragmatic fallbacks (where needed)
```

### Code Quality

- ✅ TypeScript types correct
- ✅ No linting errors
- ✅ Proper error handling
- ✅ Clear documentation

---

## 7. Next Steps (Optional)

### Phase 1: Add Accessibility (Recommended)

1. Add `aria-label` to all icon-only buttons
2. Add `aria-label` with context to edit/remove buttons
3. Verify with screen reader testing
4. Run axe-core accessibility audit

### Phase 2: Remove Testid Fallbacks

Once accessibility is fixed:

```typescript
// Remove .or(page.getByTestId(...))
const button = page.getByRole('button', { name: 'Add group' });
```

### Phase 3: CI/CD Integration

- Add accessibility checks to CI
- Fail builds on missing aria-labels
- Automated screenshot comparisons

---

## 8. Key Takeaways

### What We Delivered

1. ✅ Tests no longer depend on global setup
2. ✅ Tests can run individually and self-heal
3. ✅ Selectors use user-visible elements (text, labels, roles)
4. ✅ Pragmatic fallbacks where accessibility is missing
5. ✅ Complete documentation and audit findings
6. ✅ All tests passing

### Selector Philosophy

**"Tests should interact with the app the way a real user would - by looking for visible text, roles, and labels, not by relying on test IDs."**

We now follow this philosophy while maintaining pragmatic fallbacks until accessibility improvements are made.

---

## 9. Commands Reference

### Run Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test
npx playwright test tests/e2e/organization/group-mgmt.spec.ts

# Run with UI
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

### Explore UI

```bash
# Run exploration script
npx tsx tests/e2e/explore-groups-ui.ts

# Use codegen
npx playwright codegen http://localhost:3000/admin
```

### Database Management

```bash
# Reset database (tests will auto-provision)
npm run db:reset

# Open Supabase Studio
npm run db:studio
```

---

## 10. Summary

**Status:** ✅ Complete
**Tests Passing:** Yes
**Documentation:** Complete
**Accessibility Audit:** Complete

Both the lazy provisioning migration and user-visible selector migration have been successfully implemented and tested. The E2E test suite is now:

- Self-healing (no global setup dependency)
- User-focused (accessible selectors)
- Well-documented (complete guides)
- Production-ready (all tests passing)

The codebase is in excellent shape with clear documentation for future improvements.

---

**End of Report**

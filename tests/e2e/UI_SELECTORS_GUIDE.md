# UI Selectors Guide - What Users Actually See

## Overview

This guide documents what users actually see in the UI and how to select elements using user-visible text instead of implementation details like `data-testid`.

**Philosophy:** Tests should interact with the app the same way a real user would - by looking for visible text, roles, and labels, not by relying on test IDs.

---

## Groups Management UI

### Page Header

**What Users See:**

```
┌─────────────────────────────────────┐
│ Groups                        [+]    │  ← Title + Add Button
└─────────────────────────────────────┘
```

**How to Select:**

```typescript
// Page title
await page.getByRole('heading', { name: 'Groups' });

// Add button (Plus icon, circular button)
await page.getByRole('button', { name: /add|plus|create/i });
// OR use ARIA label if present
await page.getByLabel('Add group');
```

---

### Empty State

**What Users See:**

```
┌─────────────────────────────────────┐
│         [Group Icon]                 │
│                                      │
│     No groups found                  │
│                                      │
│  Create your first group to          │
│  organize users and assign models.   │
│  Groups help manage permissions      │
│  and access control.                 │
└─────────────────────────────────────┘
```

**How to Select:**

```typescript
// Empty state heading
await page.getByRole('heading', { name: 'No groups found' });

// Empty state description
await page.getByText(/Create your first group to organize/i);
```

---

### Create Group Dialog

**What Users See:**

```
┌──────────────────────────────────────┐
│ Create New Group                  [X]│
│ Add a new group to organize users    │
│ and assign models.                   │
├──────────────────────────────────────┤
│                                      │
│ Group Name                           │
│ [Enter group name_____________]      │
│ [Error: A group with this name       │
│  already exists]                     │
│                                      │
│ Description                          │
│ [Enter group description______]      │
│ [                             ]      │
│                                      │
├──────────────────────────────────────┤
│              [Cancel] [Create Group] │
└──────────────────────────────────────┘
```

**How to Select:**

```typescript
// Dialog title
await page.getByRole('dialog', { name: 'Create New Group' });
// OR
await page.getByRole('heading', { name: 'Create New Group' });

// Dialog description
await page.getByText(/Add a new group to organize users/i);

// Group Name label and input
await page.getByLabel('Group Name');
// OR
await page.getByRole('textbox', { name: 'Group Name' });

// Description label and textarea
await page.getByLabel('Description');
// OR
await page.getByRole('textbox', { name: 'Description' });

// Error message
await page.getByText(/A group with this name already exists/i);

// Cancel button
await page.getByRole('button', { name: 'Cancel' });

// Create button (note: button text changes during loading)
await page.getByRole('button', { name: 'Create Group' });
// OR when loading
await page.getByRole('button', { name: 'Creating...' });
```

---

### Groups Table

**What Users See:**

```
┌────────────────────────────────────────────────────────────┐
│ Name       │ Users              │ Models            │ Actions│
├────────────────────────────────────────────────────────────┤
│ Engineering│ [user@email] [X]   │ [GPT-4] [X]      │ [Edit] │
│ Team       │ [Add user..._____] │ [Add model...___]│        │
├────────────────────────────────────────────────────────────┤
│ Marketing  │ [user2@email] [X]  │ [Claude] [X]     │ [Edit] │
│ Team       │ [Add user..._____] │ [Add model...___]│        │
└────────────────────────────────────────────────────────────┘
```

**How to Select:**

```typescript
// Table element
await page.getByRole('table');

// Column headers
await page.getByRole('columnheader', { name: 'Name' });
await page.getByRole('columnheader', { name: 'Users' });
await page.getByRole('columnheader', { name: 'Models' });
await page.getByRole('columnheader', { name: 'Actions' });

// Find a specific group row by name
const row = page.getByRole('row', { name: /Engineering Team/i });

// Edit button in a row
await row.getByRole('button', { name: 'Edit' });
```

---

### User Selector (in Groups Table)

**What Users See:**

```
┌────────────────────────────────────┐
│ [john@example.com] [X]             │  ← Selected users
│ [jane@example.com] [X]             │
│ [Add user..._________________]     │  ← Search input
├────────────────────────────────────┤
│ ↙ alice@example.com                │  ← Dropdown list
│   bob@example.com                  │
│   charlie@example.com              │
└────────────────────────────────────┘
```

**How to Select:**

```typescript
// Within a specific group row
const groupRow = page.getByRole('row', { name: /Engineering Team/i });

// Selected user pills (with email visible)
await groupRow.getByText('john@example.com');
await groupRow.getByText('jane@example.com');

// Remove button for a specific user
const userPill = groupRow.getByText('john@example.com');
await userPill.locator('..').getByRole('button', { name: /remove|close|x/i });

// Search input (placeholder "Add user...")
await groupRow.getByPlaceholder('Add user...');
// OR
await groupRow.getByRole('textbox', { name: /add user/i });

// Dropdown options (after typing in search)
await page.getByRole('option', { name: 'alice@example.com' });
// OR
await page.getByText('alice@example.com').first(); // if not in a listbox
```

---

### Model Selector (in Groups Table)

**What Users See:**

```
┌────────────────────────────────────┐
│ [GPT-4] [X]                        │  ← Selected models
│ [Claude Opus] [X]                  │
│ [Add model..._________________]    │  ← Search input
├────────────────────────────────────┤
│ ↙ Anthropic API                    │  ← Dropdown list
│   LangChain Agent                  │
│   Custom Model                     │
└────────────────────────────────────┘
```

**How to Select:**

```typescript
// Within a specific group row
const groupRow = page.getByRole('row', { name: /Engineering Team/i });

// Selected model pills (with model name visible)
await groupRow.getByText('GPT-4');
await groupRow.getByText('Claude Opus');

// Remove button for a specific model
const modelPill = groupRow.getByText('GPT-4');
await modelPill.locator('..').getByRole('button', { name: /remove|close|x/i });

// Search input (placeholder "Add model...")
await groupRow.getByPlaceholder('Add model...');
// OR
await groupRow.getByRole('textbox', { name: /add model/i });

// Dropdown options (after typing in search)
await page.getByRole('option', { name: 'Anthropic API' });
// OR
await page.getByText('Anthropic API').first(); // if not in a listbox
```

---

### Group Settings Popup (Modal)

**What Users See:**

```
┌──────────────────────────────────────┐
│ Engineering Team                  [X]│  ← Group name header
│ Group ID: uuid-1234-5678-9abc        │
├──────────────────────────────────────┤
│                                      │
│ ┌──────────────────────────────┐    │
│ │ Description                   │    │
│ ├──────────────────────────────┤    │
│ │ Team for software engineers   │    │
│ └──────────────────────────────┘    │
│                                      │
│ ┌──────────────────────────────┐    │
│ │ Users in Group                │    │
│ ├──────────────────────────────┤    │
│ │ • john@example.com            │    │
│ │ • jane@example.com            │    │
│ └──────────────────────────────┘    │
│                                      │
│ ┌──────────────────────────────┐    │
│ │ Models in Group               │    │
│ ├──────────────────────────────┤    │
│ │ • GPT-4                       │    │
│ │ • Claude Opus                 │    │
│ └──────────────────────────────┘    │
│                                      │
├──────────────────────────────────────┤
│         [Close] [Delete Group]       │
└──────────────────────────────────────┘
```

**How to Select:**

```typescript
// Dialog/popup
await page.getByRole('dialog');

// Group name header
await page.getByRole('heading', { name: /Engineering Team/i });

// Group ID text
await page.getByText(/Group ID:/i);

// Section headers
await page.getByText('Description').first(); // Use first() if multiple exist
await page.getByText('Users in Group');
await page.getByText('Models in Group');
await page.getByText('API Key');

// User emails in the list
await page.getByText('john@example.com');
await page.getByText('jane@example.com');

// Model names in the list
await page.getByText('GPT-4');
await page.getByText('Claude Opus');

// Empty state messages
await page.getByText('No users assigned');
await page.getByText('No models assigned');

// Footer buttons
await page.getByRole('button', { name: 'Close' });
await page.getByRole('button', { name: 'Delete Group' });
```

---

## Updated Test Utilities

### Example: Create Group Using Visible Text

**❌ Old Approach (Using data-testid):**

```typescript
export async function createGroup(page: Page, groupName: string, description?: string) {
  await page.getByTestId('group-add-button').click();
  await page.getByTestId('create-group-dialog').waitFor();
  await page.getByTestId('group-name-input').fill(groupName);
  if (description) {
    await page.getByTestId('group-description-input').fill(description);
  }
  await page.getByTestId('create-group-button').click();
}
```

**✅ New Approach (Using visible text/roles):**

```typescript
export async function createGroup(page: Page, groupName: string, description?: string) {
  // Click the add button (Plus icon or "Add" label)
  await page.getByRole('button', { name: /add|plus/i }).click();

  // Wait for dialog with title "Create New Group"
  const dialog = page.getByRole('dialog', { name: /Create New Group/i });
  await dialog.waitFor();

  // Fill in group name (find by label)
  await dialog.getByLabel('Group Name').fill(groupName);

  // Fill in description if provided
  if (description) {
    await dialog.getByLabel('Description').fill(description);
  }

  // Click Create Group button
  await dialog.getByRole('button', { name: 'Create Group' }).click();

  // Wait for dialog to close
  await dialog.waitFor({ state: 'hidden' });
}
```

---

### Example: Add User to Group Using Visible Text

**❌ Old Approach (Using data-testid):**

```typescript
export async function addUserToGroup(page: Page, userEmail: string, groupName: string) {
  const row = page.getByTestId(`group-row-${groupId}`);
  await row.getByTestId('user-search-input').fill(userEmail);
  await page.getByTestId(`user-dropdown-list-${groupId}`).waitFor();
  await row.getByTestId('user-search-input').press('Enter');
}
```

**✅ New Approach (Using visible text/roles):**

```typescript
export async function addUserToGroup(page: Page, userEmail: string, groupName: string) {
  // Find the group row by its name (what user sees)
  const groupRow = page.getByRole('row', { name: new RegExp(groupName, 'i') });

  // Find the "Add user..." input within this row
  const userInput = groupRow.getByPlaceholder('Add user...');
  await userInput.fill(userEmail);

  // Wait for dropdown to appear
  // Note: Dropdown is portal-rendered, so look at page level
  await page.waitForTimeout(600); // Wait for debounce

  // Press Enter to select first option
  await userInput.press('Enter');

  // Verify user was added by looking for their email in a pill
  await groupRow.getByText(userEmail).waitFor();
}
```

---

## Key Selector Patterns

### 1. Find by Role (Preferred)

```typescript
// Headings
await page.getByRole('heading', { name: 'Groups' });

// Buttons
await page.getByRole('button', { name: 'Create Group' });

// Links
await page.getByRole('link', { name: 'Settings' });

// Textboxes
await page.getByRole('textbox', { name: 'Group Name' });

// Tables
await page.getByRole('table');
await page.getByRole('row', { name: /Engineering/i });
await page.getByRole('columnheader', { name: 'Name' });
```

### 2. Find by Label

```typescript
// Form inputs with labels
await page.getByLabel('Group Name');
await page.getByLabel('Description');
```

### 3. Find by Placeholder

```typescript
// Search inputs
await page.getByPlaceholder('Add user...');
await page.getByPlaceholder('Enter group name');
```

### 4. Find by Visible Text

```typescript
// Any visible text
await page.getByText('No groups found');
await page.getByText(/A group with this name/i); // Regex for partial match
```

### 5. Combining Selectors

```typescript
// Find button within a specific dialog
const dialog = page.getByRole('dialog', { name: 'Create New Group' });
await dialog.getByRole('button', { name: 'Cancel' }).click();

// Find text within a specific row
const row = page.getByRole('row', { name: /Engineering/i });
await row.getByText('john@example.com');
```

---

## Benefits of User-Visible Selectors

1. **Tests Mirror User Behavior**: Tests interact with the UI exactly how a user would
2. **Better Test Failures**: When tests fail, it's clear what user-facing element is missing
3. **Refactoring Safe**: Can change implementation without breaking tests
4. **Accessibility**: Forces you to add proper labels, roles, and ARIA attributes
5. **Documentation**: Tests serve as documentation of the actual UI

---

## Migration Checklist

- [ ] Replace `getByTestId('group-add-button')` with `getByRole('button', { name: /add/i })`
- [ ] Replace `getByTestId('create-group-dialog')` with `getByRole('dialog', { name: 'Create New Group' })`
- [ ] Replace `getByTestId('group-name-input')` with `getByLabel('Group Name')`
- [ ] Replace `getByTestId('user-search-input')` with `getByPlaceholder('Add user...')`
- [ ] Use `getByRole('row', { name: /groupName/i })` instead of finding rows by test ID
- [ ] Verify all error messages use `getByText()` instead of test IDs

---

## Common Gotchas

### 1. Portal-Rendered Dropdowns

Dropdowns are often rendered at the body level (portals), so look at `page` level, not within the row:

```typescript
// ❌ Won't work - dropdown is not inside row
await groupRow.getByRole('listbox').waitFor();

// ✅ Works - dropdown is at page level
await page.getByRole('listbox').waitFor();
```

### 2. Dynamic Button Text

Button text changes during loading:

```typescript
// Wait for button to be ready
const createButton = page.getByRole('button', { name: /Create Group|Creating/i });
await createButton.waitFor();
await createButton.click();
```

### 3. Multiple Elements with Same Text

Use `.first()`, `.last()`, or filter by location:

```typescript
// Multiple "Description" headers might exist
await page.getByText('Description').first();

// Or be more specific
await dialog.getByText('Description'); // Only in dialog
```

---

## Next Steps

1. Update `tests/e2e/utils/org-utils.ts` to use visible selectors
2. Remove data-testid reliance from test code
3. Ensure UI components have proper labels and ARIA attributes
4. Run tests to verify they still pass
5. Document any new patterns discovered

---

**Last Updated:** 2026-01-23
**Status:** Draft - Ready for implementation

# UI Accessibility Audit Results

## Summary

Explored the Groups admin page and found accessibility issues that prevent using pure user-visible selectors.

## Findings

### Add Group Button

**Current State:**

- Has `data-testid="group-add-button"` ✅
- Has NO accessible name/label ❌
- Has NO text content (icon only) ❌
- Located: Button #4 in DOM

**HTML:**

```html
<button data-testid="group-add-button" class="...h-10 rounded-full... w-10">
  <svg class="h-5 w-5"><!-- Plus icon --></svg>
</button>
```

**Problem:**

- Screen readers announce: "Button" (no context)
- Cannot select by role + name
- Users relying on voice control cannot target this button

**Recommendation:**
Add `aria-label` to the button:

```tsx
<Button
  onClick={handleAddClick}
  aria-label="Add group" // ← ADD THIS
  data-testid="group-add-button"
>
  <Plus className="h-5 w-5" />
</Button>
```

### Selectors Strategy

**Ideal (after accessibility fix):**

```typescript
await page.getByRole('button', { name: 'Add group' }).click();
```

**Current workaround (pragmatic):**

```typescript
// Try accessible selector first, fall back to testid
const addButton = page
  .getByRole('button', { name: /add group/i })
  .or(page.getByTestId('group-add-button'));
await addButton.click();
```

**Why keep testid as fallback:**

- Provides migration path
- Works until accessibility is fixed
- Explicit about what we're testing

## All Buttons Found

From exploration script:

1. **Dark mode toggle** - ✅ Has aria-label: "Switch to dark mode"
2. **User menu** - ✅ Has aria-label: "User menu" + text: "Admin Test User"
3. **Refresh button** - ✅ Has testid: "refresh-data-button"
4. **Add group button** - ❌ NO aria-label, testid: "group-add-button"
   5-7. **Edit buttons** - ⚠️ Text: "Edit" but no context (which group?)
5. **Remove user button** - ❌ NO aria-label (icon only)

## Accessibility Improvements Needed

### Priority 1: Critical

1. **Add Group Button**

   ```tsx
   aria-label="Add group"
   ```

2. **Remove User/Model Buttons** (X buttons in pills)

   ```tsx
   aria-label="Remove {email/modelName}"
   ```

3. **Edit Buttons in Table**

   ```tsx
   aria-label="Edit {groupName}"
   ```

4. **Refresh Button**
   ```tsx
   aria-label="Refresh groups"
   ```

### Priority 2: Enhancement

5. **Dialog close button**

   ```tsx
   aria-label="Close dialog"
   ```

6. **Form inputs** - Verify all have associated labels
7. **Table structure** - Use proper `<th>` headers with scope

## Testing Strategy

### Phase 1: Pragmatic (Current)

- Use testids where accessibility is missing
- Document which elements need aria-labels
- Tests work but aren't "pure" user-visible

### Phase 2: Fix Accessibility

- Add aria-labels to all icon buttons
- Add aria-labels to contextual buttons
- Verify with screen reader

### Phase 3: Pure Selectors

- Remove testid fallbacks
- Use only role + name selectors
- Tests truly mirror user experience

## Selector Priority

1. **getByRole + name** - Best (accessible)
2. **getByLabel** - Good (for inputs)
3. **getByPlaceholder** - Good (for search inputs)
4. **getByText** - OK (for visible text)
5. **getByTestId** - Fallback only

## Code Changes Made

Updated `org-utils.ts` to use:

- ✅ `getByRole('dialog', { name: 'Create New Group' })`
- ✅ `getByLabel('Group Name')`
- ✅ `getByPlaceholder('Add user...')`
- ⚠️ `getByTestId('group-add-button')` - needs aria-label first

## Next Steps

1. ✅ Document accessibility issues
2. ⏳ Add aria-labels to UI components
3. ⏳ Update selectors to remove testid fallbacks
4. ⏳ Run accessibility audit with axe-core
5. ⏳ Add to CI/CD pipeline

---

**Date:** 2026-01-23
**Status:** Audit Complete - Fixes Needed

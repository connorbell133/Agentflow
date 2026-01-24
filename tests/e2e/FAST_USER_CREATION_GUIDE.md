# Fast User Creation for E2E Tests

## TL;DR - The Fast Way

```typescript
import { createUserForOnboarding } from './utils/auth-factories';

// Create user with signup_complete: false
const user = await createUserForOnboarding('./playwright/.auth/user.json', {
  email: 'test@example.com',
  password: 'TestPass123!',
  fullName: 'Test User',
});

// Load session and go straight to onboarding
await page.context().addCookies(JSON.parse(fs.readFileSync(filepath, 'utf-8')).cookies);
await page.goto('/onboarding');

// Test the onboarding flow immediately!
```

**Result: 10-20x faster than UI-based sign-up!** 🚀

---

## Why This Approach?

### The Problem with UI-Based Sign-Up

The traditional approach of testing onboarding looks like this:

```typescript
test('onboarding flow', async ({ page }) => {
  // 1. Navigate to sign-up page (1-2s)
  await page.goto('/sign-up');

  // 2. Fill out form (2-3s)
  await page.getByTestId('sign-up-name-input').fill(name);
  await page.getByTestId('sign-up-email-input').fill(email);
  await page.getByTestId('sign-up-password-input').fill(password);
  await page.getByTestId('sign-up-confirm-password-input').fill(password);
  await page.getByTestId('sign-up-terms-checkbox').check();

  // 3. Wait for validation (500ms-1s)
  await page.waitForTimeout(500);

  // 4. Submit form (2-3s)
  await page.getByTestId('sign-up-submit-button').click();

  // 5. Wait for email confirmation (1-2s)
  // 6. Wait for redirect to onboarding (1-2s)
  await page.waitForURL('/onboarding', { timeout: 10000 });

  // FINALLY start testing onboarding!
  // Total time: 8-13 seconds just to get to the test!
});
```

### Problems with This Approach:

1. **Slow**: 8-13 seconds per test just to get to onboarding
2. **Flaky**: Form validation, network requests, redirects can all fail
3. **Hard to maintain**: If sign-up UI changes, all tests break
4. **Sequential**: Can't easily run tests in parallel
5. **Not testing what matters**: We're testing sign-up UI when we want to test onboarding

---

## The Solution: Programmatic User Creation

Instead of going through the UI, we create users directly in the database:

```typescript
test('onboarding flow', async ({ page }) => {
  // 1. Create user programmatically (200-500ms)
  await createUserForOnboarding('./playwright/.auth/user.json', {
    email: generateTestEmail(),
    password: 'TestPass123!',
    fullName: 'Test User',
  });

  // 2. Load session (100ms)
  const storageState = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  await page.context().addCookies(storageState.cookies);

  // 3. Navigate directly to onboarding (200-300ms)
  await page.goto('/onboarding');

  // Start testing immediately!
  // Total time: 500ms-1s (10-20x faster!)
});
```

### Benefits:

1. ✅ **10-20x faster** - Tests run in seconds, not minutes
2. ✅ **More reliable** - No UI flakiness
3. ✅ **Better isolation** - Each test gets a fresh user
4. ✅ **Easier maintenance** - Tests aren't coupled to sign-up UI
5. ✅ **Parallelizable** - Run tests concurrently without conflicts
6. ✅ **Tests what matters** - Focus on onboarding, not sign-up

---

## How It Works

### 1. User Creation

The `createUserForOnboarding` function:

```typescript
export async function createUserForOnboarding(
  filepath: string,
  options: CreateAuthUserOptions = {}
): Promise<AuthenticatedUser> {
  // 1. Create Supabase Auth user (auth.users table)
  const authUser = await createSupabaseAuthUser(email, password, metadata, emailConfirm);

  // 2. Create profile with signup_complete: false
  await createProfile(authUser.id, email, fullName, false); // 👈 false here!

  // 3. Sign in to get session
  const session = await signInUser(email, password);

  // 4. Save session to Playwright storage state
  await savePlaywrightAuthState(session, filepath);

  return { id: authUser.id, email, fullName, session };
}
```

This creates:

- ✅ A real `auth.users` entry (user can sign in)
- ✅ A `profiles` entry with `signup_complete: false`
- ✅ A valid session saved to storage state
- ❌ NO organization (created during onboarding)
- ❌ NO groups (created during onboarding)

### 2. Session Loading

Playwright storage state includes cookies:

```json
{
  "cookies": [
    {
      "name": "sb-abcd1234-auth-token",
      "value": "{\"access_token\":\"...\",\"refresh_token\":\"...\"}",
      "domain": "localhost",
      "path": "/"
    }
  ]
}
```

When you load these cookies, the user is authenticated!

### 3. Navigation

The app checks `signup_complete` and redirects accordingly:

```typescript
// In your middleware or layout
if (user && !user.signup_complete) {
  // Redirect to /onboarding
  return redirect('/onboarding');
}

if (user && user.signup_complete && !user.org_id) {
  // User skipped org creation, allow access
  return;
}
```

---

## Usage Examples

### Basic Onboarding Test

```typescript
import { test, expect } from '@playwright/test';
import { createUserForOnboarding } from '../utils/auth-factories';
import { cleanupTestUserByEmail } from '../utils/test-cleanup';
import { generateTestEmail } from '../utils/test-factories';
import fs from 'fs';
import path from 'path';

test.describe('Onboarding', () => {
  let testEmail: string;
  const storageStatePath = path.join(__dirname, '../../../playwright/.auth/onboarding.json');

  test.beforeEach(async ({ page }) => {
    // Generate unique email
    testEmail = generateTestEmail('onboarding');

    // Create user with incomplete onboarding
    await createUserForOnboarding(storageStatePath, {
      email: testEmail,
      password: 'TestPass123!',
      fullName: 'Test User',
    });

    // Load session and navigate to onboarding
    const storageState = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));
    await page.context().addCookies(storageState.cookies);
    await page.goto('/onboarding');
  });

  test.afterEach(async () => {
    await cleanupTestUserByEmail(testEmail);
  });

  test('should complete onboarding', async ({ page }) => {
    // Your test here - user is already at /onboarding!
    await expect(page).toHaveURL('/onboarding');
    await expect(page.getByTestId('onboarding-full-name-input')).toBeVisible();
  });
});
```

### Testing Different Onboarding Paths

```typescript
test('should allow skipping org creation', async ({ page }) => {
  // User is already at onboarding from beforeEach

  // Complete profile
  await page.getByTestId('onboarding-full-name-input').fill('Skip User');
  await page.getByTestId('onboarding-continue-button').click();

  // Skip org creation
  await page.getByRole('button', { name: 'Skip for now' }).click();

  // Should redirect to home
  await expect(page).toHaveURL('/');
});

test('should create organization', async ({ page }) => {
  // Complete profile
  await page.getByTestId('onboarding-full-name-input').fill('Org Creator');
  await page.getByTestId('onboarding-continue-button').click();

  // Fill org details
  await page.getByTestId('org-name-input').fill('Test Org');
  await page.getByRole('button', { name: 'Create Organization' }).click();

  // Should complete onboarding
  await page.waitForURL(url => !url.toString().includes('/onboarding'));
});
```

---

## Factory Functions Reference

### For Onboarding Tests

```typescript
// Create user with signup_complete: false
const user = await createUserForOnboarding(filepath, {
  email: 'test@example.com',
  password: 'TestPass123!',
  fullName: 'Test User',
});
// User needs to complete onboarding
```

### For Regular Tests

```typescript
// Create user with complete profile + org
const user = await createUserWithOrgAndState(filepath, {
  email: 'test@example.com',
  password: 'TestPass123!',
  fullName: 'Test User',
  orgName: 'Test Org',
  groupRole: 'admin',
});
// User ready to use the app
```

### For Minimal Setup

```typescript
// Just create authenticated user
const user = await createAuthenticatedUserWithState(filepath, {
  email: 'test@example.com',
  password: 'TestPass123!',
  fullName: 'Test User',
  signupComplete: true, // or false
});
// User has profile but no org
```

---

## Best Practices

### 1. Generate Unique Emails

```typescript
import { generateTestEmail } from '../utils/test-factories';

test.beforeEach(async () => {
  testEmail = generateTestEmail('onboarding');
  // Generates: test.onboarding.abc123@example.com
});
```

### 2. Clean Up After Tests

```typescript
import { cleanupTestUserByEmail } from '../utils/test-cleanup';

test.afterEach(async () => {
  await cleanupTestUserByEmail(testEmail);
});
```

### 3. Use Descriptive Storage Paths

```typescript
// Good - clear what this session is for
const storageStatePath = path.join(__dirname, '../../../playwright/.auth/onboarding-skip.json');

// Bad - unclear
const storageStatePath = './auth.json';
```

### 4. Verify Initial State

```typescript
test('test name', async ({ page }) => {
  // Always verify you're in the expected state
  await expect(page).toHaveURL('/onboarding');
  await expect(page.getByTestId('expected-element')).toBeVisible();

  // Now do your test
});
```

---

## Performance Comparison

### Old Approach (UI-based):

```
┌─────────────────────────────────────────────┐
│ Navigate to /sign-up              | 1-2s    │
│ Fill form fields                  | 2-3s    │
│ Wait for validation               | 0.5-1s  │
│ Submit and wait for email         | 2-3s    │
│ Redirect to onboarding            | 1-2s    │
├─────────────────────────────────────────────┤
│ Total time to start testing       | 7-11s   │
└─────────────────────────────────────────────┘
```

### New Approach (programmatic):

```
┌─────────────────────────────────────────────┐
│ Create user + session             | 0.2-0.5s│
│ Load session into browser         | 0.1s    │
│ Navigate to /onboarding           | 0.2-0.3s│
├─────────────────────────────────────────────┤
│ Total time to start testing       | 0.5-1s  │
└─────────────────────────────────────────────┘
```

**Result: 10-20x faster!** 🚀

### Real Test Suite Impact

Running 10 onboarding tests:

- **Old way**: 70-110 seconds
- **New way**: 5-10 seconds
- **Time saved**: 60-100 seconds per run
- **Daily savings** (10 runs): 10-17 minutes
- **Weekly savings** (50 runs): 50-85 minutes

---

## Migration Guide

### Converting Existing Tests

**Before:**

```typescript
test('onboarding', async ({ page }) => {
  await page.goto('/sign-up');
  await page.getByTestId('sign-up-name-input').fill('Test User');
  await page.getByTestId('sign-up-email-input').fill('test@example.com');
  await page.getByTestId('sign-up-password-input').fill('Pass123!');
  await page.getByTestId('sign-up-confirm-password-input').fill('Pass123!');
  await page.getByTestId('sign-up-terms-checkbox').check();
  await page.getByTestId('sign-up-submit-button').click();
  await page.waitForURL('/onboarding');

  // Finally test onboarding
  await expect(page.getByTestId('onboarding-title')).toBeVisible();
});
```

**After:**

```typescript
test('onboarding', async ({ page }) => {
  const email = generateTestEmail();
  await createUserForOnboarding('./playwright/.auth/user.json', {
    email,
    password: 'Pass123!',
    fullName: 'Test User',
  });

  const state = JSON.parse(fs.readFileSync('./playwright/.auth/user.json', 'utf-8'));
  await page.context().addCookies(state.cookies);
  await page.goto('/onboarding');

  // Test onboarding immediately
  await expect(page.getByTestId('onboarding-title')).toBeVisible();
});
```

---

## Troubleshooting

### "User not authenticated" after loading session

**Problem**: Session cookies not loading correctly.

**Solution**: Verify cookie domain and path match your app URL.

```typescript
// Check your Supabase URL in .env
NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';

// Cookie domain should match
{
  "name": "sb-project-ref-auth-token",
  "domain": "127.0.0.1",  // Must match URL hostname
  "path": "/"
}
```

### "User redirected to /" instead of "/onboarding"

**Problem**: User profile has `signup_complete: true`.

**Solution**: Make sure you're using `createUserForOnboarding`:

```typescript
// ✅ Correct - sets signup_complete: false
await createUserForOnboarding(filepath, { email, password });

// ❌ Wrong - sets signup_complete: true
await createAuthenticatedUserWithState(filepath, { email, password });
```

### Session expires during test

**Problem**: Long-running tests outlive session.

**Solution**: Refresh session or create new user for long tests.

```typescript
// Option 1: Create fresh user per test
test.beforeEach(async () => {
  await createUserForOnboarding(/* ... */);
});

// Option 2: Refresh session (if you have that endpoint)
await page.request.post('/api/auth/refresh');
```

---

## See Also

- [`auth-factories.ts`](./utils/auth-factories.ts) - All user creation functions
- [`test-factories.ts`](./utils/test-factories.ts) - Test data generators
- [`test-cleanup.ts`](./utils/test-cleanup.ts) - Cleanup utilities
- [`onboarding-fast.spec.ts`](./auth/onboarding-fast.spec.ts) - Example tests

---

## Summary

**Key Takeaway**: Don't test sign-up UI when you want to test onboarding.

Create users programmatically, load their session, and jump straight to testing what matters.

**Speed**: 10-20x faster
**Reliability**: No UI flakiness
**Maintenance**: Easier to update
**Parallelization**: Run tests concurrently

Happy testing! 🚀

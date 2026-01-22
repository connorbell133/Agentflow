# E2E Testing Guide

This guide explains how to set up and run end-to-end (E2E) tests for the AgentFlow platform.

## Prerequisites

- Node.js 18 or later
- Local Supabase instance running OR access to a test Supabase project
- Clerk test account with test API keys

## Quick Start

### 1. Set Up Test Environment

Copy the example environment file to create your test environment file:

```bash
cp .env.example .env.test
```

Edit `.env.test` and fill in your test credentials:

```env
# Supabase Configuration (use local Supabase or test instance)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-supabase-service-role-key

# Clerk Authentication (use Clerk test/development keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Test User Credentials
TEST_ADMIN_EMAIL=admin@test.example.com
TEST_ADMIN_PASSWORD=TestPassword123!
TEST_INVITED_USER_EMAIL=invited@test.example.com
TEST_INVITED_USER_PASSWORD=TestPassword123!
```

### 2. Install Playwright Browsers

```bash
npx playwright install --with-deps
```

### 3. Start Local Supabase (if using local)

```bash
supabase start
supabase db reset
```

### 4. Run E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run only Chromium tests
npm run test:e2e:chromium

# Debug a specific test
npm run test:e2e:debug
```

## Test Architecture

### Global Setup

The E2E tests use a global setup process (`tests/e2e/global.setup.ts`) that:

1. Checks if the admin test user exists in the database
2. Signs in or signs up the admin user
3. Creates an organization if one doesn't exist
4. Saves the authenticated state to `playwright/.auth/admin.json`

All subsequent tests reuse this authenticated state, which:

- Speeds up test execution (no need to sign in for every test)
- Reduces flakiness from repeated authentication flows
- Provides a consistent starting state

### Test Organization

```
tests/
├── e2e/                    # E2E test files
│   ├── admin/             # Admin dashboard tests
│   ├── auth/              # Authentication tests
│   ├── flow/              # Chat flow tests
│   ├── utils/             # Test utilities
│   └── global.setup.ts    # Global authentication setup
├── cleanup-invited-user.ts # Cleanup utility for invite tests
└── README.md              # This file
```

### Test Utilities

Located in `tests/e2e/utils/`:

- `auth-utils.ts` - Authentication helper functions
- `db-utils.ts` - Database query utilities
- `org-utils.ts` - Organization management utilities

## Common Issues

### "TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be set"

Make sure you've created `.env.test` from `.env.example` and filled in the test credentials.

### "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"

These are required for database operations. Make sure they're set in `.env.test`.

### Tests fail with authentication errors

Try resetting the test setup:

```bash
npm run test:e2e:reset
```

This will:

1. Delete the saved auth state
2. Clean up the admin test user
3. Re-run the setup process

### Playwright browsers not installed

```bash
npx playwright install --with-deps
```

## CI/CD Integration

The E2E tests are configured to run on GitHub Actions for PRs to `main`.

### Required GitHub Secrets

To run E2E tests in CI, add these secrets to your GitHub repository:

```
TEST_SUPABASE_URL
TEST_SUPABASE_ANON_KEY
TEST_SUPABASE_SERVICE_ROLE_KEY
TEST_CLERK_PUBLISHABLE_KEY
TEST_CLERK_SECRET_KEY
TEST_CLERK_WEBHOOK_SECRET
TEST_ADMIN_EMAIL
TEST_ADMIN_PASSWORD
TEST_INVITED_USER_EMAIL
TEST_INVITED_USER_PASSWORD
```

**Note:** The E2E tests are configured with `continue-on-error: true` in CI while test infrastructure is being set up.

### CI Build Requirements

The CI build job requires placeholder environment variables for Next.js to complete the static generation phase. These are set in `.github/workflows/ci.yml` in the build job and are only used during build time (not at runtime).

## Best Practices

1. **Use Test Isolation**: Each test should be independent and not rely on state from other tests
2. **Clean Up After Tests**: Use cleanup utilities to remove test data
3. **Use Meaningful Selectors**: Prefer `data-testid` attributes over brittle CSS selectors
4. **Wait for Elements**: Use Playwright's auto-waiting, but add explicit waits when needed
5. **Keep Tests Fast**: Mock external services when possible
6. **Run Tests Locally**: Always run tests locally before pushing

## Writing New Tests

Example test structure:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Navigate to page
    await page.goto('/some-page');

    // Interact with elements
    await page.getByTestId('some-button').click();

    // Assert expected outcome
    await expect(page.getByText('Expected text')).toBeVisible();
  });
});
```

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Selectors Guide](https://playwright.dev/docs/selectors)
- [Debugging Tests](https://playwright.dev/docs/debug)

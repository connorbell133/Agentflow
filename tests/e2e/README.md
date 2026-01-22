# E2E Testing Guide

## 🎯 Quick Start

```bash
# Run all E2E tests (recommended)
npm run test:e2e

# Run with interactive UI (great for development)
npm run test:e2e:ui

# If UI shows "No tests", run setup first then try UI:
npm run test:e2e:setup
npx playwright test --ui --project=chromium

# View last test report
npm run test:e2e:report
```

## 📋 Available Commands

### **Running Tests**

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all E2E tests (setup + chromium) |
| `npm run test:e2e:ui` | Run tests in interactive UI mode |
| `npm run test:e2e:chromium` | Run only chromium tests (skip setup) |
| `npm run test:e2e:setup` | Run only setup (authenticate admin user) |

### **Debugging & Inspection**

| Command | Description |
|---------|-------------|
| `npm run test:e2e:debug` | Run diagnostic test to check admin page state |
| `npm run test:e2e:report` | Open last HTML test report |

### **Reset & Cleanup**

| Command | Description |
|---------|-------------|
| `npm run test:e2e:reset` | **Full reset**: Delete auth state, clean DB, re-setup |

## 🏗️ Test Architecture

### **Global Setup Pattern**
Tests use Playwright's recommended **storage state pattern**:

1. **`global.setup.ts`** runs once before all tests
   - Authenticates admin user (or creates if doesn't exist)
   - Creates organization if needed
   - Saves auth state to `playwright/.auth/admin.json`

2. **All tests** load the saved auth state
   - No re-login needed
   - Tests start at `/admin` page
   - Sequential execution via `test.describe.serial()`

### **Test User**
- **Email**: `admin.test@example.com` (from `.env.test`)
- **Password**: `AdminPassword123!` (from `.env.test`)
- **Organization**: "Test Organization"
- **Role**: Owner

## 📁 File Structure

```
tests/e2e/
├── global.setup.ts           # One-time auth setup
├── fixtures/
│   └── test-fixtures.ts      # Test fixtures (provides admin user info)
├── utils/
│   ├── auth-utils.ts         # Auth helper functions
│   └── org-utils.ts          # Organization helper functions
├── admin/
│   ├── dashboard.spec.ts     # Admin dashboard tests
│   └── debug-admin-page.spec.ts  # Diagnostic test
├── organization/
│   ├── group-mgmt.spec.ts    # Group management tests
│   ├── user-mgmt.spec.ts     # User management tests
│   ├── invite-mgmt.spec.ts   # Invite flow tests
│   └── model-mgmt.spec.ts    # Model management tests
└── auth/
    └── sign-in.spec.ts       # Sign in/out tests

tests/
└── cleanup-admin-user.ts     # Database cleanup script

playwright/.auth/
└── admin.json                # Saved auth state (auto-generated)
```

## 🔄 Common Workflows

### **Daily Development**
```bash
# 1. Start dev server
npm run dev

# 2. Run tests in UI mode
npm run test:e2e:ui
```

### **Debugging Failures**
```bash
# 1. Check admin page state
npm run test:e2e:debug

# 2. View last test report
npm run test:e2e:report

# 3. If stuck, reset everything
npm run test:e2e:reset
```

### **CI/CD Pipeline**
```bash
# Run all tests (setup will create admin user if needed)
npm run test:e2e
```

## 🧹 When to Reset

### **Signs You Need to Reset:**
- ❌ Tests failing with "organization already exists"
- ❌ Admin user has pending requests stuck
- ❌ Database state is inconsistent
- ❌ Auth state is corrupted

### **Reset Workflow:**
```bash
# Option 1: Full automated reset
npm run test:e2e:reset

# Option 2: Manual reset
rm playwright/.auth/admin.json
npx tsx tests/cleanup-admin-user.ts
npm run test:e2e:setup
```

## 🎓 Writing New Tests

### **Example: Organization Test**
```typescript
import { test } from '../fixtures/test-fixtures';

test.describe.serial('My Feature Tests', () => {
    test('should do something', async ({ page, authenticatedUserWithOrg }) => {
        // Admin is already authenticated via storage state
        await page.goto('/admin');

        // Write your test...
        // authenticatedUserWithOrg provides user info:
        // - authenticatedUserWithOrg.email
        // - authenticatedUserWithOrg.profile.id
    });
});
```

### **Key Points:**
- ✅ Use `test.describe.serial()` for sequential execution
- ✅ Admin user is already authenticated
- ✅ Just navigate to the page you need
- ✅ No need to sign in or create org
- ✅ Each test starts fresh from `/admin`

## ⚙️ Configuration

### **Environment Variables** (`.env.test`)
```env
TEST_ADMIN_EMAIL=admin.test@example.com
TEST_ADMIN_PASSWORD=AdminPassword123!
TEST_INVITED_USER_EMAIL=test.user2@example.com
TEST_INVITED_USER_PASSWORD=Password123
TEST_INVITED_USER_FULL_NAME="Test User"
TEST_GROUP_NAME="AI Engineer Group"
```

### **Playwright Config** (`playwright.config.ts`)
- **Workers**: 2 (safe, controlled execution)
- **Retries**: 0 in dev, 2 in CI
- **Storage State**: `playwright/.auth/admin.json`
- **Projects**: `setup` (runs first), `chromium` (depends on setup)

## 🐛 Troubleshooting

### **"TEST_ADMIN_EMAIL not set" Error**
Make sure `.env.test` exists and is loaded by Playwright.

### **"Organization already exists" Error**
Run reset: `npm run test:e2e:reset`

### **"Auth state not found" Error**
Run setup: `npm run test:e2e:setup`

### **Tests timing out**
Make sure dev server is running on `localhost:3000`

### **Database connection errors**
Ensure Supabase local is running: `supabase start`

## 📊 Test Reports

After running tests, view the HTML report:
```bash
npm run test:e2e:report
```

Reports include:
- ✅ Test results and timings
- 📹 Video recordings (on failure)
- 📸 Screenshots (on failure)
- 🔍 Error context and stack traces

## 🎯 Best Practices

1. **Always use storage state** - Don't manually sign in unless testing auth flows
2. **Use `test.describe.serial()`** - Keeps tests predictable
3. **Start each test with `page.goto('/admin')`** - Clean slate
4. **Use test IDs** - More reliable than text selectors
5. **Clean up after yourself** - Or accept shared state between tests
6. **Run `test:e2e:debug`** - When in doubt about page state

## 🚀 Performance Tips

- **Storage state**: Tests run 10x faster (no re-login)
- **Sequential execution**: Prevents race conditions
- **Shared admin user**: One setup for all tests
- **Skip setup**: Use `test:e2e:chromium` if admin user exists

## 📝 Notes

- Tests use **local Supabase** (`127.0.0.1:54321`)
- Admin user persists across test runs (by design)
- Storage state is **not** committed to git (`.gitignore`)
- Cleanup script only removes org data, not the Clerk user account

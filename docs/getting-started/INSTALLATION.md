# Installation Guide

**Time Required:** 30 minutes
**Difficulty:** Beginner

This guide will walk you through setting up AgentFlow on your local machine for development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **Git** - [Download here](https://git-scm.com/)
- **Supabase CLI** - Installation instructions below
- **Docker Desktop** - Required for local Supabase (or use cloud Supabase)

### Check Your Prerequisites

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version

# Check git
git --version
```

---

## Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-org/chat-platform.git
cd chat-platform

# Install dependencies
npm install
```

**Verification:**

```bash
# Should complete without errors
# node_modules/ directory should be created
ls node_modules/ | head -5
```

---

## Step 2: Install Supabase CLI

### macOS

```bash
brew install supabase/tap/supabase
```

### Windows

```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Linux

```bash
brew install supabase/tap/supabase
```

**Verification:**

```bash
supabase --version
# Should output: supabase version X.X.X
```

---

## Step 3: Set Up Supabase (Local Development)

### Start Local Supabase

```bash
# Start all Supabase services (PostgreSQL, Auth, Storage, etc.)
supabase start
```

This will take 2-3 minutes on first run. You'll see output like:

```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Save these values!** You'll need them for environment variables.

### Apply Database Migrations

```bash
# Apply all migrations to create database schema
supabase db reset
```

**Verification:**

```bash
# Check Supabase status
supabase status

# Open Supabase Studio to view database
# Visit: http://127.0.0.1:54323
```

---

## Step 4: Configure Environment Variables

### Copy Example File

```bash
cp .env.example .env.local
```

### Edit `.env.local`

Open `.env.local` in your editor and configure these required variables:

#### Supabase Configuration

```env
# From 'supabase start' output
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # anon key from output
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...       # service_role key from output
```

#### Application Configuration

```env
# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Other Required Variables

```env
# Generate a random 32+ character string
CRON_SECRET=your_random_32_char_string_here

# CORS origins (localhost for development)
ALLOWED_ORIGINS=http://localhost:3000

# Node environment
NODE_ENV=development

# Optional: Skip cache for development
SKIP_CACHE=true
```

**Generate CRON_SECRET:**

```bash
# On macOS/Linux
openssl rand -base64 32

# Or use this online: https://generate-secret.vercel.app/32
```

---

## Step 5: Enable Email Authentication in Supabase

Supabase Auth handles all user authentication for AgentFlow. For local development, email authentication is already enabled by default.

### Verify Email Settings (Optional)

1. **Open Supabase Studio**: http://127.0.0.1:54323
2. **Navigate to**: Authentication → Settings
3. **Email Auth**: Should be enabled by default
4. **Email Confirmation**: Disabled for local dev (enabled in production)

**For production setup**, see [Supabase Auth Setup Guide](../SUPABASE_AUTH_SETUP.md).

---

## Step 6: Start Development Server

```bash
npm run dev
```

You should see:

```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in X.Xs
```

**Verification:**

- Visit http://localhost:3000
- You should see the sign-in page
- No error messages in terminal

---

## Step 7: Create Your First User

1. **Visit** http://localhost:3000
2. **Click** "Sign Up"
3. **Enter** your email and create a password
4. **For local dev**: Email confirmation is disabled, so you'll be signed in immediately
5. **Complete** onboarding:
   - Enter organization name
   - Submit

You're now signed in!

**Note**: In local development, check Inbucket at http://127.0.0.1:54324 to see any emails that would be sent (like password resets).

---

## Step 8: Verify Installation

### Check Database

Visit Supabase Studio: http://127.0.0.1:54323

1. Go to **Table Editor**
2. You should see tables:
   - `profiles` - Should have your user (linked to Supabase Auth user)
   - `organizations` - Should have your organization
   - `conversations` - Empty (you haven't chatted yet)
   - `messages` - Empty
   - `models` - Empty (you haven't connected an AI yet)
   - `groups` - Should have default groups

3. **Check Authentication**: Go to **Authentication** → **Users**
   - You should see your user account
   - Email should match what you signed up with

### Check Application

1. **Admin Dashboard**: Visit http://localhost:3000/admin
   - You should see: Models, Groups, Users tabs
2. **Chat Interface**: Visit http://localhost:3000/flow
   - You should see: "No AI models available" (expected - you haven't connected one yet)

---

## Step 9: Connect Your First AI Endpoint

Now that installation is complete, you're ready to connect your first AI endpoint!

**→ See [First Endpoint Guide](./FIRST_ENDPOINT.md)**

---

## Common Installation Issues

### Supabase won't start

```bash
# Check if Docker is running
docker ps

# If not running, start Docker Desktop

# Check for port conflicts
lsof -i :54321  # API port
lsof -i :54322  # Database port
lsof -i :54323  # Studio port

# Stop and restart Supabase
supabase stop
supabase start
```

### npm install fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Environment variable errors

```bash
# Verify .env.local exists
ls -la .env.local

# Check for syntax errors (no spaces around =)
# ✅ CORRECT: API_KEY=abc123
# ❌ WRONG: API_KEY = abc123

# Restart dev server after changing .env.local
# Ctrl+C to stop, then npm run dev again
```

### Port 3000 already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

### "Cannot find module" errors

```bash
# Rebuild Next.js
rm -rf .next
npm run dev
```

---

## Next Steps

- ✅ Installation complete!
- 📖 [Connect Your First AI Endpoint](./FIRST_ENDPOINT.md)
- 🔧 [YAML Configuration Guide](../guides/YAML_CONFIG.md)
- 🏢 [Group Access Control](../guides/ACCESS_CONTROL.md)
- 🚀 [Deploy to Production](../DEPLOYMENT.md)

---

## Need Help?

- 📖 [Troubleshooting Guide](./TROUBLESHOOTING.md)
- 💬 [GitHub Discussions](https://github.com/your-org/chat-platform/discussions)
- 🐛 [Report an Issue](https://github.com/your-org/chat-platform/issues)

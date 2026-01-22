# Troubleshooting Guide

Common issues and solutions for AgentFlow setup and operation.

---

## Installation Issues

### Supabase Won't Start

**Symptom:** `supabase start` fails or hangs

**Causes & Solutions:**

#### Docker Not Running
```bash
# Check Docker status
docker ps

# If error, start Docker Desktop application
# macOS: Open Docker Desktop from Applications
# Windows: Start Docker Desktop from Start menu
```

#### Port Conflicts
```bash
# Check what's using Supabase ports
lsof -i :54321  # API port
lsof -i :54322  # Database port
lsof -i :54323  # Studio port
lsof -i :54324  # Inbucket port

# Kill conflicting process
kill -9 <PID>

# Or stop and restart Supabase
supabase stop
supabase start
```

#### Corrupted Supabase State
```bash
# Stop Supabase
supabase stop

# Remove all containers and volumes
docker compose -f ~/.supabase/docker-compose.yml down -v

# Restart fresh
supabase start
```

### npm install Fails

**Symptom:** Errors during `npm install`

**Solutions:**

#### Clear npm Cache
```bash
# Clear npm cache
npm cache clean --force

# Delete lock file and node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### Node Version Mismatch
```bash
# Check Node version (needs 18+)
node --version

# If <18, upgrade Node.js
# macOS: brew upgrade node
# Or download from nodejs.org
```

#### Permission Errors
```bash
# Don't use sudo with npm!
# Instead, fix npm permissions:
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
```

---

## Environment Variable Issues

### "Missing environment variables" Error

**Symptom:** App crashes on startup with environment variable errors

**Check:**
```bash
# 1. Verify .env.local exists
ls -la .env.local

# 2. Check file has all required variables
cat .env.local | grep -E "SUPABASE|CLERK|CRON_SECRET"

# 3. Check for syntax errors (no spaces around =)
# ✅ CORRECT: API_KEY=abc123
# ❌ WRONG: API_KEY = abc123

# 4. Restart dev server after changes
# Ctrl+C to stop
npm run dev
```

**Required Variables Checklist:**
```env
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
✅ CLERK_SECRET_KEY
✅ CLERK_WEBHOOK_SECRET
✅ CRON_SECRET
✅ ALLOWED_ORIGINS
```

### Environment Variables Not Loading

**Symptom:** Variables are set but app doesn't see them

**Solutions:**
```bash
# 1. File must be named .env.local (not .env)
mv .env .env.local

# 2. Restart dev server (Ctrl+C then npm run dev)

# 3. Check file location (must be in project root)
ls -la | grep env

# 4. For production, set in hosting platform (Vercel, etc.)
```

---

## Clerk Authentication Issues

### Webhook Returns 401 Unauthorized

**Symptom:** Clerk webhooks fail, users not syncing to database

**Causes & Solutions:**

#### Wrong Webhook Secret
```bash
# 1. Get secret from Clerk Dashboard → Webhooks → Your Endpoint
# 2. Copy the "Signing Secret"
# 3. Add to .env.local:
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
# 4. Restart dev server
```

#### Missing Webhook Secret
```bash
# Check if variable exists
grep CLERK_WEBHOOK_SECRET .env.local

# If not found, add it
echo "CLERK_WEBHOOK_SECRET=whsec_your_secret" >> .env.local
```

### Webhook Returns 404 Not Found

**Symptom:** Clerk can't reach your webhook endpoint

**Causes & Solutions:**

#### Tunnel Not Running
```bash
# Start tunnel
npm run tunnel

# Or manually
lt --port 3000 --subdomain agentflow-yourname

# Verify tunnel URL matches Clerk webhook endpoint
```

#### Wrong URL in Clerk
```
# Clerk Dashboard → Webhooks → Your Endpoint
# URL should be: https://your-tunnel.loca.lt/api/clerk/webhook
#                                              ^^^^^^^^^^^^^^^^
#                                              Must end with this exact path
```

### User Created But Not in Database

**Symptom:** Can sign up but profile doesn't appear in Supabase

**Debug Steps:**

```bash
# 1. Check Clerk webhook logs
# Clerk Dashboard → Webhooks → Your Endpoint → Logs

# 2. Check dev server terminal for errors
# Look for: [Webhook] Received event: user.created

# 3. Check Supabase for profile
# Visit: http://127.0.0.1:54323
# Table Editor → profiles → Check for your user

# 4. Manually trigger webhook
# Clerk Dashboard → Webhooks → Testing → user.created → Send Example
```

**Common Causes:**
- Webhook never fired (check Clerk logs)
- Webhook failed (check server logs)
- Database error (check Supabase logs)

### "Organizations must be enabled" Error

**Symptom:** Error when trying to create organization

**Fix:**
```bash
# 1. Go to Clerk Dashboard → Organizations
# 2. Toggle "Enable Organizations" to ON
# 3. Restart dev server
```

---

## Database Issues

### Database Reset Removes My Data

**Symptom:** `supabase db reset` wipes everything

**Understanding:**
```bash
# supabase db reset does:
# 1. Drops ALL tables
# 2. Recreates schema from migrations
# 3. Deletes ALL data

# Use this for:
# - Fresh start
# - Applying new migrations in dev

# DON'T use in production!
```

**Alternatives:**
```bash
# Apply single migration
supabase db push

# Seed test data after reset
npm run db:seed <your-user-id>

# For production, use migrations only
supabase migration new add_feature
# Edit migration file
supabase db push
```

### Migration Errors

**Symptom:** `supabase db reset` fails with SQL errors

**Debug:**
```bash
# 1. Check migration files
ls supabase/migrations/

# 2. Try applying migrations one by one
# (Advanced - modify supabase config to skip erroring migration)

# 3. For local dev, can reset from scratch
supabase db reset --force

# 4. Check SQL syntax in migration files
```

### Can't Connect to Database

**Symptom:** App can't reach Supabase database

**Check:**
```bash
# 1. Verify Supabase is running
supabase status

# 2. Check database URL in .env.local
# Should be: http://127.0.0.1:54321

# 3. Check connection in Supabase Studio
# Visit: http://127.0.0.1:54323

# 4. Check for firewall blocking ports 54321-54324
```

---

## Model Connection Issues

### "No models available" in Chat

**Causes & Solutions:**

#### Model Not Assigned to Group
```bash
# Fix: Admin → Groups → Your Group → Models tab
# Click "Add Model" → Select your model
```

#### User Not in Group
```bash
# Fix: Admin → Groups → Your Group → Members tab
# Click "Add Member" → Select your user
```

#### Model Disabled
```bash
# Fix: Admin → Models → Your Model
# Toggle "Enabled" to ON
```

### Model Test Fails

**Symptom:** "Test Connection" button returns error

#### Error 401: Invalid API Key
```bash
# Causes:
# - Wrong API key
# - API key expired
# - API key doesn't have permission

# Fix:
# 1. Get new API key from provider
# 2. Admin → Models → Edit → Paste new key
# 3. Click "Save"
# 4. Try test again
```

#### Error 404: Endpoint Not Found
```bash
# Cause: Wrong endpoint URL in configuration

# Fix:
# 1. Check API documentation for correct URL
# 2. Admin → Models → Edit
# 3. Update endpoint URL
# 4. Save and test
```

#### Error: Cannot Parse Response
```bash
# Cause: response_path doesn't match API response structure

# Debug:
# 1. Check actual API response format
# 2. Update response_path in YAML

# Example:
# If API returns: { "result": { "text": "response" } }
# response_path should be: "result.text"

# See: YAML Configuration Guide
```

### Model Works in Test But Not in Chat

**Symptom:** Test connection succeeds, but chat doesn't work

**Debug:**
```bash
# 1. Open browser console (F12)
# Look for JavaScript errors

# 2. Check Network tab
# Look for failed API requests

# 3. Check dev server terminal
# Look for error logs

# 4. Common causes:
# - CORS error (add domain to ALLOWED_ORIGINS)
# - Missing authentication header
# - Rate limiting
```

---

## Chat Interface Issues

### Messages Not Sending

**Symptom:** Type message, click send, nothing happens

**Debug:**
```bash
# 1. Check browser console (F12 → Console)
# Look for errors

# 2. Check Network tab (F12 → Network)
# Look for failed /api/chat requests

# 3. Check you selected a model
# Model selector (top right) should show a model

# 4. Check you're in a group with model access
# Admin → Groups → Check your membership
```

### Conversations Not Saving

**Symptom:** Can chat but conversation disappears on refresh

**Causes:**
```bash
# 1. Database connection issue
# Check: Supabase Studio → conversations table

# 2. RLS policy blocking
# Check server logs for "permission denied" errors

# 3. User not authenticated
# Check: localStorage has Clerk session
```

### AI Response Streams Then Stops

**Symptom:** Response starts loading but stops mid-sentence

**Causes:**
```bash
# 1. API timeout
# Check: API provider dashboard for timeout settings

# 2. Rate limiting
# Check: API provider dashboard for rate limit errors

# 3. Network error
# Check: Browser Network tab for aborted requests
```

---

## Access Control Issues

### Can't Access Admin Dashboard

**Symptom:** Redirected or see "Access Denied"

**Causes:**
```bash
# 1. Not an Owner or Admin
# Fix: Have organization owner upgrade your role
# Admin → Users → Your User → Change Role

# 2. Not authenticated
# Fix: Sign in at /sign-in

# 3. Not in an organization
# Fix: Create organization during onboarding
```

### User Can See Models They Shouldn't

**Symptom:** Users see AI models from other groups

**Debug:**
```bash
# 1. Check group assignments
# Admin → Groups → Check which models are assigned

# 2. Check user's group membership
# Admin → Users → Click User → Groups tab

# 3. Check for "Everyone" group
# If exists, may give access to all models
```

### Group Permissions Not Working

**Symptom:** Group changes don't take effect

**Fix:**
```bash
# 1. Refresh browser (Ctrl+R or Cmd+R)
# 2. Sign out and sign back in
# 3. Check RLS policies are applied
# Supabase Studio → Authentication → Policies
```

---

## Performance Issues

### Slow Page Load

**Symptom:** Pages take >3 seconds to load

**Solutions:**
```bash
# 1. Check database query performance
# Supabase Studio → Database → Performance Insights

# 2. Clear Next.js cache
rm -rf .next
npm run dev

# 3. Check for infinite loops in code
# Browser console for repeated network requests

# 4. For production, check server logs
```

### Chat Interface Laggy

**Symptom:** Typing or scrolling is slow

**Solutions:**
```bash
# 1. Check for large message history
# Limit to last 50 messages per conversation

# 2. Disable browser extensions
# Try incognito mode

# 3. Check browser memory usage
# Task Manager → Browser should be <1GB
```

---

## Production Deployment Issues

### Build Fails

**Symptom:** `npm run build` fails

**Common Errors:**

#### TypeScript Errors
```bash
# Fix type errors before building
npm run type-check

# Check specific files with errors
```

#### Missing Environment Variables
```bash
# Build requires all env vars set
# Set in Vercel/hosting platform

# For local build:
cp .env.local .env.production
npm run build
```

#### Out of Memory
```bash
# Increase Node memory
NODE_OPTIONS=--max_old_space_size=4096 npm run build
```

### Deployed App Not Working

**Symptom:** App works locally but not in production

**Check:**
```bash
# 1. Environment variables set in hosting platform
# Vercel → Project → Settings → Environment Variables

# 2. Clerk webhook points to production domain
# Clerk Dashboard → Webhooks
# URL: https://yourdomain.com/api/clerk/webhook

# 3. Database connection
# Use production Supabase project, not local

# 4. CORS configured
ALLOWED_ORIGINS=https://yourdomain.com
```

---

## Getting Help

### Before Asking for Help

1. **Check this guide** for your specific error
2. **Search GitHub Issues** for similar problems
3. **Check browser console** for errors (F12)
4. **Check server logs** for backend errors
5. **Try in incognito mode** to rule out extensions

### Gathering Debug Information

```bash
# System info
node --version
npm --version
supabase --version

# Check Supabase status
supabase status

# Check environment (sanitized)
cat .env.local | grep -v "SECRET\|KEY" | grep "="

# Export logs
npm run dev > debug.log 2>&1
```

### Where to Get Help

- 💬 **[GitHub Discussions](https://github.com/your-org/chat-platform/discussions)** - Ask questions
- 🐛 **[GitHub Issues](https://github.com/your-org/chat-platform/issues)** - Report bugs
- 📖 **[Documentation](../README.md)** - Read guides
- 🔍 **Search Issues** - Someone may have had same problem

### Creating a Good Issue

Include:
1. **What you were trying to do**
2. **What you expected to happen**
3. **What actually happened**
4. **Error messages** (full error, not screenshot)
5. **Environment info** (Node version, OS, etc.)
6. **Steps to reproduce**

**Good Example:**
```
Title: "Clerk webhook returns 401 on user.created event"

I'm trying to sync Clerk users to Supabase but the webhook fails.

Expected: User profile created in Supabase
Actual: Webhook returns 401 Unauthorized

Error:
{
  "error": "Invalid signature",
  "code": "WEBHOOK_VERIFICATION_FAILED"
}

Environment:
- Node: 18.17.0
- Supabase CLI: 1.127.4
- OS: macOS 13.5

Steps to reproduce:
1. Set CLERK_WEBHOOK_SECRET in .env.local
2. Create webhook in Clerk pointing to lt tunnel
3. Sign up new user
4. Check Clerk webhook logs - shows 401
```

---

## Still Stuck?

Don't give up! The AgentFlow community is here to help.

- Start a [GitHub Discussion](https://github.com/your-org/chat-platform/discussions)
- Join our [Discord](link-to-discord) (if available)
- Check [Clerk Support](https://clerk.com/support) for auth issues
- Check [Supabase Support](https://supabase.com/support) for database issues

---

**Most issues can be resolved by:**
1. Restarting the dev server
2. Checking environment variables
3. Clearing cache and rebuilding
4. Reading error messages carefully

Good luck! 🚀

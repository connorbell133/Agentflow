# Clerk Authentication Setup

**Time Required:** 15 minutes
**Prerequisites:** [Installation](./INSTALLATION.md) completed through Step 4

Clerk handles all user authentication, session management, and organization features for AgentFlow. This guide will walk you through setting up Clerk for local development.

---

## Step 1: Create Clerk Account

1. **Visit** [clerk.com](https://clerk.com)
2. **Sign up** for a free account
3. **Verify** your email

---

## Step 2: Create Application

1. **Click** "Create Application"
2. **Name**: "AgentFlow Local Dev" (or any name you prefer)
3. **Select Framework**: Choose "Next.js"
4. **Authentication Methods**:
   - ✅ Email
   - ✅ Google (optional)
   - ✅ GitHub (optional)
5. **Click** "Create Application"

---

## Step 3: Get API Keys

After creating your application, you'll see the Quick Start page.

### Copy Publishable Key

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxx
```

Add to `.env.local`:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxx
```

### Copy Secret Key

```
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxx
```

Add to `.env.local`:
```env
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxx
```

**⚠️ Security Warning:** Never commit the Secret Key to version control!

---

## Step 4: Enable Organizations

AgentFlow uses Clerk Organizations for multi-tenant data isolation.

1. **Navigate** to Clerk Dashboard → **Organizations** (left sidebar)
2. **Toggle** "Enable Organizations" to **ON**
3. **Settings** to configure:
   - ✅ **Allow users to create organizations** → ON
   - ✅ **Allow users to delete organizations** → OFF (recommended)
   - ✅ **Maximum organizations per user** → Set to 5 (or unlimited)

4. **Save changes**

---

## Step 5: Configure Webhooks

Webhooks sync Clerk users with your AgentFlow database. This is **required** for the app to work.

### For Local Development: Set Up Tunnel

Since Clerk needs a public URL to send webhooks, you'll need to expose your local server:

#### Option A: Using Localtunnel (Recommended for Dev)

```bash
# Install localtunnel globally (one time)
npm install -g localtunnel

# In one terminal: Start your dev server
npm run dev

# In another terminal: Start tunnel
lt --port 3000 --subdomain agentflow-yourname
```

You'll get a URL like: `https://agentflow-yourname.loca.lt`

**💡 Tip:** Use a consistent subdomain so you don't have to update Clerk every time.

#### Option B: Using ngrok

```bash
# Install ngrok
brew install ngrok  # macOS

# Start tunnel
ngrok http 3000
```

You'll get a URL like: `https://abc123.ngrok.io`

#### Option C: Using npm script (Localtunnel)

```bash
# Start dev server + tunnel automatically
npm run dev:webhook

# This runs both:
# - npm run dev
# - npm run tunnel
```

### Configure Webhook in Clerk

1. **Navigate** to Clerk Dashboard → **Webhooks** (left sidebar)
2. **Click** "Add Endpoint"
3. **Endpoint URL**:
   ```
   https://your-tunnel-url.loca.lt/api/clerk/webhook
   ```
   Replace `your-tunnel-url.loca.lt` with your actual tunnel URL

4. **Subscribe to events** (select ALL of these):

   **User Events:**
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`

   **Organization Events:**
   - ✅ `organization.created`
   - ✅ `organization.updated`
   - ✅ `organization.deleted`

   **Organization Membership Events:**
   - ✅ `organizationMembership.created`
   - ✅ `organizationMembership.updated`
   - ✅ `organizationMembership.deleted`

5. **Click** "Create"

### Get Webhook Secret

After creating the webhook endpoint:

1. **Click** on the webhook you just created
2. **Copy** the **Signing Secret**
   ```
   whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. **Add to `.env.local`**:
   ```env
   CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

## Step 6: Configure Redirect URLs (Optional)

The default configuration works, but you can customize redirect paths.

### In Clerk Dashboard

1. **Navigate** to **Paths** (left sidebar)
2. **Sign-in URL**: `/sign-in` (already set in .env.local)
3. **Sign-up URL**: `/sign-up` (already set in .env.local)
4. **After sign-in URL**: `/flow` (already set in .env.local)
5. **After sign-up URL**: `/flow` (already set in .env.local)

### Your `.env.local` should have:

```env
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/flow
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/flow
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/flow
```

---

## Step 7: Test Webhook Connection

### Start Your Server

```bash
# Make sure tunnel is running
npm run dev:webhook

# Or manually in separate terminals:
# Terminal 1: npm run dev
# Terminal 2: npm run tunnel
```

### Test the Webhook

1. **In Clerk Dashboard** → **Webhooks**
2. **Click** your webhook endpoint
3. **Click** "Testing" tab
4. **Select event**: `user.created`
5. **Click** "Send Example"

**Expected result:**
- ✅ Status: 200 OK
- ✅ Your terminal shows: `[Webhook] Received event: user.created`

**If you see an error:**
- Check your tunnel is running
- Check the endpoint URL is correct
- Check your dev server is running
- Check `.env.local` has `CLERK_WEBHOOK_SECRET`

---

## Step 8: Verify Complete Configuration

Your `.env.local` should now have all Clerk variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Clerk URLs (optional - these are defaults)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/flow
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/flow
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/flow
```

### Restart Your Dev Server

```bash
# Stop dev server (Ctrl+C)
# Restart
npm run dev
```

---

## Step 9: Test Authentication

1. **Visit** http://localhost:3000
2. **Click** "Sign Up"
3. **Create account** with email
4. **Check for verification email**:
   - **Local dev**: Check Inbucket at http://127.0.0.1:54324
   - **Production**: Check your actual email
5. **Verify email** by clicking the link
6. **Complete onboarding**:
   - Enter organization name
   - Click "Create Organization"
7. **You should be redirected** to `/flow`

### Verify Database Sync

1. **Visit** Supabase Studio: http://127.0.0.1:54323
2. **Go to** Table Editor → `profiles`
3. **You should see** your user record with your Clerk ID
4. **Go to** Table Editor → `organizations`
5. **You should see** your organization

**If you don't see your data:**
- Check webhook was triggered (look at dev server logs)
- Check Clerk Dashboard → Webhooks → View logs
- See [Troubleshooting](#common-issues) below

---

## Common Issues

### Webhook Returns 401 Unauthorized

**Cause:** `CLERK_WEBHOOK_SECRET` is incorrect or missing

**Fix:**
1. Check `.env.local` has the correct webhook secret
2. Copy it again from Clerk Dashboard → Webhooks → Your Endpoint
3. Restart dev server

### Webhook Returns 404 Not Found

**Cause:** Tunnel URL is incorrect or tunnel isn't running

**Fix:**
1. Check tunnel is running: `lt --port 3000 --subdomain agentflow-yourname`
2. Verify tunnel URL matches webhook endpoint in Clerk
3. Make sure URL ends with `/api/clerk/webhook`

### User Created But Not in Database

**Cause:** Webhook didn't fire or failed

**Fix:**
1. Check Clerk Dashboard → Webhooks → Logs
2. Check your dev server terminal for errors
3. Manually trigger: Clerk Dashboard → Webhooks → Testing → Send Example

### "Organization must be enabled" Error

**Cause:** Organizations feature not enabled in Clerk

**Fix:**
1. Clerk Dashboard → Organizations
2. Toggle "Enable Organizations" to ON
3. Restart dev server

### Tunnel URL Changes Every Time

**Fix for Localtunnel:**
```bash
# Use a fixed subdomain
lt --port 3000 --subdomain agentflow-yourname

# Add to package.json scripts:
"tunnel": "lt --port 3000 --subdomain agentflow-yourname"
```

**Fix for ngrok:**
```bash
# Get a free static domain
ngrok http 3000 --domain=your-static-domain.ngrok-free.app
```

---

## Production Setup

For production deployment, you'll need:

1. **Different Clerk Application**
   - Create a new "Production" application in Clerk
   - Use production API keys

2. **Real Domain for Webhooks**
   - Example: `https://yourdomain.com/api/clerk/webhook`
   - No tunnel needed

3. **Environment Variables in Vercel/Hosting**
   - Set all Clerk variables in your hosting platform
   - Never commit secrets to Git

**→ See [Deployment Guide](../DEPLOYMENT.md) for full production setup**

---

## Next Steps

- ✅ Clerk setup complete!
- 🔙 [Back to Installation](./INSTALLATION.md#step-6-start-development-server)
- 📖 [Connect Your First AI Endpoint](./FIRST_ENDPOINT.md)

---

## Need Help?

- 📖 [Clerk Documentation](https://clerk.com/docs)
- 💬 [GitHub Discussions](https://github.com/your-org/chat-platform/discussions)
- 🐛 [Report an Issue](https://github.com/your-org/chat-platform/issues)

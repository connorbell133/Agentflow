# Multi-Tenant Architecture Guide

Complete guide to AgentFlow's organization-based multi-tenancy.

---

## Overview

AgentFlow implements **true multi-tenancy** at the database level, allowing you to serve multiple completely isolated organizations from a single deployment.

**What this means:**
- Each organization has its own users, data, and AI models
- Complete data isolation enforced at the database layer
- No shared data between organizations
- Scale from 1 to 10,000+ organizations on one platform

---

## Core Concepts

### Organizations

An **organization** is the top-level tenant in AgentFlow. Think of it as a completely separate workspace.

```
Platform: agentflow.live

Organizations:
├── Acme Corp (org_123)
│   ├── Users: alice@acme.com, bob@acme.com
│   ├── AI Models: GPT-4, Custom Sales Agent
│   └── Conversations: 1,234 conversations
│
├── TechStart Inc (org_456)
│   ├── Users: charlie@techstart.io, dana@techstart.io
│   ├── AI Models: Claude, Support Bot
│   └── Conversations: 567 conversations
│
└── Legal LLC (org_789)
    ├── Users: eve@legal.com
    ├── AI Models: Contract Analyzer
    └── Conversations: 89 conversations
```

**Each organization is completely isolated:**
- Acme Corp cannot see TechStart's data
- TechStart cannot access Legal's AI models
- Legal cannot view Acme's conversations

---

## Database Architecture

### Row-Level Security (RLS)

AgentFlow uses **PostgreSQL Row-Level Security** to enforce multi-tenant isolation at the database level.

**How it works:**

```sql
-- Every table has an org_id column
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,  -- Links to organization
  user_id TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policy ensures users only see their org's data
CREATE POLICY "Users can only see their organization's conversations"
  ON conversations
  FOR SELECT
  USING (org_id = current_setting('app.current_org_id')::UUID);
```

**Benefits:**
- ✅ **Enforced at database level** - No way to bypass in application code
- ✅ **Automatic filtering** - All queries automatically scoped to organization
- ✅ **Performance** - Database-level filtering is fast
- ✅ **Security** - SQL injection can't access other organizations

### Data Model

**Core tables with multi-tenant structure:**

```
organizations
  ├── id (UUID)
  ├── name
  └── owner_id

profiles (users)
  ├── id (Clerk user ID)
  ├── org_id (UUID) → organizations.id
  ├── email
  └── role (owner, admin, guest)

groups
  ├── id (UUID)
  ├── org_id (UUID) → organizations.id
  └── name

ai_models
  ├── id (UUID)
  ├── org_id (UUID) → organizations.id
  ├── name
  └── configuration (JSONB)

conversations
  ├── id (UUID)
  ├── org_id (UUID) → organizations.id
  ├── user_id → profiles.id
  └── title

messages
  ├── id (UUID)
  ├── conversation_id → conversations.id
  ├── content
  └── role (user, assistant)
```

**Key points:**
- Every table (except `organizations`) has `org_id`
- Foreign keys maintain referential integrity
- RLS policies on every table
- Indexes on `org_id` for performance

---

## Multi-Tenant Patterns

### Pattern 1: Single Platform, Multiple Clients

**Use Case:** Agency or consultant serving multiple clients

```
Platform: your-ai-platform.com

└── Organization per client:
    ├── Client A Inc (org_abc)
    │   ├── 10 users
    │   ├── 3 AI models (custom for Client A)
    │   └── 500 conversations
    │
    ├── Client B Corp (org_def)
    │   ├── 25 users
    │   ├── 5 AI models (custom for Client B)
    │   └── 1,200 conversations
    │
    └── Client C LLC (org_ghi)
        ├── 5 users
        ├── 2 AI models (custom for Client C)
        └── 150 conversations
```

**Benefits:**
- One codebase, one deployment
- Each client feels like separate platform
- You manage all infrastructure
- Centralized monitoring and updates

**Setup:**
1. Deploy AgentFlow once
2. Create organization for each client
3. Invite client users to their organization
4. Connect client-specific AI endpoints
5. Client manages their own users going forward

---

### Pattern 2: SaaS Product with Organizations

**Use Case:** SaaS company where each customer gets an organization

```
SaaS Product: yourproduct.com

└── Customer Organizations:
    ├── Customer 1 (Free Plan)
    │   ├── 1 user (owner)
    │   ├── Access to GPT-3.5 only
    │   └── 100 messages/month limit
    │
    ├── Customer 2 (Pro Plan)
    │   ├── 10 users
    │   ├── Access to GPT-4 + Custom models
    │   └── Unlimited messages
    │
    └── Customer 3 (Enterprise Plan)
        ├── 100 users
        ├── Access to all models + Custom deployments
        └── Unlimited everything + SLA
```

**Benefits:**
- Scale from free to enterprise on same platform
- Usage tracking per organization
- Billing per organization
- Easy upgrades/downgrades

**Implementation:**
```typescript
// Check organization's plan limits
async function canSendMessage(org_id: string, user_id: string) {
  const org = await getOrganization(org_id);
  const usage = await getMonthlyUsage(org_id);

  if (org.plan === 'free' && usage.messages >= 100) {
    throw new Error('Monthly message limit reached. Upgrade to Pro.');
  }

  return true;
}
```

---

### Pattern 3: Department-Based Organizations (Enterprise)

**Use Case:** Large enterprise with separate departments

```
Company: BigCorp

└── Departments as Organizations:
    ├── Legal Department (org_legal)
    │   ├── 15 lawyers
    │   ├── Contract Analyzer, Legal Research AI
    │   └── Strict data isolation (compliance)
    │
    ├── HR Department (org_hr)
    │   ├── 8 HR staff
    │   ├── Policy Assistant, Employee Q&A
    │   └── Isolated from other departments
    │
    └── Engineering (org_eng)
        ├── 200 engineers
        ├── Code Assistant, Documentation AI
        └── Separate data for security
```

**Benefits:**
- Compliance: Legal data never mixes with HR
- Security: Engineering code stays in Engineering
- Customization: Each department gets their AI tools
- Audit trail: Clear ownership per department

---

### Pattern 4: White-Label Platform

**Use Case:** Provide AgentFlow to your customers as their own platform

```
Your Business: AI Platform Provider

└── White-Label Customers:
    ├── Customer A
    │   ├── Custom domain: ai.customera.com
    │   ├── Custom branding (logo, colors)
    │   ├── Their own users and AI models
    │   └── Organization: org_customer_a
    │
    ├── Customer B
    │   ├── Custom domain: chat.customerb.io
    │   ├── Custom branding
    │   ├── Their own users and AI models
    │   └── Organization: org_customer_b
    │
    └── Customer C
        ├── Custom domain: ai.customerc.net
        ├── Custom branding
        ├── Their own users and AI models
        └── Organization: org_customer_c
```

**Benefits:**
- Each customer feels like separate platform
- Custom domains and branding
- Complete data isolation
- You manage infrastructure, they manage users

**Implementation:**
```typescript
// Determine organization from domain
function getOrgFromDomain(hostname: string) {
  if (hostname === 'ai.customera.com') return 'org_customer_a';
  if (hostname === 'chat.customerb.io') return 'org_customer_b';
  if (hostname === 'ai.customerc.net') return 'org_customer_c';

  // Fallback to subdomain
  const subdomain = hostname.split('.')[0];
  return getOrgBySubdomain(subdomain);
}
```

---

## Organization Management

### Creating Organizations

**During Onboarding:**

```typescript
// User completes signup with Clerk
// Webhook receives user.created event

// In webhook handler:
async function handleUserCreated(clerkUser) {
  // 1. Create organization
  const org = await createOrganization({
    name: `${clerkUser.firstName}'s Organization`,
    owner_id: clerkUser.id
  });

  // 2. Add user to organization as owner
  await createProfile({
    id: clerkUser.id,
    org_id: org.id,
    email: clerkUser.emailAddresses[0].emailAddress,
    role: 'owner'
  });

  // 3. Create default group
  await createGroup({
    org_id: org.id,
    name: 'Everyone',
    is_default: true
  });
}
```

**Via Invite:**

```typescript
// Existing user invites new user to their organization
async function inviteUserToOrganization(email: string, org_id: string, role: string) {
  // 1. Create invite
  const invite = await createInvite({
    email,
    org_id,
    role,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });

  // 2. Send email
  await sendEmail({
    to: email,
    subject: 'You\'ve been invited to join AgentFlow',
    template: 'organization-invite',
    data: { invite }
  });

  return invite;
}
```

### Organization Roles

**Owner:**
- Full control over organization
- Can delete organization
- Manage billing (future)
- All Admin permissions

**Admin:**
- Manage AI models
- Manage groups
- Invite/remove users
- Cannot delete organization

**Guest:**
- Limited access to assigned conversations
- Cannot create AI models
- Cannot manage users

**Implementation:**
```typescript
// Check if user can perform action
async function hasPermission(user_id: string, org_id: string, action: string) {
  const user = await getProfile(user_id);

  if (user.org_id !== org_id) return false;

  const permissions = {
    owner: ['*'], // All actions
    admin: ['models.*', 'users.*', 'groups.*', 'settings.*'],
    guest: ['conversations.read', 'messages.send']
  };

  const userPermissions = permissions[user.role] || [];

  return userPermissions.includes(action) || userPermissions.includes('*');
}
```

---

## Data Isolation

### How It Works

**1. Set organization context:**
```typescript
// Middleware sets organization for request
export async function middleware(req: NextRequest) {
  const { userId, org_id } = auth();

  // Store org_id for database queries
  await supabase.rpc('set_config', {
    parameter: 'app.current_org_id',
    value: org_id
  });
}
```

**2. Database automatically filters:**
```sql
-- User queries conversations
SELECT * FROM conversations;

-- RLS policy automatically adds:
SELECT * FROM conversations
WHERE org_id = current_setting('app.current_org_id')::UUID;

-- User ONLY sees their organization's conversations
```

**3. Inserts are also scoped:**
```typescript
// Create new conversation
await supabase.from('conversations').insert({
  title: 'New Chat',
  user_id: userId
  // org_id automatically added by RLS trigger
});
```

### Testing Isolation

**Unit test:**
```typescript
test('users cannot access other organizations data', async () => {
  // Create two organizations
  const orgA = await createOrganization({ name: 'Org A' });
  const orgB = await createOrganization({ name: 'Org B' });

  // Create conversation in Org A
  const conv = await createConversation({ org_id: orgA.id });

  // Try to access from Org B
  await setCurrentOrg(orgB.id);
  const result = await getConversation(conv.id);

  // Should return null or throw error
  expect(result).toBeNull();
});
```

---

## Organization Settings

### Customization Options

**Basic Settings:**
```typescript
interface OrganizationSettings {
  name: string;
  logo_url?: string;
  primary_color?: string;
  allow_user_signup: boolean;
  require_approval: boolean;
  default_ai_model?: string;
}
```

**Usage Limits:**
```typescript
interface OrganizationLimits {
  max_users: number;
  max_ai_models: number;
  max_conversations_per_user: number;
  max_messages_per_month: number;
  allowed_features: string[]; // ['voice', 'files', 'custom_models']
}
```

**Implementation:**
```typescript
// Check if organization can add user
async function canAddUser(org_id: string) {
  const org = await getOrganization(org_id);
  const userCount = await getUserCount(org_id);

  if (userCount >= org.limits.max_users) {
    throw new Error(`Organization has reached user limit (${org.limits.max_users})`);
  }

  return true;
}
```

---

## Migration Strategies

### From Single-Tenant to Multi-Tenant

**If you have existing single-tenant deployment:**

```sql
-- 1. Create default organization
INSERT INTO organizations (id, name, owner_id)
VALUES (gen_random_uuid(), 'Default Organization', 'current_owner_id');

-- 2. Add org_id to existing data
UPDATE profiles
SET org_id = (SELECT id FROM organizations WHERE name = 'Default Organization');

UPDATE conversations
SET org_id = (SELECT id FROM organizations WHERE name = 'Default Organization');

-- 3. Enable RLS policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON conversations
  FOR ALL USING (org_id = current_setting('app.current_org_id')::UUID);
```

### From Shared Database to Separate Databases

**If needed for compliance or scale:**

```typescript
// Database per organization (advanced)
function getDatabase(org_id: string) {
  const dbConfig = orgDatabaseMap.get(org_id);

  return createClient(dbConfig.url, dbConfig.key);
}

// Query data
async function getConversations(org_id: string) {
  const db = getDatabase(org_id);
  return await db.from('conversations').select('*');
}
```

---

## Monitoring & Analytics

### Per-Organization Metrics

**Track usage:**
```typescript
async function getOrganizationMetrics(org_id: string) {
  return {
    users: await getUserCount(org_id),
    conversations: await getConversationCount(org_id),
    messages_this_month: await getMessageCount(org_id, 'month'),
    ai_models: await getModelCount(org_id),
    storage_used: await getStorageUsed(org_id)
  };
}
```

**Billing calculation:**
```typescript
async function calculateMonthlyBill(org_id: string) {
  const metrics = await getOrganizationMetrics(org_id);
  const org = await getOrganization(org_id);

  let total = org.plan_base_price;

  // Add per-user cost
  total += (metrics.users - org.plan_included_users) * org.plan_per_user_price;

  // Add per-message cost
  total += (metrics.messages_this_month - org.plan_included_messages) * 0.001;

  return total;
}
```

---

## Security Considerations

### 1. Prevent Organization Hopping

**Always verify user belongs to organization:**
```typescript
async function performAction(user_id: string, org_id: string, action: string) {
  // Verify user is in organization
  const user = await getProfile(user_id);

  if (user.org_id !== org_id) {
    throw new Error('User does not belong to this organization');
  }

  // Proceed with action
}
```

### 2. Validate org_id in All Requests

**Never trust client-provided org_id:**
```typescript
// ❌ Bad - Client provides org_id
async function getConversations(org_id: string) {
  return await db.query.conversations.findMany({
    where: eq(conversations.org_id, org_id) // User could pass any org_id!
  });
}

// ✅ Good - Get org_id from authenticated session
async function getConversations() {
  const { org_id } = await auth(); // From Clerk session
  return await db.query.conversations.findMany({
    where: eq(conversations.org_id, org_id)
  });
}
```

### 3. Audit Logging

**Log all cross-organization attempts:**
```typescript
async function logSecurityEvent(event: string, user_id: string, org_id: string, details: any) {
  await db.insert(auditLogs).values({
    event,
    user_id,
    org_id,
    details,
    ip_address: req.ip,
    created_at: new Date()
  });

  // Alert on suspicious activity
  if (event === 'unauthorized_org_access') {
    await alertSecurity({ user_id, org_id, details });
  }
}
```

---

## Scaling Multi-Tenant Deployments

### Database Optimization

**Index all org_id columns:**
```sql
CREATE INDEX idx_conversations_org_id ON conversations(org_id);
CREATE INDEX idx_messages_org_id ON messages(conversation_id, org_id);
CREATE INDEX idx_profiles_org_id ON profiles(org_id);
```

**Partition large tables:**
```sql
-- Partition messages by org_id (for very large deployments)
CREATE TABLE messages (
  id UUID,
  org_id UUID,
  content TEXT,
  ...
) PARTITION BY LIST (org_id);

CREATE TABLE messages_org_123 PARTITION OF messages
  FOR VALUES IN ('org_123_uuid');
```

### Caching Strategy

**Cache per organization:**
```typescript
// Cache key includes org_id
const cacheKey = `conversations:${org_id}:${user_id}`;

const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const conversations = await fetchConversations(org_id, user_id);
await redis.set(cacheKey, JSON.stringify(conversations), 'EX', 300);

return conversations;
```

### Rate Limiting

**Limit per organization:**
```typescript
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m') // 100 requests per minute
});

async function checkRateLimit(org_id: string) {
  const { success } = await ratelimit.limit(`org:${org_id}`);

  if (!success) {
    throw new Error('Organization rate limit exceeded');
  }
}
```

---

## Best Practices

### 1. Always Scope Queries

```typescript
// ✅ Good
const conversations = await db.query.conversations.findMany({
  where: eq(conversations.org_id, currentOrgId)
});

// ❌ Bad
const conversations = await db.query.conversations.findMany();
```

### 2. Use Type-Safe org_id

```typescript
// Define branded type
type OrganizationId = string & { readonly __brand: 'OrganizationId' };

// Validate before use
function toOrganizationId(id: string): OrganizationId {
  if (!isValidUUID(id)) throw new Error('Invalid organization ID');
  return id as OrganizationId;
}
```

### 3. Test Isolation Thoroughly

```typescript
// Test that users cannot access other orgs
describe('Multi-tenant isolation', () => {
  test('user cannot see other org conversations', async () => {
    const orgA = await createOrg('Org A');
    const orgB = await createOrg('Org B');

    const conv = await createConversation({ org_id: orgA.id });

    await setCurrentOrg(orgB.id);
    await expect(getConversation(conv.id)).rejects.toThrow();
  });
});
```

### 4. Monitor Cross-Organization Errors

**Alert on any cross-org access attempts:**
```typescript
if (user.org_id !== requested_org_id) {
  await logSecurityEvent('unauthorized_org_access', user.id, requested_org_id);

  // Alert security team
  await sendAlert({
    severity: 'high',
    message: `User ${user.id} attempted to access org ${requested_org_id}`
  });

  throw new Error('Unauthorized');
}
```

---

## Troubleshooting

### Users See Data from Other Organizations

**Cause:** RLS policies not enabled or incorrectly configured

**Fix:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Verify policies exist
SELECT * FROM pg_policies WHERE tablename = 'conversations';
```

### Performance Issues with Large Organizations

**Cause:** Missing indexes on org_id

**Fix:**
```sql
-- Add indexes
CREATE INDEX CONCURRENTLY idx_conversations_org_id ON conversations(org_id);

-- Verify index usage
EXPLAIN ANALYZE SELECT * FROM conversations WHERE org_id = 'some-uuid';
```

### Organization Creation Fails

**Cause:** Clerk webhook not configured or failing

**Fix:**
1. Check Clerk webhook logs
2. Verify webhook secret is correct
3. Test webhook endpoint manually
4. Check database constraints

---

## See Also

- [Access Control Guide](./ACCESS_CONTROL.md) - Groups, roles, permissions
- [Security Documentation](../SECURITY.md) - Security policies
- [Deployment Guide](../DEPLOYMENT.md) - Production deployment

---

**Ready to serve multiple organizations?** AgentFlow's multi-tenant architecture scales from 1 to 10,000+ organizations with complete data isolation and security.

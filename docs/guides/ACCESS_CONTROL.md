# Access Control Guide

Complete guide to managing groups, roles, and permissions in AgentFlow.

---

## Overview

AgentFlow uses a multi-layered access control system:

1. **Organizations** - Top-level tenants with complete data isolation
2. **Groups** - Collections of users within an organization
3. **Roles** - User permissions (Owner, Admin, Guest)
4. **Model Access** - AI models assigned to groups

**Key Principle:** Users can only access AI models assigned to their groups.

---

## Organizations

### What is an Organization?

An organization represents a completely isolated tenant in AgentFlow. Data, users, conversations, and AI models are all scoped to an organization.

**Row-Level Security (RLS)** ensures database-level isolation.

### Organization Creation

**During Onboarding:**

1. User signs up via Supabase Auth
2. Completes onboarding flow
3. Creates organization (or joins existing via invite)

**Via Invite:**

1. Existing user invites new user
2. New user receives email invite
3. Clicks link → Signs up → Joins organization

### Organization Roles

#### Owner

- Full control over organization
- Can delete organization
- Manage billing (future feature)
- All Admin permissions

#### Admin

- Manage AI models (create, edit, delete)
- Manage groups
- Invite and manage users
- Configure organization settings
- Cannot delete organization

#### Guest

- Limited access to assigned conversations
- Cannot create new AI models
- Cannot manage users or groups
- View-only access to most settings

---

## Groups

### What is a Group?

A group is a collection of users within an organization. Groups control which users can access which AI models.

**Example:**

```
Organization: Acme Corp
├── Group: Engineering
│   ├── Users: Alice, Bob, Charlie
│   └── Models: Code Assistant, GPT-4
├── Group: Marketing
│   ├── Users: David, Emma
│   └── Models: Content Writer, GPT-3.5
└── Group: Executives
    ├── Users: Frank (CEO)
    └── Models: All models (via multiple group membership)
```

### Creating Groups

**Via Admin Dashboard:**

1. Navigate to Admin → Groups
2. Click "Create Group"
3. Enter:
   - Name (e.g., "Engineering Team")
   - Description (optional)
4. Click "Create"

**Best Practices:**

- Name groups by department, role, or subscription tier
- Use descriptions to clarify purpose
- Create groups before assigning models

### Assigning Models to Groups

1. Navigate to group details
2. Click "Models" tab
3. Click "Add Model"
4. Select AI model(s) from list
5. Click "Add"

**Result:** Only users in this group can access these models.

### Adding Users to Groups

**Method 1: Via Group Page**

1. Navigate to group
2. Click "Members" tab
3. Click "Add Member"
4. Select user(s)
5. Click "Add"

**Method 2: Via User Page**

1. Navigate to Admin → Users
2. Click user
3. Click "Groups" tab
4. Click "Add to Group"
5. Select group(s)

**Users can be in multiple groups** - they get access to all models across all their groups.

---

## Access Control Patterns

### Pattern 1: Department-Based Access

**Scenario:** Different departments need different AI tools

```
Organization: Your Company

Groups:
├── Legal Department
│   └── Models: Contract Analyzer, Legal Research
├── HR Department
│   └── Models: Policy Assistant, Employee Q&A
├── Engineering
│   └── Models: Code Helper, Technical Docs
└── Sales
    └── Models: Sales Coach, Proposal Writer

Each department only sees their AI tools.
```

**Setup:**

1. Create group per department
2. Connect department-specific AI models
3. Assign users to their department group
4. Result: Automatic access control

### Pattern 2: Subscription Tier Access

**Scenario:** SaaS with Free, Pro, Enterprise tiers

```
Organization: Your SaaS Product

Groups:
├── Free Users
│   └── Models: GPT-3.5 Turbo (rate-limited)
├── Pro Users
│   └── Models: GPT-4, Claude 3 Sonnet
└── Enterprise Users
    └── Models: All models + Custom fine-tuned

Access automatically updates when subscription changes.
```

**Implementation:**

1. Create groups for each tier
2. Assign appropriate models
3. On subscription change:
   - Remove user from old tier group
   - Add user to new tier group
4. Access updates immediately

### Pattern 3: Role-Based Access

**Scenario:** Access based on job role, not department

```
Organization: Acme Corp

Groups:
├── All Employees
│   └── Models: General Assistant (GPT-3.5)
├── Managers
│   └── Models: + Advanced Assistant (GPT-4)
└── Executives
    └── Models: + Premium Models (Claude Opus)

Hierarchical access - higher roles get more models.
```

**Implementation:**

- New employees → "All Employees" group
- Promoted to manager → Add to "Managers" (keep "All Employees")
- Promoted to executive → Add to "Executives" (keep both previous)

### Pattern 4: Project-Based Access

**Scenario:** Temporary project teams need specific AI

```
Organization: Agency

Groups:
├── Project Alpha Team
│   └── Models: Client A Custom Agent
├── Project Beta Team
│   └── Models: Client B Custom Agent
└── Bench (available resources)
    └── Models: General purpose tools

Users move between groups as projects change.
```

**Workflow:**

1. New project starts → Create group
2. Assign team members → Add to group
3. Connect project-specific AI → Assign to group
4. Project ends → Archive group

### Pattern 5: Multi-Tenant Client Management

**Scenario:** Agency with multiple clients

```
Platform: agency-ai.com

Organizations (separate tenants):
├── Client A Inc
│   ├── Group: All Users
│   └── Models: Client A Agent
├── Client B Corp
│   ├── Group: Marketing
│   └── Models: Content Tools
└── Client C LLC
    ├── Group: Support Team
    └── Models: Support Bot

Complete data isolation between clients.
```

**Setup:**

- Each client = Separate organization
- Complete database isolation via RLS
- You (agency) manage as admin of each org

---

## Advanced Scenarios

### Scenario: User Needs Access to Multiple Teams

**Problem:** Alice is in both Engineering and Marketing

**Solution:** Add Alice to both groups

```
Alice's Groups:
├── Engineering Team
│   └── Access: Code Assistant, GPT-4
└── Marketing Team
    └── Access: Content Writer, GPT-3.5

Alice sees all 4 models in her chat interface.
```

### Scenario: Temporary Access Grant

**Problem:** Give intern temporary access to premium AI

**Solution 1: Time-bound group membership**

1. Add intern to "Premium" group
2. Set calendar reminder
3. Remove after internship ends

**Solution 2: Project-specific group**

1. Create "Summer Intern 2025" group
2. Assign AI models
3. Add all interns
4. Archive group when done

### Scenario: Granular Model Access

**Problem:** Sales team needs GPT-4 but not code models

**Solution:** Create specific groups

```
Groups:
├── Sales Team
│   └── Models: GPT-4 (general), Sales Coach
└── Engineering Team
    └── Models: GPT-4 (general), Code Assistant

GPT-4 assigned to both, Code Assistant only to Engineering.
```

### Scenario: Testing New AI Model

**Problem:** Want to test new model with small group before rollout

**Solution:**

1. Create "Beta Testers" group
2. Add 3-5 volunteer users
3. Assign new AI model to group
4. Collect feedback
5. When ready, assign to broader groups

---

## Role Permissions Reference

### Owner Permissions

**Organization Management:**

- ✅ Delete organization
- ✅ Transfer ownership
- ✅ Manage billing (future)

**User Management:**

- ✅ Invite users
- ✅ Change user roles
- ✅ Remove users
- ✅ View all users

**Group Management:**

- ✅ Create/edit/delete groups
- ✅ Assign models to groups
- ✅ Add/remove users from groups

**Model Management:**

- ✅ Import/create AI models
- ✅ Edit model configurations
- ✅ Delete models
- ✅ Test connections

**Settings:**

- ✅ Change organization settings
- ✅ View analytics (future)
- ✅ Export data

### Admin Permissions

**Organization Management:**

- ❌ Delete organization
- ❌ Transfer ownership
- ❌ Manage billing

**User Management:**

- ✅ Invite users
- ✅ Change user roles (except Owner)
- ✅ Remove users
- ✅ View all users

**Group Management:**

- ✅ Create/edit/delete groups
- ✅ Assign models to groups
- ✅ Add/remove users from groups

**Model Management:**

- ✅ Import/create AI models
- ✅ Edit model configurations
- ✅ Delete models
- ✅ Test connections

**Settings:**

- ✅ Change most organization settings
- ✅ View analytics (future)
- ❌ Critical settings (reserved for Owner)

### Guest Permissions

**Organization Management:**

- ❌ All restricted

**User Management:**

- ❌ All restricted

**Group Management:**

- ❌ All restricted

**Model Management:**

- ❌ All restricted

**Chat:**

- ✅ View assigned conversations
- ✅ Send messages in assigned conversations
- ✅ View conversation history
- ❌ Create new conversations

---

## Best Practices

### Group Design

**Do:**

- ✅ Create groups based on access needs
- ✅ Use descriptive names
- ✅ Document group purpose in description
- ✅ Review group membership regularly

**Don't:**

- ❌ Create too many overlapping groups
- ❌ Use vague names like "Group 1"
- ❌ Grant blanket access to all models
- ❌ Leave unused groups active

### Role Assignment

**Do:**

- ✅ Use least privilege principle
- ✅ Limit Owner role (1-2 people)
- ✅ Make team leads Admins
- ✅ Default new users to Guest, upgrade as needed

**Don't:**

- ❌ Make everyone an Admin
- ❌ Use Guest for active team members
- ❌ Change roles without documentation

### Model Access

**Do:**

- ✅ Start restrictive, expand as needed
- ✅ Test with small groups first
- ✅ Monitor usage patterns
- ✅ Collect feedback on access needs

**Don't:**

- ❌ Give everyone access to everything
- ❌ Create models without assigning to groups
- ❌ Forget to remove access when users leave

---

## Troubleshooting

### User Can't See Any Models

**Causes:**

1. User not in any groups
2. Groups don't have models assigned
3. Models are disabled

**Debug:**

```
1. Check user's groups: Admin → Users → [User] → Groups tab
2. Check groups have models: Admin → Groups → [Group] → Models tab
3. Check models are enabled: Admin → Models → [Model] → Enabled toggle
```

### User Sees Wrong Models

**Causes:**

1. User in wrong groups
2. Models assigned to wrong groups

**Debug:**

```
1. Check which groups user is in
2. Check which models are assigned to those groups
3. Verify matches expected access
```

### Can't Remove User from Group

**Causes:**

1. Insufficient permissions (need Admin+)
2. Trying to remove yourself as Owner

**Fix:**

- Check your role
- Have another Admin remove you if needed

---

## API Integration

For programmatic access control management:

```typescript
// Coming soon: Access control API
// POST /api/groups
// POST /api/groups/:id/members
// POST /api/groups/:id/models
```

---

## See Also

- [Multi-Tenant Guide](./MULTI_TENANT.md) - Organization architecture
- [YAML Configuration](./YAML_CONFIG.md) - Model configuration
- [First Endpoint Guide](../getting-started/FIRST_ENDPOINT.md) - Setup walkthrough

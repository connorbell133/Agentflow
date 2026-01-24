# E2E Test File Map

Quick visual reference for finding the right test file.

## By Feature

```
Authentication & User Setup
├── Sign In              → auth/sign-in.spec.ts
├── Sign Up              → auth/sign-up.spec.ts
├── Onboarding           → auth/onboarding.spec.ts
└── Session Verification → auth/verify-session.spec.ts

Organization Management
├── Invite Management    → organization/invite-mgmt.spec.ts
│   ├── Create invite
│   ├── Revoke invite
│   └── List invites
│
├── Invite Acceptance    → organization/invite-accept.spec.ts
│   ├── Accept during onboarding
│   ├── Accept from badge
│   ├── Accept with existing org
│   └── Error scenarios
│
├── Group Management     → organization/group-mgmt.spec.ts
│   ├── Create group
│   ├── Edit group
│   ├── Delete group
│   └── Add/remove users
│
└── Model Management     → organization/model-mgmt.spec.ts
    ├── Add model
    ├── Configure model
    └── Remove model

Chat & Conversations
└── Conversations        → chat/conversation.spec.ts
    ├── Create conversation
    ├── Send messages
    └── View history
```

## By User Role

### Regular User

```
As a user, I want to...
├── Sign up                → auth/sign-up.spec.ts
├── Sign in                → auth/sign-in.spec.ts
├── Complete onboarding    → auth/onboarding.spec.ts
├── Accept an invite       → organization/invite-accept.spec.ts
└── Chat with AI           → chat/conversation.spec.ts
```

### Admin User

```
As an admin, I want to...
├── Invite users           → organization/invite-mgmt.spec.ts
├── Manage groups          → organization/group-mgmt.spec.ts
├── Configure models       → organization/model-mgmt.spec.ts
└── Revoke invites         → organization/invite-mgmt.spec.ts
```

### Owner

```
As an owner, I want to...
├── Create organization    → auth/onboarding.spec.ts
├── Invite admins          → organization/invite-mgmt.spec.ts
├── Manage all settings    → organization/*
└── View analytics         → (not yet implemented)
```

## By User Journey

### New User Journey

```
1. Sign Up              → auth/sign-up.spec.ts
2. Complete Profile     → auth/onboarding.spec.ts
3. Create/Join Org      → auth/onboarding.spec.ts OR
                          organization/invite-accept.spec.ts
4. Start Chatting       → chat/conversation.spec.ts
```

### Invited User Journey

```
1. Receive Invite      → (email, not tested in E2E)
2. Sign Up             → auth/sign-up.spec.ts
3. Complete Profile    → auth/onboarding.spec.ts
4. Accept Invite       → organization/invite-accept.spec.ts
5. Start Chatting      → chat/conversation.spec.ts
```

### Admin Setting Up Team

```
1. Sign In             → auth/sign-in.spec.ts
2. Invite Team         → organization/invite-mgmt.spec.ts
3. Create Groups       → organization/group-mgmt.spec.ts
4. Configure Models    → organization/model-mgmt.spec.ts
5. Assign Permissions  → organization/group-mgmt.spec.ts
```

## Decision Tree

### "Where should my test go?"

```
START: What are you testing?

├─ User authentication flow?
│  ├─ Sign in?              → auth/sign-in.spec.ts
│  ├─ Sign up?              → auth/sign-up.spec.ts
│  └─ Onboarding?           → auth/onboarding.spec.ts
│
├─ Organization invites?
│  ├─ Creating/revoking?    → organization/invite-mgmt.spec.ts
│  └─ Accepting?            → organization/invite-accept.spec.ts
│
├─ Groups?
│  ├─ CRUD operations?      → organization/group-mgmt.spec.ts
│  └─ Membership?           → organization/group-mgmt.spec.ts
│
├─ Models?
│  ├─ Adding/removing?      → organization/model-mgmt.spec.ts
│  └─ Configuration?        → organization/model-mgmt.spec.ts
│
└─ Chat/conversations?
   └─ Any messaging?        → chat/conversation.spec.ts
```

## Common Scenarios

| Scenario                                | File                                 |
| --------------------------------------- | ------------------------------------ |
| Test sign-up form                       | `auth/sign-up.spec.ts`               |
| Test profile setup                      | `auth/onboarding.spec.ts`            |
| Test creating org                       | `auth/onboarding.spec.ts`            |
| Test admin inviting user                | `organization/invite-mgmt.spec.ts`   |
| Test user accepting invite (onboarding) | `organization/invite-accept.spec.ts` |
| Test user accepting invite (badge)      | `organization/invite-accept.spec.ts` |
| Test user accepting invite (ANY way)    | `organization/invite-accept.spec.ts` |
| Test revoking invite                    | `organization/invite-mgmt.spec.ts`   |
| Test creating group                     | `organization/group-mgmt.spec.ts`    |
| Test adding model                       | `organization/model-mgmt.spec.ts`    |
| Test sending message                    | `chat/conversation.spec.ts`          |

## Anti-Pattern Examples

### ❌ Wrong: By Page/Route

```
Don't do this:
├── admin-page-tests.spec.ts       # Everything on /admin
├── onboarding-page-tests.spec.ts  # Everything on /onboarding
└── dashboard-page-tests.spec.ts   # Everything on /dashboard
```

**Why?** Tests for the same feature scattered across files.

### ❌ Wrong: By UI Component

```
Don't do this:
├── invite-button-tests.spec.ts    # Testing the button
├── invite-modal-tests.spec.ts     # Testing the modal
└── invite-badge-tests.spec.ts     # Testing the badge
```

**Why?** UI implementation details, not features.

### ❌ Wrong: Generic Names

```
Don't do this:
├── tests.spec.ts
├── more-tests.spec.ts
└── misc.spec.ts
```

**Why?** Impossible to know what's tested without reading.

### ✅ Right: By Feature

```
Do this:
├── auth/
│   ├── sign-in.spec.ts
│   ├── sign-up.spec.ts
│   └── onboarding.spec.ts
└── organization/
    ├── invite-mgmt.spec.ts
    └── invite-accept.spec.ts
```

**Why?** Clear, discoverable, organized by capability.

## Quick Tips

1. **Can't find where to add a test?**
   - Ask: "What FEATURE am I testing?"
   - NOT: "Where is the button?"

2. **File getting too large (>500 lines)?**
   - Split by sub-feature
   - Example: `invite-tests.spec.ts` → `invite-mgmt.spec.ts` + `invite-accept.spec.ts`

3. **Testing multiple features?**
   - Put it in the file for the PRIMARY feature
   - Use clear test names

4. **New feature entirely?**
   - Create new file in appropriate directory
   - Update this map!

## Summary

**Finding tests is easy:**

1. Think about the feature
2. Look at the map
3. Go to the file

**No more guessing!** 🎯

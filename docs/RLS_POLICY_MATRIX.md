# RLS Policy Access Control Matrix

**Generated:** January 24, 2026
**Purpose:** Complete mapping of all Row-Level Security policies by table, operation, and actor

---

## Legend

- ✅ **Policy Exists** - RLS policy is implemented
- ⚠️ **Policy Partial** - Policy exists but has gaps
- ❌ **Policy Missing** - No policy for this operation
- 🔒 **RLS Enforced** - Table has RLS enabled
- 🔓 **RLS Not Enforced** - Table does not have RLS enabled
- 👑 **Service Role** - Operation uses service role (bypasses RLS)

---

## Table: `profiles`

| Operation | Actor        | Policy Status | Condition                    | Code Locations                                          |
| --------- | ------------ | ------------- | ---------------------------- | ------------------------------------------------------- |
| SELECT    | auth user    | ✅ Exists     | `auth.uid() = id`            | actions/auth/users.ts:17<br/>actions/auth/profile.ts:64 |
| INSERT    | auth user    | ⚠️ Partial    | None (implicitly via signup) | actions/auth/profile.ts:96 (👑 service role)            |
| UPDATE    | auth user    | ✅ Exists     | `auth.uid() = id`            | actions/auth/profile.ts:99,129                          |
| DELETE    | auth user    | ❌ Missing    | N/A                          | Not used                                                |
| ALL       | service_role | 👑 Bypass     | `true`                       | actions/auth/profile.ts:96                              |

**Status:** 🔒 RLS Enabled (not forced)
**Security Notes:**

- Profile creation uses service role during signup (acceptable)
- Users can only access own profile (correct isolation)

---

## Table: `organizations`

| Operation | Actor        | Policy Status | Condition                                     | Code Locations                                                        |
| --------- | ------------ | ------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| SELECT    | auth user    | ✅ Exists     | User is org member via `org_map`              | actions/organization/organizations.ts:16<br/>actions/auth/users.ts:67 |
| INSERT    | auth user    | ✅ Exists     | Any authenticated user (⚠️ consider limiting) | actions/organization/organizations.ts:38                              |
| INSERT    | service_role | 👑 Bypass     | Used for initial org creation                 | actions/organization/organizations.ts:114                             |
| UPDATE    | org owner    | ✅ Exists     | User has `role = 'owner'` in `org_map`        | actions/organization/organizations.ts:130                             |
| DELETE    | org owner    | ✅ Exists     | User has `role = 'owner'` in `org_map`        | Not used in code                                                      |
| ALL       | service_role | 👑 Bypass     | `true`                                        | actions/organization/organizations.ts:114                             |

**Status:** 🔒 RLS Enabled (not forced)
**Security Notes:**

- Service role used for org creation with trigger to auto-add owner
- Consider limiting who can create organizations

---

## Table: `org_map`

| Operation | Actor        | Policy Status | Condition                           | Code Locations                                                     |
| --------- | ------------ | ------------- | ----------------------------------- | ------------------------------------------------------------------ |
| SELECT    | auth user    | ✅ Exists     | `user_id = auth.uid()`              | actions/organization/getUserOrg.ts:10<br/>actions/auth/users.ts:79 |
| SELECT    | service_role | 👑 Bypass     | Used in invite acceptance           | actions/organization/invites.ts:322                                |
| INSERT    | auth user    | ✅ Exists     | `user_id = auth.uid()`              | Not directly used                                                  |
| INSERT    | service_role | 👑 Bypass     | Used in invite acceptance           | actions/organization/invites.ts:309                                |
| UPDATE    | auth user    | ❌ Missing    | Should allow owners to update roles | **MISSING POLICY**                                                 |
| DELETE    | org owner    | ✅ Exists     | User is owner of the organization   | Not used in code                                                   |
| ALL       | service_role | 👑 Bypass     | `true`                              | actions/organization/invites.ts:309,322                            |

**Status:** 🔒 RLS Enabled (not forced)
**Security Notes:**

- 🔴 **CRITICAL:** Service role used for invite acceptance (security risk)
- ❌ **MISSING:** UPDATE policy for role changes
- Users can only see their own memberships (correct)

---

## Table: `groups`

| Operation | Actor        | Policy Status | Condition                            | Code Locations                                                       |
| --------- | ------------ | ------------- | ------------------------------------ | -------------------------------------------------------------------- |
| SELECT    | org member   | ✅ Exists     | User belongs to group's organization | actions/organization/group.ts:81<br/>app/api/user/groups/route.ts:49 |
| SELECT    | service_role | 👑 Bypass     | Used to preview group before joining | actions/organization/invites.ts:72                                   |
| INSERT    | org owner    | ✅ Exists     | User has `role = 'owner'` in org     | actions/organization/group.ts:113                                    |
| UPDATE    | org owner    | ✅ Exists     | User has `role = 'owner'` in org     | actions/organization/group.ts:173                                    |
| DELETE    | org owner    | ✅ Exists     | User has `role = 'owner'` in org     | actions/organization/group.ts:207                                    |
| ALL       | service_role | 👑 Bypass     | `true`                               | actions/organization/invites.ts:72                                   |

**Status:** 🔒 RLS Enabled (not forced)
**Security Notes:**

- Service role used to show group details in pending invites
- Well-designed policies for org-scoped access

---

## Table: `group_map`

| Operation | Actor        | Policy Status | Condition                      | Code Locations                                                              |
| --------- | ------------ | ------------- | ------------------------------ | --------------------------------------------------------------------------- |
| SELECT    | auth user    | ✅ Exists     | `user_id = auth.uid()`         | actions/chat/models.ts:28<br/>actions/organization/group.ts:48              |
| SELECT    | org owner    | ⚠️ Partial    | Via generic policy             | actions/organization/group.ts:92                                            |
| INSERT    | auth user    | ⚠️ Partial    | Only if invited (not enforced) | app/api/invites/[id]/accept/route.ts:33                                     |
| INSERT    | service_role | 👑 Bypass     | Used in invite acceptance      | actions/organization/invites.ts:337                                         |
| UPDATE    | auth user    | ❌ Missing    | No UPDATE policy exists        | **MISSING POLICY**                                                          |
| DELETE    | org owner    | ✅ Exists     | User is owner of group's org   | actions/organization/group.ts:143<br/>app/api/groups/[id]/leave/route.ts:22 |
| ALL       | service_role | 👑 Bypass     | `true`                         | actions/organization/invites.ts:337,351                                     |

**Status:** 🔒 RLS Enabled (not forced)
**Security Notes:**

- 🔴 **CRITICAL:** Service role bypasses validation in invite acceptance
- ❌ **MISSING:** Explicit policy to validate invite exists before INSERT
- ❌ **MISSING:** UPDATE policy

---

## Table: `invites`

| Operation | Actor        | Policy Status  | Condition                                         | Code Locations                         |
| --------- | ------------ | -------------- | ------------------------------------------------- | -------------------------------------- |
| SELECT    | org member   | ✅ Exists      | User belongs to organization                      | app/api/invites/route.ts:33            |
| SELECT    | invitee      | ⚠️ **MISSING** | Should allow viewing invites sent to user's email | **CRITICAL GAP**                       |
| SELECT    | service_role | 👑 Bypass      | Used to fetch invites by email                    | actions/organization/invites.ts:31     |
| INSERT    | org owner    | ✅ Exists      | User has `role = 'owner'` in org                  | actions/organization/invites.ts:135    |
| UPDATE    | auth user    | ❌ Missing     | Not used                                          | N/A                                    |
| DELETE    | org owner    | ✅ Exists      | User has `role = 'owner'` in org                  | actions/organization/invites.ts:161    |
| DELETE    | service_role | 👑 Bypass      | Cleanup after acceptance                          | actions/organization/invites.ts:365    |
| ALL       | service_role | 👑 Bypass      | `true`                                            | actions/organization/invites.ts:31,365 |

**Status:** 🔒 RLS Enabled (not forced)
**Security Notes:**

- 🔴 **CRITICAL:** Users cannot see invites sent to them without service role bypass
- Service role used for invite discovery before user joins org
- Need policy: `invitee = (SELECT email FROM profiles WHERE id = auth.uid())`

---

## Table: `models`

| Operation | Actor      | Policy Status | Condition                            | Code Locations                                                        |
| --------- | ---------- | ------------- | ------------------------------------ | --------------------------------------------------------------------- |
| SELECT    | org member | ✅ Exists     | User belongs to model's organization | actions/chat/models.ts:77,101<br/>actions/chat/models-optimized.ts:61 |
| INSERT    | org owner  | ✅ Exists     | User has `role = 'owner'` in org     | actions/chat/model-configs.ts:249                                     |
| UPDATE    | org owner  | ✅ Exists     | User has `role = 'owner'` in org     | actions/chat/model-configs.ts:154                                     |
| DELETE    | org owner  | ✅ Exists     | User has `role = 'owner'` in org     | lib/db/tenant-db.ts:421                                               |

**Status:** 🔒 RLS Enabled (not forced)
**Security Notes:**

- ✅ **SECURE:** No service role bypass
- ✅ **SECURE:** Proper org-scoped access
- Excellent policy design

---

## Table: `model_map`

| Operation | Actor        | Policy Status | Condition             | Code Locations                                                    |
| --------- | ------------ | ------------- | --------------------- | ----------------------------------------------------------------- |
| SELECT    | group member | ✅ Exists     | User belongs to group | actions/chat/models.ts:52<br/>actions/chat/models-optimized.ts:43 |
| INSERT    | org owner    | ✅ Exists     | Via generic policy    | actions/organization/group.ts:226                                 |
| UPDATE    | org owner    | ❌ Missing    | No UPDATE policy      | **MISSING POLICY**                                                |
| DELETE    | org owner    | ✅ Exists     | Via generic policy    | actions/organization/group.ts:255                                 |

**Status:** 🔒 RLS Enabled (not forced)
**Security Notes:**

- ✅ **SECURE:** No service role bypass
- ❌ **MISSING:** Explicit UPDATE policy
- Users can only see models assigned to their groups

---

## Table: `model_keys`

| Operation | Actor      | Policy Status | Condition                            | Code Locations             |
| --------- | ---------- | ------------- | ------------------------------------ | -------------------------- |
| SELECT    | org member | ✅ Exists     | User belongs to model's organization | actions/chat/models.ts:267 |
| INSERT    | org owner  | ✅ Exists     | Via generic policy                   | Not directly used          |
| UPDATE    | org owner  | ✅ Exists     | Via generic policy                   | Not directly used          |
| DELETE    | org owner  | ✅ Exists     | Via generic policy                   | Not directly used          |

**Status:** 🔒 RLS Enabled (not forced)
**Security Notes:**

- ✅ **SECURE:** API keys properly protected
- ✅ **SECURE:** Only org members can view keys

---

## Table: `model_prompts`

| Operation | Actor      | Policy Status | Condition                            | Code Locations       |
| --------- | ---------- | ------------- | ------------------------------------ | -------------------- |
| SELECT    | org member | ✅ Exists     | User belongs to model's organization | Not directly queried |
| INSERT    | org owner  | ✅ Exists     | Via generic policy                   | Not directly used    |
| UPDATE    | org owner  | ✅ Exists     | Via generic policy                   | Not directly used    |
| DELETE    | org owner  | ✅ Exists     | Via generic policy                   | Not directly used    |

**Status:** 🔒 RLS Enabled (not forced)
**Security Notes:**

- ✅ **SECURE:** Proper org-scoped access

---

## Table: `model_config_presets`

| Operation | Actor                    | Policy Status | Condition                              | Code Locations              |
| --------- | ------------------------ | ------------- | -------------------------------------- | --------------------------- |
| SELECT    | auth user (system)       | ✅ Exists     | `is_system = true`                     | actions/chat/presets.ts:126 |
| SELECT    | org member (org presets) | ✅ Exists     | `org_id` in user's orgs                | actions/chat/presets.ts:316 |
| INSERT    | org member               | ✅ Exists     | `is_system = false` AND org membership | Not directly used           |
| UPDATE    | org member               | ✅ Exists     | `is_system = false` AND org membership | Not directly used           |
| DELETE    | org member               | ✅ Exists     | `is_system = false` AND org membership | Not directly used           |

**Status:** 🔒 RLS Enabled (not forced)
**Security Notes:**

- ✅ **SECURE:** Multi-scope policy (system + org)
- ✅ **SECURE:** Prevents users from modifying system presets
- Excellent design

---

## Table: `conversations`

| Operation | Actor | Policy Status | Condition             | Code Locations                                              |
| --------- | ----- | ------------- | --------------------- | ----------------------------------------------------------- |
| SELECT    | owner | ✅ Exists     | `auth.uid() = "user"` | actions/chat/conversations.ts:23<br/>lib/db/tenant-db.ts:65 |
| INSERT    | owner | ✅ Exists     | `auth.uid() = "user"` | lib/db/tenant-db.ts:102                                     |
| UPDATE    | owner | ✅ Exists     | `auth.uid() = "user"` | lib/db/tenant-db.ts:121                                     |
| DELETE    | owner | ✅ Exists     | `auth.uid() = "user"` | lib/db/tenant-db.ts:157                                     |

**Status:** 🔒 RLS Enabled (not forced)
**Security Notes:**

- ✅ **SECURE:** Perfect user isolation
- ✅ **SECURE:** No service role bypass
- Users can only access their own conversations

---

## Table: `messages`

| Operation | Actor              | Policy Status | Condition                             | Code Locations                                                  |
| --------- | ------------------ | ------------- | ------------------------------------- | --------------------------------------------------------------- |
| SELECT    | conversation owner | ✅ Exists     | Via `conversations.user = auth.uid()` | actions/chat/feedback.ts:29<br/>lib/db/tenant-db.ts:245         |
| INSERT    | conversation owner | ✅ Exists     | Via `conversations.user = auth.uid()` | lib/ai/router/index.ts:367<br/>lib/ai/router/persistence.ts:150 |
| UPDATE    | conversation owner | ✅ Exists     | Via `conversations.user = auth.uid()` | actions/chat/feedback.ts:49                                     |
| DELETE    | conversation owner | ✅ Exists     | Via `conversations.user = auth.uid()` | lib/db/tenant-db.ts:304                                         |

**Status:** 🔒 RLS Enabled (not forced)
**Security Notes:**

- ✅ **SECURE:** Properly scoped via conversation ownership
- ✅ **SECURE:** No service role bypass
- Excellent join-based policy design

---

## Table: `message_feedback`

| Operation | Actor         | Policy Status | Condition                             | Code Locations               |
| --------- | ------------- | ------------- | ------------------------------------- | ---------------------------- |
| SELECT    | message owner | ✅ Exists     | Via `conversations.user = auth.uid()` | actions/chat/feedback.ts:138 |
| INSERT    | message owner | ✅ Exists     | Via `conversations.user = auth.uid()` | actions/chat/feedback.ts:147 |
| UPDATE    | message owner | ❌ Missing    | No UPDATE policy                      | actions/chat/feedback.ts:161 |
| DELETE    | message owner | ❌ Missing    | No DELETE policy                      | actions/chat/feedback.ts:204 |

**Status:** 🔒 RLS Enabled (not forced)
**Security Notes:**

- ⚠️ **CONCERN:** UPDATE and DELETE used in code but no policies exist
- ✅ **SECURE:** No service role bypass

---

## Table: `temp_org_requests`

| Operation | Actor     | Policy Status | Condition                   | Code Locations                                |
| --------- | --------- | ------------- | --------------------------- | --------------------------------------------- |
| SELECT    | requester | ✅ Exists     | `requester_id = auth.uid()` | actions/organization/temp-org-requests.ts:57  |
| INSERT    | auth user | ✅ Exists     | `requester_id = auth.uid()` | actions/organization/temp-org-requests.ts:77  |
| UPDATE    | requester | ⚠️ Partial    | Not explicitly defined      | actions/organization/temp-org-requests.ts:105 |
| DELETE    | requester | ⚠️ Partial    | Not explicitly defined      | actions/organization/organizations.ts:90      |

**Status:** 🔒 RLS Enabled (not forced)
**Security Notes:**

- ⚠️ **CONCERN:** UPDATE/DELETE policies not explicitly defined
- User can only see own requests

---

## Table: `product_tiers`

| Operation | Actor        | Policy Status | Condition           | Code Locations       |
| --------- | ------------ | ------------- | ------------------- | -------------------- |
| SELECT    | any          | ❌ **NO RLS** | Table not protected | Not queried directly |
| INSERT    | service_role | ❌ **NO RLS** | Reference data only | Not used             |
| UPDATE    | service_role | ❌ **NO RLS** | Reference data only | Not used             |
| DELETE    | service_role | ❌ **NO RLS** | Reference data only | Not used             |

**Status:** 🔓 **RLS NOT ENABLED**
**Security Notes:**

- ⚠️ **MINOR:** Reference data table with no protection
- ✅ **ACCEPTABLE:** If this is truly read-only reference data
- 📝 **RECOMMENDATION:** Enable RLS with public read policy

---

## Service Role Bypass Summary

### Critical Service Role Usage (Needs Replacement)

| Function                 | File       | Line | Table     | Operation | Risk            | Fix Required                          |
| ------------------------ | ---------- | ---- | --------- | --------- | --------------- | ------------------------------------- |
| getUserInvites           | invites.ts | 31   | invites   | SELECT    | 🔴 High         | Add RLS policy for email-based access |
| getInviteGroup           | invites.ts | 72   | groups    | SELECT    | 🟡 Medium       | Create anon-accessible view or policy |
| acceptInvite (org_map)   | invites.ts | 309  | org_map   | INSERT    | 🔴 **CRITICAL** | Replace with RLS + trigger            |
| acceptInvite (group_map) | invites.ts | 337  | group_map | INSERT    | 🔴 **CRITICAL** | Replace with RLS + trigger            |
| removeInvite             | invites.ts | 365  | invites   | DELETE    | 🟡 Medium       | Can use user context after INSERT     |

### Acceptable Service Role Usage

| Function           | File             | Line | Table         | Operation | Justification                      |
| ------------------ | ---------------- | ---- | ------------- | --------- | ---------------------------------- |
| createProfile      | profile.ts       | 96   | profiles      | UPSERT    | Initial signup requires bypass     |
| createOrganization | organizations.ts | 114  | organizations | INSERT    | Trigger auto-adds owner to org_map |

---

## Missing Policies Summary

| Table            | Missing Operation | Impact                           | Priority        |
| ---------------- | ----------------- | -------------------------------- | --------------- |
| org_map          | UPDATE            | Cannot change user roles         | 🔴 High         |
| group_map        | UPDATE            | Cannot modify group memberships  | 🟡 Medium       |
| model_map        | UPDATE            | Cannot reassign models to groups | 🟢 Low          |
| message_feedback | UPDATE, DELETE    | Cannot modify/remove feedback    | 🟡 Medium       |
| invites          | SELECT (by email) | Users can't see own invites      | 🔴 **CRITICAL** |
| product_tiers    | ALL               | No protection on reference data  | 🟢 Low          |

---

## Policy Effectiveness Rating

| Table                | Overall Rating | Notes                             |
| -------------------- | -------------- | --------------------------------- |
| profiles             | ⭐⭐⭐⭐☆      | Strong, minor service role usage  |
| organizations        | ⭐⭐⭐⭐☆      | Strong, acceptable service role   |
| org_map              | ⭐⭐☆☆☆        | **Weak** - service role bypass    |
| groups               | ⭐⭐⭐⭐☆      | Strong                            |
| group_map            | ⭐⭐☆☆☆        | **Weak** - service role bypass    |
| invites              | ⭐⭐☆☆☆        | **Weak** - missing invite preview |
| models               | ⭐⭐⭐⭐⭐     | Excellent                         |
| model_map            | ⭐⭐⭐⭐☆      | Strong, minor UPDATE gap          |
| model_keys           | ⭐⭐⭐⭐⭐     | Excellent                         |
| model_prompts        | ⭐⭐⭐⭐⭐     | Excellent                         |
| model_config_presets | ⭐⭐⭐⭐⭐     | Excellent (multi-scope)           |
| conversations        | ⭐⭐⭐⭐⭐     | Excellent                         |
| messages             | ⭐⭐⭐⭐⭐     | Excellent                         |
| message_feedback     | ⭐⭐⭐⭐☆      | Strong, minor UPDATE/DELETE gap   |
| temp_org_requests    | ⭐⭐⭐☆☆       | Good, minor policy gaps           |
| product_tiers        | ⭐☆☆☆☆         | **No RLS**                        |

**Average Rating:** ⭐⭐⭐⭐☆ (3.8/5)

---

## Action Items by Priority

### 🔴 CRITICAL (Fix Immediately)

1. Add RLS policy for users to view invites sent to their email
2. Refactor invite acceptance to use RLS instead of service role
3. Enable FORCE ROW LEVEL SECURITY on all tables
4. Add missing UPDATE policy to org_map

### 🟡 HIGH (Fix Within 1 Week)

5. Add UPDATE/DELETE policies to message_feedback
6. Add UPDATE policy to group_map
7. Replace service role client instances with admin singleton

### 🟢 MEDIUM (Fix Within 1 Month)

8. Add RLS to product_tiers
9. Add audit logging for all service role operations
10. Implement RLS policy unit tests

---

**Matrix Complete**
This matrix provides a complete view of all RLS policies, their effectiveness, and required improvements.

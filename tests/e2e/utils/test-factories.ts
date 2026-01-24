/**
 * Test Data Factory Functions
 *
 * These factories create test data with sensible defaults and unique identifiers.
 * Each factory function creates data directly in the database using Supabase,
 * bypassing UI interactions for faster, more reliable test setup.
 *
 * Usage:
 * ```typescript
 * const user = await createTestUser({ email: 'test@example.com' });
 * const org = await createTestOrganization({ name: 'Test Org', ownerId: user.id });
 * const invite = await createTestInvite({ orgId: org.id, inviteeEmail: 'invited@example.com' });
 * ```
 *
 * Worker-Scoped Usage (Parallel-Safe):
 * ```typescript
 * const ctx = WorkerContext.create(testInfo);
 * const tracker = ResourceTracker.forTest(testInfo, ctx);
 * const user = await createWorkerScopedUser(ctx, tracker, { fullName: 'Test User' });
 * const org = await createWorkerScopedOrganization(ctx, tracker, { ownerId: user.id });
 * ```
 */

import { createSupabaseTestClient } from './supabase-test-client';
import { randomUUID } from 'crypto';
import type { Database } from '@/lib/supabase/types';
import type { WorkerContext } from './worker-context';
import type { ResourceTracker } from './resource-tracker';
import type { TestInfo } from '@playwright/test';

/**
 * Sanitizes a test title for use in email addresses.
 * Converts to lowercase, replaces spaces with hyphens, removes special characters.
 */
function sanitizeTestTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove special characters
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generates a unique test email using test metadata.
 * Always includes the test title (sanitized) and parallel index for traceability.
 * All test emails start with "test+" and end with "@test.com" for easy cleanup.
 *
 * @param testInfo Playwright TestInfo object (required when called from tests)
 * @returns Unique email address with format: test+{test-title}.w{parallelIndex}.{timestamp}.{randomId}@test.com
 *
 * @example
 * ```typescript
 * test('should sign in', async ({ page }, testInfo) => {
 *   const email = generateTestEmail(testInfo);
 *   // Result: test+should-sign-in.w0.1234567890.abc123@test.com
 * });
 * ```
 */
export function generateTestEmail(testInfo: TestInfo | null): string {
  const timestamp = Date.now();
  const randomId = randomUUID().split('-')[0];

  if (testInfo) {
    // Include test title and parallel index when testInfo is available
    const parallelIndex = testInfo.parallelIndex ?? 0;
    const sanitizedTitle = sanitizeTestTitle(testInfo.title);
    // Format: test+{title}.w{index}.{timestamp}.{randomId}@test.com
    return `test+${sanitizedTitle}.w${parallelIndex}.${timestamp}.${randomId}@test.com`;
  } else {
    // Fallback for legacy usage (should be avoided)
    // Format: test+unknown.w0.{timestamp}.{randomId}@test.com
    return `test+unknown.w0.${timestamp}.${randomId}@test.com`;
  }
}

/**
 * Generates a unique organization name
 */
export function generateOrgName(prefix: string = 'Test Org'): string {
  const randomId = randomUUID().split('-')[0];
  return `${prefix}-${randomId}`;
}

/**
 * Generates a unique test group name using test metadata.
 * Always includes the test title (sanitized) and parallel index for traceability.
 *
 * @param testInfo Playwright TestInfo object (required when called from tests)
 * @param prefix Optional prefix for the group name (defaults to 'group')
 * @returns Unique group name with format: {prefix}-{test-title}.w{parallelIndex}.{timestamp}.{randomId}
 *
 * @example
 * ```typescript
 * test('should create a group', async ({ page }, testInfo) => {
 *   const groupName = generateTestGroupName(testInfo, 'Engineering');
 *   // Result: Engineering-should-create-a-group.w0.1234567890.abc123
 * });
 * ```
 */
export function generateTestGroupName(testInfo: TestInfo | null, prefix: string = 'group'): string {
  const timestamp = Date.now();
  const randomId = randomUUID().split('-')[0];

  if (testInfo) {
    const parallelIndex = testInfo.parallelIndex ?? 0;
    const sanitizedTitle = sanitizeTestTitle(testInfo.title);
    return `${prefix}-${sanitizedTitle}.w${parallelIndex}.${timestamp}.${randomId}`;
  } else {
    return `${prefix}-unknown.w0.${timestamp}.${randomId}`;
  }
}

/**
 * Generates a unique test model name using test metadata.
 * Always includes the test title (sanitized) and parallel index for traceability.
 *
 * @param testInfo Playwright TestInfo object (required when called from tests)
 * @param prefix Optional prefix for the model name (defaults to 'model')
 * @returns Unique model name with format: {prefix}-{test-title}.w{parallelIndex}.{timestamp}.{randomId}
 */
export function generateTestModelName(testInfo: TestInfo | null, prefix: string = 'model'): string {
  const timestamp = Date.now();
  const randomId = randomUUID().split('-')[0];

  if (testInfo) {
    const parallelIndex = testInfo.parallelIndex ?? 0;
    const sanitizedTitle = sanitizeTestTitle(testInfo.title);
    return `${prefix}-${sanitizedTitle}.w${parallelIndex}.${timestamp}.${randomId}`;
  } else {
    return `${prefix}-unknown.w0.${timestamp}.${randomId}`;
  }
}

/**
 * Generates a unique group role name
 */
export function generateGroupRole(prefix: string = 'test-group'): string {
  const randomId = randomUUID().split('-')[0];
  return `${prefix}-${randomId}`;
}

/**
 * User factory options
 */
export interface CreateTestUserOptions {
  email?: string;
  fullName?: string;
  avatarUrl?: string | null;
  signupComplete?: boolean;
}

/**
 * Organization factory options
 */
export interface CreateTestOrganizationOptions {
  name?: string;
  ownerId: string; // Required: who owns this org
}

/**
 * Group factory options
 */
export interface CreateTestGroupOptions {
  orgId: string; // Required
  role?: string;
  description?: string;
}

/**
 * Invite factory options
 */
export interface CreateTestInviteOptions {
  orgId: string; // Required
  inviterId: string; // Required
  inviteeEmail: string; // Required
  groupId?: string;
  message?: string | null;
}

/**
 * Model factory options
 */
export interface CreateTestModelOptions {
  orgId: string; // Required
  modelId?: string;
  niceName?: string;
  description?: string;
  endpoint?: string;
  method?: string;
  responsePath?: string;
}

/**
 * Test data created by factories
 */
export interface TestUser {
  id: string;
  email: string;
  fullName: string;
}

export interface TestOrganization {
  id: string;
  name: string;
  owner: string;
}

export interface TestGroup {
  id: string;
  orgId: string;
  role: string;
}

export interface TestInvite {
  id: string;
  orgId: string;
  inviteeEmail: string;
}

export interface TestModel {
  id: string;
  modelId: string;
  niceName: string;
  orgId: string;
}

/**
 * Creates a test user profile in the database
 * Note: This does NOT create a Supabase Auth user - only the profile
 *
 * @param options User creation options
 * @returns Created user data
 */
export async function createTestUser(options: CreateTestUserOptions = {}): Promise<TestUser> {
  const supabase = await createSupabaseTestClient();

  const userId = randomUUID();
  const email = options.email || generateTestEmail(null);
  const fullName = options.fullName || 'Test User';

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      full_name: fullName,
      avatar_url: options.avatarUrl ?? null,
      signup_complete: options.signupComplete ?? true,
    })
    .select('id, email, full_name')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test user: ${error?.message || 'No data returned'}`);
  }

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name || fullName,
  };
}

/**
 * Creates a test organization in the database
 *
 * @param options Organization creation options
 * @returns Created organization data
 */
export async function createTestOrganization(
  options: CreateTestOrganizationOptions
): Promise<TestOrganization> {
  const supabase = await createSupabaseTestClient();

  const name = options.name || generateOrgName();

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name,
      owner: options.ownerId,
    })
    .select('id, name, owner')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test organization: ${error?.message || 'No data returned'}`);
  }

  if (!data.owner) {
    throw new Error('Organization owner is required but was null');
  }

  return {
    id: data.id,
    name: data.name,
    owner: data.owner,
  };
}

/**
 * Adds a user to an organization
 *
 * @param orgId Organization ID
 * @param userId User ID
 */
export async function addUserToOrganization(orgId: string, userId: string): Promise<void> {
  const supabase = await createSupabaseTestClient();

  // Check if already in org
  const { data: existing } = await supabase
    .from('org_map')
    .select('id')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (existing) {
    return; // Already in org
  }

  const { error } = await supabase.from('org_map').insert({
    user_id: userId,
    org_id: orgId,
  });

  if (error) {
    throw new Error(`Failed to add user to organization: ${error.message}`);
  }
}

/**
 * Creates a test group in the database
 *
 * @param options Group creation options
 * @returns Created group data
 */
export async function createTestGroup(options: CreateTestGroupOptions): Promise<TestGroup> {
  const supabase = await createSupabaseTestClient();

  const role = options.role || 'member';
  const description = options.description || `Test group: ${role}`;

  const { data, error } = await supabase
    .from('groups')
    .insert({
      org_id: options.orgId,
      role,
      description,
    })
    .select('id, org_id, role')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test group: ${error?.message || 'No data returned'}`);
  }

  return {
    id: data.id,
    orgId: data.org_id,
    role: data.role,
  };
}

/**
 * Adds a user to a group
 *
 * @param groupId Group ID
 * @param userId User ID
 * @param orgId Organization ID
 */
export async function addUserToGroup(
  groupId: string,
  userId: string,
  orgId: string
): Promise<void> {
  const supabase = await createSupabaseTestClient();

  // Check if already in group
  const { data: existing } = await supabase
    .from('group_map')
    .select('id')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .maybeSingle();

  if (existing) {
    return; // Already in group
  }

  const { error } = await supabase.from('group_map').insert({
    user_id: userId,
    group_id: groupId,
    org_id: orgId,
  });

  if (error) {
    throw new Error(`Failed to add user to group: ${error.message}`);
  }
}

/**
 * Creates a test invite in the database
 *
 * @param options Invite creation options
 * @returns Created invite data
 */
export async function createTestInvite(options: CreateTestInviteOptions): Promise<TestInvite> {
  const supabase = await createSupabaseTestClient();

  let groupId = options.groupId;

  // If no group ID provided, create a default member group
  if (!groupId) {
    const group = await createTestGroup({
      orgId: options.orgId,
      role: 'member',
    });
    groupId = group.id;
  }

  const { data, error } = await supabase
    .from('invites')
    .insert({
      org_id: options.orgId,
      inviter: options.inviterId,
      invitee: options.inviteeEmail,
      group_id: groupId,
      message: options.message ?? null,
    })
    .select('id, org_id, invitee')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test invite: ${error?.message || 'No data returned'}`);
  }

  return {
    id: data.id,
    orgId: data.org_id,
    inviteeEmail: data.invitee,
  };
}

/**
 * Creates a test model in the database
 *
 * @param options Model creation options
 * @returns Created model data
 */
export async function createTestModel(options: CreateTestModelOptions): Promise<TestModel> {
  const supabase = await createSupabaseTestClient();

  const modelId = options.modelId || 'test-model-' + randomUUID().split('-')[0];
  const niceName = options.niceName || 'Test Model';

  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const defaultBodyConfig = {
    model: modelId,
    messages: [{ role: 'user', content: '{{user_message}}' }],
  };

  const { data, error } = await supabase
    .from('models')
    .insert({
      model_id: modelId,
      nice_name: niceName,
      description: options.description || `Test model: ${niceName}`,
      org_id: options.orgId,
      endpoint: options.endpoint || 'https://api.example.com/chat',
      method: options.method || 'POST',
      response_path: options.responsePath || 'choices[0].message.content',
      headers: defaultHeaders,
      body_config: defaultBodyConfig,
    })
    .select('id, model_id, nice_name, org_id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test model: ${error?.message || 'No data returned'}`);
  }

  return {
    id: data.id,
    modelId: data.model_id || '',
    niceName: data.nice_name || '',
    orgId: data.org_id,
  };
}

/**
 * Adds a model to a group
 *
 * @param modelId Model ID
 * @param groupId Group ID
 * @param orgId Organization ID
 */
export async function addModelToGroup(
  modelId: string,
  groupId: string,
  orgId: string
): Promise<void> {
  const supabase = await createSupabaseTestClient();

  // Check if already in group
  const { data: existing } = await supabase
    .from('model_map')
    .select('id')
    .eq('model_id', modelId)
    .eq('group_id', groupId)
    .maybeSingle();

  if (existing) {
    return; // Already mapped
  }

  const { error } = await supabase.from('model_map').insert({
    model_id: modelId,
    group_id: groupId,
    org_id: orgId,
  });

  if (error) {
    throw new Error(`Failed to add model to group: ${error.message}`);
  }
}

/**
 * Creates a complete test organization setup with user, org, and group
 * This is a convenience function for common test scenarios
 *
 * @returns Object with user, org, and group data
 */
export async function createCompleteTestSetup(
  options: {
    userEmail?: string;
    userName?: string;
    orgName?: string;
    groupRole?: string;
  } = {}
) {
  // Create user
  const user = await createTestUser({
    email: options.userEmail,
    fullName: options.userName,
  });

  // Create organization
  const org = await createTestOrganization({
    name: options.orgName,
    ownerId: user.id,
  });

  // Add user to organization
  await addUserToOrganization(org.id, user.id);

  // Create default group
  const group = await createTestGroup({
    orgId: org.id,
    role: options.groupRole || 'member',
  });

  // Add user to group
  await addUserToGroup(group.id, user.id, org.id);

  return {
    user,
    org,
    group,
  };
}

// ============================================================================
// WORKER-SCOPED FACTORIES (Parallel-Safe)
// ============================================================================

/**
 * Worker-scoped factory options
 */
export interface WorkerScopedUserOptions extends Omit<CreateTestUserOptions, 'email'> {
  emailSuffix?: string; // Optional suffix after worker prefix
}

export interface WorkerScopedOrganizationOptions extends Omit<
  CreateTestOrganizationOptions,
  'name'
> {
  nameSuffix?: string; // Optional suffix after worker prefix
}

export interface WorkerScopedGroupOptions extends Omit<CreateTestGroupOptions, 'role'> {
  roleSuffix?: string; // Optional suffix after worker prefix
}

export interface WorkerScopedInviteOptions extends CreateTestInviteOptions {
  // inviteeEmail will be worker-scoped automatically
}

export interface WorkerScopedModelOptions extends Omit<
  CreateTestModelOptions,
  'modelId' | 'niceName'
> {
  modelIdSuffix?: string; // Optional suffix after worker prefix
  niceNameSuffix?: string; // Optional suffix after worker prefix
}

/**
 * Creates a worker-scoped test user (parallel-safe)
 * Automatically generates worker-specific email and tracks resource
 *
 * @param ctx Worker context for unique naming
 * @param tracker Resource tracker for cleanup
 * @param options User creation options
 * @returns Created user data
 */
export async function createWorkerScopedUser(
  ctx: WorkerContext,
  tracker: ResourceTracker,
  options: WorkerScopedUserOptions = {}
): Promise<TestUser> {
  const supabase = await createSupabaseTestClient();

  const userId = randomUUID();
  const emailBase = options.emailSuffix || 'test';
  const email = ctx.generateEmail(emailBase);
  const fullName = options.fullName || `Test User (Worker ${ctx.getWorkerId()})`;

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      full_name: fullName,
      avatar_url: options.avatarUrl ?? null,
      signup_complete: options.signupComplete ?? true,
    })
    .select('id, email, full_name')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create worker-scoped user: ${error?.message || 'No data returned'}`);
  }

  // Track for cleanup
  tracker.trackProfile(data.id, data.email, {
    workerId: ctx.getWorkerId(),
    testIndex: ctx.getTestIndex(),
  });

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name || fullName,
  };
}

/**
 * Creates a worker-scoped test organization (parallel-safe)
 * Automatically generates worker-specific name and tracks resource
 *
 * @param ctx Worker context for unique naming
 * @param tracker Resource tracker for cleanup
 * @param options Organization creation options
 * @returns Created organization data
 */
export async function createWorkerScopedOrganization(
  ctx: WorkerContext,
  tracker: ResourceTracker,
  options: WorkerScopedOrganizationOptions
): Promise<TestOrganization> {
  const supabase = await createSupabaseTestClient();

  const nameBase = options.nameSuffix || 'Test Org';
  const name = ctx.generateOrgName(nameBase);

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name,
      owner: options.ownerId,
    })
    .select('id, name, owner')
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to create worker-scoped organization: ${error?.message || 'No data returned'}`
    );
  }

  if (!data.owner) {
    throw new Error('Organization owner is required but was null');
  }

  // Track for cleanup
  tracker.trackOrganization(data.id, data.name, {
    workerId: ctx.getWorkerId(),
    testIndex: ctx.getTestIndex(),
  });

  return {
    id: data.id,
    name: data.name,
    owner: data.owner,
  };
}

/**
 * Adds a user to an organization (worker-scoped version with tracking)
 */
export async function addUserToOrganizationTracked(
  orgId: string,
  userId: string,
  tracker: ResourceTracker,
  ctx: WorkerContext
): Promise<void> {
  const supabase = await createSupabaseTestClient();

  // Check if already in org
  const { data: existing } = await supabase
    .from('org_map')
    .select('id')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (existing) {
    return; // Already in org
  }

  const { error } = await supabase.from('org_map').insert({
    user_id: userId,
    org_id: orgId,
  });

  if (error) {
    throw new Error(`Failed to add user to organization: ${error.message}`);
  }

  // Track for cleanup
  tracker.trackOrgMap(userId, orgId, `${userId}-${orgId}`, {
    workerId: ctx.getWorkerId(),
    testIndex: ctx.getTestIndex(),
  });
}

/**
 * Creates a worker-scoped test group (parallel-safe)
 */
export async function createWorkerScopedGroup(
  ctx: WorkerContext,
  tracker: ResourceTracker,
  options: WorkerScopedGroupOptions
): Promise<TestGroup> {
  const supabase = await createSupabaseTestClient();

  const roleBase = options.roleSuffix || 'member';
  const role = ctx.generateGroupName(roleBase);
  const description = options.description || `Test group: ${role}`;

  const { data, error } = await supabase
    .from('groups')
    .insert({
      org_id: options.orgId,
      role,
      description,
    })
    .select('id, org_id, role')
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to create worker-scoped group: ${error?.message || 'No data returned'}`
    );
  }

  // Track for cleanup
  tracker.trackGroup(data.id, data.role, {
    workerId: ctx.getWorkerId(),
    testIndex: ctx.getTestIndex(),
  });

  return {
    id: data.id,
    orgId: data.org_id,
    role: data.role,
  };
}

/**
 * Adds a user to a group (worker-scoped version with tracking)
 */
export async function addUserToGroupTracked(
  groupId: string,
  userId: string,
  orgId: string,
  tracker: ResourceTracker,
  ctx: WorkerContext
): Promise<void> {
  const supabase = await createSupabaseTestClient();

  // Check if already in group
  const { data: existing } = await supabase
    .from('group_map')
    .select('id')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .maybeSingle();

  if (existing) {
    return; // Already in group
  }

  const { error } = await supabase.from('group_map').insert({
    user_id: userId,
    group_id: groupId,
    org_id: orgId,
  });

  if (error) {
    throw new Error(`Failed to add user to group: ${error.message}`);
  }

  // Track for cleanup
  tracker.trackGroupMap(userId, groupId, `${userId}-${groupId}`, {
    workerId: ctx.getWorkerId(),
    testIndex: ctx.getTestIndex(),
  });
}

/**
 * Creates a worker-scoped test invite (parallel-safe)
 */
export async function createWorkerScopedInvite(
  ctx: WorkerContext,
  tracker: ResourceTracker,
  options: WorkerScopedInviteOptions
): Promise<TestInvite> {
  const supabase = await createSupabaseTestClient();

  let groupId = options.groupId;

  // If no group ID provided, create a default member group
  if (!groupId) {
    const group = await createWorkerScopedGroup(ctx, tracker, {
      orgId: options.orgId,
      roleSuffix: 'member',
    });
    groupId = group.id;
  }

  const { data, error } = await supabase
    .from('invites')
    .insert({
      org_id: options.orgId,
      inviter: options.inviterId,
      invitee: options.inviteeEmail,
      group_id: groupId,
      message: options.message ?? null,
    })
    .select('id, org_id, invitee')
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to create worker-scoped invite: ${error?.message || 'No data returned'}`
    );
  }

  // Track for cleanup
  tracker.trackInvite(data.id, data.invitee, {
    workerId: ctx.getWorkerId(),
    testIndex: ctx.getTestIndex(),
  });

  return {
    id: data.id,
    orgId: data.org_id,
    inviteeEmail: data.invitee,
  };
}

/**
 * Creates a worker-scoped test model (parallel-safe)
 */
export async function createWorkerScopedModel(
  ctx: WorkerContext,
  tracker: ResourceTracker,
  options: WorkerScopedModelOptions
): Promise<TestModel> {
  const supabase = await createSupabaseTestClient();

  const modelIdBase = options.modelIdSuffix || 'test-model';
  const modelId = ctx.generateModelId(modelIdBase);

  const niceNameBase = options.niceNameSuffix || 'Test Model';
  const niceName = `${ctx.getWorkerPrefix()}-${niceNameBase}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const defaultBodyConfig = {
    model: modelId,
    messages: [{ role: 'user', content: '{{user_message}}' }],
  };

  const { data, error } = await supabase
    .from('models')
    .insert({
      model_id: modelId,
      nice_name: niceName,
      description: options.description || `Test model: ${niceName}`,
      org_id: options.orgId,
      endpoint: options.endpoint || 'https://api.example.com/chat',
      method: options.method || 'POST',
      response_path: options.responsePath || 'choices[0].message.content',
      headers: defaultHeaders,
      body_config: defaultBodyConfig,
    })
    .select('id, model_id, nice_name, org_id')
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to create worker-scoped model: ${error?.message || 'No data returned'}`
    );
  }

  // Track for cleanup
  tracker.trackModel(data.id, data.nice_name || '', {
    workerId: ctx.getWorkerId(),
    testIndex: ctx.getTestIndex(),
  });

  return {
    id: data.id,
    modelId: data.model_id || '',
    niceName: data.nice_name || '',
    orgId: data.org_id,
  };
}

/**
 * Adds a model to a group (worker-scoped version with tracking)
 */
export async function addModelToGroupTracked(
  modelId: string,
  groupId: string,
  orgId: string,
  tracker: ResourceTracker,
  ctx: WorkerContext
): Promise<void> {
  const supabase = await createSupabaseTestClient();

  // Check if already in group
  const { data: existing } = await supabase
    .from('model_map')
    .select('id')
    .eq('model_id', modelId)
    .eq('group_id', groupId)
    .maybeSingle();

  if (existing) {
    return; // Already mapped
  }

  const { error } = await supabase.from('model_map').insert({
    model_id: modelId,
    group_id: groupId,
    org_id: orgId,
  });

  if (error) {
    throw new Error(`Failed to add model to group: ${error.message}`);
  }

  // Track for cleanup
  tracker.trackModelMap(modelId, groupId, `${modelId}-${groupId}`, {
    workerId: ctx.getWorkerId(),
    testIndex: ctx.getTestIndex(),
  });
}

/**
 * Creates a complete worker-scoped test setup (parallel-safe)
 * This is a convenience function for common test scenarios
 *
 * @returns Object with user, org, and group data
 */
export async function createWorkerScopedCompleteSetup(
  ctx: WorkerContext,
  tracker: ResourceTracker,
  options: {
    userEmailSuffix?: string;
    userName?: string;
    orgNameSuffix?: string;
    groupRoleSuffix?: string;
  } = {}
) {
  // Create user
  const user = await createWorkerScopedUser(ctx, tracker, {
    emailSuffix: options.userEmailSuffix,
    fullName: options.userName,
  });

  // Create organization
  const org = await createWorkerScopedOrganization(ctx, tracker, {
    nameSuffix: options.orgNameSuffix,
    ownerId: user.id,
  });

  // Add user to organization
  await addUserToOrganizationTracked(org.id, user.id, tracker, ctx);

  // Create default group
  const group = await createWorkerScopedGroup(ctx, tracker, {
    orgId: org.id,
    roleSuffix: options.groupRoleSuffix || 'member',
  });

  // Add user to group
  await addUserToGroupTracked(group.id, user.id, org.id, tracker, ctx);

  return {
    user,
    org,
    group,
  };
}

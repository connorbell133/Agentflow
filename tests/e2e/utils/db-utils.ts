import { createSupabaseServerClient } from './supabase-test-client';
import { randomUUID } from 'crypto';

/**
 * Test Database Utilities
 *
 * Modular database helper functions for e2e tests.
 * These functions bypass the UI and work directly with the database,
 * allowing tests to focus on specific flows without testing setup steps.
 */

/**
 * Gets a user's ID from their email address.
 *
 * @param email The user's email address
 * @returns The user ID (Supabase Auth user ID stored in profiles.id)
 * @throws Error if user not found
 */
export async function getUserIdByEmail(email: string): Promise<string> {
  const supabase = await createSupabaseServerClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (error || !profile) {
    throw new Error(
      `User with email "${email}" not found in database. ` +
        `Error: ${error?.message || 'No profile returned'}`
    );
  }

  return profile.id;
}

/**
 * Gets the organization ID for a user.
 *
 * @param userId The user's ID (from profiles.id)
 * @returns The organization ID
 * @throws Error if user is not part of an organization
 */
export async function getOrgIdByUserId(userId: string): Promise<string> {
  const supabase = await createSupabaseServerClient();

  const { data: orgMap, error } = await supabase
    .from('org_map')
    .select('org_id')
    .eq('user_id', userId)
    .single();

  if (error || !orgMap) {
    throw new Error(
      `User ${userId} is not part of an organization. ` +
        `Error: ${error?.message || 'No org_map entry found'}`
    );
  }

  return orgMap.org_id;
}

/**
 * Gets or creates a group for an organization.
 *
 * @param orgId The organization ID
 * @param role The group role/name (e.g., 'member', 'admin', 'guest')
 * @returns The group ID
 * @throws Error if group cannot be found or created
 */
export async function getOrCreateGroupId(orgId: string, role: string): Promise<string> {
  const supabase = await createSupabaseServerClient();

  // Try to find existing group
  const { data: existingGroup, error: findError } = await supabase
    .from('groups')
    .select('id')
    .eq('org_id', orgId)
    .eq('role', role)
    .single();

  if (existingGroup && !findError) {
    return existingGroup.id;
  }

  // Group doesn't exist, create it
  const { data: newGroup, error: createError } = await supabase
    .from('groups')
    .insert({
      org_id: orgId,
      role: role,
      description: `Test group: ${role}`,
    })
    .select('id')
    .single();

  if (createError || !newGroup) {
    throw new Error(
      `Could not find or create group with role "${role}" for org ${orgId}. ` +
        `Error: ${createError?.message || 'No group returned'}`
    );
  }

  return newGroup.id;
}

/**
 * Gets the organization ID for a user by their email.
 * Convenience function that combines getUserIdByEmail and getOrgIdByUserId.
 *
 * @param email The user's email address
 * @returns The organization ID
 */
export async function getOrgIdByEmail(email: string): Promise<string> {
  const userId = await getUserIdByEmail(email);
  return getOrgIdByUserId(userId);
}

/**
 * Creates an invite directly in the database.
 *
 * @param inviterEmail The email of the user sending the invite (must be org owner/member)
 * @param inviteeEmail The email of the user being invited
 * @param groupName Optional group role/name (defaults to 'member')
 * @returns The created invite ID
 */
export async function createInviteInDatabase(
  inviterEmail: string,
  inviteeEmail: string,
  groupName: string = 'member'
): Promise<string> {
  const supabase = await createSupabaseServerClient();

  // Get inviter's user ID
  const inviterUserId = await getUserIdByEmail(inviterEmail);

  // Get inviter's organization ID
  const orgId = await getOrgIdByUserId(inviterUserId);

  // Get or create the group
  const groupId = await getOrCreateGroupId(orgId, groupName);

  // Create the invite
  const { data: invite, error } = await supabase
    .from('invites')
    .insert({
      org_id: orgId,
      invitee: inviteeEmail,
      inviter: inviterUserId,
      group_id: groupId,
      message: null,
    })
    .select('id')
    .single();

  if (error || !invite) {
    throw new Error(
      `Failed to create invite in database. ` + `Error: ${error?.message || 'No invite returned'}`
    );
  }

  return invite.id;
}

/**
 * Deletes an invite from the database.
 *
 * @param inviteId The invite ID to delete
 */
export async function deleteInviteFromDatabase(inviteId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('invites').delete().eq('id', inviteId);

  if (error) {
    throw new Error(
      `Failed to delete invite ${inviteId} from database. ` + `Error: ${error.message}`
    );
  }
}

/**
 * Deletes all invites for a specific invitee email.
 * Useful for test cleanup.
 *
 * @param inviteeEmail The email of the invited user
 */
export async function deleteInvitesByEmail(inviteeEmail: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('invites').delete().eq('invitee', inviteeEmail);

  if (error) {
    throw new Error(`Failed to delete invites for ${inviteeEmail}. ` + `Error: ${error.message}`);
  }
}

/**
 * Deletes a group from the database by organization ID and group name (role).
 *
 * @param orgId The organization ID
 * @param groupName The group name/role to delete
 * @throws Error if group cannot be found or deleted
 */
export async function deleteGroupFromDatabase(orgId: string, groupName: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('org_id', orgId)
    .eq('role', groupName);

  if (error) {
    throw new Error(
      `Failed to delete group "${groupName}" from org ${orgId}. ` + `Error: ${error.message}`
    );
  }
}

/**
 * Gets a group ID by organization ID and group name (role).
 *
 * @param orgId The organization ID
 * @param groupName The group name/role
 * @returns The group ID
 * @throws Error if group not found
 */
export async function getGroupIdByName(orgId: string, groupName: string): Promise<string> {
  const supabase = await createSupabaseServerClient();

  const { data: group, error } = await supabase
    .from('groups')
    .select('id')
    .eq('org_id', orgId)
    .eq('role', groupName)
    .single();

  if (error || !group) {
    throw new Error(
      `Group "${groupName}" not found in org ${orgId}. ` +
        `Error: ${error?.message || 'No group returned'}`
    );
  }

  return group.id;
}

/**
 * Adds a user to a group programmatically in the database.
 *
 * @param orgId The organization ID
 * @param userEmail The email of the user to add
 * @param groupName The group name/role
 * @throws Error if user or group not found, or if operation fails
 */
export async function addUserToGroupInDatabase(
  orgId: string,
  userEmail: string,
  groupName: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // Get user ID
  const userId = await getUserIdByEmail(userEmail);

  // Get group ID
  const groupId = await getGroupIdByName(orgId, groupName);

  // Check if user is already in the group
  const { data: existing, error: checkError } = await supabase
    .from('group_map')
    .select('id')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    throw new Error(`Failed to check group membership: ${checkError.message}`);
  }

  // If already in group, return early
  if (existing) {
    return;
  }

  // Add user to group
  const { error } = await supabase.from('group_map').insert({
    user_id: userId,
    group_id: groupId,
    org_id: orgId,
  });

  if (error) {
    throw new Error(
      `Failed to add user ${userEmail} to group "${groupName}". ` + `Error: ${error.message}`
    );
  }
}

/**
 * Removes a user from a group programmatically in the database.
 *
 * @param orgId The organization ID
 * @param userEmail The email of the user to remove
 * @param groupName The group name/role
 * @throws Error if user or group not found, or if operation fails
 */
export async function removeUserFromGroupInDatabase(
  orgId: string,
  userEmail: string,
  groupName: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // Get user ID
  const userId = await getUserIdByEmail(userEmail);

  // Get group ID
  const groupId = await getGroupIdByName(orgId, groupName);

  // Remove user from group
  const { error } = await supabase
    .from('group_map')
    .delete()
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .eq('org_id', orgId);

  if (error) {
    throw new Error(
      `Failed to remove user ${userEmail} from group "${groupName}". ` + `Error: ${error.message}`
    );
  }
}

/**
 * Gets a model ID by name (nice_name) and organization ID.
 *
 * @param orgId The organization ID
 * @param modelName The model name (nice_name)
 * @returns The model ID
 * @throws Error if model not found
 */
export async function getModelIdByName(orgId: string, modelName: string): Promise<string> {
  const supabase = await createSupabaseServerClient();

  const { data: model, error } = await supabase
    .from('models')
    .select('id')
    .eq('org_id', orgId)
    .eq('nice_name', modelName)
    .single();

  if (error || !model) {
    throw new Error(
      `Model "${modelName}" not found in org ${orgId}. ` +
        `Error: ${error?.message || 'No model returned'}`
    );
  }

  return model.id;
}

/**
 * Adds a model to a group programmatically in the database.
 *
 * @param orgId The organization ID
 * @param modelName The model name (nice_name)
 * @param groupName The group name/role
 * @throws Error if model or group not found, or if operation fails
 */
export async function addModelToGroupInDatabase(
  orgId: string,
  modelName: string,
  groupName: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // Get model ID
  const modelId = await getModelIdByName(orgId, modelName);

  // Get group ID
  const groupId = await getGroupIdByName(orgId, groupName);

  // Check if model is already in the group
  const { data: existing, error: checkError } = await supabase
    .from('model_map')
    .select('id')
    .eq('model_id', modelId)
    .eq('group_id', groupId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    throw new Error(`Failed to check model-group mapping: ${checkError.message}`);
  }

  // If already mapped, return early
  if (existing) {
    return;
  }

  // Add model to group
  const { error } = await supabase.from('model_map').insert({
    model_id: modelId,
    group_id: groupId,
    org_id: orgId,
  });

  if (error) {
    throw new Error(
      `Failed to add model "${modelName}" to group "${groupName}". ` + `Error: ${error.message}`
    );
  }
}

/**
 * Removes a model from a group programmatically in the database.
 *
 * @param orgId The organization ID
 * @param modelName The model name (nice_name)
 * @param groupName The group name/role
 * @throws Error if model or group not found, or if operation fails
 */
export async function removeModelFromGroupInDatabase(
  orgId: string,
  modelName: string,
  groupName: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // Get model ID
  const modelId = await getModelIdByName(orgId, modelName);

  // Get group ID
  const groupId = await getGroupIdByName(orgId, groupName);

  // Remove model from group
  const { error } = await supabase
    .from('model_map')
    .delete()
    .eq('model_id', modelId)
    .eq('group_id', groupId)
    .eq('org_id', orgId);

  if (error) {
    throw new Error(
      `Failed to remove model "${modelName}" from group "${groupName}". ` +
        `Error: ${error.message}`
    );
  }
}

/**
 * Creates a test user profile programmatically in the database.
 * Note: This creates a profile only - the user will NOT be able to sign in without Supabase Auth.
 * This is useful for testing admin UI functionality that doesn't require authentication.
 *
 * @param userId A unique user ID (typically a UUID)
 * @param email The user's email address (must be unique)
 * @param fullName The user's full name
 * @returns The created profile
 * @throws Error if user creation fails
 */
export async function createTestUserProfile(
  userId: string,
  email: string,
  fullName: string
): Promise<{ id: string; email: string; full_name: string | null }> {
  const supabase = await createSupabaseServerClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email: email,
      full_name: fullName,
      signup_complete: true,
      avatar_url: null,
    })
    .select('id, email, full_name')
    .single();

  if (error || !profile) {
    throw new Error(
      `Failed to create test user profile with email "${email}". ` +
        `Error: ${error?.message || 'No profile returned'}`
    );
  }

  return profile;
}

/**
 * Adds a user to an organization programmatically in the database.
 *
 * @param orgId The organization ID
 * @param userId The user ID (from profiles.id)
 * @throws Error if user is already in org or operation fails
 */
export async function addUserToOrgInDatabase(orgId: string, userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // Check if user is already in the org
  const { data: existing, error: checkError } = await supabase
    .from('org_map')
    .select('id')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    throw new Error(`Failed to check org membership: ${checkError.message}`);
  }

  // If already in org, return early
  if (existing) {
    return;
  }

  // Add user to org
  const { error } = await supabase.from('org_map').insert({
    user_id: userId,
    org_id: orgId,
  });

  if (error) {
    throw new Error(`Failed to add user ${userId} to org ${orgId}. ` + `Error: ${error.message}`);
  }
}

/**
 * Creates a test user and adds them to an organization programmatically.
 * This is a convenience function that combines createTestUserProfile and addUserToOrgInDatabase.
 *
 * @param orgId The organization ID
 * @param email The user's email address (must be unique)
 * @param fullName The user's full name
 * @returns The created user ID
 * @throws Error if user creation or org addition fails
 */
export async function createTestUserInOrg(
  orgId: string,
  email: string,
  fullName: string
): Promise<string> {
  // Generate a unique user ID using proper UUID format
  const userId = randomUUID();

  // Create the profile
  await createTestUserProfile(userId, email, fullName);

  // Add to organization
  await addUserToOrgInDatabase(orgId, userId);

  return userId;
}

/**
 * Removes a user from an organization programmatically.
 *
 * @param orgId The organization ID
 * @param userId The user ID
 * @throws Error if operation fails
 */
export async function removeUserFromOrgInDatabase(orgId: string, userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('org_map')
    .delete()
    .eq('user_id', userId)
    .eq('org_id', orgId);

  if (error) {
    throw new Error(
      `Failed to remove user ${userId} from org ${orgId}. ` + `Error: ${error.message}`
    );
  }
}

/**
 * Deletes a test user profile from the database.
 * Note: This should be called after removing the user from all orgs and groups.
 *
 * @param userId The user ID to delete
 * @throws Error if deletion fails
 */
export async function deleteTestUserProfile(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // First remove from all groups
  const { error: groupMapError } = await supabase.from('group_map').delete().eq('user_id', userId);

  if (groupMapError) {
    throw new Error(
      `Failed to remove user ${userId} from groups. ` + `Error: ${groupMapError.message}`
    );
  }

  // Remove from all orgs
  const { error: orgMapError } = await supabase.from('org_map').delete().eq('user_id', userId);

  if (orgMapError) {
    throw new Error(
      `Failed to remove user ${userId} from orgs. ` + `Error: ${orgMapError.message}`
    );
  }

  // Finally delete the profile
  const { error } = await supabase.from('profiles').delete().eq('id', userId);

  if (error) {
    throw new Error(`Failed to delete test user profile ${userId}. ` + `Error: ${error.message}`);
  }
}

/**
 * Creates a test model programmatically in the database.
 * Based on the structure from tests/data/Models Rows.sql
 *
 * @param orgId The organization ID
 * @param modelId The model identifier (e.g., 'openai-gpt-4.1')
 * @param niceName The display name for the model (e.g., 'GPT-4')
 * @param description Optional description for the model
 * @returns The created model ID
 * @throws Error if model creation fails
 */
export async function createTestModel(
  orgId: string,
  modelId: string,
  niceName: string,
  description?: string
): Promise<string> {
  const supabase = await createSupabaseServerClient();

  // Default values based on the SQL example
  const defaultEndpoint = 'https://api.openai.com/v1/chat/completions';
  const defaultMethod = 'POST';

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer {{openai_api_key}}',
  };

  const defaultBodyConfig = {
    user: '{{user_id}}',
    model: modelId,
    top_p: 1,
    stream: false,
    messages: [
      { role: 'system', content: '{{system_prompt}}' },
      { role: 'user', content: '{{user_message}}' },
    ],
    max_tokens: 4000,
    temperature: 0.7,
    presence_penalty: 0,
    frequency_penalty: 0,
  };

  const defaultMessageFormatConfig = {
    mapping: {
      role: {
        source: 'role',
        target: 'messages[{{message_index}}].role',
        transform: 'openai_role',
      },
      content: {
        source: 'content',
        target: 'messages[{{message_index}}].content',
        transform: 'none',
      },
      timestamp: {
        source: 'timestamp',
        target: 'metadata.timestamp',
        transform: 'iso8601',
      },
    },
    customFields: [
      {
        name: 'model_configuration',
        type: 'object',
        value: {
          model: modelId,
          version: 'latest',
          platform: 'openai',
          capabilities: ['text_generation', 'reasoning', 'code_generation'],
        },
      },
      {
        name: 'generation_settings',
        type: 'object',
        value: {
          top_p: 1,
          max_tokens: 4000,
          temperature: 0.7,
          presence_penalty: 0,
          frequency_penalty: 0,
        },
      },
    ],
  };

  const defaultSuggestionPrompts = [
    'Generate creative marketing copy for a new product launch',
    'Analyze complex data and provide strategic recommendations',
    'Write technical documentation for API endpoints',
    'Create personalized email templates for different customer segments',
    'Generate code solutions for specific programming challenges',
  ];

  const { data: model, error } = await supabase
    .from('models')
    .insert({
      model_id: modelId,
      nice_name: niceName,
      description: description || `Test model: ${niceName}`,
      org_id: orgId,
      endpoint: defaultEndpoint,
      method: defaultMethod,
      response_path: 'choices[0].message.content',
      headers: defaultHeaders,
      body_config: defaultBodyConfig,
      message_format_config: defaultMessageFormatConfig,
      suggestion_prompts: defaultSuggestionPrompts,
    })
    .select('id')
    .single();

  if (error || !model) {
    throw new Error(
      `Failed to create test model "${niceName}" in org ${orgId}. ` +
        `Error: ${error?.message || 'No model returned'}`
    );
  }

  return model.id;
}

/**
 * Deletes a test model from the database.
 * Note: This should be called after removing the model from all groups.
 *
 * @param modelId The model ID to delete
 * @param orgId The organization ID (for validation)
 * @throws Error if deletion fails
 */
export async function deleteTestModel(modelId: string, orgId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // First remove from all groups
  const { error: modelMapError } = await supabase
    .from('model_map')
    .delete()
    .eq('model_id', modelId)
    .eq('org_id', orgId);

  if (modelMapError) {
    throw new Error(
      `Failed to remove model ${modelId} from groups. ` + `Error: ${modelMapError.message}`
    );
  }

  // Delete the model
  const { error } = await supabase.from('models').delete().eq('id', modelId).eq('org_id', orgId);

  if (error) {
    throw new Error(`Failed to delete test model ${modelId}. ` + `Error: ${error.message}`);
  }
}

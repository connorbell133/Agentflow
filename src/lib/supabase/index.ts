/**
 * Supabase Client Exports
 *
 * Central export point for all Supabase client utilities.
 * All clients now use native Supabase Auth for RLS authentication.
 */

// Browser client with Supabase Auth (for client components)
export { createSupabaseClient, getSupabaseBrowserClient } from './client';

// Server client with Supabase Auth (for server components, actions, API routes)
export { createSupabaseServerClient, createSupabaseServerClientReadOnly } from './server';

// Admin client (for webhooks, cron jobs, admin operations)
export { getSupabaseAdminClient, createSupabaseAdminClient } from './admin';

// Types
export type {
  Database,
  Tables,
  TablesInsert as InsertTables,
  TablesUpdate as UpdateTables,
} from './types';
export type {
  Profile,
  Organization,
  OrgMap,
  Conversation,
  Message,
  Group,
  GroupMap,
  Model,
  ModelMap,
  ModelKey,
  ModelPrompt,
  Invite,
  TempOrgRequest,
  MessageFeedback,
  ProductTier,
  KeyMap,
  // Insert types
  ProfileInsert,
  OrganizationInsert,
  OrgMapInsert,
  ConversationInsert,
  MessageInsert,
  GroupInsert,
  GroupMapInsert,
  ModelInsert,
  ModelMapInsert,
  InviteInsert,
  TempOrgRequestInsert,
  MessageFeedbackInsert,
  // Update types
  ProfileUpdate,
  OrganizationUpdate,
  ConversationUpdate,
  MessageUpdate,
  GroupUpdate,
  ModelUpdate,
} from './types';

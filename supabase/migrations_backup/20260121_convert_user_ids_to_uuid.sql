-- ============================================
-- Migration: Convert user ID columns from text to uuid
-- This migration converts all user identifier columns to use
-- the native uuid type instead of text, matching Supabase Auth's auth.uid()
-- Created: 2026-01-22
-- ============================================

-- This migration must run BEFORE the RLS policy migration
-- because the RLS policies expect uuid types

-- ============================================
-- Drop ALL existing RLS policies on all tables
-- They will be recreated in the next migration with uuid types
-- ============================================

-- Drop all policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their orgs" ON profiles;

-- Drop all policies on conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
DROP POLICY IF EXISTS "Service role full access to conversations" ON conversations;

-- Drop all policies on messages
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can delete messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Service role full access to messages" ON messages;

-- Drop all policies on org_map
DROP POLICY IF EXISTS "Users can view own org memberships" ON org_map;
DROP POLICY IF EXISTS "Users can view org_map in their orgs" ON org_map;
DROP POLICY IF EXISTS "Users can join org via invite" ON org_map;
DROP POLICY IF EXISTS "Service role full access to org_map" ON org_map;

-- Drop all policies on organizations
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update organization" ON organizations;
DROP POLICY IF EXISTS "Organization owners can delete organization" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Service role full access to organizations" ON organizations;

-- Drop all policies on groups
DROP POLICY IF EXISTS "Users can view groups in their orgs" ON groups;
DROP POLICY IF EXISTS "Users can insert groups in their orgs" ON groups;
DROP POLICY IF EXISTS "Users can update groups in their orgs" ON groups;
DROP POLICY IF EXISTS "Users can delete groups in their orgs" ON groups;
DROP POLICY IF EXISTS "Service role full access to groups" ON groups;

-- Drop all policies on group_map
DROP POLICY IF EXISTS "Users can view own group memberships" ON group_map;
DROP POLICY IF EXISTS "Users can view group_map in their org" ON group_map;
DROP POLICY IF EXISTS "Org members can add users to groups" ON group_map;
DROP POLICY IF EXISTS "Org members can remove users from groups" ON group_map;
DROP POLICY IF EXISTS "Service role full access to group_map" ON group_map;

-- Drop all policies on models
DROP POLICY IF EXISTS "Users can view models in their orgs" ON models;
DROP POLICY IF EXISTS "Users can insert models in their orgs" ON models;
DROP POLICY IF EXISTS "Users can update models in their orgs" ON models;
DROP POLICY IF EXISTS "Users can delete models in their orgs" ON models;
DROP POLICY IF EXISTS "Service role full access to models" ON models;

-- Drop all policies on model_map
DROP POLICY IF EXISTS "Users can view model_map in their orgs" ON model_map;
DROP POLICY IF EXISTS "Org members can add models to groups" ON model_map;
DROP POLICY IF EXISTS "Org members can remove models from groups" ON model_map;
DROP POLICY IF EXISTS "Service role full access to model_map" ON model_map;

-- Drop all policies on model_keys
DROP POLICY IF EXISTS "Users can view model_keys in their orgs" ON model_keys;
DROP POLICY IF EXISTS "Users can insert model_keys in their orgs" ON model_keys;
DROP POLICY IF EXISTS "Users can update model_keys in their orgs" ON model_keys;
DROP POLICY IF EXISTS "Users can delete model_keys in their orgs" ON model_keys;
DROP POLICY IF EXISTS "Service role full access to model_keys" ON model_keys;

-- Drop all policies on model_prompts
DROP POLICY IF EXISTS "Users can view model_prompts in their orgs" ON model_prompts;
DROP POLICY IF EXISTS "Users can insert model_prompts in their orgs" ON model_prompts;
DROP POLICY IF EXISTS "Users can update model_prompts in their orgs" ON model_prompts;
DROP POLICY IF EXISTS "Users can delete model_prompts in their orgs" ON model_prompts;
DROP POLICY IF EXISTS "Service role full access to model_prompts" ON model_prompts;

-- Drop all policies on invites
DROP POLICY IF EXISTS "Users can view invites to them" ON invites;
DROP POLICY IF EXISTS "Users can view invites in their orgs or to them" ON invites;
DROP POLICY IF EXISTS "Users can insert invites in their orgs" ON invites;
DROP POLICY IF EXISTS "Users can update invites in their orgs" ON invites;
DROP POLICY IF EXISTS "Users can delete invites in their orgs" ON invites;
DROP POLICY IF EXISTS "Service role full access to invites" ON invites;

-- Drop all policies on message_feedback
DROP POLICY IF EXISTS "Users can view own feedback" ON message_feedback;
DROP POLICY IF EXISTS "Users can create own feedback" ON message_feedback;
DROP POLICY IF EXISTS "Users can view feedback on their messages" ON message_feedback;
DROP POLICY IF EXISTS "Users can create feedback on their messages" ON message_feedback;
DROP POLICY IF EXISTS "Service role full access to message_feedback" ON message_feedback;

-- Drop all policies on key_map
DROP POLICY IF EXISTS "Users can view own api keys" ON key_map;
DROP POLICY IF EXISTS "Service role full access to key_map" ON key_map;

-- Drop all policies on temp_org_requests
DROP POLICY IF EXISTS "Users can view own org requests" ON temp_org_requests;
DROP POLICY IF EXISTS "Users can create own org requests" ON temp_org_requests;
DROP POLICY IF EXISTS "Users can view own temp org requests" ON temp_org_requests;
DROP POLICY IF EXISTS "Users can create temp org requests" ON temp_org_requests;
DROP POLICY IF EXISTS "Service role full access to temp_org_requests" ON temp_org_requests;

-- ============================================
-- Convert profiles.id from text to uuid
-- ============================================

-- Drop dependent constraints and indexes
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;

-- Convert the column type
ALTER TABLE profiles ALTER COLUMN id TYPE uuid USING id::uuid;

-- Recreate primary key
ALTER TABLE profiles ADD PRIMARY KEY (id);

-- ============================================
-- Convert conversations.user from text to uuid
-- ============================================

ALTER TABLE conversations ALTER COLUMN "user" TYPE uuid USING "user"::uuid;

-- ============================================
-- Convert org_map.user_id from text to uuid
-- ============================================

ALTER TABLE org_map ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Add role column to org_map if it doesn't exist
ALTER TABLE org_map ADD COLUMN IF NOT EXISTS role text DEFAULT 'member' NOT NULL;

-- ============================================
-- Convert group_map.user_id from text to uuid
-- ============================================

ALTER TABLE group_map ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- ============================================
-- Convert message_feedback.user_id from text to uuid
-- ============================================

ALTER TABLE message_feedback ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- ============================================
-- Convert key_map.user from text to uuid
-- ============================================

ALTER TABLE key_map ALTER COLUMN "user" TYPE uuid USING "user"::uuid;

-- ============================================
-- Convert temp_org_requests.requester_id from text to uuid
-- ============================================

ALTER TABLE temp_org_requests ALTER COLUMN requester_id TYPE uuid USING requester_id::uuid;

-- ============================================
-- Migration complete
-- ============================================

-- All user identifier columns are now native uuid type
-- This ensures type compatibility with Supabase Auth's auth.uid()
-- and eliminates the need for type casting in RLS policies

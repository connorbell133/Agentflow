-- ============================================================================
-- AGENTFLOW DATABASE SCHEMA
-- Supabase PostgreSQL Schema - Organized Version
-- ============================================================================

-- ============================================================================
-- SECTION 1: CONFIGURATION
-- ============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';
SET default_table_access_method = "heap";


-- ============================================================================
-- SECTION 2: EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

COMMENT ON SCHEMA "public" IS 'standard public schema';


-- ============================================================================
-- SECTION 3: CUSTOM FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 User Identity Functions
-- ----------------------------------------------------------------------------

-- Get current authenticated user ID from JWT
CREATE OR REPLACE FUNCTION "public"."get_current_user_id"()
RETURNS "text"
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT auth.jwt()->>'sub'),
    (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
  );
$$;

ALTER FUNCTION "public"."get_current_user_id"() OWNER TO "postgres";


-- Get user email by ID
CREATE OR REPLACE FUNCTION "public"."get_user_email"("user_id" "text")
RETURNS "text"
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT email FROM profiles WHERE id = user_id LIMIT 1;
$$;

ALTER FUNCTION "public"."get_user_email"("user_id" "text") OWNER TO "postgres";


-- Debug function to test JWT access
CREATE OR REPLACE FUNCTION "public"."test_jwt_access"()
RETURNS json
LANGUAGE "plpgsql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  jwt_claims json;
  jwt_sub text;
  auth_jwt_result json;
BEGIN
  -- Try to get JWT claims from request settings
  BEGIN
    jwt_claims := current_setting('request.jwt.claims', true)::json;
  EXCEPTION WHEN OTHERS THEN
    jwt_claims := NULL;
  END;

  -- Try auth.jwt()
  BEGIN
    auth_jwt_result := auth.jwt();
  EXCEPTION WHEN OTHERS THEN
    auth_jwt_result := NULL;
  END;

  -- Extract sub from claims if available
  IF jwt_claims IS NOT NULL THEN
    jwt_sub := jwt_claims->>'sub';
  ELSIF auth_jwt_result IS NOT NULL THEN
    jwt_sub := auth_jwt_result->>'sub';
  ELSE
    jwt_sub := NULL;
  END IF;

  RETURN json_build_object(
    'jwt_claims', jwt_claims,
    'auth_jwt', auth_jwt_result,
    'sub', jwt_sub,
    'role', current_setting('request.jwt.claims', true)::json->>'role'
  );
END;
$$;

ALTER FUNCTION "public"."test_jwt_access"() OWNER TO "postgres";


-- ----------------------------------------------------------------------------
-- 3.2 Organization Permission Functions
-- ----------------------------------------------------------------------------

-- Check if user is organization member
CREATE OR REPLACE FUNCTION "public"."user_is_org_member"("check_user_id" "text", "check_org_id" "uuid")
RETURNS boolean
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = check_org_id
      AND org_map.user_id = check_user_id
  );
$$;

ALTER FUNCTION "public"."user_is_org_member"("check_user_id" "text", "check_org_id" "uuid") OWNER TO "postgres";


-- Check if user is organization owner
CREATE OR REPLACE FUNCTION "public"."user_is_org_owner"("check_user_id" "text", "check_org_id" "uuid")
RETURNS boolean
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organizations
    WHERE id = check_org_id AND owner = check_user_id
  );
$$;

ALTER FUNCTION "public"."user_is_org_owner"("check_user_id" "text", "check_org_id" "uuid") OWNER TO "postgres";


-- Check if owner_id owns an org that member_id belongs to
CREATE OR REPLACE FUNCTION "public"."user_owns_org_with_member"("owner_id" "text", "member_id" "text")
RETURNS boolean
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organizations o
    JOIN org_map om ON o.id = om.org_id
    WHERE o.owner = owner_id AND om.user_id = member_id
  );
$$;

ALTER FUNCTION "public"."user_owns_org_with_member"("owner_id" "text", "member_id" "text") OWNER TO "postgres";


-- ----------------------------------------------------------------------------
-- 3.3 Group Permission Functions
-- ----------------------------------------------------------------------------

-- Check if user can manage a group (is org member)
CREATE OR REPLACE FUNCTION "public"."user_can_manage_group"("check_user_id" "text", "check_group_id" "uuid")
RETURNS boolean
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM groups g
    WHERE g.id = check_group_id
      AND public.user_is_org_member(check_user_id, g.org_id)
  );
$$;

ALTER FUNCTION "public"."user_can_manage_group"("check_user_id" "text", "check_group_id" "uuid") OWNER TO "postgres";


-- Check if user has invite to a group
CREATE OR REPLACE FUNCTION "public"."user_has_invite_to_group"("user_email" "text", "check_group_id" "uuid")
RETURNS boolean
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM invites
    WHERE invites.group_id = check_group_id
      AND invites.invitee = user_email
  );
$$;

ALTER FUNCTION "public"."user_has_invite_to_group"("user_email" "text", "check_group_id" "uuid") OWNER TO "postgres";


-- Check if user has invite to an organization
CREATE OR REPLACE FUNCTION "public"."user_has_invite_to_org"("user_email" "text", "check_org_id" "uuid")
RETURNS boolean
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM invites
    WHERE invites.org_id = check_org_id
      AND invites.invitee = user_email
  );
$$;

ALTER FUNCTION "public"."user_has_invite_to_org"("user_email" "text", "check_org_id" "uuid") OWNER TO "postgres";


-- ----------------------------------------------------------------------------
-- 3.4 Model Permission Functions
-- ----------------------------------------------------------------------------

-- Check if user can manage a model
CREATE OR REPLACE FUNCTION "public"."user_can_manage_model"("check_user_id" "text", "check_model_id" "uuid")
RETURNS boolean
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM models m
    WHERE m.id = check_model_id
      AND public.user_is_org_member(check_user_id, m.org_id)
  );
$$;

ALTER FUNCTION "public"."user_can_manage_model"("check_user_id" "text", "check_model_id" "uuid") OWNER TO "postgres";


-- Check if user has model access via org membership
CREATE OR REPLACE FUNCTION "public"."user_has_model_access"("check_user_id" "text", "check_model_id" "uuid")
RETURNS boolean
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM models m
    JOIN org_map om ON om.org_id = m.org_id
    WHERE m.id = check_model_id
      AND om.user_id = check_user_id
  );
$$;

ALTER FUNCTION "public"."user_has_model_access"("check_user_id" "text", "check_model_id" "uuid") OWNER TO "postgres";


-- ----------------------------------------------------------------------------
-- 3.5 Conversation Permission Functions
-- ----------------------------------------------------------------------------

-- Check if user owns a conversation
CREATE OR REPLACE FUNCTION "public"."user_owns_conversation"("check_user_id" "text", "check_conversation_id" "uuid")
RETURNS boolean
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations
    WHERE id = check_conversation_id
      AND "user" = check_user_id
  );
$$;

ALTER FUNCTION "public"."user_owns_conversation"("check_user_id" "text", "check_conversation_id" "uuid") OWNER TO "postgres";


-- ----------------------------------------------------------------------------
-- 3.6 Trigger Functions
-- ----------------------------------------------------------------------------

-- Auto-add organization owner to org_map when org is created
CREATE OR REPLACE FUNCTION "public"."auto_add_org_owner_to_org_map"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
  INSERT INTO org_map (user_id, org_id, role)
  VALUES (NEW.owner, NEW.id, 'owner')
  ON CONFLICT (user_id, org_id) DO UPDATE
    SET role = 'owner'
    WHERE org_map.user_id = NEW.owner AND org_map.org_id = NEW.id;
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."auto_add_org_owner_to_org_map"() OWNER TO "postgres";
COMMENT ON FUNCTION "public"."auto_add_org_owner_to_org_map"() IS 'Automatically adds organization owner to org_map with role=owner when org is created';


-- Update updated_at timestamp for model_config_presets
CREATE OR REPLACE FUNCTION "public"."update_model_config_presets_updated_at"()
RETURNS "trigger"
LANGUAGE "plpgsql"
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_model_config_presets_updated_at"() OWNER TO "postgres";


-- ============================================================================
-- SECTION 4: TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 User Management Tables
-- ----------------------------------------------------------------------------

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS "public"."profiles" (
  "id" "uuid" NOT NULL,
  "full_name" "text",
  "email" "text" NOT NULL,
  "avatar_url" "text",
  "signup_complete" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT "now"(),
  "updated_at" timestamp with time zone DEFAULT "now"(),

  CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "profiles_email_key" UNIQUE ("email")
);

ALTER TABLE "public"."profiles" OWNER TO "postgres";


-- API key mappings for users
CREATE TABLE IF NOT EXISTS "public"."key_map" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "user" "uuid" NOT NULL,
  "api_key" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "requests" integer DEFAULT 0,
  "last_used" timestamp without time zone DEFAULT "now"(),

  CONSTRAINT "key_map_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."key_map" OWNER TO "postgres";


-- Product tier definitions
CREATE TABLE IF NOT EXISTS "public"."product_tiers" (
  "id" "text" NOT NULL,
  "tier_name" "text",

  CONSTRAINT "product_tiers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."product_tiers" OWNER TO "postgres";


-- ----------------------------------------------------------------------------
-- 4.2 Organization Tables
-- ----------------------------------------------------------------------------

-- Organizations (multi-tenant root entity)
CREATE TABLE IF NOT EXISTS "public"."organizations" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  "name" "text" DEFAULT 'organization'::"text",
  "owner" "uuid",
  "status" "text",

  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."organizations" OWNER TO "postgres";
COMMENT ON TABLE "public"."organizations" IS 'RLS disabled for E2E testing - re-enable for production';
COMMENT ON COLUMN "public"."organizations"."owner" IS 'Organization owner user ID (uuid type matching Supabase Auth)';


-- Organization membership mapping
CREATE TABLE IF NOT EXISTS "public"."org_map" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  "org_id" "uuid" NOT NULL,
  "user_id" "uuid" NOT NULL,
  "role" "text" DEFAULT 'member'::"text" NOT NULL,

  CONSTRAINT "org_map_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "org_map_user_org_unique" UNIQUE ("user_id", "org_id")
);

ALTER TABLE "public"."org_map" OWNER TO "postgres";
COMMENT ON CONSTRAINT "org_map_user_org_unique" ON "public"."org_map" IS 'Ensures each user has only one role per organization';


-- Temporary organization requests (for approval workflow)
CREATE TABLE IF NOT EXISTS "public"."temp_org_requests" (
  "id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  "org_name" "text" NOT NULL,
  "requester_id" "uuid" NOT NULL,
  "request_desc" "text" NOT NULL,
  "approved" boolean DEFAULT false NOT NULL,

  CONSTRAINT "temp_org_requests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."temp_org_requests" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."temp_org_requests_id_seq"
  START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE "public"."temp_org_requests_id_seq" OWNER TO "postgres";
ALTER SEQUENCE "public"."temp_org_requests_id_seq" OWNED BY "public"."temp_org_requests"."id";
ALTER TABLE ONLY "public"."temp_org_requests" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."temp_org_requests_id_seq"'::"regclass");


-- ----------------------------------------------------------------------------
-- 4.3 Group Tables
-- ----------------------------------------------------------------------------

-- Groups within organizations
CREATE TABLE IF NOT EXISTS "public"."groups" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "role" "text" DEFAULT 'guest'::"text" NOT NULL,
  "description" "text",
  "org_id" "uuid" DEFAULT 'ac676474-8216-490e-bbcf-ce6e1b07d038'::"uuid" NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"(),

  CONSTRAINT "groups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "groups_org_id_role_unique" UNIQUE ("org_id", "role")
);

ALTER TABLE "public"."groups" OWNER TO "postgres";


-- Group membership mapping
CREATE TABLE IF NOT EXISTS "public"."group_map" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "user_id" "uuid" NOT NULL,
  "group_id" "uuid" NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"(),
  "org_id" "uuid" NOT NULL,

  CONSTRAINT "group_map_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."group_map" OWNER TO "postgres";


-- Invitations to organizations and groups
CREATE TABLE IF NOT EXISTS "public"."invites" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  "org_id" "uuid" NOT NULL,
  "invitee" "text" NOT NULL,
  "inviter" "text" NOT NULL,
  "group_id" "uuid",
  "message" "text",

  CONSTRAINT "invites_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "unique_invite_per_user_org_group" UNIQUE NULLS NOT DISTINCT ("invitee", "org_id", "group_id")
);

ALTER TABLE "public"."invites" OWNER TO "postgres";


-- ----------------------------------------------------------------------------
-- 4.4 Model Tables
-- ----------------------------------------------------------------------------

-- Model configuration presets (templates)
CREATE TABLE IF NOT EXISTS "public"."model_config_presets" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "name" "text" NOT NULL,
  "description" "text",
  "category" "text" NOT NULL,
  "event_mappings" "jsonb" NOT NULL,
  "field_metadata" "jsonb",
  "is_system" boolean DEFAULT false NOT NULL,
  "org_id" "uuid",
  "created_by" "uuid",
  "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,

  CONSTRAINT "model_config_presets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "model_config_presets_category_check" CHECK (("category" = ANY (ARRAY['openai'::"text", 'anthropic'::"text", 'langchain'::"text", 'custom'::"text"])))
);

ALTER TABLE "public"."model_config_presets" OWNER TO "postgres";


-- AI Models configuration
CREATE TABLE IF NOT EXISTS "public"."models" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  "model_id" "text",
  "schema" "text",
  "description" "text",
  "nice_name" "text",
  "org_id" "uuid" NOT NULL,
  "endpoint" "text" DEFAULT ''::"text" NOT NULL,
  "method" "text" DEFAULT 'POST'::"text" NOT NULL,
  "response_path" "text",
  "headers" "jsonb",
  "body_config" "jsonb",
  "message_format_config" "jsonb" DEFAULT '{"mapping": {"role": {"source": "role", "target": "role", "transform": "none"}, "content": {"source": "content", "target": "content", "transform": "none"}}}'::"jsonb" NOT NULL,
  "suggestion_prompts" "text"[],
  "endpoint_type" "text" DEFAULT 'webhook'::"text" NOT NULL,
  "stream_config" "jsonb",
  "template_id" "uuid",
  "template_mode" "text",
  "template_modified_fields" "jsonb" DEFAULT '{}'::"jsonb",

  CONSTRAINT "models_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "models_endpoint_type_check" CHECK (("endpoint_type" = ANY (ARRAY['webhook'::"text", 'ai-sdk-stream'::"text", 'sse'::"text"]))),
  CONSTRAINT "models_template_mode_check" CHECK (("template_mode" = ANY (ARRAY['custom'::"text", 'template'::"text", 'modified'::"text"])))
);

ALTER TABLE "public"."models" OWNER TO "postgres";
COMMENT ON COLUMN "public"."models"."endpoint_type" IS 'Type of endpoint: webhook (JSON response), ai-sdk-stream (AI SDK 6 pass-through), or sse (Server-Sent Events)';
COMMENT ON COLUMN "public"."models"."stream_config" IS 'SSE stream configuration with contentPath and doneSignal for extracting content from streaming responses';
COMMENT ON COLUMN "public"."models"."template_id" IS 'Reference to the model_config_presets template used to create this model';
COMMENT ON COLUMN "public"."models"."template_mode" IS 'Mode: custom (no template), template (using template), or modified (template was customized)';
COMMENT ON COLUMN "public"."models"."template_modified_fields" IS 'JSONB object mapping field paths to boolean indicating if field was modified from template';


-- Model API keys (encrypted storage)
CREATE TABLE IF NOT EXISTS "public"."model_keys" (
  "id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  "model_id" "uuid" NOT NULL,
  "key" "text" NOT NULL,

  CONSTRAINT "model_keys_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."model_keys" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."model_keys_id_seq"
  START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE "public"."model_keys_id_seq" OWNER TO "postgres";
ALTER SEQUENCE "public"."model_keys_id_seq" OWNED BY "public"."model_keys"."id";
ALTER TABLE ONLY "public"."model_keys" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."model_keys_id_seq"'::"regclass");


-- Model-to-group access mappings
CREATE TABLE IF NOT EXISTS "public"."model_map" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "model_id" "uuid" NOT NULL,
  "group_id" "uuid" NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"(),
  "org_id" "uuid" DEFAULT '6da9a1db-2bd6-43e0-a104-fc5fde4ae50c'::"uuid" NOT NULL,

  CONSTRAINT "model_map_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."model_map" OWNER TO "postgres";


-- Model system prompts
CREATE TABLE IF NOT EXISTS "public"."model_prompts" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "model_id" "uuid" NOT NULL,
  "prompt" "text" NOT NULL,

  CONSTRAINT "model_prompts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."model_prompts" OWNER TO "postgres";


-- ----------------------------------------------------------------------------
-- 4.5 Conversation Tables
-- ----------------------------------------------------------------------------

-- Conversations
CREATE TABLE IF NOT EXISTS "public"."conversations" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  "user" "uuid" NOT NULL,
  "model" "uuid",
  "org_id" "uuid" NOT NULL,
  "title" "text" DEFAULT 'conversation'::"text" NOT NULL,

  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."conversations" OWNER TO "postgres";


-- Messages within conversations
CREATE TABLE IF NOT EXISTS "public"."messages" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  "content" "text",
  "conversation_id" "uuid" NOT NULL,
  "role" "text",
  "parts" "jsonb",
  "metadata" "jsonb",
  "ai_sdk_id" "text",

  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."messages" OWNER TO "postgres";
COMMENT ON COLUMN "public"."messages"."parts" IS 'AI SDK 6 UIMessage parts for multimodal content (text, images, etc.)';
COMMENT ON COLUMN "public"."messages"."metadata" IS 'AI SDK 6 UIMessage metadata for custom message data';
COMMENT ON COLUMN "public"."messages"."ai_sdk_id" IS 'AI SDK client-side message ID for mapping frontend IDs to database UUIDs';


-- Message feedback (thumbs up/down)
CREATE TABLE IF NOT EXISTS "public"."message_feedback" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  "message_id" "uuid" NOT NULL,
  "conversation_id" "uuid" NOT NULL,
  "model_id" "uuid" NOT NULL,
  "user_id" "uuid" NOT NULL,
  "positive" boolean,
  "comment" "text",

  CONSTRAINT "message_feedback_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."message_feedback" OWNER TO "postgres";
COMMENT ON COLUMN "public"."message_feedback"."message_id" IS 'References messages.id but not enforced via FK - resolved dynamically via ai_sdk_id mapping';


-- ============================================================================
-- SECTION 5: INDEXES
-- ============================================================================

CREATE INDEX "idx_messages_ai_sdk_id" ON "public"."messages" USING "btree" ("ai_sdk_id");
CREATE INDEX "idx_model_config_presets_category" ON "public"."model_config_presets" USING "btree" ("category");
CREATE INDEX "idx_model_config_presets_is_system" ON "public"."model_config_presets" USING "btree" ("is_system");
CREATE INDEX "idx_model_config_presets_org_id" ON "public"."model_config_presets" USING "btree" ("org_id");
CREATE INDEX "idx_models_template_id" ON "public"."models" USING "btree" ("template_id");


-- ============================================================================
-- SECTION 6: TRIGGERS
-- ============================================================================

CREATE OR REPLACE TRIGGER "trigger_auto_add_org_owner"
  AFTER INSERT ON "public"."organizations"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."auto_add_org_owner_to_org_map"();

CREATE OR REPLACE TRIGGER "update_model_config_presets_updated_at"
  BEFORE UPDATE ON "public"."model_config_presets"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."update_model_config_presets_updated_at"();


-- ============================================================================
-- SECTION 7: FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 7.1 Organization Foreign Keys
-- ----------------------------------------------------------------------------

ALTER TABLE ONLY "public"."org_map"
  ADD CONSTRAINT "org_map_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");


-- ----------------------------------------------------------------------------
-- 7.2 Group Foreign Keys
-- ----------------------------------------------------------------------------

ALTER TABLE ONLY "public"."group_map"
  ADD CONSTRAINT "group_map2_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id");

ALTER TABLE ONLY "public"."group_map"
  ADD CONSTRAINT "group_map_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");


-- ----------------------------------------------------------------------------
-- 7.3 Model Foreign Keys
-- ----------------------------------------------------------------------------

ALTER TABLE ONLY "public"."model_config_presets"
  ADD CONSTRAINT "model_config_presets_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."model_config_presets"
  ADD CONSTRAINT "model_config_presets_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."models"
  ADD CONSTRAINT "models_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "public"."model_config_presets"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."model_keys"
  ADD CONSTRAINT "model_keys_model_id_fkey"
  FOREIGN KEY ("model_id") REFERENCES "public"."models"("id");

ALTER TABLE ONLY "public"."model_map"
  ADD CONSTRAINT "model_map2_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id");

ALTER TABLE ONLY "public"."model_map"
  ADD CONSTRAINT "model_map2_model_id_fkey"
  FOREIGN KEY ("model_id") REFERENCES "public"."models"("id");

ALTER TABLE ONLY "public"."model_map"
  ADD CONSTRAINT "model_map_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."model_prompts"
  ADD CONSTRAINT "model_prompts_model_id_fkey"
  FOREIGN KEY ("model_id") REFERENCES "public"."models"("id");


-- ----------------------------------------------------------------------------
-- 7.4 Conversation Foreign Keys
-- ----------------------------------------------------------------------------

ALTER TABLE ONLY "public"."conversations"
  ADD CONSTRAINT "conversations_model_fkey"
  FOREIGN KEY ("model") REFERENCES "public"."models"("id");

ALTER TABLE ONLY "public"."conversations"
  ADD CONSTRAINT "conversations_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."messages"
  ADD CONSTRAINT "messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."message_feedback"
  ADD CONSTRAINT "message_feedback_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."message_feedback"
  ADD CONSTRAINT "message_feedback_model_id_fkey"
  FOREIGN KEY ("model_id") REFERENCES "public"."models"("id");


-- ============================================================================
-- SECTION 8: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE "public"."key_map" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."message_feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."model_config_presets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."model_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."model_prompts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."temp_org_requests" ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- 8.1 Service Role Bypass Policies (Full Access)
-- ----------------------------------------------------------------------------

CREATE POLICY "Service role bypass for organizations"
  ON "public"."organizations" TO "service_role"
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to conversations"
  ON "public"."conversations" TO "service_role"
  USING (true);

CREATE POLICY "Service role full access to group_map"
  ON "public"."group_map" TO "service_role"
  USING (true);

CREATE POLICY "Service role full access to groups"
  ON "public"."groups" TO "service_role"
  USING (true);

CREATE POLICY "Service role full access to invites"
  ON "public"."invites" TO "service_role"
  USING (true);

CREATE POLICY "Service role full access to key_map"
  ON "public"."key_map" TO "service_role"
  USING (true);

CREATE POLICY "Service role full access to message_feedback"
  ON "public"."message_feedback" TO "service_role"
  USING (true);

CREATE POLICY "Service role full access to messages"
  ON "public"."messages" TO "service_role"
  USING (true);

CREATE POLICY "Service role full access to model_keys"
  ON "public"."model_keys" TO "service_role"
  USING (true);

CREATE POLICY "Service role full access to model_map"
  ON "public"."model_map" TO "service_role"
  USING (true);

CREATE POLICY "Service role full access to model_prompts"
  ON "public"."model_prompts" TO "service_role"
  USING (true);

CREATE POLICY "Service role full access to models"
  ON "public"."models" TO "service_role"
  USING (true);

CREATE POLICY "Service role full access to org_map"
  ON "public"."org_map" TO "service_role"
  USING (true);

CREATE POLICY "Service role full access to profiles"
  ON "public"."profiles" TO "service_role"
  USING (true);

CREATE POLICY "Service role full access to temp_org_requests"
  ON "public"."temp_org_requests" TO "service_role"
  USING (true);


-- ----------------------------------------------------------------------------
-- 8.2 Organization Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can create organizations"
  ON "public"."organizations" FOR INSERT TO "authenticated"
  WITH CHECK (true);

CREATE POLICY "Users can view organizations they belong to"
  ON "public"."organizations" FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."org_map"
    WHERE "org_map"."org_id" = "organizations"."id"
      AND "org_map"."user_id" = "auth"."uid"()
  ));

CREATE POLICY "Organization owners can update organization"
  ON "public"."organizations" FOR UPDATE TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."org_map"
    WHERE "org_map"."org_id" = "organizations"."id"
      AND "org_map"."user_id" = "auth"."uid"()
      AND "org_map"."role" = 'owner'::"text"
  ));

CREATE POLICY "Organization owners can delete organization"
  ON "public"."organizations" FOR DELETE TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."org_map"
    WHERE "org_map"."org_id" = "organizations"."id"
      AND "org_map"."user_id" = "auth"."uid"()
      AND "org_map"."role" = 'owner'::"text"
  ));


-- ----------------------------------------------------------------------------
-- 8.3 Organization Mapping Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can create organization mappings"
  ON "public"."org_map" FOR INSERT TO "authenticated"
  WITH CHECK ("user_id" = "auth"."uid"());

CREATE POLICY "Users can view own organization mappings"
  ON "public"."org_map" FOR SELECT TO "authenticated"
  USING ("user_id" = "auth"."uid"());

CREATE POLICY "Organization owners can delete mappings"
  ON "public"."org_map" FOR DELETE TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."org_map" "owner_check"
    WHERE "owner_check"."org_id" = "org_map"."org_id"
      AND "owner_check"."user_id" = "auth"."uid"()
      AND "owner_check"."role" = 'owner'::"text"
  ));


-- ----------------------------------------------------------------------------
-- 8.4 Group Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view groups in their organization"
  ON "public"."groups" FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."org_map"
    WHERE "org_map"."org_id" = "groups"."org_id"
      AND "org_map"."user_id" = "auth"."uid"()
  ));

CREATE POLICY "Organization owners can create groups"
  ON "public"."groups" FOR INSERT TO "authenticated"
  WITH CHECK (EXISTS (
    SELECT 1 FROM "public"."org_map"
    WHERE "org_map"."org_id" = "groups"."org_id"
      AND "org_map"."user_id" = "auth"."uid"()
      AND "org_map"."role" = 'owner'::"text"
  ));

CREATE POLICY "Organization owners can update groups"
  ON "public"."groups" FOR UPDATE TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."org_map"
    WHERE "org_map"."org_id" = "groups"."org_id"
      AND "org_map"."user_id" = "auth"."uid"()
      AND "org_map"."role" = 'owner'::"text"
  ));

CREATE POLICY "Organization owners can delete groups"
  ON "public"."groups" FOR DELETE TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."org_map"
    WHERE "org_map"."org_id" = "groups"."org_id"
      AND "org_map"."user_id" = "auth"."uid"()
      AND "org_map"."role" = 'owner'::"text"
  ));


-- ----------------------------------------------------------------------------
-- 8.5 Group Mapping Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view own group mappings"
  ON "public"."group_map" FOR SELECT TO "authenticated"
  USING ("user_id" = "auth"."uid"());

CREATE POLICY "Organization owners can manage group mappings"
  ON "public"."group_map" TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."groups"
    JOIN "public"."org_map" ON "org_map"."org_id" = "groups"."org_id"
    WHERE "groups"."id" = "group_map"."group_id"
      AND "org_map"."user_id" = "auth"."uid"()
      AND "org_map"."role" = 'owner'::"text"
  ));


-- ----------------------------------------------------------------------------
-- 8.6 Invite Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view invites to their organization"
  ON "public"."invites" FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."org_map"
    WHERE "org_map"."org_id" = "invites"."org_id"
      AND "org_map"."user_id" = "auth"."uid"()
  ));

CREATE POLICY "Organization owners can create invites"
  ON "public"."invites" FOR INSERT TO "authenticated"
  WITH CHECK (EXISTS (
    SELECT 1 FROM "public"."org_map"
    WHERE "org_map"."org_id" = "invites"."org_id"
      AND "org_map"."user_id" = "auth"."uid"()
      AND "org_map"."role" = 'owner'::"text"
  ));

CREATE POLICY "Organization owners can delete invites"
  ON "public"."invites" FOR DELETE TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."org_map"
    WHERE "org_map"."org_id" = "invites"."org_id"
      AND "org_map"."user_id" = "auth"."uid"()
      AND "org_map"."role" = 'owner'::"text"
  ));


-- ----------------------------------------------------------------------------
-- 8.7 Model Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view models in their organization"
  ON "public"."models" FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."org_map"
    WHERE "org_map"."org_id" = "models"."org_id"
      AND "org_map"."user_id" = "auth"."uid"()
  ));

CREATE POLICY "Organization owners can create models"
  ON "public"."models" FOR INSERT TO "authenticated"
  WITH CHECK (EXISTS (
    SELECT 1 FROM "public"."org_map"
    WHERE "org_map"."org_id" = "models"."org_id"
      AND "org_map"."user_id" = "auth"."uid"()
      AND "org_map"."role" = 'owner'::"text"
  ));

CREATE POLICY "Organization owners can update models"
  ON "public"."models" FOR UPDATE TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."org_map"
    WHERE "org_map"."org_id" = "models"."org_id"
      AND "org_map"."user_id" = "auth"."uid"()
      AND "org_map"."role" = 'owner'::"text"
  ));

CREATE POLICY "Organization owners can delete models"
  ON "public"."models" FOR DELETE TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."org_map"
    WHERE "org_map"."org_id" = "models"."org_id"
      AND "org_map"."user_id" = "auth"."uid"()
      AND "org_map"."role" = 'owner'::"text"
  ));


-- ----------------------------------------------------------------------------
-- 8.8 Model Config Presets Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "System presets are visible to all authenticated users"
  ON "public"."model_config_presets" FOR SELECT
  USING ("is_system" = true AND "auth"."uid"() IS NOT NULL);

CREATE POLICY "Organization presets are visible to org members"
  ON "public"."model_config_presets" FOR SELECT
  USING ("is_system" = false AND "org_id" IN (
    SELECT "org_map"."org_id" FROM "public"."org_map"
    WHERE "org_map"."user_id" = "auth"."uid"()
  ));

CREATE POLICY "Users can create organization presets"
  ON "public"."model_config_presets" FOR INSERT
  WITH CHECK ("is_system" = false AND "org_id" IN (
    SELECT "org_map"."org_id" FROM "public"."org_map"
    WHERE "org_map"."user_id" = "auth"."uid"()
  ));

CREATE POLICY "Users can update organization presets"
  ON "public"."model_config_presets" FOR UPDATE
  USING ("is_system" = false AND "org_id" IN (
    SELECT "org_map"."org_id" FROM "public"."org_map"
    WHERE "org_map"."user_id" = "auth"."uid"()
  ));

CREATE POLICY "Users can delete organization presets"
  ON "public"."model_config_presets" FOR DELETE
  USING ("is_system" = false AND "org_id" IN (
    SELECT "org_map"."org_id" FROM "public"."org_map"
    WHERE "org_map"."user_id" = "auth"."uid"()
  ));


-- ----------------------------------------------------------------------------
-- 8.9 Model Keys Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view model keys in their organization"
  ON "public"."model_keys" FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."models"
    JOIN "public"."org_map" ON "org_map"."org_id" = "models"."org_id"
    WHERE "models"."id" = "model_keys"."model_id"
      AND "org_map"."user_id" = "auth"."uid"()
  ));

CREATE POLICY "Organization owners can manage model keys"
  ON "public"."model_keys" TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."models"
    JOIN "public"."org_map" ON "org_map"."org_id" = "models"."org_id"
    WHERE "models"."id" = "model_keys"."model_id"
      AND "org_map"."user_id" = "auth"."uid"()
      AND "org_map"."role" = 'owner'::"text"
  ));


-- ----------------------------------------------------------------------------
-- 8.10 Model Map Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view model mappings in their groups"
  ON "public"."model_map" FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."group_map"
    WHERE "group_map"."group_id" = "model_map"."group_id"
      AND "group_map"."user_id" = "auth"."uid"()
  ));

CREATE POLICY "Organization owners can manage model mappings"
  ON "public"."model_map" TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."groups"
    JOIN "public"."org_map" ON "org_map"."org_id" = "groups"."org_id"
    WHERE "groups"."id" = "model_map"."group_id"
      AND "org_map"."user_id" = "auth"."uid"()
      AND "org_map"."role" = 'owner'::"text"
  ));


-- ----------------------------------------------------------------------------
-- 8.11 Model Prompts Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view model prompts in their organization"
  ON "public"."model_prompts" FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."models"
    JOIN "public"."org_map" ON "org_map"."org_id" = "models"."org_id"
    WHERE "models"."id" = "model_prompts"."model_id"
      AND "org_map"."user_id" = "auth"."uid"()
  ));

CREATE POLICY "Organization owners can manage model prompts"
  ON "public"."model_prompts" TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."models"
    JOIN "public"."org_map" ON "org_map"."org_id" = "models"."org_id"
    WHERE "models"."id" = "model_prompts"."model_id"
      AND "org_map"."user_id" = "auth"."uid"()
      AND "org_map"."role" = 'owner'::"text"
  ));


-- ----------------------------------------------------------------------------
-- 8.12 Conversation Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can create own conversations"
  ON "public"."conversations" FOR INSERT TO "authenticated"
  WITH CHECK ("auth"."uid"() = "user");

CREATE POLICY "Users can view own conversations"
  ON "public"."conversations" FOR SELECT TO "authenticated"
  USING ("auth"."uid"() = "user");

CREATE POLICY "Users can update own conversations"
  ON "public"."conversations" FOR UPDATE TO "authenticated"
  USING ("auth"."uid"() = "user");

CREATE POLICY "Users can delete own conversations"
  ON "public"."conversations" FOR DELETE TO "authenticated"
  USING ("auth"."uid"() = "user");


-- ----------------------------------------------------------------------------
-- 8.13 Message Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view messages in own conversations"
  ON "public"."messages" FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."conversations"
    WHERE "conversations"."id" = "messages"."conversation_id"
      AND "conversations"."user" = "auth"."uid"()
  ));

CREATE POLICY "Users can create messages in own conversations"
  ON "public"."messages" FOR INSERT TO "authenticated"
  WITH CHECK (EXISTS (
    SELECT 1 FROM "public"."conversations"
    WHERE "conversations"."id" = "messages"."conversation_id"
      AND "conversations"."user" = "auth"."uid"()
  ));

CREATE POLICY "Users can update messages in own conversations"
  ON "public"."messages" FOR UPDATE TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."conversations"
    WHERE "conversations"."id" = "messages"."conversation_id"
      AND "conversations"."user" = "auth"."uid"()
  ));

CREATE POLICY "Users can delete messages in own conversations"
  ON "public"."messages" FOR DELETE TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."conversations"
    WHERE "conversations"."id" = "messages"."conversation_id"
      AND "conversations"."user" = "auth"."uid"()
  ));


-- ----------------------------------------------------------------------------
-- 8.14 Message Feedback Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view feedback on their messages"
  ON "public"."message_feedback" FOR SELECT TO "authenticated"
  USING (EXISTS (
    SELECT 1 FROM "public"."messages"
    JOIN "public"."conversations" ON "conversations"."id" = "messages"."conversation_id"
    WHERE "messages"."id" = "message_feedback"."message_id"
      AND "conversations"."user" = "auth"."uid"()
  ));

CREATE POLICY "Users can create feedback on their messages"
  ON "public"."message_feedback" FOR INSERT TO "authenticated"
  WITH CHECK (EXISTS (
    SELECT 1 FROM "public"."messages"
    JOIN "public"."conversations" ON "conversations"."id" = "messages"."conversation_id"
    WHERE "messages"."id" = "message_feedback"."message_id"
      AND "conversations"."user" = "auth"."uid"()
  ));


-- ----------------------------------------------------------------------------
-- 8.15 Profile Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view own profile"
  ON "public"."profiles" FOR SELECT TO "authenticated"
  USING ("auth"."uid"() = "id");

CREATE POLICY "Users can update own profile"
  ON "public"."profiles" FOR UPDATE TO "authenticated"
  USING ("auth"."uid"() = "id");


-- ----------------------------------------------------------------------------
-- 8.16 Key Map Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view own api keys"
  ON "public"."key_map" FOR SELECT TO "authenticated"
  USING ("auth"."uid"() = "user");


-- ----------------------------------------------------------------------------
-- 8.17 Temp Org Requests Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can create temp org requests"
  ON "public"."temp_org_requests" FOR INSERT TO "authenticated"
  WITH CHECK ("requester_id" = "auth"."uid"());

CREATE POLICY "Users can view own temp org requests"
  ON "public"."temp_org_requests" FOR SELECT TO "authenticated"
  USING ("requester_id" = "auth"."uid"());


-- ============================================================================
-- SECTION 9: GRANTS
-- ============================================================================

-- Schema grants
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

-- Function grants
GRANT ALL ON FUNCTION "public"."auto_add_org_owner_to_org_map"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_add_org_owner_to_org_map"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_add_org_owner_to_org_map"() TO "service_role";

GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "service_role";

GRANT ALL ON FUNCTION "public"."get_user_email"("user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_email"("user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_email"("user_id" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."test_jwt_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_jwt_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_jwt_access"() TO "service_role";

GRANT ALL ON FUNCTION "public"."update_model_config_presets_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_model_config_presets_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_model_config_presets_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."user_can_manage_group"("check_user_id" "text", "check_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_manage_group"("check_user_id" "text", "check_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_manage_group"("check_user_id" "text", "check_group_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."user_can_manage_model"("check_user_id" "text", "check_model_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_manage_model"("check_user_id" "text", "check_model_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_manage_model"("check_user_id" "text", "check_model_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."user_has_invite_to_group"("user_email" "text", "check_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_invite_to_group"("user_email" "text", "check_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_invite_to_group"("user_email" "text", "check_group_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."user_has_invite_to_org"("user_email" "text", "check_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_invite_to_org"("user_email" "text", "check_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_invite_to_org"("user_email" "text", "check_org_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."user_has_model_access"("check_user_id" "text", "check_model_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_model_access"("check_user_id" "text", "check_model_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_model_access"("check_user_id" "text", "check_model_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."user_is_org_member"("check_user_id" "text", "check_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_org_member"("check_user_id" "text", "check_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_org_member"("check_user_id" "text", "check_org_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."user_is_org_owner"("check_user_id" "text", "check_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_org_owner"("check_user_id" "text", "check_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_org_owner"("check_user_id" "text", "check_org_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."user_owns_conversation"("check_user_id" "text", "check_conversation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_owns_conversation"("check_user_id" "text", "check_conversation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_owns_conversation"("check_user_id" "text", "check_conversation_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."user_owns_org_with_member"("owner_id" "text", "member_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_owns_org_with_member"("owner_id" "text", "member_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_owns_org_with_member"("owner_id" "text", "member_id" "text") TO "service_role";

-- Table grants
GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";

GRANT ALL ON TABLE "public"."group_map" TO "anon";
GRANT ALL ON TABLE "public"."group_map" TO "authenticated";
GRANT ALL ON TABLE "public"."group_map" TO "service_role";

GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";

GRANT ALL ON TABLE "public"."invites" TO "anon";
GRANT ALL ON TABLE "public"."invites" TO "authenticated";
GRANT ALL ON TABLE "public"."invites" TO "service_role";

GRANT ALL ON TABLE "public"."key_map" TO "anon";
GRANT ALL ON TABLE "public"."key_map" TO "authenticated";
GRANT ALL ON TABLE "public"."key_map" TO "service_role";

GRANT ALL ON TABLE "public"."message_feedback" TO "anon";
GRANT ALL ON TABLE "public"."message_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."message_feedback" TO "service_role";

GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";

GRANT ALL ON TABLE "public"."model_config_presets" TO "anon";
GRANT ALL ON TABLE "public"."model_config_presets" TO "authenticated";
GRANT ALL ON TABLE "public"."model_config_presets" TO "service_role";

GRANT ALL ON TABLE "public"."model_keys" TO "anon";
GRANT ALL ON TABLE "public"."model_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."model_keys" TO "service_role";

GRANT ALL ON SEQUENCE "public"."model_keys_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."model_keys_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."model_keys_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."model_map" TO "anon";
GRANT ALL ON TABLE "public"."model_map" TO "authenticated";
GRANT ALL ON TABLE "public"."model_map" TO "service_role";

GRANT ALL ON TABLE "public"."model_prompts" TO "anon";
GRANT ALL ON TABLE "public"."model_prompts" TO "authenticated";
GRANT ALL ON TABLE "public"."model_prompts" TO "service_role";

GRANT ALL ON TABLE "public"."models" TO "anon";
GRANT ALL ON TABLE "public"."models" TO "authenticated";
GRANT ALL ON TABLE "public"."models" TO "service_role";

GRANT ALL ON TABLE "public"."org_map" TO "anon";
GRANT ALL ON TABLE "public"."org_map" TO "authenticated";
GRANT ALL ON TABLE "public"."org_map" TO "service_role";

GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";

GRANT ALL ON TABLE "public"."product_tiers" TO "anon";
GRANT ALL ON TABLE "public"."product_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."product_tiers" TO "service_role";

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";

GRANT ALL ON TABLE "public"."temp_org_requests" TO "anon";
GRANT ALL ON TABLE "public"."temp_org_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."temp_org_requests" TO "service_role";

GRANT ALL ON SEQUENCE "public"."temp_org_requests_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."temp_org_requests_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."temp_org_requests_id_seq" TO "service_role";


-- Default privileges
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


-- Realtime publication
ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

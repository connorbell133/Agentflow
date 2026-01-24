

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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user" "text" NOT NULL,
    "model" "uuid",
    "org_id" "uuid" NOT NULL,
    "title" "text" DEFAULT 'conversation'::"text" NOT NULL
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_map" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "group_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "org_id" "uuid" NOT NULL
);


ALTER TABLE "public"."group_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" "text" DEFAULT 'guest'::"text" NOT NULL,
    "description" "text",
    "org_id" "uuid" DEFAULT 'ac676474-8216-490e-bbcf-ce6e1b07d038'::"uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "invitee" "text" NOT NULL,
    "inviter" "text" NOT NULL,
    "group_id" "uuid",
    "message" "text"
);


ALTER TABLE "public"."invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."key_map" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user" "text" NOT NULL,
    "api_key" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requests" integer DEFAULT 0,
    "last_used" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."key_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "model_id" "uuid" NOT NULL,
    "user_id" "text" NOT NULL,
    "positive" boolean,
    "comment" "text"
);


ALTER TABLE "public"."message_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "text",
    "conversation_id" "uuid" NOT NULL,
    "role" "text"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."model_keys" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "model_id" "uuid" NOT NULL,
    "key" "text" NOT NULL
);


ALTER TABLE "public"."model_keys" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."model_keys_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."model_keys_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."model_keys_id_seq" OWNED BY "public"."model_keys"."id";



CREATE TABLE IF NOT EXISTS "public"."model_map" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "model_id" "uuid" NOT NULL,
    "group_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "org_id" "uuid" DEFAULT '6da9a1db-2bd6-43e0-a104-fc5fde4ae50c'::"uuid" NOT NULL
);


ALTER TABLE "public"."model_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."model_prompts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "model_id" "uuid" NOT NULL,
    "prompt" "text" NOT NULL
);


ALTER TABLE "public"."model_prompts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."models" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "model_id" "text",
    "schema" "text",
    "description" "text",
    "nice_name" "text",
    "org_id" "uuid" NOT NULL,
    "endpoint" "text" DEFAULT ''::text NOT NULL,
    "method" "text" DEFAULT 'POST'::text NOT NULL,
    "response_path" "text",
    "headers" "jsonb",
    "body_config" "jsonb",
    "message_format_config" "jsonb" DEFAULT '{"mapping": {"role": {"source": "role", "target": "role", "transform": "none"}, "content": {"source": "content", "target": "content", "transform": "none"}}}'::"jsonb" NOT NULL,
    "suggestion_prompts" "text"[]
);


ALTER TABLE "public"."models" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_map" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "text" NOT NULL
);


ALTER TABLE "public"."org_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" DEFAULT 'organization'::"text",
    "owner" "text",
    "status" "text"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_tiers" (
    "id" "text" NOT NULL,
    "tier_name" "text"
);


ALTER TABLE "public"."product_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "text" NOT NULL,
    "full_name" "text",
    "email" "text" NOT NULL,
    "avatar_url" "text",
    "signup_complete" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."temp_org_requests" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_name" "text" NOT NULL,
    "requester_id" "text" NOT NULL,
    "request_desc" "text" NOT NULL,
    "approved" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."temp_org_requests" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."temp_org_requests_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."temp_org_requests_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."temp_org_requests_id_seq" OWNED BY "public"."temp_org_requests"."id";



ALTER TABLE ONLY "public"."model_keys" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."model_keys_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."temp_org_requests" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."temp_org_requests_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_map"
    ADD CONSTRAINT "group_map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."key_map"
    ADD CONSTRAINT "key_map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_feedback"
    ADD CONSTRAINT "message_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."model_keys"
    ADD CONSTRAINT "model_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."model_map"
    ADD CONSTRAINT "model_map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."model_prompts"
    ADD CONSTRAINT "model_prompts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."models"
    ADD CONSTRAINT "models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_map"
    ADD CONSTRAINT "org_map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_tiers"
    ADD CONSTRAINT "product_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."temp_org_requests"
    ADD CONSTRAINT "temp_org_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_model_fkey" FOREIGN KEY ("model") REFERENCES "public"."models"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."group_map"
    ADD CONSTRAINT "group_map2_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id");



ALTER TABLE ONLY "public"."group_map"
    ADD CONSTRAINT "group_map_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."group_map"
    ADD CONSTRAINT "group_map_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."message_feedback"
    ADD CONSTRAINT "message_feedback_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_feedback"
    ADD CONSTRAINT "message_feedback_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_feedback"
    ADD CONSTRAINT "message_feedback_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id");



ALTER TABLE ONLY "public"."message_feedback"
    ADD CONSTRAINT "message_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."model_keys"
    ADD CONSTRAINT "model_keys_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id");



ALTER TABLE ONLY "public"."model_map"
    ADD CONSTRAINT "model_map2_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id");



ALTER TABLE ONLY "public"."model_map"
    ADD CONSTRAINT "model_map2_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id");



ALTER TABLE ONLY "public"."model_map"
    ADD CONSTRAINT "model_map_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."model_prompts"
    ADD CONSTRAINT "model_prompts_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id");



ALTER TABLE ONLY "public"."org_map"
    ADD CONSTRAINT "org_map_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."org_map"
    ADD CONSTRAINT "org_map_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_owner_fkey" FOREIGN KEY ("owner") REFERENCES "public"."profiles"("id");





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































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






























RESET ALL;

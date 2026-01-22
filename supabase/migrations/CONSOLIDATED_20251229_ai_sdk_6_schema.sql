-- ============================================
-- CONSOLIDATED MIGRATION: AI SDK 6 Schema Changes
-- ============================================
-- This migration consolidates the following migrations:
--   - 20251229003000_add_ai_sdk_6_fields_to_models.sql
--   - 20251229003400_add_messages_ai_sdk_columns.sql
--   - 20251229005000_remove_message_feedback_fkey.sql
--
-- Adds support for AI SDK 6 features:
--   - Multiple endpoint types (webhook, ai-sdk-stream, sse)
--   - SSE stream configuration
--   - Multimodal message parts
--   - Message metadata
--   - AI SDK client ID mapping
-- ============================================

-- ============================================
-- Models table: Add AI SDK 6 endpoint configuration
-- ============================================

-- Add endpoint_type column (defaults to 'webhook' for backward compatibility)
ALTER TABLE models
ADD COLUMN IF NOT EXISTS endpoint_type text NOT NULL DEFAULT 'webhook';

-- Add stream_config column for SSE configuration
ALTER TABLE models
ADD COLUMN IF NOT EXISTS stream_config jsonb;

-- Add check constraint to ensure endpoint_type is valid
ALTER TABLE models
DROP CONSTRAINT IF EXISTS models_endpoint_type_check;

ALTER TABLE models
ADD CONSTRAINT models_endpoint_type_check
CHECK (endpoint_type IN ('webhook', 'ai-sdk-stream', 'sse'));

-- Add documentation comments
COMMENT ON COLUMN models.endpoint_type IS 'Type of endpoint: webhook (JSON response), ai-sdk-stream (AI SDK 6 pass-through), or sse (Server-Sent Events)';
COMMENT ON COLUMN models.stream_config IS 'SSE stream configuration with contentPath and doneSignal for extracting content from streaming responses';

-- ============================================
-- Messages table: Add AI SDK 6 compatibility columns
-- ============================================

-- Add parts column for multimodal content
ALTER TABLE messages ADD COLUMN IF NOT EXISTS parts jsonb;

-- Add metadata column for additional message data
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Add ai_sdk_id column to map AI SDK client-side IDs to database UUIDs
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_sdk_id text;

-- Create index for fast lookups by AI SDK ID
CREATE INDEX IF NOT EXISTS idx_messages_ai_sdk_id ON messages(ai_sdk_id);

-- Add documentation comments
COMMENT ON COLUMN messages.parts IS 'AI SDK 6 UIMessage parts for multimodal content (text, images, etc.)';
COMMENT ON COLUMN messages.metadata IS 'AI SDK 6 UIMessage metadata for custom message data';
COMMENT ON COLUMN messages.ai_sdk_id IS 'AI SDK client-side message ID for mapping frontend IDs to database UUIDs';

-- ============================================
-- Message Feedback: Remove foreign key constraint
-- ============================================
-- The message_id is resolved via ai_sdk_id lookup, not a direct foreign key
-- This allows for more flexible message ID mapping in AI SDK 6

ALTER TABLE message_feedback DROP CONSTRAINT IF EXISTS message_feedback_message_id_fkey;

-- Add comment explaining why there's no FK
COMMENT ON COLUMN message_feedback.message_id IS 'References messages.id but not enforced via FK - resolved dynamically via ai_sdk_id mapping';

-- Create model_config_presets table
-- This table stores reusable SSE event mapping configurations

CREATE TABLE IF NOT EXISTS public.model_config_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('openai', 'anthropic', 'langchain', 'custom')),
  event_mappings JSONB NOT NULL,
  field_metadata JSONB,
  is_system BOOLEAN NOT NULL DEFAULT false,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_model_config_presets_org_id ON public.model_config_presets(org_id);
CREATE INDEX idx_model_config_presets_category ON public.model_config_presets(category);
CREATE INDEX idx_model_config_presets_is_system ON public.model_config_presets(is_system);

-- Enable RLS
ALTER TABLE public.model_config_presets ENABLE ROW LEVEL SECURITY;

-- System presets are visible to everyone
CREATE POLICY "System presets are visible to all authenticated users"
  ON public.model_config_presets
  FOR SELECT
  USING (
    is_system = true
    AND auth.uid() IS NOT NULL
  );

-- Organization presets are visible to org members
CREATE POLICY "Organization presets are visible to org members"
  ON public.model_config_presets
  FOR SELECT
  USING (
    is_system = false
    AND org_id IN (
      SELECT org_id FROM public.org_map WHERE user_id = auth.uid()
    )
  );

-- Users can create org presets
CREATE POLICY "Users can create organization presets"
  ON public.model_config_presets
  FOR INSERT
  WITH CHECK (
    is_system = false
    AND org_id IN (
      SELECT org_id FROM public.org_map WHERE user_id = auth.uid()
    )
  );

-- Users can update org presets
CREATE POLICY "Users can update organization presets"
  ON public.model_config_presets
  FOR UPDATE
  USING (
    is_system = false
    AND org_id IN (
      SELECT org_id FROM public.org_map WHERE user_id = auth.uid()
    )
  );

-- Users can delete org presets
CREATE POLICY "Users can delete organization presets"
  ON public.model_config_presets
  FOR DELETE
  USING (
    is_system = false
    AND org_id IN (
      SELECT org_id FROM public.org_map WHERE user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_model_config_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_model_config_presets_updated_at
  BEFORE UPDATE ON public.model_config_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_model_config_presets_updated_at();

-- Add some default system presets
INSERT INTO public.model_config_presets (name, description, category, event_mappings, is_system) VALUES
  (
    'OpenAI Chat Completions (Streaming)',
    'Standard SSE event mapping for OpenAI Chat Completions API',
    'openai',
    '{
      "event_mappings": [
        {
          "source_event_type": "data",
          "target_ui_event": "text-delta",
          "field_mappings": {
            "delta": "choices[0].delta.content",
            "id": "id"
          }
        },
        {
          "source_event_type": "data",
          "target_ui_event": "finish",
          "when": "choices[0].finish_reason != null",
          "field_mappings": {
            "finishReason": "choices[0].finish_reason"
          }
        }
      ],
      "done_signal": "[DONE]"
    }'::jsonb,
    true
  ),
  (
    'Anthropic Claude (Streaming)',
    'SSE event mapping for Anthropic Claude API',
    'anthropic',
    '{
      "event_mappings": [
        {
          "source_event_type": "content_block_delta",
          "target_ui_event": "text-delta",
          "field_mappings": {
            "delta": "delta.text"
          }
        },
        {
          "source_event_type": "message_stop",
          "target_ui_event": "finish",
          "field_mappings": {
            "finishReason": "stop"
          }
        }
      ],
      "event_type_path": "type"
    }'::jsonb,
    true
  );

-- Add Template Tracking Fields to Models Table
--
-- This migration adds fields to track which template a model was created from,
-- whether it was modified from the template, and which fields were modified.
-- This enables the template system to show users which fields are locked/unlocked
-- and track template usage.

-- Add template_id column (references model_config_presets)
ALTER TABLE public.models
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.model_config_presets(id) ON DELETE SET NULL;

-- Add template_mode column (tracks if model was created from template, custom, or modified)
ALTER TABLE public.models
ADD COLUMN IF NOT EXISTS template_mode TEXT CHECK (template_mode IN ('custom', 'template', 'modified'));

-- Add template_modified_fields column (JSONB object tracking which fields were modified from template)
ALTER TABLE public.models
ADD COLUMN IF NOT EXISTS template_modified_fields JSONB DEFAULT '{}'::jsonb;

-- Create index on template_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_models_template_id ON public.models(template_id);

-- Add comments for documentation
COMMENT ON COLUMN public.models.template_id IS 'Reference to the model_config_presets template used to create this model';
COMMENT ON COLUMN public.models.template_mode IS 'Mode: custom (no template), template (using template), or modified (template was customized)';
COMMENT ON COLUMN public.models.template_modified_fields IS 'JSONB object mapping field paths to boolean indicating if field was modified from template';

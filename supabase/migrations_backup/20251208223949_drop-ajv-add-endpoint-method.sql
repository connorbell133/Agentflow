ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS endpoint text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS method text DEFAULT 'POST' NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'models' AND column_name = 'ajv_schema'
  ) THEN
    ALTER TABLE public.models DROP COLUMN ajv_schema;
  END IF;
END$$;
-- Generic key-value store for small store-wide settings that need to be
-- admin-editable without a code deploy. First use: which sizes count as
-- "plus size" for the surcharge feature (src/lib/db.ts).
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_public_all ON public.app_settings;
CREATE POLICY app_settings_public_all ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- Seed with the sizes that were previously hardcoded, so behavior doesn't
-- change until an admin actually edits the list.
INSERT INTO public.app_settings (key, value)
VALUES ('plus_sizes', '["XXL", "3XL", "38", "40"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

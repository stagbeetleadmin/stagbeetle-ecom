-- Galla identifies stock by their own numeric product code (e.g. "10056"),
-- not our STYLE-COLOUR-SIZE SKU (e.g. "SATN-CRM-M") — the two don't match,
-- so outbound order sync needs an explicit per-variant mapping, filled in
-- by an admin, rather than assuming our own SKU is recognizable to them.
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS galla_sku TEXT;

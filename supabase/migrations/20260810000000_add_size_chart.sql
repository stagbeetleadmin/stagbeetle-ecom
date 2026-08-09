-- Per-product size chart: which measurements apply (Chest/Waist/etc.), what
-- unit they're in, and the actual number per size. Optional — a product with
-- no chart set just doesn't show a "Size Guide" on the customer page.
--
-- Shape: { "unit": "in" | "cm", "measurements": string[], "rows": { [size]: { [measurement]: number } } }
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size_chart JSONB;

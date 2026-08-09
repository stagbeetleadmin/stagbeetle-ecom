-- Per-product surcharge applied when a customer selects a plus size (the
-- largest one or two sizes in the tops or waist-size scale — see PLUS_SIZES
-- in src/lib/db.ts). NULL/0 means no surcharge, matching existing products.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS plus_size_surcharge NUMERIC;

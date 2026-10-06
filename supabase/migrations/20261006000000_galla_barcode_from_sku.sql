-- Galla's order webhook matches stock on the item's BARCODE / EAN CODE, not
-- its item name. Their barcode is our variant SKU with the hyphens dropped
-- (WINGS-F.S-XXL -> WINGSF.SXXL; see src/lib/gallaBarcode.ts). The
-- 20260912000000 backfill set galla_sku = sku, which Galla accepts (202) but
-- never applies — so outbound stock sync has silently done nothing since.
--
-- Re-derive every variant still on an auto value (NULL, or equal to its own
-- sku). Any galla_sku an admin typed by hand is left alone. Safe to re-run.
UPDATE public.product_variants
SET galla_sku = replace(upper(sku), '-', '')
WHERE galla_sku IS NULL OR galla_sku = sku;

COMMENT ON COLUMN public.product_variants.galla_sku IS
  'Galla BARCODE / EAN code for this size (sku without hyphens unless overridden) — sent as line_items[].sku to Galla''s order webhook';

-- Read-only preview for migrations/20261006000000_galla_barcode_from_sku.sql:
-- lists every size whose Galla code will change, and what it will become.
--   npm run sql -- supabase/previews/20261006000000_galla_barcode_from_sku.preview.sql
SELECT sku, galla_sku AS current_value, replace(upper(sku), '-', '') AS new_barcode
FROM public.product_variants
WHERE galla_sku IS NULL OR galla_sku = sku
ORDER BY sku;

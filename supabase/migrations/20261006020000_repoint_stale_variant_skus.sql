-- Some products' style/colour code was renamed after their size-variants were
-- created, and the variants kept the old SKU (ensureVariantsForProduct used
-- to skip existing rows; it re-points them now). E.g. product PRO-BGGY-05
-- still had variants PRP-05-30…, RIB-01 had RIN-09-L…, CAMOU-BLK had
-- CAMOU-L… — so Galla stock imports and order sync used the wrong barcode.
--
-- Re-point every variant to PRODUCT_SKU-SIZE, and its Galla barcode too
-- unless it was set by hand. Safe to re-run.
UPDATE public.product_variants v
SET sku = upper(trim(p.sku)) || '-' || upper(trim(v.size)),
    galla_sku = CASE
      WHEN v.galla_sku IS NULL OR v.galla_sku = v.sku OR v.galla_sku = replace(upper(v.sku), '-', '')
        THEN replace(upper(trim(p.sku)) || '-' || upper(trim(v.size)), '-', '')
      ELSE v.galla_sku
    END
FROM public.products p
WHERE p.id = v.product_id
  AND coalesce(trim(p.sku), '') <> ''
  AND v.sku <> upper(trim(p.sku)) || '-' || upper(trim(v.size));

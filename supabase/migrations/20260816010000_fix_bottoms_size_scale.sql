-- ============================================================
-- Data fix: Track pant/Shorts/Joggers were created before the app enforced
-- "only Jeans use the waist-inch scale" (see NUMERIC_SIZED_TYPES in
-- src/lib/db.ts) — 11 existing products are still stored with sizes like
-- {28,30,32,34,36,38} instead of the S/M/L/XL/XXL scale they're actually
-- sold in. New products already get this right; this migrates the old ones.
--
-- Mapping (confirmed with the store owner):
--   28, 30 -> S
--   32     -> M
--   34     -> L
--   36     -> XL
--   38, 40 -> XXL
--
-- Two of those seven inputs collapse into a shared target on either end
-- (28+30 -> S, 38+40 -> XXL), so a product carrying both sides of either
-- pair has two existing product_variants rows that need to become one.
-- Where exactly one side already has a live inventory row, that row (and
-- its real stock count) is the one kept — never the untracked side — so no
-- stock is silently dropped. Where both sides happen to carry stock, the
-- counts are summed onto the keeper before the loser is deleted.
-- ============================================================

CREATE OR REPLACE FUNCTION public._bottoms_size_remap(p_size TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_size
    WHEN '28' THEN 'S'
    WHEN '30' THEN 'S'
    WHEN '32' THEN 'M'
    WHEN '34' THEN 'L'
    WHEN '36' THEN 'XL'
    WHEN '38' THEN 'XXL'
    WHEN '40' THEN 'XXL'
    ELSE p_size
  END;
$$;

-- One row per affected variant, with the merge decided up front — every
-- later step reads from this instead of re-deriving the ranking, so the
-- inventory merge and the delete can never disagree about who the keeper is.
CREATE TEMP TABLE _bottoms_migration_plan AS
SELECT
  pv.id AS variant_id,
  pv.product_id,
  pv.size AS old_size,
  public._bottoms_size_remap(pv.size) AS new_size,
  ROW_NUMBER() OVER (
    PARTITION BY pv.product_id, public._bottoms_size_remap(pv.size)
    ORDER BY (i.variant_id IS NOT NULL) DESC, pv.size ASC
  ) AS rn
FROM public.product_variants pv
JOIN public.products p ON p.id = pv.product_id
LEFT JOIN public.inventory i ON i.variant_id = pv.id
WHERE p.subcategory IN ('Track pant', 'Shorts', 'Joggers')
  AND pv.size IN ('28', '30', '32', '34', '36', '38', '40');

-- Fold a losing variant's stock onto its group's keeper before the loser
-- (and, via cascade, its inventory row) is deleted below.
UPDATE public.inventory i
SET quantity_on_hand = i.quantity_on_hand + extra.on_hand,
    quantity_reserved = i.quantity_reserved + extra.reserved,
    updated_at = now()
FROM (
  SELECT k.variant_id AS keeper_variant_id,
         SUM(li.quantity_on_hand) AS on_hand,
         SUM(li.quantity_reserved) AS reserved
  FROM _bottoms_migration_plan l
  JOIN public.inventory li ON li.variant_id = l.variant_id
  JOIN _bottoms_migration_plan k ON k.product_id = l.product_id AND k.new_size = l.new_size AND k.rn = 1
  WHERE l.rn > 1
  GROUP BY k.variant_id
) extra
WHERE i.variant_id = extra.keeper_variant_id;

-- Delete the losing variants (ON DELETE CASCADE takes their inventory row
-- with them — already folded into the keeper above, so nothing is lost).
DELETE FROM public.product_variants
WHERE id IN (SELECT variant_id FROM _bottoms_migration_plan WHERE rn > 1);

-- Rename the surviving variant + its SKU to the new letter size.
UPDATE public.product_variants pv
SET size = plan.new_size,
    sku = regexp_replace(pv.sku, '-(28|30|32|34|36|38|40)$', '-' || plan.new_size)
FROM _bottoms_migration_plan plan
WHERE pv.id = plan.variant_id AND plan.rn = 1;

-- products.sizes: remap every element and dedupe (28 and 30 both becoming
-- "S" would otherwise leave a duplicate entry in the array).
UPDATE public.products
SET sizes = (
  SELECT array_agg(DISTINCT public._bottoms_size_remap(s))
  FROM unnest(sizes) AS s
)
WHERE subcategory IN ('Track pant', 'Shorts', 'Joggers')
  AND sizes && ARRAY['28', '30', '32', '34', '36', '38', '40'];

-- size_chart rows are keyed by size ("28": {...}) — remap those keys too,
-- keeping one row per merged target (the measurement values a 28 and a 30
-- row held were already near-identical reference data, not stock, so
-- picking either is fine — DISTINCT ON deterministically keeps the lower
-- original waist number's row).
UPDATE public.products
SET size_chart = jsonb_set(
  size_chart,
  '{rows}',
  (
    SELECT jsonb_object_agg(new_key, val)
    FROM (
      SELECT DISTINCT ON (public._bottoms_size_remap(key)) public._bottoms_size_remap(key) AS new_key, value AS val
      FROM jsonb_each(size_chart -> 'rows')
      ORDER BY public._bottoms_size_remap(key), key
    ) remapped
  )
)
WHERE subcategory IN ('Track pant', 'Shorts', 'Joggers')
  AND size_chart IS NOT NULL
  AND size_chart -> 'rows' ?| ARRAY['28', '30', '32', '34', '36', '38', '40'];

DROP TABLE _bottoms_migration_plan;
DROP FUNCTION public._bottoms_size_remap(TEXT);

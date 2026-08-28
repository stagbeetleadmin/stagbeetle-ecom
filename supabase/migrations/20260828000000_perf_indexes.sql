-- ============================================================
-- Performance: indexes for the hot query paths
--
-- Every query below currently forces a sequential scan because no
-- supporting index exists. Cheap to add, no behavioural change, safe to
-- re-run (IF NOT EXISTS). Not CONCURRENTLY — `supabase db push` runs each
-- migration in a transaction, and these tables are small enough that the
-- brief lock during a plain index build is imperceptible.
-- ============================================================

-- getOrders(): `.select('*').order('created_at', { ascending: false })`
-- — the admin Order Registry's main fetch. Also serves any date-ranged
-- order reporting.
CREATE INDEX IF NOT EXISTS orders_created_at_desc_idx
  ON public.orders (created_at DESC);

-- RLS policy "Users can view own orders" (USING auth.uid() = user_id) is
-- evaluated on every read of the orders table; without this it's a scan
-- per check. Partial — guest orders have a NULL user_id and never match.
CREATE INDEX IF NOT EXISTS orders_user_id_idx
  ON public.orders (user_id)
  WHERE user_id IS NOT NULL;

-- Product lookups / grouping by style code. getInventoryBySku, the admin
-- catalog's SKU search, and syncSizeChartAcrossStyle's
-- `ilike('sku', '<base>-%')` all filter on sku; today none can use an
-- index. text_pattern_ops additionally lets a `LIKE '<base>-%'` prefix
-- match use this index.
CREATE INDEX IF NOT EXISTS products_sku_idx
  ON public.products (sku);
CREATE INDEX IF NOT EXISTS products_sku_pattern_idx
  ON public.products (sku text_pattern_ops);

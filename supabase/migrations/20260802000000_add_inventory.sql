-- ============================================================
-- Inventory tracking
--
-- product_variants: turns each size of a product into an addressable,
-- stockable unit (SKU convention: STYLE-COLOR-SIZE, e.g. SATN-CRM-M —
-- already previewed in the admin form, now actually persisted).
--
-- inventory: current stock per variant. Source of truth is the external
-- POS/inventory system (Galla) once synced; sync_source='manual_admin'
-- until then, so the admin can set an initial count.
--
-- inventory_sync_log: idempotency + audit trail for both directions
-- (Galla -> us, and us -> Galla after an online sale).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  size TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, size)
);

CREATE TABLE IF NOT EXISTS public.inventory (
  variant_id UUID PRIMARY KEY REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 3,
  sync_source TEXT NOT NULL DEFAULT 'manual_admin', -- 'external_pos' | 'manual_admin' | 'order_deduction'
  version INTEGER NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quantity_on_hand_non_negative CHECK (quantity_on_hand >= 0)
);

CREATE TABLE IF NOT EXISTS public.inventory_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL, -- 'inbound' | 'outbound'
  external_event_id TEXT,
  variant_sku TEXT,
  payload JSONB,
  status TEXT NOT NULL, -- 'applied' | 'skipped_duplicate' | 'skipped_stale' | 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency guard: the same external event, in the same direction, is a no-op on retry
CREATE UNIQUE INDEX IF NOT EXISTS inventory_sync_log_idempotency
  ON public.inventory_sync_log (direction, external_event_id)
  WHERE external_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON public.product_variants (product_id);

-- RLS: permissive, matching the posture already used by every other table in
-- this app (anon key does the reads/writes; the /api/inventory/sync route is
-- the actually-secured boundary via HMAC signing, not table-level policy).
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_variants_public_all ON public.product_variants;
CREATE POLICY product_variants_public_all ON public.product_variants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS inventory_public_all ON public.inventory;
CREATE POLICY inventory_public_all ON public.inventory FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS inventory_sync_log_public_all ON public.inventory_sync_log;
CREATE POLICY inventory_sync_log_public_all ON public.inventory_sync_log FOR ALL USING (true) WITH CHECK (true);

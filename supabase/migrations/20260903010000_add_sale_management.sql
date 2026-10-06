-- ============================================================
-- Sale management: global sale window, category discounts, product
-- discounts.
--
-- sale_config reuses the existing app_settings key/value table (same
-- pattern as plus_sizes / member_discount_config) — seeded inactive so
-- nothing changes storefront-side until an admin explicitly configures a
-- sale window at /admin/sales.
--
-- category_discounts / product_discounts are real tables (not settings)
-- because they're each a *list* of independently editable rows, not a
-- single value. Both need public SELECT — sale pricing is computed
-- client-side (src/lib/db.ts, same as the rest of the product-pricing
-- pipeline), so an anonymous shopper's browser must be able to read which
-- discounts are currently configured, the same way it already reads
-- `products` and `coupons`. Writes are locked to public.is_admin(),
-- reusing the helper from 20260811000000_harden_rls_policies.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.category_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  subcategory TEXT, -- NULL = applies to the whole category
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT category_discounts_percent_max CHECK (discount_type <> 'percentage' OR discount_value <= 100)
);

-- One row per category(+subcategory) — editing "Men > Shirt" updates the
-- existing row instead of silently creating a duplicate that would then
-- ambiguously tie with it at read time.
CREATE UNIQUE INDEX IF NOT EXISTS category_discounts_unique_scope
  ON public.category_discounts (lower(category), lower(COALESCE(subcategory, '')));

ALTER TABLE public.category_discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read category discounts" ON public.category_discounts;
CREATE POLICY "Public read category discounts" ON public.category_discounts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin writes category discounts" ON public.category_discounts;
CREATE POLICY "Admin writes category discounts" ON public.category_discounts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


CREATE TABLE IF NOT EXISTS public.product_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_discounts_percent_max CHECK (discount_type <> 'percentage' OR discount_value <= 100),
  CONSTRAINT product_discounts_one_per_product UNIQUE (product_id)
);

ALTER TABLE public.product_discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read product discounts" ON public.product_discounts;
CREATE POLICY "Public read product discounts" ON public.product_discounts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin writes product discounts" ON public.product_discounts;
CREATE POLICY "Admin writes product discounts" ON public.product_discounts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS product_discounts_product_id_idx ON public.product_discounts (product_id);

-- Store-wide sale window + on/off switch. Inactive by default — existing
-- pricing is completely unaffected until an admin turns this on.
INSERT INTO public.app_settings (key, value)
VALUES ('sale_config', jsonb_build_object(
  'active', false,
  'start_at', null,
  'end_at', null
))
ON CONFLICT (key) DO NOTHING;

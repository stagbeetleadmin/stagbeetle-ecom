-- ============================================================
-- Harden Row Level Security
--
-- RLS was ON for every table, but several policies were effectively
-- USING (true) for ALL commands to the `public` role — meaning the anon
-- key (embedded in every visitor's browser, by design, same as any
-- Supabase app) could directly INSERT/UPDATE/DELETE products, orders,
-- coupons, inventory, and app_settings with no authentication at all.
-- The admin login/MFA gate only ever controlled whether the dashboard UI
-- rendered — it never actually protected the underlying data.
--
-- This migration:
--   1. Adds a single admin() check other policies delegate to, so the
--      admin identity lives in exactly one place in SQL (mirrors the
--      client-side check in AuthContext.tsx).
--   2. Locks writes on products/coupons/orders/inventory/product_variants/
--      inventory_sync_log/app_settings to that admin identity.
--   3. Keeps every read path, and the specific writes genuine shoppers
--      need (placing an order, the atomic stock decrement after payment,
--      the append-only inventory sync log), exactly as open as before.
--   4. Makes the atomic stock-decrement RPC SECURITY DEFINER so it keeps
--      working for a checkout flow that was never (and still isn't)
--      authenticated as the admin — it's narrow, can't go negative, and
--      can't touch anything but the one row it's given.
--
-- carts is intentionally left as-is: guest carts have no real Supabase
-- Auth session to bind an ownership check to (see the app's dual
-- authenticated/guest identity model), so a real fix there needs Supabase
-- anonymous-auth sessions — a separate, larger change, not bundled here.
-- ============================================================

-- ── Single source of truth for "is this request the admin" ─────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'stagbeetlebilling@gmail.com';
$$;

-- ── products ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users manage products" ON public.products;
DROP POLICY IF EXISTS "Authenticated admin manages products" ON public.products;
-- "Public read products" (SELECT, true) and "Service role manages products"
-- are left as-is — public catalog browsing and the service-role escape
-- hatch are both intentional and unaffected by the policies above.

CREATE POLICY "Admin writes products" ON public.products
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── coupons ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin manages coupons" ON public.coupons;
-- "Public read active coupons" (SELECT, true) stays — checkout must be
-- able to validate a code without the shopper being logged in.

CREATE POLICY "Admin writes coupons" ON public.coupons
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── orders ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin CRM can view all orders" ON public.orders;
-- "Public can insert orders" and "Users can view own orders" stay — guest
-- checkout and a customer viewing their own order history are unaffected.

CREATE POLICY "Admin reads all orders" ON public.orders
  FOR SELECT
  USING (public.is_admin());

-- There was no UPDATE policy at all for the admin path before this
-- (only a service_role one) — admin shipping-status updates from the
-- dashboard were likely already silently failing under RLS. This adds it.
CREATE POLICY "Admin updates orders" ON public.orders
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── inventory ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "inventory_public_all" ON public.inventory;

CREATE POLICY "Public reads inventory" ON public.inventory
  FOR SELECT
  USING (true);

CREATE POLICY "Admin writes inventory" ON public.inventory
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── product_variants ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "product_variants_public_all" ON public.product_variants;

CREATE POLICY "Public reads product_variants" ON public.product_variants
  FOR SELECT
  USING (true);

CREATE POLICY "Admin writes product_variants" ON public.product_variants
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── inventory_sync_log ──────────────────────────────────────────────────
-- Append-only from anywhere (checkout's post-payment decrement, and the
-- Galla integration route, both write here without an admin session) —
-- inserting a log row can't corrupt real data. Reading history and
-- editing/erasing the audit trail are admin-only.
DROP POLICY IF EXISTS "inventory_sync_log_public_all" ON public.inventory_sync_log;

CREATE POLICY "Public appends inventory_sync_log" ON public.inventory_sync_log
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin reads inventory_sync_log" ON public.inventory_sync_log
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admin manages inventory_sync_log" ON public.inventory_sync_log
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin deletes inventory_sync_log" ON public.inventory_sync_log
  FOR DELETE
  USING (public.is_admin());

-- ── app_settings ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "app_settings_public_all" ON public.app_settings;

CREATE POLICY "Public reads app_settings" ON public.app_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admin writes app_settings" ON public.app_settings
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── Atomic stock decrement stays usable from checkout ──────────────────
-- Checkout was never (and still isn't) authenticated as the admin — it's
-- a real shopper's browser calling this right after their payment clears.
-- SECURITY DEFINER lets this one narrow, already-safe operation (can't
-- go negative, can't touch any row but the one variant it's given, no
-- caller-supplied SQL) keep working now that direct inventory writes
-- require admin. search_path is pinned to prevent the standard
-- SECURITY DEFINER hijacking risk.
ALTER FUNCTION public.decrement_inventory_on_hand(UUID, INTEGER)
  SECURITY DEFINER
  SET search_path = public;

-- ── Galla inbound sync stays usable without a service-role key ─────────
-- /api/inventory/sync already verifies the caller via HMAC signature
-- before ever reaching this — that IS its authentication, it just isn't
-- a Supabase session, so it can't satisfy is_admin(). Rather than hand
-- the integration a service-role key (full, permanent RLS bypass if it
-- ever leaked), this narrow RPC does exactly the one upsert the sync
-- needs and nothing else.
CREATE OR REPLACE FUNCTION public.upsert_inventory_from_sync(
  p_variant_id UUID,
  p_quantity_on_hand INTEGER,
  p_last_synced_at TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inventory (variant_id, quantity_on_hand, sync_source, last_synced_at)
  VALUES (p_variant_id, GREATEST(0, p_quantity_on_hand), 'external_pos', p_last_synced_at)
  ON CONFLICT (variant_id) DO UPDATE
    SET quantity_on_hand = GREATEST(0, p_quantity_on_hand),
        sync_source = 'external_pos',
        last_synced_at = p_last_synced_at,
        updated_at = now();
END;
$$;

-- ── Storage: garment-images bucket ─────────────────────────────────────
-- Same issue as the tables above — uploads/overwrites/deletes were open
-- to anyone. Reads must stay public (product images render on the
-- storefront); writes should only come from the admin catalog form.
DROP POLICY IF EXISTS "Allow Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Delete" ON storage.objects;
-- "Allow Public Select" is left as-is — product photos must stay publicly viewable.

CREATE POLICY "Admin uploads garment images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'garment-images' AND public.is_admin());

CREATE POLICY "Admin updates garment images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'garment-images' AND public.is_admin());

CREATE POLICY "Admin deletes garment images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'garment-images' AND public.is_admin());

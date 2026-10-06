-- Finishes 20260811000000_harden_rls_policies on the live (migrated)
-- project, where it only half-applied: its admin-only policies exist, but the
-- old allow-everything policies it was meant to drop are still there — so
-- anyone, signed in or not, could rewrite stock, variants/barcodes, the sync
-- log, app settings, and delete or overwrite product images. And the stock
-- decrement RPC never became SECURITY DEFINER, so checkout's deduction was
-- only working because of those open policies.
--
-- Order matters: make the RPC SECURITY DEFINER first, then close the
-- policies, so order deductions never lose access. Safe to re-run.

ALTER FUNCTION public.decrement_inventory_on_hand(UUID, INTEGER)
  SECURITY DEFINER
  SET search_path = public;

DROP POLICY IF EXISTS "inventory_public_all" ON public.inventory;
DROP POLICY IF EXISTS "product_variants_public_all" ON public.product_variants;
DROP POLICY IF EXISTS "inventory_sync_log_public_all" ON public.inventory_sync_log;
DROP POLICY IF EXISTS "app_settings_public_all" ON public.app_settings;

-- Product photos stay publicly readable ("Allow Public Select" is kept);
-- writes go through the "Admin … garment images" policies.
DROP POLICY IF EXISTS "Allow Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Delete" ON storage.objects;

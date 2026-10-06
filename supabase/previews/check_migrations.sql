-- Read-only: is every migration's effect present on the live database? Every row should say t.
--   npm run sql -- supabase/previews/check_migrations.sql
SELECT m, ok FROM (VALUES
 ('20260811 harden_rls (is_admin + "Admin writes products")', to_regproc('public.is_admin') IS NOT NULL AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename='products' AND policyname='Admin writes products') AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inventory' AND policyname='inventory_public_all')),
 ('20260812 add_galla_sku', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_variants' AND column_name='galla_sku')),
 ('20260816 add_members', to_regclass('public.members') IS NOT NULL AND to_regproc('public.date_is_within_window') IS NOT NULL),
 ('20260816010000 fix_bottoms_size_scale (no leftover helper)', to_regproc('public._bottoms_size_remap') IS NULL),
 ('20260816020000 admin_profiles_policy', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Admin reads all profiles')),
 ('20260817000000 profiles admin update + unique email', EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Admin updates profiles') AND to_regclass('public.profiles_email_unique') IS NOT NULL),
 ('20260817010000 member_discount_redemptions', to_regclass('public.member_discount_redemptions') IS NOT NULL AND to_regproc('public.redeem_member_discount') IS NOT NULL AND to_regproc('public.nearest_occurrence_year') IS NOT NULL),
 ('20260817020000 member_discount_redeemed_at', EXISTS (SELECT 1 FROM pg_proc WHERE proname='get_member_discount' AND pg_get_function_result(oid) ILIKE '%redeemed_at%')),
 ('20260817030000 members_bulk_discount_status', to_regproc('public.get_members_bulk_discount_status') IS NOT NULL),
 ('20260828 perf_indexes', to_regclass('public.orders_created_at_desc_idx') IS NOT NULL AND to_regclass('public.orders_user_id_idx') IS NOT NULL AND to_regclass('public.products_sku_idx') IS NOT NULL AND to_regclass('public.products_sku_pattern_idx') IS NOT NULL),
 ('20260903000000 member_month_columns', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='anniversary_month') AND to_regclass('public.members_birthday_month_idx') IS NOT NULL),
 ('20260903010000 sale_management', to_regclass('public.category_discounts') IS NOT NULL AND to_regclass('public.product_discounts') IS NOT NULL AND to_regclass('public.product_discounts_product_id_idx') IS NOT NULL),
 ('20260912 backfill_galla_sku (no NULL barcodes)', NOT EXISTS (SELECT 1 FROM public.product_variants WHERE galla_sku IS NULL)),
 ('20260915 festivals_and_notifications', to_regclass('public.festivals') IS NOT NULL AND to_regclass('public.notification_campaigns') IS NOT NULL AND to_regclass('public.notification_campaigns_created_at_idx') IS NOT NULL),
 ('20261006000000 galla_barcode_from_sku (column comment)', col_description('public.product_variants'::regclass, (SELECT attnum FROM pg_attribute WHERE attrelid='public.product_variants'::regclass AND attname='galla_sku')) IS NOT NULL),
 ('20261006010000 backfill_order_user_id', NOT EXISTS (SELECT 1 FROM public.orders o JOIN auth.users u ON lower(u.email)=lower(o.customer_email) WHERE o.user_id IS NULL AND u.email_confirmed_at IS NOT NULL)),
 ('20261006020000 repoint_stale_variant_skus', NOT EXISTS (SELECT 1 FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE coalesce(trim(p.sku),'')<>'' AND v.sku <> upper(trim(p.sku))||'-'||upper(trim(v.size)))),
 ('20261006030000 finish_rls_hardening', (SELECT prosecdef FROM pg_proc WHERE proname='decrement_inventory_on_hand') AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname IN ('inventory_public_all','product_variants_public_all','inventory_sync_log_public_all','app_settings_public_all','Allow Public Insert','Allow Public Update','Allow Public Delete')))
) t(m, ok);

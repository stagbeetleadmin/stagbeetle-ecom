-- ===========================================================================
-- Stage 3 of the Supabase Singapore -> Mumbai migration.
--
-- Run this against the NEW (Mumbai) database AFTER migrate-db.sh and
-- migrate-storage.mjs have both finished:
--
--     psql "$NEW_DB_URL" -f migration/rewrite-urls.sql
--
-- Stored image URLs are absolute and contain the project ref as a subdomain
-- (https://<ref>.supabase.co/storage/v1/object/public/garment-images/...), so
-- after the data is copied they still point at the old project. This rewrites
-- every occurrence of the old host to the new host, in place, in one
-- transaction. Array order in products.images is preserved.
--
-- If any *.items / *.value column in your schema is `json` rather than
-- `jsonb`, change the matching `::jsonb` below to `::json`.
-- ===========================================================================

\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  old_host CONSTANT text := 'lpkasszpjklrmwugeupp.supabase.co';
  new_host CONSTANT text := 'uzhdhxfcvptgowkuupmz.supabase.co';
  n bigint;
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    UPDATE public.products
    SET images = (
      SELECT array_agg(replace(u, old_host, new_host) ORDER BY ord)
      FROM unnest(images) WITH ORDINALITY AS t(u, ord)
    )
    WHERE array_to_string(images, ',') LIKE '%' || old_host || '%';
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'products.images       : % row(s)', n;

    UPDATE public.products
    SET description = replace(description, old_host, new_host)
    WHERE description LIKE '%' || old_host || '%';
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'products.description  : % row(s)', n;

    UPDATE public.products
    SET size_chart = replace(size_chart::text, old_host, new_host)::jsonb
    WHERE size_chart IS NOT NULL AND size_chart::text LIKE '%' || old_host || '%';
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'products.size_chart   : % row(s)', n;
  END IF;

  IF to_regclass('public.orders') IS NOT NULL THEN
    UPDATE public.orders
    SET items = replace(items::text, old_host, new_host)::jsonb
    WHERE items::text LIKE '%' || old_host || '%';
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'orders.items          : % row(s)', n;
  END IF;

  IF to_regclass('public.carts') IS NOT NULL THEN
    UPDATE public.carts
    SET items = replace(items::text, old_host, new_host)::jsonb
    WHERE items::text LIKE '%' || old_host || '%';
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'carts.items           : % row(s)', n;
  END IF;

  IF to_regclass('public.app_settings') IS NOT NULL THEN
    UPDATE public.app_settings
    SET value = replace(value::text, old_host, new_host)::jsonb
    WHERE value::text LIKE '%' || old_host || '%';
    GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'app_settings.value    : % row(s)', n;
  END IF;
END $$;

-- Safety net — should report 0.
SELECT count(*) AS products_still_pointing_at_old_project
FROM public.products
WHERE (array_to_string(images, ',') || coalesce(description, '') || coalesce(size_chart::text, ''))
      LIKE '%lpkasszpjklrmwugeupp.supabase.co%';

COMMIT;

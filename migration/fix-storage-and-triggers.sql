-- ===========================================================================
-- Post-migration patch: objects that live OUTSIDE the public schema and were
-- therefore not carried by migrate-db.sh (which dumps --schema=public only).
--
-- Run against the NEW (Mumbai) database:
--     psql "$NEW_DB_URL" -f migration/fix-storage-and-triggers.sql
--
-- 1. storage.objects RLS policies for the garment-images bucket — without the
--    INSERT policy, admin image uploads are denied by RLS (the reported bug).
-- 2. the auth.users -> public.profiles trigger (the function itself already
--    migrated with the public schema; only the trigger binding was missing).
-- ===========================================================================

\set ON_ERROR_STOP on

-- ── storage.objects policies (mirror of the OLD project) ───────────────────
drop policy if exists "Allow Public Select" on storage.objects;
create policy "Allow Public Select"
  on storage.objects for select to public
  using (bucket_id = 'garment-images');

drop policy if exists "Admin uploads garment images" on storage.objects;
create policy "Admin uploads garment images"
  on storage.objects for insert to public
  with check (bucket_id = 'garment-images' and public.is_admin());

drop policy if exists "Admin updates garment images" on storage.objects;
create policy "Admin updates garment images"
  on storage.objects for update to public
  using (bucket_id = 'garment-images' and public.is_admin());

drop policy if exists "Admin deletes garment images" on storage.objects;
create policy "Admin deletes garment images"
  on storage.objects for delete to public
  using (bucket_id = 'garment-images' and public.is_admin());

-- ── auth.users signup trigger ─────────────────────────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── report ────────────────────────────────────────────────────────────────
select policyname || ' [' || cmd || ']' as storage_policy
from pg_policies where schemaname = 'storage' and tablename = 'objects'
order by policyname;

select tgname as auth_users_trigger
from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;

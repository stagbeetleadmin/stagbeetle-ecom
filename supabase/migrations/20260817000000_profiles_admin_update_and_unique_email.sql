-- Two additive fixes to public.profiles, alongside the earlier
-- "Admin reads all profiles" migration:
--
-- 1. The admin dashboard's Registered Users page can now edit a customer's
--    phone (or name) — there was no policy letting the admin session write
--    to a row it doesn't own, only "auth.uid() = id" (self-update). This
--    adds the write half to match the read half already granted.
--
-- 2. A case-insensitive unique index on email — profiles.email is meant to
--    mirror the (unique) auth.users.email for real accounts, but nothing
--    enforced that at the profiles-table level, so a direct write (e.g. a
--    manual profile edit) could in principle create a second row claiming
--    an email that's already registered. This is the database-level half
--    of the same-email-is-the-same-person guarantee; the application-level
--    half is the new duplicate check in loginWithEmailPhone (AuthContext).
CREATE POLICY "Admin updates profiles" ON public.profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique
  ON public.profiles (lower(email))
  WHERE email <> '';

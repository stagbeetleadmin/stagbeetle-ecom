-- Registered customers were never visible anywhere in the admin dashboard —
-- not a missing UI feature so much as a missing RLS policy: `profiles` has
-- had RLS on since the original schema, but the only SELECT policy was
-- "auth.uid() = id" (a user reading their own row). There was no way for
-- the admin session to read anyone else's profile, so no admin page could
-- have listed them even if one had been built.
--
-- public.is_admin() already exists (added in the RLS hardening migration) —
-- this just adds a second, additive SELECT policy for it. Postgres ORs
-- multiple permissive policies together, so this doesn't touch the existing
-- "view own profile" policy at all.
CREATE POLICY "Admin reads all profiles" ON public.profiles
  FOR SELECT
  USING (public.is_admin());

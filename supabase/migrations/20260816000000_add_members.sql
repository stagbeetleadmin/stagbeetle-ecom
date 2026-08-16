-- ============================================================
-- Membership program: birthday/anniversary discounts.
--
-- A `members` table holds contact + special-date info, captured either
-- through the public self-registration page (/join, e.g. via an in-store
-- QR code) or from the admin panel. Eligibility (is this member inside
-- their birthday/anniversary discount window right now, and by how much)
-- is computed by the get_member_discount() RPC below — never by a direct
-- table read — so an unauthenticated checkout can check "does this email
-- qualify for a discount" without being able to read anyone's birthday,
-- phone number, or email off the table directly. Same reasoning as
-- decrement_inventory_on_hand / upsert_inventory_from_sync in the RLS
-- hardening migration: a narrow SECURITY DEFINER function is the safe way
-- to give an anonymous caller exactly the one answer they need.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  birthday DATE,
  anniversary DATE,
  source TEXT NOT NULL DEFAULT 'online', -- 'online' | 'in_store_qr' | 'admin'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One membership record per email — self-registering twice with the same
-- address hits this instead of silently creating a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS members_email_unique ON public.members (lower(email));
CREATE INDEX IF NOT EXISTS members_phone_idx ON public.members (phone) WHERE phone IS NOT NULL;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Self-registration (online form or in-store QR kiosk) needs to insert
-- without a login — there is no password/account created at signup time
-- (see AGENTS/product notes: membership is a lightweight record, not a
-- website login).
CREATE POLICY "Public can register as a member" ON public.members
  FOR INSERT
  WITH CHECK (true);

-- No public SELECT/UPDATE/DELETE — this is the PII-protecting half of the
-- design. The admin Members page (search, edit, delete) authenticates as
-- the admin and is covered by this; checkout eligibility never reads this
-- table directly, only through get_member_discount() below.
CREATE POLICY "Admin manages members" ON public.members
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Store-wide discount configuration — reuses the existing app_settings
-- key/value table (same one plus_sizes already lives in), so no new
-- settings table is needed. window_days: how many days before/after the
-- actual date still counts (admin-configurable, so "the exact day only"
-- isn't a hardcoded assumption).
INSERT INTO public.app_settings (key, value)
VALUES ('member_discount_config', jsonb_build_object(
  'active', true,
  'birthday_percent', 15,
  'anniversary_percent', 15,
  'window_days', 3
))
ON CONFLICT (key) DO NOTHING;

-- ── Safe date construction — clamps an invalid day (Feb 29 in a non-leap
-- year, most commonly) to the last real day of that month instead of
-- erroring, so a birthday of Feb 29 doesn't crash eligibility checks in
-- every non-leap year. ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.safe_make_date(p_year INT, p_month INT, p_day INT)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (date_trunc('month', make_date(p_year, p_month, 1))
          + (LEAST(p_day, EXTRACT(DAY FROM (date_trunc('month', make_date(p_year, p_month, 1)) + INTERVAL '1 month - 1 day'))::int) - 1) * INTERVAL '1 day'
         )::date;
$$;

-- ── Is `p_target` (a birthday/anniversary, any year) within `p_window_days`
-- of today, comparing month+day only? Checks last/this/next year's
-- occurrence of that month+day against today so it handles the
-- December-to-January wraparound correctly without modulo-arithmetic
-- edge cases. ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.date_is_within_window(p_target DATE, p_window_days INT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT p_target IS NOT NULL AND EXISTS (
    SELECT 1 FROM (
      SELECT public.safe_make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int - 1, EXTRACT(MONTH FROM p_target)::int, EXTRACT(DAY FROM p_target)::int) AS d
      UNION ALL
      SELECT public.safe_make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int,     EXTRACT(MONTH FROM p_target)::int, EXTRACT(DAY FROM p_target)::int)
      UNION ALL
      SELECT public.safe_make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1, EXTRACT(MONTH FROM p_target)::int, EXTRACT(DAY FROM p_target)::int)
    ) candidates
    WHERE abs(CURRENT_DATE - d) <= GREATEST(0, p_window_days)
  );
$$;

-- ── The one thing checkout (and the in-store admin lookup) actually needs:
-- given an email and/or phone, is there a member, and do they currently
-- qualify for a discount? Returns only the percent + reason — never the
-- member's row. SECURITY DEFINER so it can read `members` on the caller's
-- behalf despite there being no public SELECT policy on that table. ──────
CREATE OR REPLACE FUNCTION public.get_member_discount(p_email TEXT, p_phone TEXT DEFAULT NULL)
RETURNS TABLE(discount_percent NUMERIC, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config JSONB;
  v_window INT;
  v_birthday_pct NUMERIC;
  v_anniversary_pct NUMERIC;
  v_active BOOLEAN;
  v_member RECORD;
  v_clean_email TEXT := NULLIF(btrim(lower(coalesce(p_email, ''))), '');
  v_clean_phone TEXT := NULLIF(btrim(coalesce(p_phone, '')), '');
BEGIN
  IF v_clean_email IS NULL AND v_clean_phone IS NULL THEN
    RETURN;
  END IF;

  SELECT value INTO v_config FROM public.app_settings WHERE key = 'member_discount_config';
  IF v_config IS NULL THEN RETURN; END IF;

  v_active := COALESCE((v_config->>'active')::boolean, true);
  IF NOT v_active THEN RETURN; END IF;

  v_window := COALESCE((v_config->>'window_days')::int, 0);
  v_birthday_pct := COALESCE((v_config->>'birthday_percent')::numeric, 0);
  v_anniversary_pct := COALESCE((v_config->>'anniversary_percent')::numeric, 0);

  -- Exact email match wins over a phone match if, implausibly, they'd
  -- resolve to two different member rows.
  SELECT * INTO v_member FROM public.members m
    WHERE (v_clean_email IS NOT NULL AND lower(m.email) = v_clean_email)
       OR (v_clean_phone IS NOT NULL AND m.phone = v_clean_phone)
    ORDER BY (v_clean_email IS NOT NULL AND lower(m.email) = v_clean_email) DESC
    LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;

  -- Birthday takes priority if, in some window_days configuration, both
  -- happen to be in range at once — a deliberate tie-break (one discount,
  -- not stacked) rather than an arbitrary result.
  IF v_birthday_pct > 0 AND public.date_is_within_window(v_member.birthday, v_window) THEN
    discount_percent := v_birthday_pct;
    reason := 'birthday';
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_anniversary_pct > 0 AND public.date_is_within_window(v_member.anniversary, v_window) THEN
    discount_percent := v_anniversary_pct;
    reason := 'anniversary';
    RETURN NEXT;
    RETURN;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_discount(TEXT, TEXT) TO anon, authenticated;

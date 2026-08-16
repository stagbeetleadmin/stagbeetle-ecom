-- Once-per-year redemption limit for the membership discount program.
--
-- Previously get_member_discount() only checked whether today falls in the
-- eligible window — nothing stopped the same member from having it applied
-- to every single order placed during that whole window. This migration:
--
--   1. Changes birthday eligibility from "±window_days" to "the same
--      calendar month as the birthday" — matches what was actually asked
--      for ("the offer can be availed in his birthday month"). Anniversary
--      keeps the existing ±window_days behavior; that wasn't asked to change.
--   2. Adds a redemption ledger (member_discount_redemptions) with a hard
--      DB-level uniqueness constraint — one row per member+reason+year, so
--      two near-simultaneous checkouts can't both "win" a second redemption
--      the way an application-level check alone could race.
--   3. get_member_discount() now also reports whether this year's discount
--      has already been redeemed, so checkout can say so in the UI instead
--      of silently applying it again or silently not offering it.
--   4. A new redeem_member_discount() RPC actually marks it used — called
--      once an order that applied the discount is confirmed, never at
--      checkout-page-load time (that's just the eligibility check).

CREATE TABLE IF NOT EXISTS public.member_discount_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('birthday', 'anniversary')),
  period_year INT NOT NULL,
  order_id TEXT,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, reason, period_year)
);

ALTER TABLE public.member_discount_redemptions ENABLE ROW LEVEL SECURITY;

-- No public SELECT/INSERT policy — same reasoning as `members` itself:
-- every access goes through a SECURITY DEFINER RPC below, never a direct
-- table read/write, so an anonymous checkout can redeem its own discount
-- without being able to read anyone else's redemption history.
CREATE POLICY "Admin reads redemptions" ON public.member_discount_redemptions
  FOR SELECT
  USING (public.is_admin());

-- Which year's occurrence (last/this/next year's month+day of p_target) is
-- the one currently inside the window — kept as its own function, using the
-- exact same "three candidate years" approach as date_is_within_window, so
-- the two can never disagree about which occurrence is "the current one".
CREATE OR REPLACE FUNCTION public.nearest_occurrence_year(p_target DATE, p_window_days INT)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT EXTRACT(YEAR FROM d)::int
  FROM (
    SELECT public.safe_make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int - 1, EXTRACT(MONTH FROM p_target)::int, EXTRACT(DAY FROM p_target)::int) AS d
    UNION ALL
    SELECT public.safe_make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int,     EXTRACT(MONTH FROM p_target)::int, EXTRACT(DAY FROM p_target)::int)
    UNION ALL
    SELECT public.safe_make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1, EXTRACT(MONTH FROM p_target)::int, EXTRACT(DAY FROM p_target)::int)
  ) candidates
  WHERE abs(CURRENT_DATE - d) <= GREATEST(0, p_window_days)
  ORDER BY abs(CURRENT_DATE - d)
  LIMIT 1;
$$;

-- Return shape is changing (two new columns) — CREATE OR REPLACE can't
-- alter an existing function's return type, so the old signature has to go
-- first.
DROP FUNCTION IF EXISTS public.get_member_discount(TEXT, TEXT);

CREATE FUNCTION public.get_member_discount(p_email TEXT, p_phone TEXT DEFAULT NULL)
RETURNS TABLE(discount_percent NUMERIC, reason TEXT, already_redeemed BOOLEAN, period_year INT)
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
  v_year INT;
  v_redeemed BOOLEAN;
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

  SELECT * INTO v_member FROM public.members m
    WHERE (v_clean_email IS NOT NULL AND lower(m.email) = v_clean_email)
       OR (v_clean_phone IS NOT NULL AND m.phone = v_clean_phone)
    ORDER BY (v_clean_email IS NOT NULL AND lower(m.email) = v_clean_email) DESC
    LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;

  -- Birthday: the whole calendar month, not a day-count window.
  IF v_birthday_pct > 0 AND v_member.birthday IS NOT NULL
     AND EXTRACT(MONTH FROM v_member.birthday) = EXTRACT(MONTH FROM CURRENT_DATE) THEN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::int;
    SELECT EXISTS(
      SELECT 1 FROM public.member_discount_redemptions mdr
      WHERE mdr.member_id = v_member.id AND mdr.reason = 'birthday' AND mdr.period_year = v_year
    ) INTO v_redeemed;
    discount_percent := v_birthday_pct;
    reason := 'birthday';
    already_redeemed := v_redeemed;
    period_year := v_year;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Anniversary: unchanged ±window_days behavior.
  IF v_anniversary_pct > 0 AND public.date_is_within_window(v_member.anniversary, v_window) THEN
    v_year := public.nearest_occurrence_year(v_member.anniversary, v_window);
    SELECT EXISTS(
      SELECT 1 FROM public.member_discount_redemptions mdr
      WHERE mdr.member_id = v_member.id AND mdr.reason = 'anniversary' AND mdr.period_year = v_year
    ) INTO v_redeemed;
    discount_percent := v_anniversary_pct;
    reason := 'anniversary';
    already_redeemed := v_redeemed;
    period_year := v_year;
    RETURN NEXT;
    RETURN;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_discount(TEXT, TEXT) TO anon, authenticated;

-- Actually marks this year's discount used. ON CONFLICT DO NOTHING makes
-- this safe to call even if two checkouts raced past the eligibility check
-- simultaneously — the unique constraint is the real enforcement; the
-- returned boolean just tells the caller whether *this* call was the one
-- that won.
CREATE OR REPLACE FUNCTION public.redeem_member_discount(p_email TEXT, p_phone TEXT, p_reason TEXT, p_period_year INT, p_order_id TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_clean_email TEXT := NULLIF(btrim(lower(coalesce(p_email, ''))), '');
  v_clean_phone TEXT := NULLIF(btrim(coalesce(p_phone, '')), '');
BEGIN
  IF p_reason NOT IN ('birthday', 'anniversary') THEN RETURN false; END IF;
  IF v_clean_email IS NULL AND v_clean_phone IS NULL THEN RETURN false; END IF;

  SELECT id INTO v_member_id FROM public.members m
    WHERE (v_clean_email IS NOT NULL AND lower(m.email) = v_clean_email)
       OR (v_clean_phone IS NOT NULL AND m.phone = v_clean_phone)
    ORDER BY (v_clean_email IS NOT NULL AND lower(m.email) = v_clean_email) DESC
    LIMIT 1;

  IF v_member_id IS NULL THEN RETURN false; END IF;

  INSERT INTO public.member_discount_redemptions (member_id, reason, period_year, order_id)
  VALUES (v_member_id, p_reason, p_period_year, p_order_id)
  ON CONFLICT (member_id, reason, period_year) DO NOTHING;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_member_discount(TEXT, TEXT, TEXT, INT, TEXT) TO anon, authenticated;

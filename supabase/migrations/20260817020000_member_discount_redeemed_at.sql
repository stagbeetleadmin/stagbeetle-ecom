-- Adds redeemed_at to get_member_discount's return so the admin in-store
-- lookup can show exactly when a member used their discount, not just
-- that they did. This is what backs the new "Mark as Availed" action on
-- /admin/members — in-store sales go through Galla (the POS), not this
-- site's checkout, so there was previously no way for staff to record an
-- in-store redemption at all; the only trigger that existed was the
-- automatic one inside online checkout.

DROP FUNCTION IF EXISTS public.get_member_discount(TEXT, TEXT);

CREATE FUNCTION public.get_member_discount(p_email TEXT, p_phone TEXT DEFAULT NULL)
RETURNS TABLE(discount_percent NUMERIC, reason TEXT, already_redeemed BOOLEAN, period_year INT, redeemed_at TIMESTAMPTZ)
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
  v_redeemed_at TIMESTAMPTZ;
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
    SELECT mdr.redeemed_at INTO v_redeemed_at FROM public.member_discount_redemptions mdr
      WHERE mdr.member_id = v_member.id AND mdr.reason = 'birthday' AND mdr.period_year = v_year;
    discount_percent := v_birthday_pct;
    reason := 'birthday';
    already_redeemed := v_redeemed_at IS NOT NULL;
    period_year := v_year;
    redeemed_at := v_redeemed_at;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Anniversary: unchanged ±window_days behavior.
  IF v_anniversary_pct > 0 AND public.date_is_within_window(v_member.anniversary, v_window) THEN
    v_year := public.nearest_occurrence_year(v_member.anniversary, v_window);
    SELECT mdr.redeemed_at INTO v_redeemed_at FROM public.member_discount_redemptions mdr
      WHERE mdr.member_id = v_member.id AND mdr.reason = 'anniversary' AND mdr.period_year = v_year;
    discount_percent := v_anniversary_pct;
    reason := 'anniversary';
    already_redeemed := v_redeemed_at IS NOT NULL;
    period_year := v_year;
    redeemed_at := v_redeemed_at;
    RETURN NEXT;
    RETURN;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_discount(TEXT, TEXT) TO anon, authenticated;

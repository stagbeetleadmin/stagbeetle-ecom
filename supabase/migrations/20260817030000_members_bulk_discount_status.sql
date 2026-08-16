-- Bulk version of get_member_discount, for the admin Members List table —
-- that page shows up to 100 members per page, and calling the single-member
-- RPC once per row would mean up to 100 round trips just to render an
-- "Offer Status" column. This does the same eligibility computation for a
-- whole batch of member ids in one call. Admin-only (unlike
-- get_member_discount, which anonymous checkout also calls for its own
-- eligibility check) — this is browsing other people's eligibility in bulk,
-- not checking your own, so it's gated on is_admin() directly rather than
-- being safe to expose to anon.
CREATE OR REPLACE FUNCTION public.get_members_bulk_discount_status(p_member_ids UUID[])
RETURNS TABLE(member_id UUID, discount_percent NUMERIC, reason TEXT, already_redeemed BOOLEAN, period_year INT, redeemed_at TIMESTAMPTZ)
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
  r RECORD;
  v_year INT;
  v_redeemed_at TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN;
  END IF;

  SELECT value INTO v_config FROM public.app_settings WHERE key = 'member_discount_config';
  IF v_config IS NULL THEN RETURN; END IF;

  v_active := COALESCE((v_config->>'active')::boolean, true);
  IF NOT v_active THEN RETURN; END IF;

  v_window := COALESCE((v_config->>'window_days')::int, 0);
  v_birthday_pct := COALESCE((v_config->>'birthday_percent')::numeric, 0);
  v_anniversary_pct := COALESCE((v_config->>'anniversary_percent')::numeric, 0);

  FOR r IN SELECT * FROM public.members m WHERE m.id = ANY(p_member_ids) LOOP
    IF v_birthday_pct > 0 AND r.birthday IS NOT NULL
       AND EXTRACT(MONTH FROM r.birthday) = EXTRACT(MONTH FROM CURRENT_DATE) THEN
      v_year := EXTRACT(YEAR FROM CURRENT_DATE)::int;
      SELECT mdr.redeemed_at INTO v_redeemed_at FROM public.member_discount_redemptions mdr
        WHERE mdr.member_id = r.id AND mdr.reason = 'birthday' AND mdr.period_year = v_year;
      member_id := r.id;
      discount_percent := v_birthday_pct;
      reason := 'birthday';
      already_redeemed := v_redeemed_at IS NOT NULL;
      period_year := v_year;
      redeemed_at := v_redeemed_at;
      RETURN NEXT;
      CONTINUE;
    END IF;

    IF v_anniversary_pct > 0 AND public.date_is_within_window(r.anniversary, v_window) THEN
      v_year := public.nearest_occurrence_year(r.anniversary, v_window);
      SELECT mdr.redeemed_at INTO v_redeemed_at FROM public.member_discount_redemptions mdr
        WHERE mdr.member_id = r.id AND mdr.reason = 'anniversary' AND mdr.period_year = v_year;
      member_id := r.id;
      discount_percent := v_anniversary_pct;
      reason := 'anniversary';
      already_redeemed := v_redeemed_at IS NOT NULL;
      period_year := v_year;
      redeemed_at := v_redeemed_at;
      RETURN NEXT;
      CONTINUE;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

-- authenticated only, not anon — this is an admin-browsing-everyone-else
-- capability (is_admin() enforces the real gate above; this just keeps it
-- out of reach of a fully anonymous caller entirely).
GRANT EXECUTE ON FUNCTION public.get_members_bulk_discount_status(UUID[]) TO authenticated;

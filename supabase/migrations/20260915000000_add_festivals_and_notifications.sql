-- ============================================================
-- Festival storefront decoration + admin bulk notifications.
--
-- festivals: each row is one seasonal campaign (Ganesh Chaturthi, Diwali,
-- etc.) an admin configures at /admin/festivals. `enabled` is a hard
-- kill-switch (same pattern as sale_config.active) that overrides
-- everything else. Mode picks how "is this live right now" is decided:
--   'auto'   -> live whenever now() falls inside [start_at, end_at]
--   'manual' -> live exactly when manual_active is true, dates ignored
-- Public SELECT because the storefront banner (src/components/
-- FestivalBanner.tsx) computes "what's live" client-side, the same way
-- sale pricing already reads category_discounts/product_discounts.
-- coupon_code optionally links an existing coupon so a festival can
-- "drive sales" (banner links straight to a pre-applied promo) without
-- duplicating discount logic — ON DELETE SET NULL so removing a coupon
-- later never breaks a festival row, just unlinks it.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.festivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT,
  message TEXT NOT NULL,
  theme_color TEXT, -- hex, e.g. '#F97316' — banner accent; null = default site gold
  coupon_code TEXT REFERENCES public.coupons(code) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'auto' CHECK (mode IN ('auto', 'manual')),
  manual_active BOOLEAN NOT NULL DEFAULT false, -- only read when mode = 'manual'
  enabled BOOLEAN NOT NULL DEFAULT true, -- master kill-switch, same idea as sale_config.active
  start_at TIMESTAMPTZ, -- only read when mode = 'auto'
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.festivals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read festivals" ON public.festivals;
CREATE POLICY "Public read festivals" ON public.festivals
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin writes festivals" ON public.festivals;
CREATE POLICY "Admin writes festivals" ON public.festivals
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- notification_campaigns: audit log of every bulk WhatsApp send from
-- /admin/notifications (see src/app/api/admin/notifications/send/route.ts).
-- Admin-only end to end — never read by the storefront, so no public
-- policy. `results` holds one {phone, name, status, error} entry per
-- recipient so a failed send is individually diagnosable later without
-- needing a separate per-recipient table.
CREATE TABLE IF NOT EXISTS public.notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('all_users', 'members')),
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp')),
  template_name TEXT NOT NULL,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'completed', 'failed')),
  results JSONB,
  created_by TEXT, -- admin's email, for the record — not a FK, just a label
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages notification campaigns" ON public.notification_campaigns;
CREATE POLICY "Admin manages notification campaigns" ON public.notification_campaigns
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS notification_campaigns_created_at_idx ON public.notification_campaigns (created_at DESC);

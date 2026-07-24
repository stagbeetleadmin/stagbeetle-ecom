-- Server-side cart persistence: one row per signed-in user so cart items
-- survive logout and can be restored on the next sign-in (and across devices).
CREATE TABLE IF NOT EXISTS public.carts (
  user_id TEXT PRIMARY KEY,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- Match the permissive anon-key posture used by the app's other tables
DROP POLICY IF EXISTS carts_public_select ON public.carts;
CREATE POLICY carts_public_select ON public.carts FOR SELECT USING (true);

DROP POLICY IF EXISTS carts_public_insert ON public.carts;
CREATE POLICY carts_public_insert ON public.carts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS carts_public_update ON public.carts;
CREATE POLICY carts_public_update ON public.carts FOR UPDATE USING (true);

DROP POLICY IF EXISTS carts_public_delete ON public.carts;
CREATE POLICY carts_public_delete ON public.carts FOR DELETE USING (true);

-- ============================================================
-- Month filter for the admin Membership tables
--
-- Adds two generated columns so the admin Members List page can filter
-- "show me everyone with a birthday OR anniversary in September" directly
-- through PostgREST (.or('birthday_month.eq.9,anniversary_month.eq.9'))
-- without a new RPC — admins already have full SELECT on `members` via the
-- existing "Admin manages members" is_admin() policy (see
-- 20260816000000_add_members.sql), so no new RLS is needed here either.
--
-- STORED + GENERATED so the value always tracks birthday/anniversary with
-- no app-side sync code; NULL in, NULL out (a member with no birthday set
-- just never matches any month filter, handled naturally).
-- ============================================================

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS birthday_month INTEGER
    GENERATED ALWAYS AS (EXTRACT(MONTH FROM birthday)::integer) STORED,
  ADD COLUMN IF NOT EXISTS anniversary_month INTEGER
    GENERATED ALWAYS AS (EXTRACT(MONTH FROM anniversary)::integer) STORED;

CREATE INDEX IF NOT EXISTS members_birthday_month_idx ON public.members (birthday_month) WHERE birthday_month IS NOT NULL;
CREATE INDEX IF NOT EXISTS members_anniversary_month_idx ON public.members (anniversary_month) WHERE anniversary_month IS NOT NULL;

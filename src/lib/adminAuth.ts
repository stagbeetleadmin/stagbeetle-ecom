import { createClient } from '@/utils/supabase/server';

// Server-side admin gate for /api/admin/* routes: the caller's own Supabase
// session cookie must belong to the admin account. The returned client acts
// as the admin, so admin-only RLS (e.g. reading inventory_sync_log) applies.
const ADMIN_EMAIL = 'stagbeetlebilling@gmail.com';

export type AdminClient = Awaited<ReturnType<typeof createClient>>;

export const ensureAdmin = async (): Promise<{ ok: true; supabase: AdminClient } | { ok: false; status: number }> => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, status: 401 };
    if (user.email?.toLowerCase() !== ADMIN_EMAIL) return { ok: false, status: 403 };
    return { ok: true, supabase };
  } catch {
    return { ok: false, status: 401 };
  }
};

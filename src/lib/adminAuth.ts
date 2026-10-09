import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { createClient as createCookieClient } from '@/utils/supabase/server';

// Server-side admin gate for /api/admin/* routes. The app signs in with the
// plain supabase-js client (src/lib/db.ts), which keeps the session in the
// browser's localStorage — not in a cookie — so the caller sends its access
// token as `Authorization: Bearer <token>` (see adminFetch in
// components/admin/galla/shared.tsx), the same way checkout does. A cookie
// session is still accepted as a fallback.
//
// The returned client acts AS the admin, so admin-only RLS (e.g. reading
// inventory_sync_log) applies.
const ADMIN_EMAIL = 'stagbeetlebilling@gmail.com';

export type AdminClient = SupabaseClient;

export const ensureAdmin = async (request: Request): Promise<{ ok: true; supabase: AdminClient } | { ok: false; status: number }> => {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    let supabase: AdminClient;
    let email: string | undefined;

    if (token) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      supabase = createSupabaseClient(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await supabase.auth.getUser(token);
      if (error) return { ok: false, status: 401 };
      email = data.user?.email;
    } else {
      supabase = (await createCookieClient()) as unknown as AdminClient;
      const { data } = await supabase.auth.getUser();
      email = data.user?.email;
    }

    if (!email) return { ok: false, status: 401 };
    if (email.toLowerCase() !== ADMIN_EMAIL) return { ok: false, status: 403 };
    return { ok: true, supabase };
  } catch {
    return { ok: false, status: 401 };
  }
};

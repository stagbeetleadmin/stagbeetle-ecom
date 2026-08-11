import crypto from 'crypto';
import { supabase } from './db';

// =========================================================================
// Access control for the two inventory endpoints Galla (or any inventory
// system) calls. Three layers — the first two are alternatives (either is
// accepted), the third is opt-in on top of either:
//
// 1. HMAC-SHA256 signature — the stronger option, if their platform can
//    compute one. The endpoint URL itself is not a secret (URLs leak into
//    logs, browser history, proxies); what gates access is that only
//    someone holding INVENTORY_SYNC_SECRET can produce a signature we'll
//    accept. No secret is ever transmitted in the request itself.
// 2. Bearer token (INVENTORY_SYNC_API_KEY) — a plain `Authorization: Bearer
//    <key>` header, checked with a constant-time comparison. Matches the
//    simpler auth style Galla's own outbound webhooks use, so it's the
//    fallback most integration platforms can actually send without custom
//    signing code. Weaker than HMAC (the key travels in every request) but
//    still requires possessing the secret — far better than an open endpoint.
// 3. IP allowlist — opt-in via INVENTORY_SYNC_ALLOWED_IPS. Leave it unset
//    until Galla has a static egress IP to give us; once set, requests from
//    any other address are rejected before either auth check runs.
//
// Every rejection is logged to inventory_sync_log for visibility — repeated
// failures are worth noticing, not just silently swallowed.
// =========================================================================

const parseAllowedIps = (): string[] | null => {
  const raw = process.env.INVENTORY_SYNC_ALLOWED_IPS;
  if (!raw?.trim()) return null;
  return raw.split(',').map(ip => ip.trim()).filter(Boolean);
};

// Vercel sets x-forwarded-for as a comma-separated chain; the first entry is
// the original client. Falls back to x-real-ip for other hosting setups.
const getClientIp = (request: Request): string | null => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip');
};

const logAuthFailure = async (request: Request, reason: string, clientIp: string | null) => {
  if (!supabase) return;
  try {
    await supabase.from('inventory_sync_log').insert([{
      direction: 'inbound',
      payload: { reason, ip: clientIp, path: new URL(request.url).pathname, user_agent: request.headers.get('user-agent') },
      status: 'failed',
      error_message: `Rejected: ${reason}`,
    }]);
  } catch {
    // Best-effort audit trail — never let logging itself break the auth check.
  }
};

export interface InventoryAuthResult {
  ok: boolean;
  status: number;
  error?: string;
}

// Verifies an inbound request against whichever of the two auth layers
// above is configured — either is sufficient. `rawBody` must be the exact,
// unparsed request body (empty string for GET /health) — the HMAC
// signature, when used, covers those exact bytes.
export const verifyInventoryRequest = async (request: Request, rawBody: string): Promise<InventoryAuthResult> => {
  const hmacSecret = process.env.INVENTORY_SYNC_SECRET;
  const apiKey = process.env.INVENTORY_SYNC_API_KEY;
  if (!hmacSecret && !apiKey) {
    console.error('[Inventory Auth] Neither INVENTORY_SYNC_SECRET nor INVENTORY_SYNC_API_KEY is set');
    return { ok: false, status: 500, error: 'Inventory sync not configured' };
  }

  const allowedIps = parseAllowedIps();
  if (allowedIps) {
    const clientIp = getClientIp(request);
    if (!clientIp || !allowedIps.includes(clientIp)) {
      await logAuthFailure(request, 'ip_not_allowed', clientIp);
      return { ok: false, status: 403, error: 'Forbidden' };
    }
  }

  // Layer 1: HMAC-SHA256 signature over the raw body (x-stagbeetle-signature)
  if (hmacSecret) {
    const signatureHeader = request.headers.get('x-stagbeetle-signature') || '';
    if (signatureHeader) {
      const expectedSignature = 'sha256=' + crypto.createHmac('sha256', hmacSecret).update(rawBody).digest('hex');
      const provided = Buffer.from(signatureHeader);
      const expected = Buffer.from(expectedSignature);
      if (provided.length === expected.length && crypto.timingSafeEqual(provided, expected)) {
        return { ok: true, status: 200 };
      }
    }
  }

  // Layer 2: plain bearer token (Authorization: Bearer <INVENTORY_SYNC_API_KEY>)
  if (apiKey) {
    const authHeader = request.headers.get('authorization') || '';
    const providedToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (providedToken) {
      const provided = Buffer.from(providedToken);
      const expected = Buffer.from(apiKey);
      if (provided.length === expected.length && crypto.timingSafeEqual(provided, expected)) {
        return { ok: true, status: 200 };
      }
    }
  }

  await logAuthFailure(request, 'invalid_credentials', getClientIp(request));
  return { ok: false, status: 401, error: 'Invalid or missing credentials' };
};

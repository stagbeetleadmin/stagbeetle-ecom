import crypto from 'crypto';
import { supabase } from './db';

// =========================================================================
// Access control for the two inventory endpoints Galla (or any inventory
// system) calls. Two layers, the first mandatory, the second opt-in:
//
// 1. HMAC-SHA256 signature — the real access control. The endpoint URL
//    itself is not a secret (URLs leak into logs, browser history, proxies);
//    what actually gates access is that only someone holding
//    INVENTORY_SYNC_SECRET can produce a signature we'll accept. No secret
//    is ever transmitted in the request itself, unlike a bare API key.
// 2. IP allowlist — opt-in via INVENTORY_SYNC_ALLOWED_IPS. Leave it unset
//    until Galla has a static egress IP to give us; once set, requests from
//    any other address are rejected before the signature is even checked.
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

// Verifies an inbound request against both layers above. `rawBody` must be
// the exact, unparsed request body (empty string for GET /health) — the
// signature covers those exact bytes.
export const verifyInventoryRequest = async (request: Request, rawBody: string): Promise<InventoryAuthResult> => {
  const secret = process.env.INVENTORY_SYNC_SECRET;
  if (!secret) {
    console.error('[Inventory Auth] Missing INVENTORY_SYNC_SECRET env var');
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

  const signatureHeader = request.headers.get('x-stagbeetle-signature') || '';
  const expectedSignature = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = Buffer.from(signatureHeader);
  const expected = Buffer.from(expectedSignature);
  const isValid = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);

  if (!isValid) {
    await logAuthFailure(request, 'invalid_signature', getClientIp(request));
    return { ok: false, status: 401, error: 'Invalid signature' };
  }

  return { ok: true, status: 200 };
};

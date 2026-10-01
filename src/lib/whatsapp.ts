// =========================================================================
// WHATSAPP NOTIFICATIONS (via pinbot.ai, a WhatsApp Cloud API BSP)
//
// Real contract, verified live 2026-09-12:
//   POST https://partnersv1.pinbot.ai/v3/<phone_number_id>/messages
//   Headers: Content-Type, apikey: <key>
//   Body: { messaging_product: "whatsapp", to, type: "template", template: {...} }
// Response is Meta's standard Cloud API shape — 200 with a message id and
// "message_status": "accepted" on success. "accepted" only means the
// request was queued for delivery, NOT that it was delivered — pinbot/Meta
// don't return delivery confirmation synchronously.
//
// WhatsApp Business only allows sending an outbound message via a
// pre-approved TEMPLATE (created in pinbot's dashboard or Meta Business
// Manager, then submitted for Meta's review) — free-form text is only
// allowed as a *reply* within a 24h customer-initiated session, which
// doesn't apply here. The template name + its variable/component
// structure is business-side config, not something this code can invent;
// callers must pass a real approved template name.
//
// Used by: bulk admin announcements (src/app/api/admin/notifications/send)
// and order confirmations (src/app/api/notifications/order-confirmation,
// called from checkout). Shipping-update / payment-failed sends are not
// wired yet — each needs its own approved template first.
// =========================================================================

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;
const BULK_SEND_DELAY_MS = 250; // small gap between sends so a large campaign doesn't slam the API

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  // Only for a dynamic URL button ({{1}} in the button URL). index is the
  // button's position in the template, as a string ("0" = first button).
  sub_type?: 'url';
  index?: string;
  parameters: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; image: { link: string } }
    | { type: 'currency'; currency: { fallback_value: string; code: string; amount_1000: number } }
  >;
}

interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

// Normalizes to E.164-ish digits-only with a country code — pinbot/Meta
// expect e.g. "919777729450", not "+91 97777 29450". Defaults to India (91)
// since that's every number this app collects today (checkout phone field
// has no country-code picker); a number that already has 10+ digits and
// doesn't start with 91 is left alone rather than guessed at.
export const toWhatsAppNumber = (rawPhone: string): string | null => {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length > 10) return digits;
  return null; // too short to be a real number — skip rather than guess
};

const callPinbot = async (to: string, templateName: string, components: WhatsAppTemplateComponent[]): Promise<SendResult> => {
  const url = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (!url || !apiKey) {
    return { ok: false, error: 'WhatsApp not configured (WHATSAPP_API_URL / WHATSAPP_API_KEY) — skipping' };
  }

  const payload = {
    messaging_product: 'whatsapp' as const,
    to,
    type: 'template' as const,
    template: {
      name: templateName,
      language: { code: 'en' },
      components,
    },
  };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        return { ok: true, messageId: body?.messages?.[0]?.id };
      }
      if (attempt === MAX_ATTEMPTS) {
        return { ok: false, error: body?.error?.message || body?.message || `HTTP ${res.status}` };
      }
    } catch (e: any) {
      if (attempt === MAX_ATTEMPTS) return { ok: false, error: e.message || String(e) };
    }
    await sleep(RETRY_DELAY_MS * attempt);
  }
  return { ok: false, error: 'Exhausted retries' };
};

// Single send — e.g. a one-off test message to confirm a template renders
// correctly before a bulk campaign goes out.
export const sendWhatsAppTemplate = async (
  phone: string,
  templateName: string,
  components: WhatsAppTemplateComponent[] = []
): Promise<SendResult> => {
  const to = toWhatsAppNumber(phone);
  if (!to) return { ok: false, error: `"${phone}" doesn't look like a valid phone number` };
  return callPinbot(to, templateName, components);
};

export interface BulkRecipient {
  phone: string;
  name?: string;
}

export interface BulkSendResultEntry {
  phone: string;
  name?: string;
  status: 'sent' | 'failed';
  error?: string;
}

export interface BulkSendSummary {
  total: number;
  sentCount: number;
  failedCount: number;
  results: BulkSendResultEntry[];
}

// Sends the same template to a list of recipients, one at a time with a
// small delay between each (see BULK_SEND_DELAY_MS) rather than firing all
// at once — a burst of hundreds of simultaneous requests is more likely to
// trip pinbot/Meta's own rate limiting than a steady drip is. Never throws;
// a bad number or a failed send for one recipient doesn't stop the rest.
// buildComponents lets each recipient get a personalized template (e.g. a
// {{1}} name variable) — return [] for a static template with no variables.
export const sendBulkWhatsAppTemplate = async (
  recipients: BulkRecipient[],
  templateName: string,
  buildComponents: (recipient: BulkRecipient) => WhatsAppTemplateComponent[] = () => []
): Promise<BulkSendSummary> => {
  const results: BulkSendResultEntry[] = [];
  for (const recipient of recipients) {
    const to = toWhatsAppNumber(recipient.phone);
    if (!to) {
      results.push({ phone: recipient.phone, name: recipient.name, status: 'failed', error: 'Invalid phone number' });
      continue;
    }
    const res = await callPinbot(to, templateName, buildComponents(recipient));
    results.push({
      phone: recipient.phone,
      name: recipient.name,
      status: res.ok ? 'sent' : 'failed',
      error: res.ok ? undefined : res.error,
    });
    await sleep(BULK_SEND_DELAY_MS);
  }
  return {
    total: results.length,
    sentCount: results.filter(r => r.status === 'sent').length,
    failedCount: results.filter(r => r.status === 'failed').length,
    results,
  };
};

// =========================================================================
// ORDER CONFIRMATION — template "order_confirmation" (approved 2026-09-20)
//   Header: image   Body: {{1}} first name, {{2}} order id, {{3}} total in ₹
//   Buttons: static "Visit Site" + "Call" — no button parameters needed.
// =========================================================================

export const ORDER_CONFIRMATION_TEMPLATE = 'order_confirmation';

// Meta must be able to fetch the header image (public https, jpeg/png,
// ≤5MB) or the send is accepted and then fails asynchronously with error
// 131053 — the API response never tells you. Anything that doesn't look
// safe falls back to this known-good product image.
const FALLBACK_HEADER_IMAGE =
  'https://uzhdhxfcvptgowkuupmz.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-PRP/SB-LNSH-PRP_image1_1780090073497.jpg';

const pickHeaderImage = (url: string | undefined): string => {
  const u = (url || '').trim();
  if (!/^https:\/\//i.test(u)) return FALLBACK_HEADER_IMAGE;
  if (/\.(webp|avif|gif|svg)(\?|$)/i.test(u)) return FALLBACK_HEADER_IMAGE; // WhatsApp headers take jpeg/png only
  return u;
};

export const sendOrderConfirmation = (params: {
  phone: string;
  customerName: string;
  orderId: string;
  totalRupees: number;
  imageUrl?: string;
}): Promise<SendResult> => {
  const firstName = params.customerName.trim().split(/\s+/)[0] || 'there';
  const total = params.totalRupees.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return sendWhatsAppTemplate(params.phone, ORDER_CONFIRMATION_TEMPLATE, [
    { type: 'header', parameters: [{ type: 'image', image: { link: pickHeaderImage(params.imageUrl) } }] },
    {
      type: 'body',
      parameters: [
        { type: 'text', text: firstName },
        { type: 'text', text: params.orderId },
        { type: 'text', text: total },
      ],
    },
  ]);
};

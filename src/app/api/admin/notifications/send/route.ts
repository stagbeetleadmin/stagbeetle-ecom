// POST /api/admin/notifications/send
//
// Sends a bulk WhatsApp announcement (or, with `testPhone`, a single test
// message) via src/lib/whatsapp.ts. Runs server-side only — needs
// WHATSAPP_API_KEY (never sent to the browser) and reads every recipient's
// phone number, which the admin-only RLS policies on profiles/members only
// grant to a request carrying the admin's own session cookie (checked below
// before anything else runs).
//
// Body:
//   title, message        — campaign metadata, stored for the history list;
//                            NOT what gets sent (WhatsApp only allows
//                            sending pre-approved template content, never
//                            freeform text — see src/lib/whatsapp.ts).
//   audience               — 'all_users' | 'members'
//   templateName            — the exact, already-Meta-approved template name
//   headerImageUrl (opt)    — if the template has an image header component
//   bodyVariables (opt)     — ordered strings for the template's {{1}}, {{2}}, ...
//                             body placeholders. Any variable containing the
//                             literal token "{{name}}" gets that recipient's
//                             name substituted in per-send.
//   testPhone (opt)         — skip the audience entirely and send once to
//                             this number only; not logged as a campaign.
import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendWhatsAppTemplate, sendBulkWhatsAppTemplate, WhatsAppTemplateComponent, BulkRecipient } from '@/lib/whatsapp';

const ADMIN_EMAIL = 'stagbeetlebilling@gmail.com';

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

async function ensureAdmin() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false as const, status: 401 };
    if (user.email?.toLowerCase() !== ADMIN_EMAIL) return { ok: false as const, status: 403 };
    return { ok: true as const, supabase };
  } catch {
    return { ok: false as const, status: 401 };
  }
}

const buildComponents = (headerImageUrl: string | undefined, bodyVariables: string[], recipientName: string): WhatsAppTemplateComponent[] => {
  const components: WhatsAppTemplateComponent[] = [];
  if (headerImageUrl?.trim()) {
    components.push({ type: 'header', parameters: [{ type: 'image', image: { link: headerImageUrl.trim() } }] });
  }
  if (bodyVariables.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyVariables.map(v => ({ type: 'text', text: v.replaceAll('{{name}}', recipientName || 'there') })),
    });
  }
  return components;
};

// Internal/house accounts excluded from broadcasts too — same list as
// db.ts's NON_CUSTOMER_PROFILE_EMAILS (kept in sync manually; small,
// unlikely to change, not worth a shared-module import for two rows).
const NON_CUSTOMER_PROFILE_EMAILS = ['stagbeetlebilling@gmail.com', 'admin@stagbeetle.co.in'];

export async function POST(request: NextRequest) {
  const auth = await ensureAdmin();
  if (!auth.ok) return json({ error: 'Not authorised.' }, auth.status);

  let body: {
    title?: string; message?: string; audience?: 'all_users' | 'members';
    templateName?: string; headerImageUrl?: string; bodyVariables?: string[]; testPhone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Malformed JSON body' }, 400);
  }

  const templateName = body.templateName?.trim();
  if (!templateName) return json({ error: '`templateName` is required — the exact name of an approved WhatsApp template' }, 400);
  const bodyVariables = (body.bodyVariables || []).filter(v => v.trim() !== '');

  // Test send: one message, no campaign row, no audience query.
  if (body.testPhone?.trim()) {
    const components = buildComponents(body.headerImageUrl, bodyVariables, 'there');
    const res = await sendWhatsAppTemplate(body.testPhone.trim(), templateName, components);
    return json(res.ok ? { ok: true, messageId: res.messageId } : { ok: false, error: res.error }, res.ok ? 200 : 502);
  }

  const audience = body.audience;
  if (audience !== 'all_users' && audience !== 'members') {
    return json({ error: '`audience` must be "all_users" or "members"' }, 400);
  }
  if (!body.title?.trim() || !body.message?.trim()) {
    return json({ error: '`title` and `message` are required' }, 400);
  }

  // Fetch the audience using the admin's own authenticated session — RLS
  // ("Admin reads all profiles" / members' admin policy) is what actually
  // grants this, not a service-role bypass.
  let recipients: BulkRecipient[] = [];
  try {
    if (audience === 'members') {
      const { data, error } = await auth.supabase.from('members').select('name,phone').not('phone', 'is', null);
      if (error) throw error;
      recipients = (data || []).map((m: any) => ({ phone: m.phone as string, name: m.name as string }));
    } else {
      let q: any = auth.supabase.from('profiles').select('name,phone').not('phone', 'is', null);
      for (const email of NON_CUSTOMER_PROFILE_EMAILS) q = q.not('email', 'ilike', email);
      const { data, error } = await q;
      if (error) throw error;
      recipients = (data || []).map((p: any) => ({ phone: p.phone as string, name: p.name as string }));
    }
  } catch (e: any) {
    return json({ error: `Failed to load audience: ${e.message || e}` }, 500);
  }

  if (recipients.length === 0) {
    return json({ error: 'No recipients with a phone number on file for this audience.' }, 400);
  }

  const summary = await sendBulkWhatsAppTemplate(
    recipients,
    templateName,
    (r) => buildComponents(body.headerImageUrl, bodyVariables, r.name || '')
  );

  const { data: campaign, error: insertError } = await auth.supabase
    .from('notification_campaigns')
    .insert([{
      title: body.title.trim(),
      message: body.message.trim(),
      audience,
      channel: 'whatsapp',
      template_name: templateName,
      total_recipients: summary.total,
      sent_count: summary.sentCount,
      failed_count: summary.failedCount,
      status: summary.failedCount === 0 ? 'completed' : summary.sentCount === 0 ? 'failed' : 'completed',
      results: summary.results,
      created_by: ADMIN_EMAIL,
    }])
    .select()
    .single();

  if (insertError) {
    console.warn('[Notifications] Failed to log campaign (messages were still sent):', insertError.message);
  }

  return json({ ok: true, summary, campaign: campaign || null });
}

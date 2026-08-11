import crypto from 'crypto';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

// Unlisted page for Galla's engineering team — not linked anywhere in the
// app, not admin-gated (they don't have our admin login). Access control is
// a long random token in the URL path plus a hard 30-day expiry, both
// checked server-side before any content renders. A wrong token renders
// identically to the expired/not-found case — never reveals which failed.

export const metadata: Metadata = {
  title: 'Integration Guide',
  robots: { index: false, follow: false },
};

const GUIDE_LIFETIME_DAYS = 30;

function isValidRequest(token: string): boolean {
  const expectedToken = process.env.GALLA_GUIDE_TOKEN;
  const createdAt = process.env.GALLA_GUIDE_CREATED_AT;
  if (!expectedToken || !createdAt) return false;

  const provided = Buffer.from(token);
  const expected = Buffer.from(expectedToken);
  const tokenMatches = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
  if (!tokenMatches) return false;

  const expiresAt = new Date(createdAt);
  expiresAt.setDate(expiresAt.getDate() + GUIDE_LIFETIME_DAYS);
  return new Date() <= expiresAt;
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-[#0D1B2A] text-[#dfe6ec] text-[12px] leading-relaxed rounded-sm p-4 overflow-x-auto font-mono whitespace-pre-wrap break-words">
      {children}
    </pre>
  );
}

function Section({ id, eyebrow, title, subtitle, children }: {
  id: string; eyebrow: string; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="border border-zinc-200 bg-white rounded-sm p-6 md:p-8 space-y-4 scroll-mt-6">
      <div>
        <span className="font-label-caps text-[10px] text-[#C5A059] tracking-[0.3em] block mb-1 uppercase font-semibold">{eyebrow}</span>
        <h2 className="font-display text-[20px] md:text-[22px] font-semibold text-[#0D1B2A]">{title}</h2>
        {subtitle && <p className="text-[13px] text-zinc-500 mt-1.5 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ChecklistItem({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5 py-3 border-b border-zinc-100 last:border-b-0">
      <span className="shrink-0 w-6 h-6 rounded-full bg-[#C5A059]/10 text-[#C5A059] text-[11px] font-bold flex items-center justify-center mt-0.5">{n}</span>
      <div>
        <p className="text-[13.5px] font-semibold text-[#0D1B2A]">{title}</p>
        <p className="text-[12.5px] text-zinc-500 mt-0.5 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function LedgerTable({ caption, rows }: { caption?: string; rows: { cells: string[]; mono?: boolean[] }[]; }) {
  return (
    <div className="overflow-x-auto border border-zinc-200 rounded-sm">
      <table className="w-full text-left border-collapse text-[12px]">
        {caption && (
          <caption className="text-left font-mono text-[12px] font-semibold text-[#0D1B2A] bg-[#F9F6F0] px-4 py-2.5 border-b border-zinc-200">
            {caption}
          </caption>
        )}
        <tbody className="divide-y divide-zinc-100">
          {rows.map((row, i) => (
            <tr key={i} className={i === 0 ? 'bg-zinc-50' : ''}>
              {row.cells.map((cell, j) => (
                <td
                  key={j}
                  className={`py-2.5 px-4 align-top ${i === 0 ? 'text-[10px] font-label-caps tracking-wider text-zinc-400 font-bold uppercase' : row.mono?.[j] ? 'font-mono text-[11.5px] text-[#0D1B2A]' : 'text-zinc-500'}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function GallaIntegrationGuidePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isValidRequest(token)) notFound();

  return (
    <div className="min-h-screen bg-[#FCFAF6] text-[#0D1B2A]">
      <div className="max-w-[860px] mx-auto px-6 md:px-12 py-12 md:py-16 space-y-6">

        {/* Header */}
        <div className="border-b border-zinc-200 pb-6">
          <span className="font-label-caps text-[10px] text-[#C5A059] tracking-[0.4em] block mb-2 uppercase font-semibold">STAGBEETLE · Integration Guide</span>
          <h1 className="font-display text-[28px] md:text-[34px] font-semibold leading-tight">Everything you need to run this</h1>
          <p className="text-[13.5px] text-zinc-500 mt-3 max-w-2xl leading-relaxed">
            The schema we expect, how to compute the request signature in your stack, copy-pasteable commands to test against us right now,
            and the full API reference. Every example here has been run against the live endpoint — nothing is speculative.
          </p>
          <div className="flex flex-wrap gap-2 mt-4 text-[11px] text-zinc-400">
            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-1 font-bold uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600" /> Inbound API live
            </span>
          </div>
        </div>

        {/* At a glance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="border border-zinc-200 rounded-sm p-4 bg-white">
            <div className="flex items-center gap-2 font-mono text-[12px] font-bold mb-2">
              <span className="bg-green-50 text-green-700 text-[10px] px-1.5 py-0.5 rounded-sm">POST</span>
              <span>/api/inventory/sync</span>
            </div>
            <p className="text-[12.5px] text-zinc-500 leading-relaxed">You call us — push a stock count whenever it changes. Batchable, idempotent, dry-run supported.</p>
          </div>
          <div className="border border-zinc-200 rounded-sm p-4 bg-white">
            <div className="flex items-center gap-2 font-mono text-[12px] font-bold mb-2">
              <span className="bg-[#C5A059]/10 text-[#8a6a2f] text-[10px] px-1.5 py-0.5 rounded-sm">GET</span>
              <span>/api/inventory/health</span>
            </div>
            <p className="text-[12.5px] text-zinc-500 leading-relaxed">You call us — confirm your signature and connectivity before running a real sync.</p>
          </div>
          <div className="border border-zinc-200 rounded-sm p-4 bg-white">
            <div className="flex items-center gap-2 font-mono text-[12px] font-bold mb-2">
              <span className="bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-sm">BLOCKED</span>
              <span>/webhooks/orders</span>
            </div>
            <p className="text-[12.5px] text-zinc-500 leading-relaxed">We call you — after an online sale. Contract confirmed, blocked on a loc_code 422 — see below.</p>
          </div>
        </div>

        {/* SKU & schema */}
        <Section id="sku" eyebrow="Reference" title="SKU &amp; schema" subtitle="What you need to be able to produce, and the exact shape of every event.">
          <p className="text-[13px] text-zinc-600 leading-relaxed">
            Our SKUs are <strong>Style + Colour + Size</strong>, hyphen-joined, uppercase, generated automatically in our catalog — never hand-typed:
          </p>
          <CodeBlock>{'STYLE-COLOUR-SIZE\n\n// e.g. a Satin Shirt, Cream colourway, size Medium:\nSATN-CRM-M'}</CodeBlock>
          <p className="text-[13px] text-zinc-600 leading-relaxed">
            For this to work, your system needs a way to produce this exact string for every stock unit you track. Practically:
          </p>
          <ul className="text-[13px] text-zinc-600 leading-relaxed list-disc list-inside space-y-1">
            <li>If you already track style + colour + size, send us your existing SKU (if it matches this format) or a simple mapping table.</li>
            <li>If you only track down to <em>colour</em> — that&apos;s the one gap that would block a clean integration. Flag it below; we may need a design conversation about splitting quantity by size.</li>
          </ul>
          <LedgerTable
            caption="Event schema — every object inside the events array"
            rows={[
              { cells: ['Field', 'Type', 'Required', 'Notes'] },
              { cells: ['external_event_id', 'string', 'Yes', 'Your idempotency key — unique per event, safe to retry'], mono: [true, true] },
              { cells: ['sku', 'string', 'Yes', 'Must match a SKU that already exists in our catalog'], mono: [true, true] },
              { cells: ['quantity_on_hand', 'integer ≥ 0', 'Yes', 'Total sellable count — an absolute value, not a delta'], mono: [true, true] },
              { cells: ['occurred_at', 'ISO 8601', 'Yes', 'Governs ordering — see status codes below'], mono: [true, true] },
              { cells: ['location_code', 'string', 'No', 'Accepted and stored, not yet used to split stock'], mono: [true, true] },
            ]}
          />
        </Section>

        {/* How stock is modeled */}
        <Section id="model" eyebrow="Reference" title="How stock is modeled on our side">
          <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 text-[12.5px] text-amber-900 leading-relaxed">
            <strong className="text-amber-700">Important:</strong> we track one aggregate quantity per SKU — not a per-store breakdown.
            Send the <strong>total sellable count</strong> across however many locations you operate. Three stores with 4 units combined → send <code className="font-mono bg-white/60 px-1 rounded-sm">quantity_on_hand: 4</code>.
          </div>
          <p className="text-[13px] text-zinc-600 leading-relaxed">
            A SKU we&apos;ve never received an event for is treated as available, not sold out — nothing breaks on our storefront while you&apos;re still rolling out.
          </p>
        </Section>

        {/* Computing the signature */}
        <Section id="auth" eyebrow="Reference" title="Authenticating your requests" subtitle="Two options — use whichever your platform can actually produce. Either is accepted on every request.">
          <div className="bg-[#F9F6F0] border border-[#C5A059]/25 rounded-sm p-4 text-[12.5px] text-[#0D1B2A] leading-relaxed">
            <strong className="text-[#8a6a2f]">Simplest option — bearer token.</strong> Send{' '}
            <code className="font-mono bg-white/60 px-1 rounded-sm">Authorization: Bearer &lt;API key&gt;</code>{' '}
            on every request, the same style your own order webhook (below) already uses. We send this key separately from this document.
            No signature computation needed — if your platform is a generic &quot;URL + API key&quot; integration, use this.
          </div>
          <p className="text-[13px] text-zinc-600 leading-relaxed">
            <strong>Stronger option — HMAC signature.</strong> If your platform supports custom request signing, send{' '}
            <code className="font-mono bg-zinc-100 px-1 rounded-sm">X-Stagbeetle-Signature: sha256=&lt;hex digest&gt;</code> — an
            HMAC-SHA256 of the <strong>exact raw request body</strong> (empty string for the health check), keyed with a separate shared secret (also sent separately).
            <code className="font-mono bg-zinc-100 px-1 rounded-sm ml-1">YOUR_SHARED_SECRET</code> below is a placeholder.
          </p>

          <p className="text-[11px] font-label-caps font-bold text-zinc-400 uppercase tracking-wider">Bearer token (simplest)</p>
          <CodeBlock>{`curl -X POST https://stagbeetle.co.in/api/inventory/sync \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"events":[{"external_event_id":"test-1","sku":"SATN-CRM-M","quantity_on_hand":5,"occurred_at":"2026-08-06T10:00:00Z"}]}'`}</CodeBlock>

          <p className="text-[11px] font-label-caps font-bold text-zinc-400 uppercase tracking-wider">HMAC signature — command line (openssl)</p>
          <CodeBlock>{`BODY='{"events":[{"external_event_id":"test-1","sku":"SATN-CRM-M","quantity_on_hand":5,"occurred_at":"2026-08-06T10:00:00Z"}]}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "YOUR_SHARED_SECRET" | sed 's/^.* //')

curl -X POST https://stagbeetle.co.in/api/inventory/sync \\
  -H "Content-Type: application/json" \\
  -H "X-Stagbeetle-Signature: sha256=$SIG" \\
  -d "$BODY"`}</CodeBlock>

          <p className="text-[11px] font-label-caps font-bold text-zinc-400 uppercase tracking-wider">Node.js</p>
          <CodeBlock>{`const crypto = require('crypto');

function sign(body, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

const body = JSON.stringify({ events: [/* ... */] });
const signature = sign(body, process.env.STAGBEETLE_SHARED_SECRET);

await fetch('https://stagbeetle.co.in/api/inventory/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Stagbeetle-Signature': signature },
  body,
});`}</CodeBlock>

          <p className="text-[11px] font-label-caps font-bold text-zinc-400 uppercase tracking-wider">Python</p>
          <CodeBlock>{`import hmac, hashlib, json, requests

def sign(body: str, secret: str) -> str:
    digest = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return f"sha256={digest}"

body = json.dumps({"events": [ ]})
signature = sign(body, STAGBEETLE_SHARED_SECRET)

requests.post(
    "https://stagbeetle.co.in/api/inventory/sync",
    headers={"Content-Type": "application/json", "X-Stagbeetle-Signature": signature},
    data=body,
)`}</CodeBlock>

          <div className="bg-[#F9F6F0] border border-[#C5A059]/25 rounded-sm p-4 text-[12.5px] text-[#0D1B2A] leading-relaxed">
            <strong className="text-[#8a6a2f]">Common mistake:</strong> signing a re-serialized version of the JSON (after parsing and re-stringifying)
            instead of the exact bytes you send. Whitespace, key order, or number formatting differences produce a different signature and a 401 —
            sign the literal string about to go over the wire.
          </div>
        </Section>

        {/* How to run it */}
        <Section id="runit" eyebrow="For your team" title="How to run it — step by step" subtitle="Follow in order. Steps 2–4 use dry-run or no real data; step 5 is the first real write.">
          <div>
            <ChecklistItem n={1} title="Get the shared secret from us">Sent separately from this document — not over the same channel this guide travels through.</ChecklistItem>
            <ChecklistItem n={2} title="Call the health check">Sign an empty body, GET /api/inventory/health. Expect {'{"ok": true}'}. A 401 means the signature computation is wrong — check the common mistake above first.</ChecklistItem>
            <ChecklistItem n={3} title={'Send one event with "dry_run": true'}>Use a real SKU from our catalog (ask us for a test SKU). Expect &quot;status&quot;: &quot;applied&quot; — we&apos;ll confirm nothing actually changed on our side.</ChecklistItem>
            <ChecklistItem n={4} title="Send the exact same dry-run request again">Expect &quot;status&quot;: &quot;skipped_duplicate&quot; — proves your external_event_id is stable and our idempotency check works end to end.</ChecklistItem>
            <ChecklistItem n={5} title="Send one real event (drop dry_run)">Pick a low-stakes test SKU. We can confirm from our admin panel that the count updated correctly.</ChecklistItem>
            <ChecklistItem n={6} title="Send a batch of several events in one call">Confirms your batching works before pointing this at your full catalog.</ChecklistItem>
            <ChecklistItem n={7} title="Send an out-of-order event on purpose">An event with an older occurred_at than one you already sent for the same SKU. Expect &quot;status&quot;: &quot;skipped_stale&quot; and the quantity unchanged.</ChecklistItem>
          </div>
        </Section>

        {/* Full API reference */}
        <Section id="inbound" eyebrow="Reference" title="Full API reference">
          <p className="text-[13px] font-bold font-mono text-[#0D1B2A]">POST /api/inventory/sync</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-label-caps font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Request</p>
              <CodeBlock>{`POST /api/inventory/sync
Content-Type: application/json
X-Stagbeetle-Signature: sha256=<hmac>

{
  "dry_run": false,
  "events": [
    {
      "external_event_id": "pos-evt-88213",
      "sku": "SATN-CRM-M",
      "quantity_on_hand": 12,
      "occurred_at": "2026-08-02T10:15:00Z",
      "location_code": "store_hegde_nagar"
    }
  ]
}`}</CodeBlock>
            </div>
            <div>
              <p className="text-[11px] font-label-caps font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Response — 200</p>
              <CodeBlock>{`{
  "dry_run": false,
  "results": [
    {
      "external_event_id": "pos-evt-88213",
      "status": "applied"
    }
  ]
}`}</CodeBlock>
            </div>
          </div>
          <p className="text-[13px] text-zinc-600 leading-relaxed">
            Batches accept up to <strong>500 events</strong> per call. A bad SKU in the middle doesn&apos;t fail the whole request — check each entry&apos;s own <code className="font-mono bg-zinc-100 px-1 rounded-sm">status</code>.
          </p>

          <p className="text-[13px] font-bold font-mono text-[#0D1B2A] pt-2">GET /api/inventory/health</p>
          <CodeBlock>{`GET /api/inventory/health
X-Stagbeetle-Signature: sha256=<hmac of empty string>

// 200: { "ok": true, "time": "2026-08-06T10:00:00Z" }
// 401: { "ok": false, "error": "Invalid signature" }`}</CodeBlock>
        </Section>

        {/* Status codes */}
        <Section id="codes" eyebrow="Reference" title="Status codes">
          <LedgerTable
            rows={[
              { cells: ['Code', 'Meaning', 'What to do'] },
              { cells: ['200', 'Processed', "Check each event's own status in results — a 200 doesn't guarantee every event applied"], mono: [true] },
              { cells: ['400', 'Malformed request', 'Missing a required field, empty events array, or batch over 500'], mono: [true] },
              { cells: ['401', 'Bad signature', 'Re-check the exact raw body bytes are what you signed'], mono: [true] },
              { cells: ['403', 'IP not allowed', 'Only relevant if we’ve enabled the optional IP allowlist for you'], mono: [true] },
              { cells: ['500', 'Our problem', 'Retry with backoff; contact us if it persists'], mono: [true] },
            ]}
          />
        </Section>

        {/* Outbound: order sync to Galla — confirmed contract */}
        <Section id="outbound" eyebrow="Confirmed 2026-08-11" title="Outbound: order sync (us calling you)" subtitle="The other direction — after an online sale, we POST to your orders webhook. Contract confirmed against your demo account.">
          <p className="text-[13px] font-bold font-mono text-[#0D1B2A]">POST /mystorev2/api/v2/webhooks/orders</p>
          <CodeBlock>{`POST https://retail.galla.app/mystorev2/api/v2/webhooks/orders
Content-Type: application/json
store-code: <your store code>
Authorization: Bearer <API key>
loc_code: <location code>

{
  "event": "order.created",
  "external_order_id": "order_ab12cd34e",
  "line_items": [
    { "sku": "SATN-CRM-M", "qty": 1 }
  ]
}`}</CodeBlock>
          <p className="text-[13px] text-zinc-600 leading-relaxed">
            One request per order — every line item in that order goes in a single <code className="font-mono bg-zinc-100 px-1 rounded-sm">line_items</code> array,
            not one call per SKU. <code className="font-mono bg-zinc-100 px-1 rounded-sm">external_order_id</code> is our order number, stable and unique per order.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-[12.5px] text-red-900 leading-relaxed">
            <strong className="text-red-700">Currently blocked:</strong> tested live against your demo credentials (store-code <code className="font-mono bg-white/60 px-1 rounded-sm">2h337h00ch</code>,
            loc_code <code className="font-mono bg-white/60 px-1 rounded-sm">KRT88</code>) using your exact documented request — every attempt gets back{' '}
            <code className="font-mono bg-white/60 px-1 rounded-sm">422 {'{"error":"loc_code header is required"}'}</code> even though the header is present.
            Verified this isn&apos;t on our end: same result whether <code className="font-mono bg-white/60 px-1 rounded-sm">loc_code</code> is sent as a header,
            a query param, or a body field. The 422 (not a 401) confirms auth and routing succeed — this looks like{' '}
            <code className="font-mono bg-white/60 px-1 rounded-sm">KRT88</code> isn&apos;t recognized as a valid location for this store-code/API key on your side.
            Need this resolved before we can confirm the full flow.
          </div>

          <p className="text-[13px] text-zinc-600 leading-relaxed">Still open, once the above is resolved:</p>
          <div>
            <ChecklistItem n={1} title="Production credentials">Store code, location code, and API key for the live account — everything above is your demo account.</ChecklistItem>
            <ChecklistItem n={2} title="Which loc_code for online orders?">We have 3 physical stores plus the online channel — should online sales report against one specific store, or a dedicated &quot;online&quot; location code?</ChecklistItem>
            <ChecklistItem n={3} title="Response contract on failure">What should we expect back for a rejected SKU (unknown SKU, insufficient stock, etc.) so we can log it usefully on our side?</ChecklistItem>
            <ChecklistItem n={4} title="Do you dedupe on your end?">We retry a failed call up to 3 times with the same external_order_id — does a duplicate delivery double-count on your side?</ChecklistItem>
          </div>
        </Section>

        {/* Security summary */}
        <Section id="security" eyebrow="Reference" title="Security summary">
          <ul className="text-[13px] text-zinc-600 leading-relaxed list-disc list-inside space-y-1.5">
            <li><strong className="text-[#0D1B2A]">HMAC-SHA256</strong> over the raw body — the secret itself never appears in any request, only a computed hash.</li>
            <li>The shared secret arrives <strong className="text-[#0D1B2A]">separately from this document</strong>, over a channel we&apos;ll confirm directly.</li>
            <li>An optional IP allowlist can be enabled once you share a static egress IP.</li>
            <li>Every rejected request is logged on our side with source IP and reason — if something should be working and isn&apos;t, we can check together.</li>
          </ul>
        </Section>

        <div className="text-center text-[11px] text-zinc-400 pt-4 pb-8 font-mono">
          This link is unlisted and expires automatically 30 days after it was shared.
        </div>
      </div>
    </div>
  );
}

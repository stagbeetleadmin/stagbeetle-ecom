"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';

interface IntegrationStatus {
  inboundSecretConfigured: boolean;
  inboundApiKeyConfigured: boolean;
  ipAllowlistConfigured: boolean;
  gallaOutboundUrlConfigured: boolean;
  gallaApiKeyConfigured: boolean;
  gallaStoreCodeConfigured: boolean;
  gallaLocCodeConfigured: boolean;
}

function StatusBadge({ done, urgent }: { done: boolean; urgent: boolean }) {
  const label = done ? 'Configured' : urgent ? 'Missing' : 'Not set';
  return (
    <span className={`shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border ${
      done
        ? 'bg-green-50 text-green-700 border-green-200'
        : urgent
          ? 'bg-red-50 text-red-700 border-red-200'
          : 'bg-zinc-50 text-zinc-500 border-zinc-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-green-600' : urgent ? 'bg-red-500' : 'bg-zinc-400'}`} />
      {label}
    </span>
  );
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
    <section id={id} className="border border-on-surface/5 bg-white rounded-sm p-6 md:p-8 space-y-4 scroll-mt-20">
      <div>
        <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.3em] block mb-1">{eyebrow}</span>
        <h2 className="font-display text-[20px] md:text-[22px] font-semibold text-on-surface">{title}</h2>
        {subtitle && <p className="text-[13px] text-on-surface-variant mt-1.5 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ChecklistItem({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5 py-3 border-b border-on-surface/5 last:border-b-0">
      <span className="shrink-0 w-6 h-6 rounded-full bg-gold-leaf/10 text-gold-leaf text-[11px] font-bold flex items-center justify-center mt-0.5">{n}</span>
      <div>
        <p className="text-[13.5px] font-semibold text-on-surface">{title}</p>
        <p className="text-[12.5px] text-on-surface-variant mt-0.5 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

export default function GallaIntegrationPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/admin/inventory-status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [isAdmin]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col min-h-screen bg-surface">
        <Header />
        <main className="flex-1 flex items-center justify-center py-24 text-center px-6">
          <div className="max-w-sm space-y-4">
            <span className="material-symbols-outlined text-[40px] text-gold-leaf">lock</span>
            <h1 className="font-display text-[22px] font-semibold text-on-surface">Admin Access Required</h1>
            <p className="text-[13px] text-on-surface-variant leading-relaxed">
              This page documents an internal integration and is only visible to signed-in administrators.
            </p>
            <Link
              href="/admin"
              className="inline-block bg-primary text-white px-6 py-3 text-[11px] font-label-caps tracking-widest font-semibold hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all"
            >
              GO TO ADMIN SIGN IN
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const statusItems: { key: keyof IntegrationStatus; label: string; urgent: boolean; note: string }[] = [
    { key: 'inboundSecretConfigured', label: 'INVENTORY_SYNC_SECRET', urgent: false, note: 'HMAC option for Galla calling us — either this or the API key below is required, not both.' },
    { key: 'inboundApiKeyConfigured', label: 'INVENTORY_SYNC_API_KEY', urgent: false, note: 'Simple bearer-token option for Galla calling us — the value to hand them as "the API Key" for our Inventory Sync API.' },
    { key: 'gallaOutboundUrlConfigured', label: 'GALLA_ORDERS_SYNC_URL', urgent: true, note: 'Confirmed 2026-08-11: https://retail.galla.app/mystorev2/api/v2/webhooks/orders. Currently their demo account — live-tested, blocked on a loc_code 422 on their side, see the integration guide.' },
    { key: 'gallaApiKeyConfigured', label: 'GALLA_API_KEY', urgent: true, note: 'Bearer token for calling Galla\'s order webhook — currently their demo key.' },
    { key: 'gallaStoreCodeConfigured', label: 'GALLA_STORE_CODE', urgent: true, note: 'store-code header value for the order webhook — currently their demo store code.' },
    { key: 'gallaLocCodeConfigured', label: 'GALLA_LOC_CODE', urgent: true, note: 'loc_code header value — currently their demo location (KRT88), which their API is rejecting. Needs the real production location(s) for our 3 stores + online.' },
    { key: 'ipAllowlistConfigured', label: 'INVENTORY_SYNC_ALLOWED_IPS', urgent: false, note: 'Optional hardening. Add once Galla shares their server\'s static egress IP.' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-surface selection:bg-gold-leaf/20">
      <Header />

      <main className="flex-1 relative py-12 md:py-16 bg-white">
        <div className="fixed inset-0 marble-overlay z-0"></div>

        <div className="max-w-[860px] mx-auto px-6 md:px-12 relative z-10 space-y-6">

          {/* Page header */}
          <div className="border-b border-on-surface/10 pb-6">
            <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-1">STAGBEETLE SELLER PORTAL · INTERNAL</span>
            <h1 className="font-display text-[28px] md:text-[32px] font-semibold text-on-surface">Galla Inventory Integration</h1>
            <p className="text-[13px] text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
              Reference for the stock sync between stagbeetle.co.in and Galla — what&apos;s built and tested, what&apos;s configured on this
              deployment right now, and what&apos;s still needed from Galla&apos;s side. Not linked from anywhere public.
            </p>
            <Link href="/admin" className="inline-block mt-4 text-[11px] font-label-caps font-semibold text-zinc-500 hover:text-gold-leaf underline uppercase tracking-wider">
              ← Back to Dashboard
            </Link>
          </div>

          {/* Live status */}
          <Section id="status" eyebrow="Live Status" title="What's configured on this deployment right now">
            <div className="divide-y divide-on-surface/5">
              {status === null ? (
                <p className="text-[12px] text-zinc-400 py-4">Checking configuration…</p>
              ) : (
                statusItems.map(item => (
                  <div key={item.key} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <code className="text-[12px] font-mono font-semibold text-on-surface">{item.label}</code>
                      <p className="text-[11.5px] text-on-surface-variant mt-0.5 leading-relaxed">{item.note}</p>
                    </div>
                    <StatusBadge done={status[item.key]} urgent={item.urgent} />
                  </div>
                ))
              )}
            </div>
            <p className="text-[11px] text-zinc-400 pt-1">Checked live from this server&apos;s environment variables — never shows the actual secret values, only whether they&apos;re set.</p>
          </Section>

          {/* SKU convention */}
          <Section id="sku" eyebrow="Reference" title="SKU convention" subtitle="Every stock event references one of our SKUs, built dynamically — never hardcoded.">
            <CodeBlock>{'STYLE-COLOUR-SIZE\n\n// e.g. a Satin Shirt, Cream colourway, size Medium:\nSATN-CRM-M'}</CodeBlock>
            <p className="text-[12.5px] text-on-surface-variant leading-relaxed">
              Generated automatically when a garment is saved in the catalog — Style Code + Color Code become the product&apos;s SKU, and
              each selected size appends onto it. This is the exact value Galla should send as <code className="font-mono bg-zinc-100 px-1 rounded-sm">sku</code>.
            </p>
          </Section>

          {/* How stock is modeled */}
          <Section id="model" eyebrow="Reference" title="How stock is modeled">
            <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 text-[12.5px] text-amber-900 leading-relaxed">
              <strong className="text-amber-700">Important:</strong> we track <strong>one aggregate quantity per SKU</strong> — not a per-store
              breakdown. Whatever Galla sends as <code className="font-mono bg-white/60 px-1 rounded-sm">quantity_on_hand</code> should be
              the total sellable count, however that&apos;s computed across locations. A <code className="font-mono bg-white/60 px-1 rounded-sm">location_code</code> field
              is accepted and logged for future use, but doesn&apos;t split inventory today.
            </div>
            <p className="text-[12.5px] text-on-surface-variant leading-relaxed">
              A SKU with no record at all is treated as available (untracked, not out of stock) — a product never breaks on the storefront
              just because it hasn&apos;t been synced yet.
            </p>
          </Section>

          {/* API reference */}
          <Section id="inbound" eyebrow="API Reference" title="What Galla calls — live &amp; tested" subtitle="Both endpoints are running in production right now.">
            <div className="space-y-1">
              <h3 className="text-[13px] font-bold text-on-surface font-mono">POST /api/inventory/sync</h3>
              <p className="text-[12.5px] text-on-surface-variant leading-relaxed">
                Batches up to 500 events per call. Each event needs an <code className="font-mono bg-zinc-100 px-1 rounded-sm">external_event_id</code> —
                a stable idempotency key that makes retrying the exact same call safe.
              </p>
            </div>
            <CodeBlock>{`POST /api/inventory/sync
Content-Type: application/json
X-Stagbeetle-Signature: sha256=<hmac>

{
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
            <CodeBlock>{`// Response — 200
{
  "dry_run": false,
  "results": [
    { "external_event_id": "pos-evt-88213", "status": "applied" }
  ]
}
// other statuses: skipped_duplicate · skipped_stale · sku_not_found`}</CodeBlock>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-on-surface/10 text-[10px] font-label-caps tracking-wider text-on-surface-variant font-bold">
                    <th className="pb-2">FIELD</th>
                    <th className="pb-2">TYPE</th>
                    <th className="pb-2">NOTES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-on-surface/5">
                  {[
                    ['external_event_id', 'string', 'Required. Idempotency key — replaying it is a safe no-op'],
                    ['sku', 'string', 'Required. Must match a SKU we already have'],
                    ['quantity_on_hand', 'integer', 'Required. Total sellable count, not a delta'],
                    ['occurred_at', 'ISO 8601', 'Required. Older-than-what-we-have events are rejected, not applied'],
                    ['location_code', 'string', 'Optional. Logged, not yet used to split stock'],
                  ].map(([field, type, note]) => (
                    <tr key={field}>
                      <td className="py-2 font-mono text-[11.5px] text-on-surface">{field}</td>
                      <td className="py-2 font-mono text-[11px] text-gold-leaf">{type}</td>
                      <td className="py-2 text-on-surface-variant">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-on-surface/5 pt-4 space-y-1">
              <h3 className="text-[13px] font-bold text-on-surface font-mono">Dry-run mode</h3>
              <p className="text-[12.5px] text-on-surface-variant leading-relaxed">
                Add <code className="font-mono bg-zinc-100 px-1 rounded-sm">&quot;dry_run&quot;: true</code> at the top level to validate a batch — unknown
                SKUs, stale timestamps, duplicates — without writing anything to inventory or the audit log.
              </p>
            </div>

            <div className="border-t border-on-surface/5 pt-4 space-y-1">
              <h3 className="text-[13px] font-bold text-on-surface font-mono">GET /api/inventory/health</h3>
              <p className="text-[12.5px] text-on-surface-variant leading-relaxed">
                Same signature scheme, signed over an <strong>empty body</strong>. Returns <code className="font-mono bg-zinc-100 px-1 rounded-sm">{'{ ok: true }'}</code> or 401.
              </p>
            </div>
          </Section>

          {/* Quick start */}
          <Section id="quickstart" eyebrow="For Galla's team" title="Quick start / test sequence">
            <div>
              <ChecklistItem n={1} title="Call the health check">Sign an empty body, confirm {'{"ok": true}'} comes back. A 401 means the signature computation is the first thing to check.</ChecklistItem>
              <ChecklistItem n={2} title="Send one event with dry_run: true">Use a real SKU from our catalog. Confirm &quot;status&quot;: &quot;applied&quot; and that nothing changed on our side.</ChecklistItem>
              <ChecklistItem n={3} title="Send the same dry-run event again">Confirm &quot;skipped_duplicate&quot; — proves the idempotency check works end to end.</ChecklistItem>
              <ChecklistItem n={4} title="Send one real event (no dry_run)">Pick a low-stakes test SKU. Confirm the count actually updates.</ChecklistItem>
              <ChecklistItem n={5} title="Send a batch">A handful of events in one call, before pointing us at the full catalog.</ChecklistItem>
            </div>
          </Section>

          {/* What we need from Galla */}
          <Section id="outbound" eyebrow="Outstanding" title="What we need from Galla" subtitle="The other direction — us calling them after an online sale. This is the one piece we can't finish without their input.">
            <div>
              <ChecklistItem n={1} title="The endpoint URL">Where do we POST a stock adjustment after an online order? A staging/sandbox URL first, if they have one.</ChecklistItem>
              <ChecklistItem n={2} title="Auth mechanism">API key in a header, HMAC signing like ours, OAuth — whatever they issue per-integration.</ChecklistItem>
              <ChecklistItem n={3} title="How they identify a SKU">Style-colour-size like us, or only down to colour? If coarser, we need to know before this maps cleanly.</ChecklistItem>
              <ChecklistItem n={4} title="Delta or absolute?">We&apos;d send a relative adjustment (e.g. -1) — confirm that&apos;s wanted, not us sending the new total.</ChecklistItem>
              <ChecklistItem n={5} title="Their expected payload field names">Ours are a proposal — sku, delta, reason, reference, occurred_at.</ChecklistItem>
              <ChecklistItem n={6} title="Do they dedupe on their end?">We retry a failed call up to 3 times — does a duplicate delivery double-deduct on their side?</ChecklistItem>
              <ChecklistItem n={7} title="Sandbox environment?">So we can verify real responses before this touches live store inventory.</ChecklistItem>
            </div>
            <p className="text-[12px] text-on-surface-variant pt-2 border-t border-on-surface/5">
              Once we have these, only <code className="font-mono bg-zinc-100 px-1 rounded-sm">src/lib/galla.ts</code> changes — nothing in checkout needs to change.
            </p>
          </Section>

          {/* Security */}
          <Section id="security" eyebrow="Reference" title="Auth &amp; security model">
            <ul className="space-y-2.5 text-[12.5px] text-on-surface-variant leading-relaxed list-disc list-inside">
              <li><strong className="text-on-surface">HMAC-SHA256</strong> over the raw request body, header <code className="font-mono bg-zinc-100 px-1 rounded-sm">X-Stagbeetle-Signature</code>. The secret itself never travels in any request — only the computed hash does.</li>
              <li><strong className="text-on-surface">Optional IP allowlist</strong> (<code className="font-mono bg-zinc-100 px-1 rounded-sm">INVENTORY_SYNC_ALLOWED_IPS</code>) runs before the signature check — set once Galla has a static egress IP.</li>
              <li><strong className="text-on-surface">Every rejected attempt is logged</strong> to <code className="font-mono bg-zinc-100 px-1 rounded-sm">inventory_sync_log</code> with source IP, path, and reason — visible for monitoring, not silent.</li>
              <li>The secret is <strong className="text-on-surface">not written anywhere in this document</strong> — hand it to Galla over a separate secure channel, not chat or a shareable doc.</li>
            </ul>
          </Section>

        </div>
      </main>

      <Footer />
    </div>
  );
}

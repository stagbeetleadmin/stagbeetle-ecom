"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { NotificationCampaign, getNotificationCampaigns, getAudienceCount } from '@/lib/db';

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="border border-on-surface/5 bg-white rounded-sm p-6 md:p-8 space-y-4">
      <div>
        <h2 className="font-display text-[18px] md:text-[20px] font-semibold text-on-surface">{title}</h2>
        {subtitle && <p className="text-[12.5px] text-on-surface-variant mt-1 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

const inputCls = "w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3.5 text-[13px] outline-none";
const labelCls = "text-[11px] font-label-caps font-semibold text-on-surface-variant block mb-1.5";

const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function AdminNotificationsPage() {
  const { isAdmin } = useAuth();

  const [audience, setAudience] = useState<'all_users' | 'members'>('all_users');
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [bodyVariables, setBodyVariables] = useState<string[]>([]);

  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState('');

  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState('');
  const [sendError, setSendError] = useState('');

  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  const refreshCampaigns = useCallback(() => {
    setLoadingCampaigns(true);
    getNotificationCampaigns().then(setCampaigns).finally(() => setLoadingCampaigns(false));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    refreshCampaigns();
  }, [isAdmin, refreshCampaigns]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    getAudienceCount(audience).then(count => { if (!cancelled) setAudienceCount(count); });
    return () => { cancelled = true; };
  }, [isAdmin, audience]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-24 text-center px-6">
        <div className="max-w-sm space-y-4">
          <span className="material-symbols-outlined text-[40px] text-gold-leaf">lock</span>
          <h1 className="font-display text-[22px] font-semibold text-on-surface">Admin Access Required</h1>
          <Link
            href="/admin"
            className="inline-block bg-primary text-white px-6 py-3 text-[11px] font-label-caps tracking-widest font-semibold hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all"
          >
            GO TO ADMIN SIGN IN
          </Link>
        </div>
      </div>
    );
  }

  const updateBodyVariable = (i: number, value: string) => setBodyVariables(prev => prev.map((v, idx) => (idx === i ? value : v)));
  const addBodyVariable = () => setBodyVariables(prev => [...prev, '']);
  const removeBodyVariable = (i: number) => setBodyVariables(prev => prev.filter((_, idx) => idx !== i));

  const handleSendTest = async () => {
    if (!templateName.trim()) { setTestResult('Enter a template name first.'); return; }
    if (!testPhone.trim()) { setTestResult('Enter a phone number to test with.'); return; }
    setTestSending(true);
    setTestResult('');
    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateName: templateName.trim(), headerImageUrl, bodyVariables, testPhone: testPhone.trim() }),
      });
      const data = await res.json();
      setTestResult(res.ok ? `✓ Sent — message id ${data.messageId || '(none returned)'}. Check the phone for actual delivery.` : `Failed: ${data.error || 'Unknown error'}`);
    } catch (e: any) {
      setTestResult(`Failed: ${e.message || e}`);
    } finally {
      setTestSending(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!title.trim() || !message.trim()) { setSendError('Title and message are required.'); return; }
    if (!templateName.trim()) { setSendError('Template name is required — see the note below.'); return; }
    if (!confirm(`Send this to ${audienceCount ?? 'all'} recipient(s) in "${audience === 'all_users' ? 'All registered users' : 'Members'}"? This cannot be undone.`)) return;

    setSending(true);
    setSendError('');
    setSendResult('');
    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), audience, templateName: templateName.trim(), headerImageUrl, bodyVariables }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error || 'Failed to send.');
      } else {
        setSendResult(`Sent to ${data.summary.sentCount}/${data.summary.total} — ${data.summary.failedCount} failed.`);
        setTitle(''); setMessage('');
        refreshCampaigns();
      }
    } catch (e: any) {
      setSendError(e.message || String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full space-y-6">

      <div className="border-b border-on-surface/10 pb-6">
        <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-1">STAGBEETLE ADMIN</span>
        <h1 className="font-display text-[28px] md:text-[32px] font-semibold text-on-surface">Notifications</h1>
        <p className="text-[13px] text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
          Send a WhatsApp announcement to every registered user or every member — a holiday closure, a flash sale, a festival greeting.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 text-[12.5px] text-amber-900 leading-relaxed">
        <strong className="text-amber-700">Template required:</strong> WhatsApp only allows sending pre-approved message templates,
        never freeform text — the Title/Message below are just this campaign&apos;s internal label, not what recipients actually see.
        Create and get a template approved in pinbot&apos;s dashboard first, then enter its exact name below. Use <code className="font-mono bg-white/60 px-1 rounded-sm">{'{{name}}'}</code> inside
        a body variable to have it replaced with each recipient&apos;s name.
      </div>

      {/* Compose */}
      <Section title="Compose" subtitle="Fill in the template details, send a test to yourself first, then send to the full audience.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Audience</label>
            <select value={audience} onChange={(e) => setAudience(e.target.value as 'all_users' | 'members')} className={inputCls}>
              <option value="all_users">All registered users</option>
              <option value="members">Members (birthday/anniversary program)</option>
            </select>
            <p className="text-[10.5px] text-zinc-400 mt-1">
              {audienceCount === null ? 'Counting recipients…' : `${audienceCount} recipient(s) with a phone number on file.`}
            </p>
          </div>
          <div>
            <label className={labelCls}>Approved WhatsApp template name</label>
            <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. festival_greeting" className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Title (internal label)</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ganesh Chaturthi Greeting" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Message (internal note — what this campaign is for)</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="e.g. Festival greeting + 20% off banner link" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Header image URL (optional — only if the template has an image header)</label>
          <input type="text" value={headerImageUrl} onChange={(e) => setHeaderImageUrl(e.target.value)} placeholder="https://…" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Body variables (optional — in order, matching the template&apos;s {'{{1}}'}, {'{{2}}'}, …)</label>
          <div className="space-y-2">
            {bodyVariables.map((v, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={v} onChange={(e) => updateBodyVariable(i, e.target.value)} placeholder={`{{${i + 1}}} value — try {{name}}`} className={inputCls} />
                <button type="button" onClick={() => removeBodyVariable(i)} className="text-[11px] font-semibold text-red-500 hover:text-red-700 px-2 shrink-0">Remove</button>
              </div>
            ))}
            <button type="button" onClick={addBodyVariable} className="text-[11px] font-bold text-[#052A42] hover:underline uppercase tracking-wide">+ Add variable</button>
          </div>
        </div>

        <div className="border-t border-on-surface/10 pt-4 space-y-2">
          <label className={labelCls}>Send a test to yourself first</label>
          <div className="flex gap-2">
            <input type="text" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="e.g. 9198XXXXXXX" className={inputCls} />
            <button
              type="button"
              onClick={handleSendTest}
              disabled={testSending}
              className="bg-zinc-100 text-zinc-800 border border-zinc-300 text-[11px] font-bold px-4 py-2.5 rounded-sm hover:bg-zinc-200 transition-colors disabled:opacity-60 shrink-0"
            >
              {testSending ? 'Sending…' : 'Send Test'}
            </button>
          </div>
          {testResult && <p className="text-[12px] text-zinc-600">{testResult}</p>}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSendCampaign}
            disabled={sending}
            className="bg-primary text-white text-[11px] font-bold px-5 py-3 rounded-sm hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all disabled:opacity-60"
          >
            {sending ? 'Sending…' : `Send to ${audience === 'all_users' ? 'All Registered Users' : 'Members'}`}
          </button>
          {sendResult && <span className="text-[12px] text-green-700 font-semibold">{sendResult}</span>}
          {sendError && <span className="text-[12px] text-red-600 font-semibold">{sendError}</span>}
        </div>
      </Section>

      {/* History */}
      <Section title="Campaign History" subtitle="Last 50 sends, most recent first.">
        {loadingCampaigns ? (
          <p className="text-[12px] text-zinc-400">Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-[12px] text-zinc-400">No campaigns sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-on-surface/10 text-[10px] font-label-caps tracking-wider text-on-surface-variant font-bold bg-surface-dim/60">
                  <th className="px-3 py-2.5">TITLE</th>
                  <th className="px-3 py-2.5">AUDIENCE</th>
                  <th className="px-3 py-2.5">TEMPLATE</th>
                  <th className="px-3 py-2.5">RESULT</th>
                  <th className="px-3 py-2.5">STATUS</th>
                  <th className="px-3 py-2.5">SENT</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-on-surface/5">
                {campaigns.map(c => (
                  <React.Fragment key={c.id}>
                    <tr className="hover:bg-surface-dim/30">
                      <td className="px-3 py-2.5 font-semibold text-on-surface whitespace-nowrap">{c.title}</td>
                      <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap">{c.audience === 'all_users' ? 'All users' : 'Members'}</td>
                      <td className="px-3 py-2.5 text-on-surface-variant font-mono whitespace-nowrap">{c.template_name}</td>
                      <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap">{c.sent_count}/{c.total_recipients} sent{c.failed_count > 0 ? `, ${c.failed_count} failed` : ''}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                          c.status === 'completed' ? 'text-green-700 bg-green-50 border border-green-200' :
                          c.status === 'failed' ? 'text-red-700 bg-red-50 border border-red-200' :
                          'text-zinc-500 bg-zinc-100 border border-zinc-200'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap">{fmt(c.created_at)}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        {c.failed_count > 0 && (
                          <button type="button" onClick={() => setExpandedCampaignId(prev => prev === c.id ? null : c.id)} className="text-[10.5px] font-bold text-[#052A42] hover:underline uppercase tracking-wide">
                            {expandedCampaignId === c.id ? 'Hide' : 'View failures'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedCampaignId === c.id && c.results && (
                      <tr>
                        <td colSpan={7} className="px-3 py-3 bg-red-50/50">
                          <ul className="text-[11.5px] text-red-800 space-y-1">
                            {c.results.filter(r => r.status === 'failed').map((r, i) => (
                              <li key={i}>{r.name || r.phone} ({r.phone}): {r.error || 'Unknown error'}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

    </div>
  );
}

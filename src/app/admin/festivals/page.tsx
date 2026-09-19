"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Festival, FestivalFormInput, getFestivals, saveFestival, deleteFestival, isFestivalLive } from '@/lib/db';

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

// Same local <-> ISO date/time convention as /admin/sales — see that page's
// comment for why (no timezone framework in this app; the admin's own
// wall-clock time is what "Start Date" means).
const toLocalDateInput = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
const toLocalTimeInput = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const isoToLocalParts = (iso?: string | null): { date: string; time: string } => {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: '', time: '' };
  return { date: toLocalDateInput(d), time: toLocalTimeInput(d) };
};
const localPartsToIso = (date: string, time: string): string | null => {
  if (!date) return null;
  const d = new Date(`${date}T${time || '00:00'}:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
};
const fmtIsoLocal = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

interface FestivalFieldsState {
  name: string;
  emoji: string;
  message: string;
  theme_color: string;
  coupon_code: string;
  mode: 'auto' | 'manual';
  manual_active: boolean;
  enabled: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

const EMPTY_FIELDS: FestivalFieldsState = {
  name: '', emoji: '🎉', message: '', theme_color: '#F97316', coupon_code: '',
  mode: 'auto', manual_active: false, enabled: true,
  startDate: '', startTime: '', endDate: '', endTime: '',
};

function buildFestivalInput(fields: FestivalFieldsState): { ok: true; input: FestivalFormInput } | { ok: false; error: string } {
  if (!fields.name.trim()) return { ok: false, error: 'Give the festival a name.' };
  if (!fields.message.trim()) return { ok: false, error: 'Write the banner message shoppers will see.' };
  const start_at = localPartsToIso(fields.startDate, fields.startTime);
  const end_at = localPartsToIso(fields.endDate, fields.endTime);
  if (fields.mode === 'auto' && !start_at && !end_at) {
    return { ok: false, error: 'Auto mode needs at least a start or end date — use Manual mode to control it by hand instead.' };
  }
  if (start_at && end_at && new Date(start_at) > new Date(end_at)) {
    return { ok: false, error: 'The end date/time must be after the start date/time.' };
  }
  return {
    ok: true,
    input: {
      name: fields.name.trim(),
      emoji: fields.emoji.trim() || null,
      message: fields.message.trim(),
      theme_color: fields.theme_color.trim() || null,
      coupon_code: fields.coupon_code.trim() || null,
      mode: fields.mode,
      manual_active: fields.manual_active,
      enabled: fields.enabled,
      start_at,
      end_at,
    },
  };
}

export default function AdminFestivalsPage() {
  const { isAdmin } = useAuth();

  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fields, setFields] = useState<FestivalFieldsState>(EMPTY_FIELDS);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const refresh = useCallback(() => {
    setLoading(true);
    getFestivals().then(setFestivals).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    refresh();
  }, [isAdmin, refresh]);

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

  const startEdit = (f: Festival) => {
    const start = isoToLocalParts(f.start_at);
    const end = isoToLocalParts(f.end_at);
    setEditingId(f.id);
    setFormError('');
    setFields({
      name: f.name, emoji: f.emoji || '', message: f.message, theme_color: f.theme_color || '#F97316',
      coupon_code: f.coupon_code || '', mode: f.mode, manual_active: f.manual_active, enabled: f.enabled,
      startDate: start.date, startTime: start.time, endDate: end.date, endTime: end.time,
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setFormError('');
    setFields(EMPTY_FIELDS);
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const built = buildFestivalInput(fields);
    if (!built.ok) { setFormError(built.error); return; }
    setSaving(true);
    setFormError('');
    const res = await saveFestival(built.input, editingId || undefined);
    if (res.ok) {
      cancelEdit();
      refresh();
    } else {
      setFormError(res.error || "Couldn't save — please try again.");
    }
    setSaving(false);
  };
  const handleDelete = async (f: Festival) => {
    if (!confirm(`Remove the "${f.name}" festival campaign?`)) return;
    const ok = await deleteFestival(f.id);
    if (ok) setFestivals(prev => prev.filter(x => x.id !== f.id));
  };
  // Quick on/off flip for a manual-mode festival directly from the list —
  // the common case ("turn it on now") shouldn't require opening the form.
  const handleToggleManual = async (f: Festival) => {
    const res = await saveFestival({
      name: f.name, emoji: f.emoji, message: f.message, theme_color: f.theme_color, coupon_code: f.coupon_code,
      mode: f.mode, manual_active: !f.manual_active, enabled: f.enabled, start_at: f.start_at, end_at: f.end_at,
    }, f.id);
    if (res.ok) refresh();
  };

  return (
    <div className="w-full space-y-6">

      <div className="border-b border-on-surface/10 pb-6">
        <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-1">STAGBEETLE ADMIN</span>
        <h1 className="font-display text-[28px] md:text-[32px] font-semibold text-on-surface">Festival Decorations</h1>
        <p className="text-[13px] text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
          Decorate the storefront for a festival — Ganesh Chaturthi, Diwali, and any other date you want to celebrate — and
          optionally link a coupon to drive sales during the window. Auto mode activates/deactivates on its own within the
          dates you set; Manual mode is a straight on/off switch you flip by hand, dates ignored.
        </p>
      </div>

      {/* Compose */}
      <Section title={editingId ? 'Edit Festival' : 'New Festival'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Name</label>
              <input type="text" value={fields.name} onChange={(e) => setFields({ ...fields, name: e.target.value })} placeholder="e.g. Ganesh Chaturthi" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Emoji</label>
              <input type="text" value={fields.emoji} onChange={(e) => setFields({ ...fields, emoji: e.target.value })} placeholder="🎉" className={inputCls} maxLength={4} />
            </div>
            <div>
              <label className={labelCls}>Theme color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={fields.theme_color} onChange={(e) => setFields({ ...fields, theme_color: e.target.value })} className="h-[42px] w-14 rounded-sm border border-on-surface/15 shrink-0" />
                <input type="text" value={fields.theme_color} onChange={(e) => setFields({ ...fields, theme_color: e.target.value })} className={inputCls} />
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Banner message</label>
            <input type="text" value={fields.message} onChange={(e) => setFields({ ...fields, message: e.target.value })} placeholder="e.g. Happy Ganesh Chaturthi! Celebrate with 20% off festive wear." className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Linked coupon code (optional — banner links straight to it)</label>
            <input type="text" value={fields.coupon_code} onChange={(e) => setFields({ ...fields, coupon_code: e.target.value.toUpperCase() })} placeholder="e.g. GANESH20" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Activation mode</label>
            <div className="flex gap-4 py-1">
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-on-surface">
                <input type="radio" checked={fields.mode === 'auto'} onChange={() => setFields({ ...fields, mode: 'auto' })} className="accent-[#052A42]" />
                Automatic (by date window)
              </label>
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-on-surface">
                <input type="radio" checked={fields.mode === 'manual'} onChange={() => setFields({ ...fields, mode: 'manual' })} className="accent-[#052A42]" />
                Manual (flip on/off by hand)
              </label>
            </div>
          </div>

          {fields.mode === 'auto' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Start Date</label>
                <div className="flex gap-2">
                  <input type="date" value={fields.startDate} onChange={(e) => setFields({ ...fields, startDate: e.target.value })} className={inputCls} />
                  <input type="time" value={fields.startTime} onChange={(e) => setFields({ ...fields, startTime: e.target.value })} className={inputCls} disabled={!fields.startDate} />
                </div>
              </div>
              <div>
                <label className={labelCls}>End Date</label>
                <div className="flex gap-2">
                  <input type="date" value={fields.endDate} onChange={(e) => setFields({ ...fields, endDate: e.target.value })} className={inputCls} />
                  <input type="time" value={fields.endTime} onChange={(e) => setFields({ ...fields, endTime: e.target.value })} className={inputCls} disabled={!fields.endDate} />
                </div>
              </div>
            </div>
          ) : (
            <label className="flex items-center gap-2.5 text-[13px] font-semibold text-on-surface">
              <input type="checkbox" checked={fields.manual_active} onChange={(e) => setFields({ ...fields, manual_active: e.target.checked })} className="w-4 h-4 accent-[#052A42]" />
              Live right now
            </label>
          )}

          <label className="flex items-center gap-2.5 text-[13px] font-semibold text-on-surface border-t border-on-surface/10 pt-4">
            <input type="checkbox" checked={fields.enabled} onChange={(e) => setFields({ ...fields, enabled: e.target.checked })} className="w-4 h-4 accent-[#052A42]" />
            Enabled (master switch — off overrides everything above)
          </label>

          {formError && <p className="text-[12px] text-red-600">{formError}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-gold-leaf text-obsidian-charcoal text-[11px] font-bold px-4 py-2.5 rounded-sm hover:bg-gold-leaf/90 transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : editingId ? 'Update Festival' : 'Add Festival'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800">
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </Section>

      {/* List */}
      <Section title="All Festivals">
        {loading ? (
          <p className="text-[12px] text-zinc-400">Loading…</p>
        ) : festivals.length === 0 ? (
          <p className="text-[12px] text-zinc-400">No festivals configured yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-on-surface/10 text-[10px] font-label-caps tracking-wider text-on-surface-variant font-bold bg-surface-dim/60">
                  <th className="px-3 py-2.5">FESTIVAL</th>
                  <th className="px-3 py-2.5">MODE</th>
                  <th className="px-3 py-2.5">WINDOW / SWITCH</th>
                  <th className="px-3 py-2.5">COUPON</th>
                  <th className="px-3 py-2.5">LIVE NOW</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-on-surface/5">
                {festivals.map(f => {
                  const live = isFestivalLive(f);
                  return (
                    <tr key={f.id} className="hover:bg-surface-dim/30">
                      <td className="px-3 py-2.5 font-semibold text-on-surface whitespace-nowrap">
                        <span className="mr-1.5">{f.emoji}</span>{f.name}
                        {!f.enabled && <span className="ml-2 text-[10px] text-zinc-400 font-normal">(disabled)</span>}
                      </td>
                      <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap capitalize">{f.mode}</td>
                      <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap">
                        {f.mode === 'auto'
                          ? (f.start_at || f.end_at ? `${fmtIsoLocal(f.start_at)} → ${fmtIsoLocal(f.end_at)}` : 'No window set')
                          : (
                            <button type="button" onClick={() => handleToggleManual(f)} className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${f.manual_active ? 'text-green-700 bg-green-50 border-green-200' : 'text-zinc-500 bg-zinc-100 border-zinc-200'}`}>
                              {f.manual_active ? 'ON — click to turn off' : 'OFF — click to turn on'}
                            </button>
                          )}
                      </td>
                      <td className="px-3 py-2.5 text-on-surface-variant font-mono whitespace-nowrap">{f.coupon_code || '—'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${live ? 'text-green-700 bg-green-50 border border-green-200' : 'text-zinc-500 bg-zinc-100 border border-zinc-200'}`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${live ? 'bg-green-600' : 'bg-zinc-400'}`} />
                          {live ? 'Live' : 'Not live'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-3">
                        <button type="button" onClick={() => startEdit(f)} className="text-[10.5px] font-bold text-[#052A42] hover:underline uppercase tracking-wide">Edit</button>
                        <button type="button" onClick={() => handleDelete(f)} className="text-[10.5px] font-semibold text-red-500 hover:text-red-700 uppercase tracking-wide">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

    </div>
  );
}

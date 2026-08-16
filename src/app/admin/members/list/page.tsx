"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Member, getMembersPage, deleteMember } from '@/lib/db';

const PAGE_SIZE = 100;

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// Full membership roster — a dedicated page (rather than folded into the
// settings hub) because this is the one that answers "how many members do
// we actually have" and is where a future bulk action (WhatsApp/email
// blast to everyone, or a filtered segment) would live. Paginated at 100
// rows/page server-side via .range() — this reads fine at hundreds of
// members and stays fine into the tens of thousands, since only one page
// of rows ever comes over the wire at a time.
export default function AdminMembersListPage() {
  const { isAdmin } = useAuth();

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback((targetPage: number, q: string) => {
    getMembersPage(targetPage, PAGE_SIZE, q || undefined).then(res => {
      setMembers(res.members);
      setTotal(res.total);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    load(page, activeQuery);
  }, [isAdmin, page, activeQuery, load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveQuery(query.trim());
  };

  const handleDelete = async (member: Member) => {
    if (!confirm(`Remove ${member.name} (${member.email}) from the membership list?`)) return;
    const ok = await deleteMember(member.id);
    if (ok) {
      setMembers(prev => prev.filter(m => m.id !== member.id));
      setTotal(prev => (prev !== null ? prev - 1 : prev));
    }
  };

  const totalPages = total !== null ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

  // authLoading is handled by admin/layout.tsx — nothing to do here.

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

  return (
    <div className="max-w-[1400px] space-y-6">

          <div className="border-b border-on-surface/10 pb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-1">STAGBEETLE ADMIN</span>
              <h1 className="font-display text-[26px] md:text-[30px] font-semibold text-on-surface">All Members</h1>
            </div>
            <div className="text-right">
              <span className="font-display text-[32px] font-semibold text-[#052A42] leading-none block">
                {total === null ? '—' : total.toLocaleString()}
              </span>
              <span className="text-[10.5px] font-label-caps text-on-surface-variant tracking-wider uppercase">Total Members</span>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name, email, or phone…"
              className="flex-1 bg-surface-dim border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
            />
            <button
              type="submit"
              className="bg-[#052A42] text-white text-[11px] font-bold px-4 py-2.5 rounded-sm hover:bg-[#052A42]/90 transition-colors"
            >
              Filter
            </button>
            {activeQuery && (
              <button
                type="button"
                onClick={() => { setQuery(''); setActiveQuery(''); setPage(1); }}
                className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 px-2"
              >
                Clear
              </button>
            )}
          </form>

          <div className="border border-on-surface/5 bg-white rounded-sm overflow-hidden">
            {loading ? (
              <p className="text-[12px] text-zinc-400 p-6">Loading…</p>
            ) : members.length === 0 ? (
              <p className="text-[12px] text-zinc-400 p-6">{activeQuery ? 'No members match that search.' : 'No members yet.'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-on-surface/10 text-[10px] font-label-caps tracking-wider text-on-surface-variant font-bold bg-surface-dim/60">
                      <th className="px-4 py-2.5">NAME</th>
                      <th className="px-4 py-2.5">CONTACT</th>
                      <th className="px-4 py-2.5">BIRTHDAY</th>
                      <th className="px-4 py-2.5">ANNIVERSARY</th>
                      <th className="px-4 py-2.5">SOURCE</th>
                      <th className="px-4 py-2.5">JOINED</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-on-surface/5">
                    {members.map(m => (
                      <tr key={m.id} className="hover:bg-surface-dim/30">
                        <td className="px-4 py-2.5 font-semibold text-on-surface whitespace-nowrap">{m.name}</td>
                        <td className="px-4 py-2.5 text-on-surface-variant whitespace-nowrap">{m.email}{m.phone ? ` · ${m.phone}` : ''}</td>
                        <td className="px-4 py-2.5 text-on-surface-variant whitespace-nowrap">{fmtDate(m.birthday)}</td>
                        <td className="px-4 py-2.5 text-on-surface-variant whitespace-nowrap">{fmtDate(m.anniversary)}</td>
                        <td className="px-4 py-2.5 text-on-surface-variant capitalize whitespace-nowrap">{m.source.replace('_', ' ')}</td>
                        <td className="px-4 py-2.5 text-on-surface-variant whitespace-nowrap">{new Date(m.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDelete(m)}
                            className="text-[10.5px] font-semibold text-red-500 hover:text-red-700 uppercase tracking-wide"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {total !== null && total > PAGE_SIZE && (
            <div className="flex items-center justify-between text-[12px] text-on-surface-variant">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="border border-zinc-200 rounded-sm px-3 py-1.5 font-semibold text-zinc-600 hover:border-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <span className="font-semibold text-zinc-700">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="border border-zinc-200 rounded-sm px-3 py-1.5 font-semibold text-zinc-600 hover:border-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

    </div>
  );
}

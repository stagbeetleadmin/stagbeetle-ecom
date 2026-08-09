"use client";

import React, { useState } from 'react';
import { SizeChart } from '@/lib/db';

interface CopyCandidate {
  id: string;
  title: string;
  size_chart?: SizeChart;
}

interface SizeChartEditorProps {
  sizes: string[]; // the product's currently-selected sizes — determines which rows show
  defaultChart: SizeChart; // this garment group's standard columns, pre-filled with typical values — what "Load Standard Template" loads
  value?: SizeChart;
  onChange: (chart: SizeChart | undefined) => void;
  copyCandidates: CopyCandidate[]; // other products (same garment group) with a chart already set
}

// A compact, optional-by-default measurement table. Starts collapsed to a
// single "no chart yet" row with two one-click starting points — load the
// standard columns for this garment type (pre-filled with typical values, so
// it's a glance-and-adjust rather than type-everything-yourself), or copy a
// similar product's chart wholesale.
export default function SizeChartEditor({ sizes, defaultChart, value, onChange, copyCandidates }: SizeChartEditorProps) {
  const [newMeasurement, setNewMeasurement] = useState('');
  const [showCopyMenu, setShowCopyMenu] = useState(false);

  const setCell = (size: string, measurement: string, val: string) => {
    if (!value) return;
    onChange({
      ...value,
      rows: {
        ...value.rows,
        [size]: { ...value.rows[size], [measurement]: val },
      },
    });
  };

  const addMeasurement = () => {
    const name = newMeasurement.trim();
    if (!value || !name || value.measurements.includes(name)) { setNewMeasurement(''); return; }
    onChange({ ...value, measurements: [...value.measurements, name] });
    setNewMeasurement('');
  };

  const removeMeasurement = (name: string) => {
    if (!value) return;
    const rows = Object.fromEntries(
      Object.entries(value.rows).map(([size, cells]) => {
        const { [name]: _removed, ...rest } = cells;
        return [size, rest];
      })
    );
    onChange({ ...value, measurements: value.measurements.filter(m => m !== name), rows });
  };

  if (!value) {
    return (
      <div className="border border-dashed border-zinc-300 rounded-sm p-4 text-center space-y-2.5 bg-zinc-50/50">
        <p className="text-[12px] text-zinc-500">No size chart yet — customers won&apos;t see a &quot;Size Guide&quot; for this garment.</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onChange(defaultChart)}
            className="bg-[#052A42] text-white text-[11px] font-bold px-3.5 py-2 rounded-sm hover:bg-[#052A42]/90 transition-colors"
          >
            Load Standard Template
          </button>
          {copyCandidates.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCopyMenu(o => !o)}
                className="border border-zinc-300 text-zinc-600 text-[11px] font-bold px-3.5 py-2 rounded-sm hover:border-zinc-400 transition-colors"
              >
                Copy From Another Product
              </button>
              {showCopyMenu && (
                <div className="absolute z-20 mt-1 left-1/2 -translate-x-1/2 w-64 bg-white border border-zinc-200 rounded-sm shadow-lg max-h-56 overflow-y-auto text-left">
                  {copyCandidates.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { onChange(p.size_chart); setShowCopyMenu(false); }}
                      className="w-full text-left px-3 py-2 text-[12px] text-zinc-700 hover:bg-zinc-50 truncate"
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <p className="text-[10.5px] text-zinc-400">The standard template arrives pre-filled with typical measurements — just review and adjust, no need to type every cell.</p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-200 rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 border-b border-zinc-200">
        <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-sm p-0.5">
          {(['in', 'cm'] as const).map(u => (
            <button
              key={u}
              type="button"
              onClick={() => onChange({ ...value, unit: u })}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-sm transition-colors ${
                value.unit === u ? 'bg-[#052A42] text-white' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="text-[10.5px] font-semibold text-red-500 hover:text-red-700 uppercase tracking-wide"
        >
          Clear Chart
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-zinc-200 bg-white">
              <th className="px-3 py-2 text-[10px] font-label-caps text-zinc-400 font-bold uppercase sticky left-0 bg-white">Size</th>
              {value.measurements.map(m => (
                <th key={m} className="px-3 py-2 text-[10px] font-label-caps text-zinc-400 font-bold uppercase whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    {m}
                    <button
                      type="button"
                      onClick={() => removeMeasurement(m)}
                      aria-label={`Remove ${m} column`}
                      className="text-zinc-300 hover:text-red-500 leading-none"
                    >
                      &times;
                    </button>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sizes.length === 0 ? (
              <tr><td className="px-3 py-3 text-zinc-400 italic" colSpan={value.measurements.length + 1}>Select sizes above first.</td></tr>
            ) : (
              sizes.map(size => (
                <tr key={size}>
                  <td className="px-3 py-1.5 font-bold text-zinc-700 sticky left-0 bg-white">{size}</td>
                  {value.measurements.map(m => (
                    <td key={m} className="px-3 py-1.5">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={value.rows[size]?.[m] ?? ''}
                        onChange={(e) => setCell(size, m, e.target.value)}
                        placeholder="—"
                        className="w-16 bg-surface-dim border border-zinc-200 rounded-sm py-1 px-1.5 text-[12px] outline-none focus:border-gold-leaf text-center"
                      />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-50 border-t border-zinc-200">
        <input
          type="text"
          value={newMeasurement}
          onChange={(e) => setNewMeasurement(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMeasurement(); } }}
          placeholder="Add a measurement (e.g. Bicep)…"
          className="flex-1 min-w-0 bg-white border border-zinc-200 rounded-sm px-2 py-1.5 text-[11.5px] outline-none focus:border-gold-leaf"
        />
        <button
          type="button"
          onClick={addMeasurement}
          className="text-[10.5px] font-bold text-[#052A42] hover:underline uppercase tracking-wide shrink-0 px-1"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

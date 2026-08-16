"use client";

import React, { useEffect } from 'react';
import { SizeChart, sortSizes } from '@/lib/db';

interface SizeGuideModalProps {
  title: string;
  chart: SizeChart;
  onClose: () => void;
}

// Read-only measurement table for shoppers, sourced from the same SizeChart
// data the admin SizeChartEditor writes. Kept intentionally simple — no unit
// conversion, no editing — this just needs to answer "which size fits me?"
export default function SizeGuideModal({ title, chart, onClose }: SizeGuideModalProps) {
  // Esc to close, and lock background scroll while open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Object.keys() on chart.rows follows insertion order for non-numeric
  // keys (S, M, L, ...) — a size chart row added later than the others
  // (e.g. S/XS added after M/L/XL already had rows) would otherwise render
  // at the bottom of this table instead of at the top.
  const sizes = sortSizes(Object.keys(chart.rows));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-lg sm:rounded-sm shadow-xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] text-[#C5A059] uppercase mb-0.5">Size Guide</p>
            <h3 className="text-[15px] font-bold text-gray-900 leading-snug">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close size guide"
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="overflow-auto px-5 py-4">
          <p className="text-[11px] text-gray-400 mb-3">All measurements in {chart.unit === 'in' ? 'inches' : 'centimeters'}</p>
          <div className="overflow-x-auto border border-gray-100 rounded-sm">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50">Size</th>
                  {chart.measurements.map(m => (
                    <th key={m} className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sizes.map(size => (
                  <tr key={size}>
                    <td className="px-3.5 py-2 font-bold text-gray-800 sticky left-0 bg-white">{size}</td>
                    {chart.measurements.map(m => (
                      <td key={m} className="px-3.5 py-2 text-gray-600 text-center">{chart.rows[size]?.[m] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10.5px] text-gray-400 mt-3">Measurements are approximate and may vary slightly by ±0.5{chart.unit === 'in' ? '"' : ' cm'} due to the handcrafted nature of each piece.</p>
        </div>
      </div>
    </div>
  );
}

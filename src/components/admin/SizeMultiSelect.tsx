"use client";

import React, { useState, useRef, useEffect } from 'react';

interface SizeMultiSelectProps {
  options: string[]; // predefined choices for the current context (e.g. tops or waist sizes)
  selected: string[]; // currently selected — may include values not in `options` (custom sizes)
  onChange: (sizes: string[]) => void;
  plusSizes?: string[]; // sizes to flag with a "+" — purely visual, no logic here
  placeholder?: string;
}

// Dependency-free multi-select combobox: a chip row that opens a checkbox
// dropdown, plus a free-text field for adding a size outside the predefined
// list (e.g. a one-off "42" or "Free Size"). Used for both a single
// product's sizes and the store-wide plus-size definition list.
export default function SizeMultiSelect({ options, selected, onChange, plusSizes = [], placeholder = 'Select sizes…' }: SizeMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Keeps whatever's selected in the same order as `options` (already
  // passed in the right display order for this context — e.g. S before M
  // before L) rather than the order things were clicked in. Without this, a
  // size picked later than the others (e.g. adding "S"/"XS" to a product
  // that already had M/L/XL selected) would just be appended to the end and
  // render there everywhere downstream. Anything not in `options` (a
  // free-typed custom size) keeps its own relative order, after every
  // recognized one.
  const reorder = (list: string[]): string[] => {
    const known = options.filter(o => list.includes(o));
    const custom = list.filter(s => !options.includes(s));
    return [...known, ...custom];
  };

  const toggle = (size: string) => {
    const next = selected.includes(size) ? selected.filter(s => s !== size) : [...selected, size];
    onChange(reorder(next));
  };

  const remove = (size: string) => onChange(selected.filter(s => s !== size));

  const addCustom = () => {
    const value = customInput.trim().toUpperCase();
    setCustomInput('');
    if (!value || selected.includes(value)) return;
    onChange(reorder([...selected, value]));
  };

  // Anything already selected but not in the predefined list (a custom size
  // added earlier) still needs to show up as a checked row.
  const allOptions = Array.from(new Set([...options, ...selected]));

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => setOpen(o => !o)}
        className="min-h-[42px] flex flex-wrap items-center gap-1.5 bg-surface-dim border border-on-surface/15 rounded-sm px-2.5 py-1.5 cursor-pointer hover:border-zinc-400 transition-colors"
      >
        {selected.length === 0 && <span className="text-[12px] text-zinc-400 px-1">{placeholder}</span>}
        {selected.map(size => (
          <span key={size} className="inline-flex items-center gap-1 bg-[#052A42] text-white text-[11px] font-bold pl-2 pr-1 py-1 rounded-sm">
            {size}
            {plusSizes.includes(size) && <span className="text-gold-leaf">+</span>}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(size); }}
              className="w-4 h-4 flex items-center justify-center rounded-sm hover:bg-white/20 leading-none"
              aria-label={`Remove ${size}`}
            >
              &times;
            </button>
          </span>
        ))}
        <span className="material-symbols-outlined text-[16px] text-zinc-400 ml-auto shrink-0">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-[220px] bg-white border border-zinc-200 rounded-sm shadow-lg">
          <div className="max-h-56 overflow-y-auto p-1">
            {allOptions.map(size => {
              const isSelected = selected.includes(size);
              const isPlus = plusSizes.includes(size);
              return (
                <label
                  key={size}
                  className="flex items-center gap-2 px-2.5 py-2 text-[12.5px] hover:bg-zinc-50 rounded-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(size)}
                    className="accent-[#052A42] w-3.5 h-3.5"
                  />
                  <span className="font-semibold text-zinc-700">{size}</span>
                  {isPlus && <span className="text-[9px] font-bold text-gold-leaf uppercase tracking-wide ml-auto">plus size</span>}
                </label>
              );
            })}
          </div>
          <div className="border-t border-zinc-100 p-2 flex gap-1.5">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
              placeholder="Add custom size…"
              className="flex-1 min-w-0 bg-surface-dim border border-zinc-200 rounded-sm px-2 py-1.5 text-[12px] outline-none focus:border-gold-leaf"
            />
            <button
              type="button"
              onClick={addCustom}
              className="bg-gold-leaf text-obsidian-charcoal text-[11px] font-bold px-3 rounded-sm hover:bg-gold-leaf/90 transition-colors shrink-0"
            >
              ADD
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

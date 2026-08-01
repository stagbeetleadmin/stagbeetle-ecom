"use client";

import React, { useRef, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const TOOLBAR_BUTTONS: { icon: string; command: string; arg?: string; title: string }[] = [
  { icon: 'format_bold', command: 'bold', title: 'Bold' },
  { icon: 'format_italic', command: 'italic', title: 'Italic' },
  { icon: 'format_h2', command: 'formatBlock', arg: 'H2', title: 'Heading' },
  { icon: 'format_h3', command: 'formatBlock', arg: 'H3', title: 'Subheading' },
  { icon: 'notes', command: 'formatBlock', arg: 'P', title: 'Paragraph' },
  { icon: 'format_list_bulleted', command: 'insertUnorderedList', title: 'Bullet List' },
  { icon: 'format_list_numbered', command: 'insertOrderedList', title: 'Numbered List' },
];

// A small contentEditable-based rich text editor — deliberately dependency-free
// (execCommand still works fine for this scope across current browsers) so we
// don't pull a WYSIWYG library into the bundle for one admin-only textarea.
// Uncontrolled by design: innerHTML is only set on mount, so typing never
// fights the cursor position. Pass a `key` from the parent to force a remount
// when switching between products.
export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && value) {
      editorRef.current.innerHTML = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runCommand = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    onChange(editorRef.current?.innerHTML || '');
  };

  return (
    <div className="border border-on-surface/15 rounded-sm overflow-hidden bg-surface-dim">
      <div className="flex flex-wrap items-center gap-1 border-b border-on-surface/15 bg-white px-2 py-1.5">
        {TOOLBAR_BUTTONS.map(btn => (
          <button
            key={btn.icon}
            type="button"
            title={btn.title}
            onMouseDown={(e) => e.preventDefault()} // keep focus/selection in the editor
            onClick={() => runCommand(btn.command, btn.arg)}
            className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 rounded-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">{btn.icon}</span>
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML || '')}
        onBlur={() => onChange(editorRef.current?.innerHTML || '')}
        data-placeholder={placeholder}
        className="rich-text-content w-full min-h-[110px] max-h-[280px] overflow-y-auto px-3.5 py-2.5 text-[13px] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400"
      />
    </div>
  );
}

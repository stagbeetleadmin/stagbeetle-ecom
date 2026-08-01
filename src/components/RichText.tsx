import React from 'react';
import { sanitizeHtml, looksLikeHtml } from '@/utils/sanitizeHtml';

interface RichTextProps {
  html: string;
  className?: string;
}

// Renders a product description. Handles both the new rich-text HTML format
// and legacy plain-text descriptions (which relied on "\n\n" line breaks),
// so older catalog entries keep rendering correctly without a data migration.
export default function RichText({ html, className = '' }: RichTextProps) {
  if (!html) return null;

  if (!looksLikeHtml(html)) {
    return <p className={`whitespace-pre-line ${className}`}>{html}</p>;
  }

  return (
    <div
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}

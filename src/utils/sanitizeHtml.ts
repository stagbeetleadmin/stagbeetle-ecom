// Lightweight allowlist HTML sanitizer — no dependency, works isomorphically
// (no DOM APIs), so it can run during server rendering as well as in the browser.
// Scope: rich-text garment descriptions authored only by the (authenticated)
// admin — this is defense-in-depth, not a general-purpose user-content sanitizer.

const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u',
  'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li', 'blockquote', 'div', 'span',
]);

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  let out = html;

  // Drop dangerous elements entirely, including their content
  out = out.replace(/<(script|style|iframe|object|embed|link|meta|form|input|textarea)[^>]*>[\s\S]*?<\/\1>/gi, '');
  out = out.replace(/<(script|style|iframe|object|embed|link|meta|form|input|textarea)[^>]*\/?>/gi, '');

  // Strip HTML comments (can hide conditional-comment IE exploits)
  out = out.replace(/<!--[\s\S]*?-->/g, '');

  // Strip every attribute from every remaining tag — removes onerror=, href="javascript:", style=, etc.
  // None of the allowed formatting tags need attributes.
  out = out.replace(/<([a-zA-Z0-9]+)(\s[^>]*)?>/g, (_m, tagName) => `<${String(tagName).toLowerCase()}>`);
  out = out.replace(/<\/([a-zA-Z0-9]+)\s*>/g, (_m, tagName) => `</${String(tagName).toLowerCase()}>`);

  // Unwrap (but keep the text of) any tag not on the allowlist
  out = out.replace(/<\/?([a-zA-Z0-9]+)>/g, (match, tagName) => (
    ALLOWED_TAGS.has(String(tagName).toLowerCase()) ? match : ''
  ));

  return out;
}

// True if the string looks like it contains real markup (vs. legacy plain-text
// descriptions that just used "\n\n" for paragraph breaks).
export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

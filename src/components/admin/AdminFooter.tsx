import React from 'react';

// One line, not the storefront's full multi-column link footer (shop
// categories, policy pages, social, newsletter) — none of that belongs on
// a page whose only job is managing the store.
export default function AdminFooter() {
  return (
    <footer className="w-full border-t border-on-surface/10 py-4 px-6 text-center">
      <p className="text-[10.5px] text-zinc-400 tracking-wide uppercase">
        © {new Date().getFullYear()} Stagbeetle — Admin Console
      </p>
    </footer>
  );
}

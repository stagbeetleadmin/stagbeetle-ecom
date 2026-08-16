import React from 'react';
import Link from 'next/link';
import Logo from './Logo';

// Logo-only header for focused, single-purpose landing pages (currently
// just /join) — deliberately not the full storefront Header. That one
// carries "New Arrivals"/"Men"/"Our Story" nav, a subcategory bar, search,
// and cart — all of it a distraction on a page whose entire job is "scan
// the QR code, fill in three fields, done" (often literally standing at
// the register). Same reasoning as AdminHeader: a page with one job
// shouldn't ship the whole site's navigation just for brand consistency.
export default function MinimalHeader() {
  return (
    <header className="w-full bg-white border-b border-gray-100">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="w-auto h-10 text-[#052A42]" showText={true} />
        </Link>
      </div>
    </header>
  );
}

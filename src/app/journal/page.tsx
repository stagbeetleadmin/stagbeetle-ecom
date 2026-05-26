import React from 'react';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Quarterly Journal | Stag Beetle',
  description: 'The Stag Beetle Journal — essays on craft, textile heritage, sustainable fashion, and the philosophy of dressing with intention.',
};

const articles = [
  {
    issue: 'Issue V · Spring 2026',
    title: 'The Geometry of the Mandible: How Beetle Anatomy Shapes Our Silhouettes',
    excerpt: 'Our creative director traces the line from a beetle\'s mandible to the lapel of the Bandhgala Jacket — a meditation on nature as the ultimate pattern-cutter.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    category: 'CRAFT',
    readTime: '8 min read',
  },
  {
    issue: 'Issue V · Spring 2026',
    title: 'Varanasi at Dawn: A Visit to the Banarasi Silk Weavers',
    excerpt: 'We spent three days with the Ansari family in Varanasi, watching the Jacquard loom produce the silk that becomes our Carapace Blouse. A story of patience, precision, and pride.',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80',
    category: 'HERITAGE',
    readTime: '12 min read',
  },
  {
    issue: 'Issue IV · Winter 2025',
    title: 'The Case for Buying Less, Buying Better',
    excerpt: 'In an era of fast fashion and algorithmic trends, we make the argument for a wardrobe of ten exceptional pieces over a hundred forgettable ones.',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
    category: 'PHILOSOPHY',
    readTime: '6 min read',
  },
  {
    issue: 'Issue IV · Winter 2025',
    title: 'Kashmir Wool: The World\'s Most Misunderstood Fibre',
    excerpt: 'Not all pashmina is created equal. We trace the journey from the Changthangi goat on the Changthang plateau to the finished Kashmir wool in our Obsidian Overcoat.',
    image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80',
    category: 'MATERIALS',
    readTime: '10 min read',
  },
  {
    issue: 'Issue III · Monsoon 2025',
    title: 'Jaipur Blue: The Indigo Revival',
    excerpt: 'Natural indigo dyeing nearly disappeared from Rajasthan. A new generation of artisans is bringing it back — and Stag Beetle is proud to be part of that story.',
    image: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&q=80',
    category: 'HERITAGE',
    readTime: '9 min read',
  },
  {
    issue: 'Issue III · Monsoon 2025',
    title: 'Dressing for the Monsoon: A Guide to Linen',
    excerpt: 'Linen is the most underrated fabric in the Indian wardrobe. We explain why it is the ideal choice for the subcontinent\'s climate — and how to wear it with intention.',
    image: 'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800&q=80',
    category: 'STYLE',
    readTime: '5 min read',
  },
];

export default function JournalPage() {
  const [featured, ...rest] = articles;

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />
      <main className="flex-1 pt-8 pb-24">
        <div className="max-w-container-max mx-auto px-6 md:px-12">

          <nav className="flex items-center gap-2 text-[11px] font-label-caps tracking-widest text-on-surface-variant/60 mb-12">
            <Link href="/" className="hover:text-gold-leaf transition-colors">HOME</Link>
            <span>/</span>
            <span className="text-on-surface">JOURNAL</span>
          </nav>

          <div className="flex flex-col md:flex-row justify-between items-baseline mb-16">
            <div>
              <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-3">THE INNER CIRCLE</span>
              <h1 className="font-display text-[40px] font-semibold text-on-surface leading-tight">Quarterly Journal</h1>
            </div>
            <p className="font-body text-[13px] text-on-surface-variant max-w-sm mt-4 md:mt-0 leading-relaxed">
              Essays on craft, textile heritage, and the philosophy of dressing with intention. Published four times a year.
            </p>
          </div>

          {/* Featured Article */}
          <div className="grid md:grid-cols-2 gap-0 mb-20 border border-on-surface/8">
            <div className="overflow-hidden">
              <img
                src={featured.image}
                alt={featured.title}
                className="w-full h-full object-cover min-h-[400px] hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="p-10 flex flex-col justify-center bg-surface-dim/40">
              <div className="flex items-center gap-4 mb-4">
                <span className="font-label-caps text-[9px] text-gold-leaf tracking-[0.3em]">{featured.category}</span>
                <span className="text-on-surface-variant/40 text-[11px]">·</span>
                <span className="text-[11px] text-on-surface-variant/60">{featured.readTime}</span>
              </div>
              <span className="font-label-caps text-[9px] text-on-surface-variant/50 tracking-widest block mb-3">{featured.issue}</span>
              <h2 className="font-display text-[26px] font-semibold text-on-surface mb-4 leading-snug">{featured.title}</h2>
              <p className="font-body text-[14px] text-on-surface-variant leading-relaxed mb-8">{featured.excerpt}</p>
              <span className="inline-flex items-center gap-3 text-gold-leaf font-label-caps text-[11px] tracking-widest font-semibold group cursor-pointer">
                READ ESSAY
                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-2 transition-transform">trending_flat</span>
              </span>
            </div>
          </div>

          {/* Article Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-gutter gap-y-14">
            {rest.map((article) => (
              <article key={article.title} className="group cursor-pointer">
                <div className="overflow-hidden mb-5 border border-on-surface/5">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-label-caps text-[9px] text-gold-leaf tracking-[0.3em]">{article.category}</span>
                  <span className="text-on-surface-variant/40 text-[11px]">·</span>
                  <span className="text-[11px] text-on-surface-variant/60">{article.readTime}</span>
                </div>
                <span className="font-label-caps text-[9px] text-on-surface-variant/50 tracking-widest block mb-2">{article.issue}</span>
                <h3 className="font-display text-[18px] font-semibold text-on-surface mb-3 leading-snug group-hover:text-gold-leaf transition-colors">{article.title}</h3>
                <p className="font-body text-[13px] text-on-surface-variant leading-relaxed">{article.excerpt}</p>
              </article>
            ))}
          </div>

          {/* Newsletter */}
          <div className="mt-24 border-t border-on-surface/5 pt-16 text-center">
            <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-3">SUBSCRIBE</span>
            <h3 className="font-display text-[28px] font-semibold text-on-surface mb-3">Receive the Journal</h3>
            <p className="font-body text-[14px] text-on-surface-variant mb-8 max-w-md mx-auto">
              New essays delivered to your inbox each quarter, along with early access to seasonal releases.
            </p>
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto border-b border-on-surface/20 focus-within:border-gold-leaf transition-colors py-2">
              <input
                type="email"
                placeholder="Your email address"
                required
                className="flex-grow bg-transparent border-none focus:ring-0 text-[14px] py-3 px-2 placeholder:text-outline text-on-surface outline-none"
              />
              <button
                type="submit"
                className="py-3 px-8 font-label-caps text-[11px] tracking-[0.2em] text-gold-leaf hover:text-primary transition-colors font-semibold"
              >
                SUBSCRIBE
              </button>
            </form>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

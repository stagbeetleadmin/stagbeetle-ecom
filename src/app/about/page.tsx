import React from 'react';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About | Stag Beetle — The Anatomy of Elegance',
  description: 'The story of Stag Beetle — born from biomimetic design and Savile Row tailoring, rooted in India\'s finest textile traditions.',
};

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />
      <main className="flex-1 pb-24">

        {/* Hero */}
        <section className="relative h-[60vh] min-h-[400px] flex items-end overflow-hidden bg-surface-dim">
          <img
            src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=80"
            alt="Stag Beetle Atelier"
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
          <div className="relative z-10 px-6 md:px-12 max-w-container-max mx-auto pb-16 w-full">
            <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-3">OUR STORY</span>
            <h1 className="font-display text-[48px] md:text-[64px] font-semibold text-on-surface leading-tight">
              The World of<br /><span className="text-gold-leaf italic font-normal">Stag Beetle</span>
            </h1>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-6 md:px-12 pt-20">

          <div className="space-y-16 font-body text-on-surface-variant">

            <section className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="font-display text-[32px] font-semibold text-on-surface leading-tight">A Legacy in the Making</h2>
                <p className="text-body-lg leading-relaxed font-light">
                  At Stag Beetle, we believe fashion is the ultimate protective carapace. Born from the intersection of biomimetic design and traditional Savile Row tailoring, integrated with heritage Indian textiles.
                </p>
                <p className="text-body-md leading-relaxed">
                  The stag beetle — nature&apos;s most architecturally perfect insect — is our muse. Its iridescent carapace, structural mandibles, and precise segmentation inform every silhouette, seam, and surface we create.
                </p>
              </div>
              <div className="border border-on-surface/10 p-3 bg-white shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"
                  alt="Atelier craftsmanship"
                  className="w-full h-72 object-cover"
                />
              </div>
            </section>

            <section>
              <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-4">OUR CRAFT</span>
              <h2 className="font-display text-[32px] font-semibold text-on-surface mb-6 leading-tight">Designed in London.<br />Handcrafted in Bengaluru.</h2>
              <p className="text-body-lg leading-relaxed font-light mb-6">
                Every stitch is a conscious choice. We source our cottons, silks, and wools directly from weaver co-operatives in Banaras, Jaipur, and Kashmir — paying fair prices and building long-term relationships with the artisans who keep these traditions alive.
              </p>
              <p className="text-body-md leading-relaxed">
                Our Bengaluru atelier employs 24 master tailors, each trained in both Western pattern-cutting and traditional Indian hand-finishing techniques. A single Stag Beetle garment passes through at least 12 pairs of hands before it reaches yours.
              </p>
            </section>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 border-y border-on-surface/5">
              {[
                { number: '2019', label: 'Founded' },
                { number: '24', label: 'Master Tailors' },
                { number: '6', label: 'Weaver Co-ops' },
                { number: '3', label: 'Ateliers' },
              ].map(({ number, label }) => (
                <div key={label} className="text-center">
                  <p className="font-display text-[40px] font-semibold text-gold-leaf">{number}</p>
                  <p className="font-label-caps text-[10px] tracking-widest text-on-surface-variant mt-1">{label}</p>
                </div>
              ))}
            </section>

            <section>
              <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-4">SUSTAINABILITY</span>
              <h2 className="font-display text-[32px] font-semibold text-on-surface mb-6 leading-tight">Slow Fashion, Lasting Value</h2>
              <p className="text-body-md leading-relaxed mb-4">
                We produce in limited quantities — never more than 50 units of any single style. This is not a marketing strategy; it is a commitment to quality over volume. Unsold inventory is never discounted or destroyed. It is offered to our atelier team at cost, or donated to textile preservation programmes.
              </p>
              <p className="text-body-md leading-relaxed">
                Our packaging is 100% plastic-free. Our shipping cartons are made from recycled board. We offset the carbon footprint of every delivery through verified reforestation projects in the Western Ghats.
              </p>
            </section>

          </div>

          <div className="mt-20 flex flex-col sm:flex-row gap-4">
            <Link
              href="/?category=all"
              className="bg-primary text-white px-10 py-4 font-label-caps text-[11px] tracking-[0.2em] hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all font-semibold text-center"
            >
              SHOP THE COLLECTION
            </Link>
            <Link
              href="/atelier"
              className="border border-primary/20 text-primary px-10 py-4 font-label-caps text-[11px] tracking-[0.2em] hover:bg-primary/5 transition-all text-center"
            >
              VISIT AN ATELIER
            </Link>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

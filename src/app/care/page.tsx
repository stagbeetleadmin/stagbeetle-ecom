import React from 'react';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Garment Care Guide | Stag Beetle',
  description: 'How to care for your Stag Beetle garments — silk, wool, linen, and handloom fabrics. Preserve your investment pieces for generations.',
};

const careItems = [
  {
    fabric: 'Banarasi & Mulberry Silk',
    icon: '✦',
    instructions: [
      'Dry clean only for heavily embroidered pieces.',
      'Hand wash in cold water with a pH-neutral silk detergent for plain silk.',
      'Never wring — gently press out water and roll in a clean towel.',
      'Dry flat in shade, away from direct sunlight to prevent colour fading.',
      'Iron on the lowest setting with a pressing cloth, or steam from a distance.',
      'Store in the provided dust bag, away from direct light.',
    ],
  },
  {
    fabric: 'Kashmir Wool & Wool Blends',
    icon: '◈',
    instructions: [
      'Dry clean recommended for structured pieces (jackets, overcoats).',
      'Hand wash knitwear in cold water with a wool-specific detergent.',
      'Lay flat to dry — never hang, as wool stretches under its own weight.',
      'Use a fabric shaver to remove pilling after several wears.',
      'Store folded, not hung. Use cedar blocks to deter moths.',
      'Air between wears rather than washing after every use.',
    ],
  },
  {
    fabric: 'Handloom Linen',
    icon: '◇',
    instructions: [
      'Machine wash on a gentle cycle in cold water, or hand wash.',
      'Use a mild detergent — avoid bleach, which weakens linen fibres.',
      'Tumble dry on low, or line dry. Linen softens beautifully with each wash.',
      'Iron while slightly damp on a medium-high setting for a crisp finish.',
      'Embrace natural creasing — it is part of linen\'s character.',
    ],
  },
  {
    fabric: 'Ikat & Handwoven Fabrics',
    icon: '❖',
    instructions: [
      'Dry clean for the first few washes to set the dyes.',
      'Hand wash separately in cold water — ikat dyes may bleed initially.',
      'Do not soak for more than 5 minutes.',
      'Dry in shade to preserve the vibrancy of the resist-dyed patterns.',
      'Iron on reverse side with a pressing cloth.',
    ],
  },
];

export default function CarePage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />
      <main className="flex-1 pt-8 pb-24">
        <div className="max-w-3xl mx-auto px-6 md:px-12">

          <nav className="flex items-center gap-2 text-[11px] font-label-caps tracking-widest text-on-surface-variant/60 mb-12">
            <Link href="/" className="hover:text-gold-leaf transition-colors">HOME</Link>
            <span>/</span>
            <span className="text-on-surface">GARMENT CARE GUIDE</span>
          </nav>

          <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-3">CLIENT SERVICE</span>
          <h1 className="font-display text-[40px] font-semibold text-on-surface mb-4 leading-tight">
            Garment Care Guide
          </h1>
          <p className="font-body text-body-lg text-on-surface-variant mb-16 leading-relaxed max-w-2xl">
            Our garments are crafted from rare, hand-processed textiles that reward careful attention. Treat them well and they will last a lifetime — and beyond.
          </p>

          <div className="space-y-10">
            {careItems.map((item) => (
              <div key={item.fabric} className="border border-on-surface/8 p-8 bg-surface-dim/40">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-gold-leaf text-[18px]">{item.icon}</span>
                  <h2 className="font-display text-[20px] font-semibold text-on-surface">{item.fabric}</h2>
                </div>
                <ul className="space-y-3">
                  {item.instructions.map((instruction, i) => (
                    <li key={i} className="flex gap-3 text-[14px] text-on-surface-variant leading-relaxed">
                      <span className="text-gold-leaf/50 mt-0.5 shrink-0">—</span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 bg-primary/5 border border-primary/10 p-8">
            <h3 className="font-display text-[20px] font-semibold text-on-surface mb-3">Professional Care</h3>
            <p className="text-[14px] text-on-surface-variant leading-relaxed">
              For heirloom pieces or heavily embroidered garments, we recommend our partner dry cleaners in Bengaluru, Mumbai, and Delhi. Contact us at{' '}
              <a href="mailto:stagbeetle0629@gmail.com" className="text-gold-leaf hover:underline">stagbeetle0629@gmail.com</a>{' '}
              for a referral.
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

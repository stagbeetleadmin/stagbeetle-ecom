import React from 'react';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Garment Care Guide | STAGBEETLE',
  description: 'How to care for your STAGBEETLE men\'s garments — linen shirts, tailored blazers, premium denim, and fine knits. Preserve your wardrobe for years.',
};

const careItems = [
  {
    fabric: 'Linen & Cotton Shirts (Jaipur Linen, Blends)',
    icon: '◇',
    instructions: [
      'Machine wash on a gentle cycle in cold water, or hand wash to preserve fiber strength.',
      'Use a mild, eco-friendly detergent — avoid bleach which weakens linen fibers.',
      'Line dry or tumble dry on low to prevent shrinkage. Do not wring shirts excessively.',
      'Iron shirts while slightly damp on a medium-high setting for a crisp, tailored collar and cuffs.',
      'Linen shirts soften beautifully with each wash; embrace natural creasing as part of its character.',
    ],
  },
  {
    fabric: 'Tailored Blazers, Suits & Nehru Jackets (Wool-Silk Blends)',
    icon: '✦',
    instructions: [
      'Dry clean only to maintain the structural padding, canvas linings, and shoulder builds.',
      'Never wash at home. Spot clean minor stains with a soft, damp cloth.',
      'Use a wide, contoured wooden hanger to preserve the shoulder structure of blazers and jackets.',
      'Avoid direct iron contact; use a handheld steamer from a distance to release creases.',
      'Air out after wearing before storing them back in breathable garment bags.',
    ],
  },
  {
    fabric: 'Premium Denim & Chinos (Jeans & Trousers)',
    icon: '❖',
    instructions: [
      'Wash sparingly (every 5-10 wears) to maintain the fit, color depth, and fabric integrity.',
      'Wash inside out in cold water to prevent surface fading and protect buttons and zippers.',
      'Line dry in the shade to preserve shape — high heat in dryers can warp elastane and shrink cotton.',
      'Avoid fabric softeners as they coat denim fibers and degrade their natural durability.',
      'Store jeans either neatly folded or hung by the back belt loop to prevent creasing.',
    ],
  },
  {
    fabric: 'Fine Knits, Polos & T-Shirts (Pima Cotton & Knits)',
    icon: '◈',
    instructions: [
      'Wash on a cold, delicate cycle or hand wash to prevent pilling and neckband stretching.',
      'Use a laundry mesh bag to protect premium crew necks and polos from snagging on hooks or zippers.',
      'Lay flat to dry on a clean towel — hanging wet knits can cause them to stretch out of shape.',
      'Iron on low heat on the reverse side to avoid fabric sheen or seam damage.',
      'Fold and store in drawers — do not hang premium knits to prevent hanger bumps on shoulders.',
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
            Our men\'s garments are crafted from premium, hand-processed textiles that reward careful attention. Treat them well and they will maintain their structured silhouette and drape for years to come.
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
              For heirloom pieces, suits, or heavily structured blazers, we recommend using a premium professional dry cleaner. Contact us at{' '}
              <a href="mailto:stagbeetle0629@gmail.com" className="text-gold-leaf hover:underline">stagbeetle0629@gmail.com</a>{' '}
              for recommended care providers in Bengaluru.
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-surface-dim border-t border-on-surface/5 py-16 px-6 md:px-12 mt-auto">
      <div className="max-w-container-max mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-20">
          
          <div className="col-span-2 lg:col-span-2 space-y-6">
            <Link href="/" className="flex items-center gap-3">
              <img 
                alt="Stag Beetle" 
                className="h-8 w-auto grayscale" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqKMGePWpDlYjwbusGvce8bRqkShOEkgEABl2XsgVnSR32KGcLJdjQqL8l-S9dViQyA0LojgLpmTyH7uXBBYCGJesXP0QJezENBofBcYJKXJce5oOom7Ix7ZLYhQ-_IgGV1jepTIM0h4MMTvxmiBBvxwyb6a0vreDgFyVIbrQOx2VQNDGeJ4xZLaFO37Zar1skAJB0svdxkkJRxwHcun4LNJg1AgjQC9QY73cCebEStxRntj87eetx4C1gqqDypvWMsCjdVMDjnQ"
              />
              <span className="font-label-caps text-label-caps tracking-[0.2em] text-on-surface">STAG BEETLE</span>
            </Link>
            <p className="text-[13px] text-on-surface-variant leading-relaxed max-w-sm">
              Modern luxury defined by architectural form and hand-crafted precision. Designed in London, produced in limited quantities with sustainably sourced materials.
            </p>
          </div>
          
          <div>
            <h4 className="font-label-caps text-[10px] text-gold-leaf mb-6 tracking-[0.3em]">SHOP</h4>
            <ul className="space-y-4 text-[13px] text-on-surface-variant">
              <li><Link className="hover:text-gold-leaf transition-colors" href="/?category=all">New Arrivals</Link></li>
              <li><Link className="hover:text-gold-leaf transition-colors" href="/?category=men">Men&apos;s Edit</Link></li>
              <li><Link className="hover:text-gold-leaf transition-colors" href="/?category=women">Women&apos;s Edit</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-label-caps text-[10px] text-gold-leaf mb-6 tracking-[0.3em]">CLIENT SERVICE</h4>
            <ul className="space-y-4 text-[13px] text-on-surface-variant">
              <li><Link className="hover:text-gold-leaf transition-colors" href="/shipping">Shipping &amp; Deliveries</Link></li>
              <li><Link className="hover:text-gold-leaf transition-colors" href="/returns">Returns &amp; Exchanges</Link></li>
              <li><Link className="hover:text-gold-leaf transition-colors" href="/care">Garment Care Guide</Link></li>
              <li><Link className="hover:text-gold-leaf transition-colors" href="/atelier">Atelier Booking</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-label-caps text-[10px] text-gold-leaf mb-6 tracking-[0.3em]">CONNECT</h4>
            <ul className="space-y-4 text-[13px] text-on-surface-variant">
              <li>
                <a className="hover:text-gold-leaf transition-colors" href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
              </li>
              <li>
                <a className="hover:text-gold-leaf transition-colors" href="https://www.pinterest.com" target="_blank" rel="noopener noreferrer">Pinterest</a>
              </li>
              <li><Link className="hover:text-gold-leaf transition-colors" href="/journal">Quarterly Journal</Link></li>
              <li><Link className="hover:text-gold-leaf transition-colors" href="/atelier">Atelier Locations</Link></li>
            </ul>
          </div>

        </div>
        
        <div className="pt-8 border-t border-on-surface/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[11px] text-on-surface-variant/60 uppercase tracking-widest">© 2026 Stag Beetle. Crafting the Sovereign.</p>
          <div className="flex gap-8 text-[11px] font-label-caps tracking-widest text-on-surface-variant/60">
            <Link className="hover:text-gold-leaf" href="/privacy">PRIVACY POLICY</Link>
            <Link className="hover:text-gold-leaf" href="/terms">TERMS OF USE</Link>
            <Link className="hover:text-gold-leaf" href="/cookies">COOKIE PREFERENCES</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

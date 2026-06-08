import React from 'react';
import Link from 'next/link';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="bg-surface-dim border-t border-on-surface/5 py-16 px-6 md:px-12 mt-auto">
      <div className="max-w-container-max mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-20">

          <div className="col-span-2 lg:col-span-2 space-y-6">
            <Link href="/" className="flex items-center gap-3">
              <Logo className="w-auto h-10 text-on-surface grayscale origin-left scale-[0.9] md:scale-100" showText={true} />
            </Link>
            <p className="text-[13px] text-on-surface-variant leading-relaxed max-w-sm">
              <strong className="text-on-surface block mb-2 font-display">STAGBEETLE® – Where Style Meets Confidence.</strong>
              Premium men’s fashion brand offering original, limited, and trend-setting designs. Step into elegance, comfort, and class — all under one roof. All garments are designed and handcrafted in-house at our Bengaluru atelier in Karnataka, India.
            </p>

            {/* Social Connection Hub */}
            <div className="flex items-center gap-3.5 pt-2">
              <a
                href="https://wa.me/919035203203"
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-surface-variant hover:text-green-600 transition-colors p-2 border border-on-surface/10 rounded-full hover:border-green-600/30 bg-surface-dim/40 flex items-center justify-center"
                aria-label="WhatsApp Business"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.37 5.378.002 12.012.002c3.212.001 6.231 1.254 8.5 3.527 2.268 2.27 3.516 5.287 3.515 8.497-.003 6.643-5.378 12.013-12.014 12.013-2.005 0-3.973-.5-5.713-1.454L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.92 1.452 5.53 0 10.029-4.5 10.032-10.03.001-2.68-1.036-5.197-2.923-7.086-1.886-1.88-4.398-2.914-7.082-2.915-5.535 0-10.036 4.5-10.038 10.03-.001 1.91.503 3.778 1.464 5.415l-.993 3.626 3.712-.973zm12.01-6.177c-.312-.156-1.848-.912-2.136-1.017-.288-.105-.497-.156-.707.156-.21.312-.81 1.016-.992 1.22-.18.204-.36.23-.672.074-1.748-.874-2.884-1.637-3.82-3.242-.249-.427.249-.396.71-.157.067.034.133.067.195.1.28.14.39.17.47.33.09.18.04.35-.02.5-.06.15-.56 1.347-.76 1.84-.2.48-.4.4-.67.387-.21-.01-.45-.01-.68-.01-.23 0-.61.09-.93.43-.32.35-1.22 1.19-1.22 2.91 0 1.72 1.25 3.39 1.43 3.62.18.23 2.46 3.76 5.96 5.27.83.36 1.48.57 1.99.73.84.27 1.61.23 2.21.14.67-.1 1.85-.75 2.11-1.47.26-.71.26-1.32.18-1.46-.08-.13-.28-.21-.59-.37z" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/stagbeetle.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-surface-variant hover:text-blue-600 transition-colors p-2 border border-on-surface/10 rounded-full hover:border-blue-600/30 bg-surface-dim/40 flex items-center justify-center"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-surface-variant hover:text-pink-600 transition-colors p-2 border border-on-surface/10 rounded-full hover:border-pink-600/30 bg-surface-dim/40 flex items-center justify-center"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-label-caps text-[10px] text-gold-leaf mb-6 tracking-[0.3em]">SHOP</h4>
            <ul className="space-y-4 text-[13px] text-on-surface-variant">
              <li><Link className="hover:text-gold-leaf transition-colors" href="/?category=all">New Arrivals</Link></li>
              <li><Link className="hover:text-gold-leaf transition-colors" href="/?category=men">Men&apos;s Edit</Link></li>
              {/* <li><Link className="hover:text-gold-leaf transition-colors" href="/?category=women">Women&apos;s Edit</Link></li> */}
            </ul>
          </div>

          <div>
            <h4 className="font-label-caps text-[10px] text-gold-leaf mb-6 tracking-[0.3em]">CLIENT SERVICE</h4>
            <ul className="space-y-4 text-[13px] text-on-surface-variant">
              <li><Link className="hover:text-gold-leaf transition-colors" href="/shipping">Shipping &amp; Deliveries</Link></li>
              <li><Link className="hover:text-gold-leaf transition-colors" href="/returns">Returns &amp; Exchanges</Link></li>
              <li><Link className="hover:text-gold-leaf transition-colors" href="/care">Garment Care Guide</Link></li>
              <li><Link className="hover:text-gold-leaf transition-colors" href="/stores">Book Consultation</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-label-caps text-[10px] text-gold-leaf mb-6 tracking-[0.3em]">CONNECT</h4>
            <ul className="space-y-4 text-[13px] text-on-surface-variant">
              <li>
                <a className="hover:text-gold-leaf transition-colors" href="https://wa.me/919035203203" target="_blank" rel="noopener noreferrer">WhatsApp Business</a>
              </li>
              <li>
                <a className="hover:text-gold-leaf transition-colors" href="https://www.facebook.com/stagbeetle.in/" target="_blank" rel="noopener noreferrer">Facebook Page</a>
              </li>
              <li>
                <a className="hover:text-gold-leaf transition-colors" href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">Instagram Profile</a>
              </li>
              <li><Link className="hover:text-gold-leaf transition-colors" href="/stores">Store Locations</Link></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-on-surface/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[11px] text-on-surface-variant/60 uppercase tracking-widest">© 2026 STAGBEETLE. Crafting the Sovereign.</p>
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

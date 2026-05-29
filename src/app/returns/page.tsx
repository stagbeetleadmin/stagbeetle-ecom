import React from 'react';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Returns & Exchanges | Stag Beetle',
  description: 'Our hassle-free 14-day return and exchange policy. Learn how to initiate a return or exchange for your Stag Beetle garment.',
};

export default function ReturnsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />
      <main className="flex-1 pt-8 pb-24">
        <div className="max-w-3xl mx-auto px-6 md:px-12">

          <nav className="flex items-center gap-2 text-[11px] font-label-caps tracking-widest text-on-surface-variant/60 mb-12">
            <Link href="/" className="hover:text-gold-leaf transition-colors">HOME</Link>
            <span>/</span>
            <span className="text-on-surface">RETURNS &amp; EXCHANGES</span>
          </nav>

          <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-3">CLIENT SERVICE</span>
          <h1 className="font-display text-[40px] font-semibold text-on-surface mb-12 leading-tight">
            Returns &amp; Exchanges
          </h1>

          <div className="space-y-12 font-body text-on-surface-variant">

            <section>
              <h2 className="font-display text-[22px] font-semibold text-on-surface mb-4">Our Policy</h2>
              <p className="text-body-md leading-relaxed mb-4">
                We want you to love every piece you receive. If for any reason you are not completely satisfied, we accept returns and exchanges within <strong className="text-on-surface">14 days</strong> of delivery, provided the garment is unworn, unwashed, and in its original packaging with all tags attached.
              </p>
              <div className="bg-gold-leaf/5 border border-gold-leaf/20 p-5 rounded-sm">
                <p className="text-[13px] text-on-surface font-semibold mb-1">Please note</p>
                <p className="text-[13px] leading-relaxed">
                  Made-to-order and bespoke pieces are non-returnable. Sale items are eligible for exchange only. Accessories (scarves, pins) must be returned in sealed original packaging.
                </p>
              </div>
            </section>

            <section>
              <h2 className="font-display text-[22px] font-semibold text-on-surface mb-4">How to Initiate a Return</h2>
              <ol className="space-y-4 text-[14px] leading-relaxed list-none">
                {[
                  { step: '01', text: 'Email us at stagbeetle0629@gmail.com with your order number and reason for return. We will respond within 24 hours with a Return Merchandise Authorisation (RMA) number.' },
                  { step: '02', text: 'Pack the garment securely in its original dust bag and box. Write the RMA number clearly on the outer packaging.' },
                  { step: '03', text: 'Drop the parcel at any DTDC or Blue Dart outlet. We will provide a prepaid return label for domestic orders.' },
                  { step: '04', text: 'Once we receive and inspect the garment (2–3 business days), your refund or exchange will be processed within 5–7 business days.' },
                ].map(({ step, text }) => (
                  <li key={step} className="flex gap-5">
                    <span className="font-display text-[28px] text-gold-leaf/30 font-semibold leading-none mt-0.5 shrink-0">{step}</span>
                    <p>{text}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h2 className="font-display text-[22px] font-semibold text-on-surface mb-4">Refunds</h2>
              <p className="text-body-md leading-relaxed">
                Approved refunds are credited to your original payment method. Bank transfers and UPI refunds typically reflect within 5–7 business days. Credit/debit card refunds may take up to 10 business days depending on your bank.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[22px] font-semibold text-on-surface mb-4">Exchanges</h2>
              <p className="text-body-md leading-relaxed">
                We are happy to exchange for a different size or colour, subject to availability. If the desired item is out of stock, we will issue a store credit valid for 12 months.
              </p>
            </section>

          </div>

          <div className="mt-16 pt-8 border-t border-on-surface/5">
            <p className="text-[13px] text-on-surface-variant">
              Need help? Email <a href="mailto:stagbeetle0629@gmail.com" className="text-gold-leaf hover:underline">stagbeetle0629@gmail.com</a> or visit our{' '}
              <Link href="/shipping" className="text-gold-leaf hover:underline">Shipping page</Link>.
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

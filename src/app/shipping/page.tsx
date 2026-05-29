import React from 'react';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Shipping & Deliveries | Stag Beetle',
  description: 'Complimentary shipping across India. Learn about our delivery timelines, packaging, and international shipping options.',
};

export default function ShippingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />
      <main className="flex-1 pt-8 pb-24">
        <div className="max-w-3xl mx-auto px-6 md:px-12">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[11px] font-label-caps tracking-widest text-on-surface-variant/60 mb-12">
            <Link href="/" className="hover:text-gold-leaf transition-colors">HOME</Link>
            <span>/</span>
            <span className="text-on-surface">SHIPPING &amp; DELIVERIES</span>
          </nav>

          <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-3">CLIENT SERVICE</span>
          <h1 className="font-display text-[40px] font-semibold text-on-surface mb-12 leading-tight">
            Shipping &amp; Deliveries
          </h1>

          <div className="space-y-12 font-body text-on-surface-variant">

            <section>
              <h2 className="font-display text-[22px] font-semibold text-on-surface mb-4">Complimentary Shipping Across India</h2>
              <p className="text-body-md leading-relaxed mb-4">
                Every Stag Beetle order ships complimentary across India, regardless of order value. We partner with premium courier services to ensure your garments arrive in pristine condition.
              </p>
              <div className="bg-surface-dim border border-on-surface/5 p-6 space-y-3">
                <div className="flex justify-between text-[13px]">
                  <span className="font-semibold text-on-surface">Standard Delivery (India)</span>
                  <span className="text-gold-leaf font-semibold">Complimentary · 5–7 business days</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="font-semibold text-on-surface">Express Delivery (India)</span>
                  <span>₹499 · 2–3 business days</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="font-semibold text-on-surface">Same-Day (Bengaluru only)</span>
                  <span>₹999 · Order before 12 PM</span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-[22px] font-semibold text-on-surface mb-4">International Shipping</h2>
              <p className="text-body-md leading-relaxed mb-4">
                We ship to over 40 countries worldwide. International orders are dispatched via DHL Express and typically arrive within 7–14 business days depending on destination and customs clearance.
              </p>
              <div className="bg-surface-dim border border-on-surface/5 p-6 space-y-3">
                <div className="flex justify-between text-[13px]">
                  <span className="font-semibold text-on-surface">South Asia (Sri Lanka, Nepal, Bangladesh)</span>
                  <span>₹1,200 · 5–8 days</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="font-semibold text-on-surface">Middle East &amp; Southeast Asia</span>
                  <span>₹2,500 · 7–10 days</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="font-semibold text-on-surface">Europe, UK &amp; Americas</span>
                  <span>₹3,500 · 10–14 days</span>
                </div>
              </div>
              <p className="text-[12px] text-on-surface-variant/60 mt-3">
                Import duties and taxes are the responsibility of the recipient and are not included in the shipping fee.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[22px] font-semibold text-on-surface mb-4">Our Packaging</h2>
              <p className="text-body-md leading-relaxed">
                Each garment is wrapped in acid-free tissue paper, placed in a signature Stag Beetle dust bag, and housed in our rigid gift box — crafted from 100% recycled board. The outer shipping carton is fully recyclable. We never use single-use plastic.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[22px] font-semibold text-on-surface mb-4">Order Tracking</h2>
              <p className="text-body-md leading-relaxed">
                Once your order is dispatched, you will receive a tracking link via email and SMS. You can also contact our client service team at <a href="mailto:stagbeetle0629@gmail.com" className="text-gold-leaf hover:underline">stagbeetle0629@gmail.com</a> for real-time updates.
              </p>
            </section>

          </div>

          <div className="mt-16 pt-8 border-t border-on-surface/5">
            <p className="text-[13px] text-on-surface-variant">
              Questions? Visit our <Link href="/returns" className="text-gold-leaf hover:underline">Returns &amp; Exchanges</Link> page or contact us at{' '}
              <a href="mailto:stagbeetle0629@gmail.com" className="text-gold-leaf hover:underline">stagbeetle0629@gmail.com</a>.
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

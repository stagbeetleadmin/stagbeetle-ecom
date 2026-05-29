import React from 'react';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Use | Stag Beetle',
  description: 'Terms and conditions governing your use of the Stag Beetle website and purchase of our products.',
};

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />
      <main className="flex-1 pt-8 pb-24">
        <div className="max-w-3xl mx-auto px-6 md:px-12">

          <nav className="flex items-center gap-2 text-[11px] font-label-caps tracking-widest text-on-surface-variant/60 mb-12">
            <Link href="/" className="hover:text-gold-leaf transition-colors">HOME</Link>
            <span>/</span>
            <span className="text-on-surface">TERMS OF USE</span>
          </nav>

          <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-3">LEGAL</span>
          <h1 className="font-display text-[40px] font-semibold text-on-surface mb-4 leading-tight">Terms of Use</h1>
          <p className="text-[12px] text-on-surface-variant/60 mb-16">Last updated: 1 January 2026</p>

          <div className="space-y-10 font-body text-on-surface-variant text-[14px] leading-relaxed">

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using the Stag Beetle website (stagbeetle.co.in) or purchasing our products, you agree to be bound by these Terms of Use and our{' '}
                <Link href="/privacy" className="text-gold-leaf hover:underline">Privacy Policy</Link>. If you do not agree, please do not use our website.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-3">2. Products and Pricing</h2>
              <p className="mb-3">
                All prices are displayed in Indian Rupees (INR) and are inclusive of applicable GST. We reserve the right to change prices at any time without notice. The price applicable to your order is the price displayed at the time you place your order.
              </p>
              <p>
                Product images are for illustrative purposes. Due to the handcrafted nature of our garments and the properties of natural textiles, slight variations in colour, texture, and finish are inherent and not considered defects.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-3">3. Orders and Payment</h2>
              <p className="mb-3">
                Placing an order constitutes an offer to purchase. We reserve the right to accept or decline any order. An order is confirmed only upon receipt of a confirmation email from us.
              </p>
              <p>
                We accept major credit and debit cards, UPI, and net banking. All transactions are processed through PCI-DSS compliant payment gateways. We do not store your payment card details.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-3">4. Shipping and Delivery</h2>
              <p>
                Delivery timelines are estimates and not guarantees. We are not liable for delays caused by courier partners, customs authorities, or circumstances beyond our control. Please refer to our{' '}
                <Link href="/shipping" className="text-gold-leaf hover:underline">Shipping &amp; Deliveries</Link> page for full details.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-3">5. Returns and Exchanges</h2>
              <p>
                Our returns and exchange policy is set out on the{' '}
                <Link href="/returns" className="text-gold-leaf hover:underline">Returns &amp; Exchanges</Link> page and forms part of these Terms.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-3">6. Intellectual Property</h2>
              <p>
                All content on this website — including text, images, logos, designs, and code — is the property of Stagbeetle Pvt. Ltd. and is protected by Indian and international copyright law. You may not reproduce, distribute, or create derivative works without our prior written consent.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-3">7. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Stag Beetle shall not be liable for any indirect, incidental, or consequential damages arising from your use of our website or products. Our total liability shall not exceed the value of the order giving rise to the claim.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-3">8. Governing Law</h2>
              <p>
                These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-3">9. Contact</h2>
              <p>
                For any queries regarding these Terms, contact us at{' '}
                <a href="mailto:stagbeetle0629@gmail.com" className="text-gold-leaf hover:underline">stagbeetle0629@gmail.com</a>.
              </p>
            </section>

          </div>

          <div className="mt-16 pt-8 border-t border-on-surface/5 flex gap-8 text-[12px] font-label-caps tracking-widest text-on-surface-variant/60">
            <Link href="/privacy" className="hover:text-gold-leaf transition-colors">PRIVACY POLICY</Link>
            <Link href="/cookies" className="hover:text-gold-leaf transition-colors">COOKIE PREFERENCES</Link>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

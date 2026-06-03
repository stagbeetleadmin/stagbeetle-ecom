import React from 'react';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Shipping Policy | Stag Beetle',
  description: 'At Stagbeetle, we ensure safe and reliable delivery of your orders across India through India Post.',
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
            <span className="text-on-surface">SHIPPING POLICY</span>
          </nav>

          <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-3">CLIENT SERVICE</span>
          <h1 className="font-display text-[40px] font-semibold text-on-surface mb-6 leading-tight">
            Shipping Policy
          </h1>
          
          <p className="text-body-md text-on-surface-variant leading-relaxed mb-12">
            At Stagbeetle, we ensure safe and reliable delivery of your orders across India through India Post, the official postal service of India. Please read our shipping policy carefully.
          </p>

          <div className="space-y-12 font-body text-on-surface-variant">

            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">1. Shipping Coverage</h2>
              <p className="leading-relaxed">
                We currently ship only within India. Orders outside India will not be accepted or processed.
              </p>
            </section>

            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">2. Order Processing Time</h2>
              <ul className="list-disc pl-5 space-y-2 leading-relaxed">
                <li>All orders are processed within 1–3 business days after order confirmation.</li>
                <li>Orders are not processed or shipped on Sundays or public holidays.</li>
                <li>During peak periods, processing time may be slightly extended.</li>
                <li>Once your order is dispatched, you will receive a shipping confirmation.</li>
              </ul>
            </section>

            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">3. Shipping Method & Delivery Time</h2>
              <p className="leading-relaxed mb-4">
                All shipments are handled by India Post (Registered Post / Speed Post, depending on availability).
              </p>
              <div className="bg-surface-dim border border-on-surface/5 p-6 mb-4 space-y-3 rounded-sm">
                <div className="flex justify-between text-[13px] border-b border-on-surface/5 pb-2">
                  <span className="font-semibold text-on-surface">Metro cities</span>
                  <span className="text-gold-leaf font-semibold">3–7 business days</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="font-semibold text-on-surface">Non-metro & rural areas</span>
                  <span className="text-gold-leaf font-semibold">5–10 business days</span>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-3">
                Delivery times are estimates and may vary due to:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed mb-4">
                <li>Weather conditions</li>
                <li>Postal delays</li>
                <li>Regional accessibility</li>
                <li>Government or local restrictions</li>
              </ul>
              <p className="text-xs text-on-surface-variant/75 italic leading-relaxed">
                Once an order is dispatched and handed over to India Post, delivery timelines and handling are governed by the carrier. Stagbeetle shall not be held liable for delays, loss, or damage caused during transit beyond reasonable coordination support.
              </p>
            </section>

            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">4. Shipping Charges</h2>
              <p className="leading-relaxed">
                Shipping charges (if applicable) will be clearly displayed at checkout before payment.
              </p>
            </section>

            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">5. Order Tracking</h2>
              <p className="leading-relaxed">
                Tracking details will be shared once your order is shipped. Please allow 24–48 hours for tracking information to become active on the India Post website.
              </p>
            </section>

            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">6. Incorrect or Incomplete Address</h2>
              <p className="leading-relaxed mb-3">
                Customers are responsible for providing accurate and complete shipping information. Stagbeetle is not liable for:
              </p>
              <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-3">
                <li>Delays caused by incorrect addresses</li>
                <li>Orders returned due to incomplete or incorrect address details</li>
              </ul>
              <p className="leading-relaxed">
                If an order is returned to us due to address issues, re-shipping charges may apply.
              </p>
            </section>

            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">7. Lost or Delayed Shipments</h2>
              <p className="leading-relaxed mb-3">
                While we rely on India Post for delivery, issues may occasionally occur. If your order has not been delivered within 10 business days of dispatch, or appears lost in transit, please contact us at <a href="mailto:support@stagbeetle.co.in" className="text-gold-leaf hover:underline font-semibold">support@stagbeetle.co.in</a> with your order number. We will assist you by coordinating with India Post.
              </p>
              <p className="text-sm font-semibold text-on-surface">
                Refunds or replacements will be considered only after confirmation from India Post.
              </p>
            </section>

            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">8. Damaged, Missing, or Incorrect Items (Mandatory Unboxing Video)</h2>
              <div className="bg-amber-50/50 border border-amber-200 p-6 mb-6 rounded-sm">
                <div className="flex items-center gap-2 text-amber-900 font-bold mb-3">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                  <span>MANDATORY UNBOXING VIDEO</span>
                </div>
                <p className="text-sm leading-relaxed text-amber-950 mb-3 font-semibold">
                  For any claim related to damaged, missing, or incorrect items, a 360° unboxing video is mandatory. Without this video, Stagbeetle will not be able to investigate or resolve the complaint.
                </p>
              </div>

              <div className="space-y-6 pl-2">
                <div>
                  <h3 className="font-semibold text-on-surface mb-2">a. Before Accepting Delivery</h3>
                  <p className="leading-relaxed">
                    Inspect the package carefully upon delivery. If the package appears tampered, opened, or damaged, take clear photos, do not accept the delivery, and share the images along with your order details by emailing us at <a href="mailto:support@stagbeetle.co.in" className="text-gold-leaf hover:underline font-semibold">support@stagbeetle.co.in</a>.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-on-surface mb-2">b. While Recording the 360° Unboxing Video</h3>
                  <p className="leading-relaxed mb-2">
                    Record an uncut, continuous video in good lighting. The video must clearly show:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 leading-relaxed">
                    <li>The sealed package from all sides (360° view)</li>
                    <li>The shipping label</li>
                    <li>The complete opening process</li>
                    <li>All items received inside the package</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-on-surface mb-2">c. If Items Are Damaged, Missing, or Incorrect</h3>
                  <p className="leading-relaxed">
                    Show clear close-ups of the issue and show the shipping label in the same video.
                  </p>
                </div>
              </div>

              <div className="mt-6 bg-surface-dim p-4 border border-on-surface/5">
                <p className="text-xs text-on-surface font-bold uppercase tracking-wider mb-2">⚠️ Important Notes:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs leading-relaxed">
                  <li>The video must be continuous, with no cuts, edits, pauses, or transitions.</li>
                  <li>Claims without a proper unboxing video will not be accepted.</li>
                  <li>The issue must be reported within 48 hours of delivery.</li>
                  <li>Once verified, Stagbeetle will evaluate the claim and offer a replacement or refund, as applicable.</li>
                </ul>
              </div>
            </section>

            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">9. Undelivered / Returned Orders</h2>
              <p className="leading-relaxed">
                If an order is returned to us due to customer unavailability, incorrect address, or refusal to accept delivery, the customer will be responsible for additional shipping charges for re-dispatch.
              </p>
            </section>

            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">10. Policy Updates</h2>
              <p className="leading-relaxed">
                Stagbeetle reserves the right to modify this Shipping Policy at any time. Updates will be effective immediately upon posting on the website.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">11. Contact Information</h2>
              <p className="leading-relaxed mb-4">
                For any shipping-related queries, please reach out to us:
              </p>
              <div className="bg-surface-dim p-6 border border-on-surface/5 space-y-2 rounded-sm text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">📧</span>
                  <a href="mailto:support@stagbeetle.co.in" className="text-gold-leaf hover:underline font-semibold">support@stagbeetle.co.in</a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">🌐</span>
                  <a href="https://www.stagbeetle.co.in" target="_blank" rel="noopener noreferrer" className="text-gold-leaf hover:underline font-semibold">www.stagbeetle.co.in</a>
                </div>
              </div>
            </section>

          </div>

          <div className="mt-16 pt-8 border-t border-on-surface/5">
            <p className="text-[13px] text-on-surface-variant">
              Questions? Visit our <Link href="/returns" className="text-gold-leaf hover:underline font-semibold font-label-caps tracking-widest text-[11px]">Cancellation &amp; Refund Policy</Link> page or contact us at{' '}
              <a href="mailto:support@stagbeetle.co.in" className="text-gold-leaf hover:underline">support@stagbeetle.co.in</a>.
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

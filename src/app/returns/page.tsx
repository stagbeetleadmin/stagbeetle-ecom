import React from 'react';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cancellation & Refund Policy | STAGBEETLE',
  description: 'Learn about Stagbeetle returns, exchanges, and cancellation policies. Read our quick guide and requirements for claims.',
};

export default function ReturnsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />
      <main className="flex-1 pt-8 pb-24">
        <div className="max-w-3xl mx-auto px-6 md:px-12">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[11px] font-label-caps tracking-widest text-on-surface-variant/60 mb-12">
            <Link href="/" className="hover:text-gold-leaf transition-colors">HOME</Link>
            <span>/</span>
            <span className="text-on-surface">CANCELLATION &amp; REFUND</span>
          </nav>

          <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-3">CLIENT SERVICE</span>
          <h1 className="font-display text-[40px] font-semibold text-on-surface mb-6 leading-tight">
            Cancellation &amp; Refund Policy
          </h1>

          <p className="text-body-md text-on-surface-variant leading-relaxed mb-10">
            At Stagbeetle, we believe in transparency. Please read our guidelines carefully before placing your order.
          </p>

          {/* Quick Guide Block */}
          <div className="bg-surface-dim border border-on-surface/5 p-6 mb-12 rounded-sm space-y-6">
            <h2 className="font-display text-[18px] font-semibold text-on-surface border-b border-on-surface/5 pb-3">
              Returns, Exchanges &amp; Refunds – Quick Guide
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-sm inline-block mb-3">
                  Allowed Scenarios
                </span>
                <p className="text-sm font-semibold text-on-surface mb-2">Only if you receive:</p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>A damaged product</li>
                  <li>A defective product</li>
                  <li>A wrong item</li>
                </ul>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-sm inline-block mb-3">
                  Reporting Window
                </span>
                <p className="text-sm font-semibold text-on-surface mb-2">⏱️ Within 48 Hours</p>
                <p className="text-sm leading-relaxed text-on-surface-variant">
                  The issue must be reported within 48 hours of delivery. Any claim raised after this window is invalid and will not be entertained.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-12 font-body text-on-surface-variant">

            {/* Mandatory Unboxing Video */}
            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">🎥 Mandatory 360° Unboxing Video</h2>
              <p className="leading-relaxed mb-4">
                For any damage, missing, or wrong item claim, a 360° unboxing video is compulsory.
              </p>
              <div className="bg-amber-50/50 border border-amber-200 p-6 rounded-sm mb-4">
                <p className="text-sm font-semibold text-amber-950 mb-2">The video must:</p>
                <ul className="list-disc pl-5 text-sm text-amber-900 space-y-1 mb-4">
                  <li>Be continuous &amp; uncut (no pauses, edits, or transitions)</li>
                  <li>Show the sealed package from all sides (360° view)</li>
                  <li>Show the shipping label clearly</li>
                  <li>Show the complete opening process</li>
                  <li>Clearly show the reported issue</li>
                </ul>
                <p className="text-xs font-bold text-red-700 uppercase tracking-wider">
                  ❌ No unboxing video = no claim acceptance
                </p>
              </div>
            </section>

            {/* Before accepting delivery */}
            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">📦 Before Accepting Delivery</h2>
              <p className="leading-relaxed mb-3">
                Please check the package carefully upon delivery. If it looks tampered or damaged:
              </p>
              <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-4">
                <li>Do not accept the delivery.</li>
                <li>Take photos along with 360° Unboxing Video and email us at <a href="mailto:support@stagbeetle.co.in" className="text-gold-leaf hover:underline font-semibold">support@stagbeetle.co.in</a>.</li>
              </ul>
              <p className="text-xs text-on-surface-variant/75 italic leading-relaxed">
                Stagbeetle reserves the right to reject claims if the submitted images or videos appear edited, tampered, unclear, incomplete, or inconsistent with order records.
              </p>
            </section>

            {/* When returns are NOT accepted */}
            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">❌ When Returns are NOT Accepted</h2>
              <ul className="list-disc pl-5 space-y-2 leading-relaxed mb-4">
                <li>Size issues (size chart is available on every product page).</li>
                <li>Change of mind.</li>
                <li>Wrong size/color ordered by customer.</li>
                <li>Used, washed, altered, or damaged items.</li>
                <li>Sale or discounted products (unless damaged or wrong).</li>
              </ul>
              <p className="text-sm font-semibold text-on-surface">
                All return, exchange, and refund decisions are subject to verification and approval by Stagbeetle. Submission of a request does not guarantee acceptance.
              </p>
            </section>

            {/* How to return approved item */}
            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">🔁 How to Return an Approved Item</h2>
              <p className="leading-relaxed mb-4">
                Customer must ship the product back themselves. Use any nearest reliable courier service.
              </p>
              <div className="bg-surface-dim border border-on-surface/5 p-6 rounded-sm mb-4">
                <p className="text-sm font-semibold text-on-surface mb-2">Item must be:</p>
                <ul className="list-disc pl-5 text-sm space-y-1.5">
                  <li>Properly packed</li>
                  <li>In original condition</li>
                  <li>With original tags &amp; invoice</li>
                </ul>
              </div>
              <p className="text-sm text-red-700 font-semibold mb-2">
                🚚 Stagbeetle does not arrange reverse pickup.
              </p>
              <p className="text-xs text-on-surface-variant/75 leading-relaxed">
                Products damaged due to improper or inadequate packaging during return transit will be rejected and sent back at the customer’s expense.
              </p>
            </section>

            {/* Return shipping charges */}
            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">💰 Return Shipping Charges</h2>
              <p className="leading-relaxed mb-3">
                Customer bears return courier charges for:
              </p>
              <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-4">
                <li>Size issues</li>
                <li>Change of mind</li>
              </ul>
              <p className="leading-relaxed mb-2">
                Stagbeetle bears return courier charges <strong className="text-on-surface">ONLY</strong> if the item was damaged at delivery, verified through images &amp; unboxing video.
              </p>
              <p className="text-sm italic font-semibold text-on-surface">
                👉 Even then, the customer must courier the item themselves.
              </p>
            </section>

            {/* Exchange & Refund */}
            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">🔄 Exchange &amp; Refund</h2>
              <ul className="list-disc pl-5 space-y-2 leading-relaxed mb-4">
                <li>Exchanges depend on stock availability.</li>
                <li>Refunds (if approved) are processed within 7–10 business days.</li>
                <li>Refunds are made to the original payment method. No cash, cheque, or alternate account refunds will be provided.</li>
                <li>Shipping charges are non-refundable, unless it’s our mistake.</li>
                <li>Refunds will be processed only after the returned product is received, inspected, and approved. No refunds will be issued without physical return of the product unless otherwise stated by Stagbeetle.</li>
              </ul>
            </section>

            {/* Cancellations */}
            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">❌ Cancellations</h2>
              <ul className="list-disc pl-5 space-y-2 leading-relaxed mb-4">
                <li>Allowed only before dispatch.</li>
                <li>No cancellations after shipping.</li>
              </ul>
              <p className="text-xs text-on-surface-variant/75 leading-relaxed">
                Stagbeetle reserves the right to refuse service, cancel orders, or block accounts found to be misusing return, refund, or exchange policies.
              </p>
            </section>

            {/* Dispute Resolution */}
            <section className="border-b border-on-surface/5 pb-8">
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">Dispute Resolution &amp; Policy Enforcement</h2>
              <p className="leading-relaxed mb-3">
                Stagbeetle reserves the sole right to assess, verify, and approve all claims related to returns, exchanges, or refunds. Any request that does not comply with the terms of this policy, including evidence requirements and timelines, shall be rejected. Submission of a claim does not imply acceptance.
              </p>
              <p className="leading-relaxed mb-3">
                Stagbeetle shall not be held liable for indirect losses, courier delays, or issues arising beyond reasonable control once the shipment is handed over to the logistics partner.
              </p>
              <p className="leading-relaxed">
                In case of suspected misuse, fraudulent activity, or repeated policy abuse, Stagbeetle reserves the right to take necessary action, including refusal of future service.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-4">📩 Need Help?</h2>
              <p className="leading-relaxed">
                Email us at: <a href="mailto:support@stagbeetle.co.in" className="text-gold-leaf hover:underline font-semibold font-body text-sm">support@stagbeetle.co.in</a>
              </p>
            </section>

          </div>

          <div className="mt-16 pt-8 border-t border-on-surface/5">
            <p className="text-[13px] text-on-surface-variant">
              Questions? Visit our <Link href="/shipping" className="text-gold-leaf hover:underline font-semibold font-label-caps tracking-widest text-[11px]">Shipping Policy</Link> page or contact us at{' '}
              <a href="mailto:support@stagbeetle.co.in" className="text-gold-leaf hover:underline">support@stagbeetle.co.in</a>.
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

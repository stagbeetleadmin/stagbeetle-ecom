import React from 'react';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Stag Beetle',
  description: 'How Stag Beetle collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />
      <main className="flex-1 pt-8 pb-24">
        <div className="max-w-3xl mx-auto px-6 md:px-12">

          <nav className="flex items-center gap-2 text-[11px] font-label-caps tracking-widest text-on-surface-variant/60 mb-12">
            <Link href="/" className="hover:text-gold-leaf transition-colors">HOME</Link>
            <span>/</span>
            <span className="text-on-surface">PRIVACY POLICY</span>
          </nav>

          <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-3">LEGAL</span>
          <h1 className="font-display text-[40px] font-semibold text-on-surface mb-4 leading-tight">Privacy Policy</h1>
          <p className="text-[12px] text-on-surface-variant/60 mb-16">Last updated: 1 January 2026</p>

          <div className="space-y-10 font-body text-on-surface-variant text-[14px] leading-relaxed">

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-3">1. Who We Are</h2>
              <p>
                Stag Beetle Apparel Private Limited (&quot;Stag Beetle&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the website stagbeetle.co.in and associated services. Our registered office is at 14, Lavelle Road, Ashok Nagar, Bengaluru — 560 001, Karnataka, India.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-3">2. Information We Collect</h2>
              <p className="mb-3">We collect information you provide directly to us, including:</p>
              <ul className="space-y-2 list-none pl-4">
                {[
                  'Name, email address, phone number, and shipping address when you place an order or create an account.',
                  'Payment information (processed securely by our payment partners — we do not store card details).',
                  'Communications you send us, including emails and atelier booking requests.',
                  'Newsletter subscription preferences.',
                ].map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-gold-leaf/50 shrink-0 mt-0.5">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4">We also collect certain information automatically when you visit our website, including IP address, browser type, pages visited, and referring URLs, via cookies and similar technologies.</p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-3">3. How We Use Your Information</h2>
              <p className="mb-3">We use your information to:</p>
              <ul className="space-y-2 list-none pl-4">
                {[
                  'Process and fulfil your orders, including sending order confirmations and shipping updates.',
                  'Manage your account and provide customer service.',
                  'Send you marketing communications, if you have opted in.',
                  'Improve our website and personalise your experience.',
                  'Comply with legal obligations under Indian law, including the Information Technology Act, 2000.',
                ].map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-gold-leaf/50 shrink-0 mt-0.5">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-3">4. Sharing Your Information</h2>
              <p>
                We do not sell your personal data. We share your information only with trusted service providers who assist us in operating our business (e.g., payment processors, courier partners, email service providers), and only to the extent necessary to provide those services. All third parties are contractually required to protect your data.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-3">5. Cookies</h2>
              <p>
                We use cookies to enhance your browsing experience, analyse site traffic, and personalise content. You can manage your cookie preferences at any time via our{' '}
                <Link href="/cookies" className="text-gold-leaf hover:underline">Cookie Preferences</Link> page.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-3">6. Data Retention</h2>
              <p>
                We retain your personal data for as long as necessary to fulfil the purposes described in this policy, or as required by law. Order records are retained for 7 years in accordance with Indian accounting regulations.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-3">7. Your Rights</h2>
              <p className="mb-3">
                Under applicable Indian data protection law, you have the right to access, correct, or delete your personal data. To exercise these rights, contact us at{' '}
                <a href="mailto:privacy@stagbeetle.co.in" className="text-gold-leaf hover:underline">privacy@stagbeetle.co.in</a>.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[20px] font-semibold text-on-surface mb-3">8. Contact Us</h2>
              <p>
                For any privacy-related queries, write to our Data Protection Officer at{' '}
                <a href="mailto:privacy@stagbeetle.co.in" className="text-gold-leaf hover:underline">privacy@stagbeetle.co.in</a>{' '}
                or by post to: Data Protection Officer, Stag Beetle Apparel Private Limited, 14 Lavelle Road, Bengaluru — 560 001.
              </p>
            </section>

          </div>

          <div className="mt-16 pt-8 border-t border-on-surface/5 flex gap-8 text-[12px] font-label-caps tracking-widest text-on-surface-variant/60">
            <Link href="/terms" className="hover:text-gold-leaf transition-colors">TERMS OF USE</Link>
            <Link href="/cookies" className="hover:text-gold-leaf transition-colors">COOKIE PREFERENCES</Link>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

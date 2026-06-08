import React from 'react';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Store Locations & Booking | Stag Beetle',
  description: 'Visit the Stag Beetle store locations in Bengaluru for private viewings, bespoke consultations, and store appointments.',
};

const locations = [
  {
    name: 'Hegde Nagar',
    label: 'HEGDE NAGAR OUTLET',
    address: 'Shop/ Door No.8, Basement, MCECHS Layout Main Rd, Sri Balaji Krupa Layout, RK Hegde Nagar, Bengaluru, Karnataka 560077',
    hours: 'Monday – Sunday, 10 AM – 8 PM',
    phone: '+91 9035203203',
    email: 'stagbeetle0629@gmail.com',
    mapUrl: 'https://share.google/EyQ2B1ZCmLuICilSg',
    note: 'Exclusive readymade garments, accessories, and personalization counter.',
  },
  {
    name: 'Singanayakanahalli',
    label: 'SINGANAYAKANAHALLI OUTLET',
    address: '4HW9+FVC, Sree Sai Layout, Singanayakanahalli, Bengaluru, Karnataka 560119',
    hours: 'Monday – Sunday, 10 AM – 8 PM',
    phone: '+91 9035203203',
    email: 'stagbeetle0629@gmail.com',
    mapUrl: 'https://share.google/WtG5nIh2cO9iX5BTN',
    note: 'Premium readymade collection showcasing and bespoke sizing consultations.',
  },
  {
    name: 'Kempapura (Hebbal)',
    label: 'KEMPAPURA OUTLET',
    address: '1st Main, Netajinagar , Kempapura, G Ramaiah Layout, Vayunandana Layout, Hebbal Kempapura, Bengaluru, Karnataka 560024',
    hours: 'Monday – Sunday, 10 AM – 8 PM',
    phone: '+91 9035203203',
    email: 'stagbeetle0629@gmail.com',
    mapUrl: 'https://share.google/BaaaMJ1wA4XQUPWOn',
    note: 'Our flagship studio offering full custom tailoring, bespoke fittings, and boutique collection.',
  },
];

export default function StoresPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />
      <main className="flex-1 pt-8 pb-24">
        <div className="max-w-6xl mx-auto px-6 md:px-12">

          <nav className="flex items-center gap-2 text-[11px] font-label-caps tracking-widest text-on-surface-variant/60 mb-12">
            <Link href="/" className="hover:text-gold-leaf transition-colors">HOME</Link>
            <span>/</span>
            <span className="text-on-surface">STORES</span>
          </nav>

          <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-3">VISIT US</span>
          <h1 className="font-display text-[40px] font-semibold text-on-surface mb-4 leading-tight">
            Our Stores
          </h1>
          <p className="font-body text-body-lg text-on-surface-variant mb-16 leading-relaxed max-w-2xl">
            Experience Stag Beetle in person. Our store locations are spaces for discovery — private viewings, bespoke consultations, and made-to-measure appointments with our style advisors.
          </p>

          <div className="space-y-10 mb-20">
            {locations.map((loc) => {
              const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(loc.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
              return (
                <div key={loc.name} className="border border-on-surface/8 p-6 md:p-8 bg-surface-dim/30 grid grid-cols-1 lg:grid-cols-12 gap-8 rounded-sm">
                  {/* Left Column: Details */}
                  <div className="lg:col-span-5 space-y-5">
                    <div>
                      <span className="font-label-caps text-[9px] text-gold-leaf tracking-[0.3em] block mb-2">{loc.label}</span>
                      <h2 className="font-display text-[22px] font-semibold text-on-surface mb-2">{loc.name}</h2>
                      <p className="text-[13px] text-on-surface-variant leading-relaxed mb-3">{loc.address}</p>
                      
                      {loc.mapUrl && (
                        <a
                          href={loc.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-label-caps tracking-widest text-[#C5A059] hover:underline mb-2 uppercase"
                        >
                          <span className="material-symbols-outlined text-[15px] align-middle">open_in_new</span>
                          Open in Google Maps
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-on-surface/5">
                      <div>
                        <span className="font-label-caps text-[9px] text-on-surface-variant/50 tracking-widest block mb-1">PHONE</span>
                        <a href={`tel:${loc.phone.replace(/\s/g, '')}`} className="text-[13px] text-on-surface hover:text-gold-leaf transition-colors font-semibold">{loc.phone}</a>
                      </div>
                      <div>
                        <span className="font-label-caps text-[9px] text-on-surface-variant/50 tracking-widest block mb-1">EMAIL</span>
                        <a href={`mailto:${loc.email}`} className="text-[13px] text-on-surface hover:text-gold-leaf transition-colors truncate block" title={loc.email}>{loc.email}</a>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-on-surface/5 space-y-1">
                      <span className="font-label-caps text-[9px] text-on-surface-variant/50 tracking-widest block">HOURS</span>
                      <p className="text-[12px] text-on-surface-variant/80 font-medium">{loc.hours}</p>
                    </div>

                    <p className="text-[11px] text-on-surface-variant/60 italic border-l-2 border-gold-leaf/30 pl-3 pt-0.5">{loc.note}</p>
                  </div>

                  {/* Right Column: Embedded Map */}
                  <div className="lg:col-span-7 h-[280px] min-h-[250px] w-full bg-gray-100 relative overflow-hidden rounded-sm border border-on-surface/5">
                    <iframe
                      title={`Map of ${loc.name}`}
                      src={embedUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={false}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Booking CTA */}
          <div className="bg-primary text-white p-10 text-center">
            <span className="font-label-caps text-[9px] tracking-[0.4em] text-white/60 block mb-3">PRIVATE APPOINTMENT</span>
            <h3 className="font-display text-[28px] font-semibold mb-4">Book a Consultation</h3>
            <p className="font-body text-[14px] text-white/80 max-w-md mx-auto mb-8 leading-relaxed">
              For bespoke commissions, made-to-measure fittings, or a private viewing of the current collection, write to us and we will arrange a dedicated appointment at one of our locations.
            </p>
            <a
              href="mailto:stagbeetle0629@gmail.com?subject=Store Appointment Request"
              className="inline-block bg-gold-leaf text-obsidian-charcoal px-10 py-4 font-label-caps text-[11px] tracking-[0.2em] font-semibold hover:bg-white transition-colors"
            >
              REQUEST AN APPOINTMENT
            </a>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

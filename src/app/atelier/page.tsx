import React from 'react';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Atelier Locations & Booking | Stag Beetle',
  description: 'Visit the Stag Beetle atelier in Bengaluru for private viewings, bespoke consultations, and made-to-measure appointments.',
};

const locations = [
  {
    name: 'Lalbagh Road (Flagship/Wholesale)',
    label: 'FLAGSHIP / WHOLESALE OUTLET',
    address: 'No. 207, 1st Floor, 4th Cross, Lalbagh Road, Bangalore - 560027',
    hours: 'Monday – Saturday, 10 AM – 7 PM',
    phone: '+91 9035203203',
    email: 'stagbeetle0629@gmail.com',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=No.+207,+1st+Floor,+4th+Cross,+Lalbagh+Road,+Bangalore+-+560027',
    note: 'Our flagship studio offering full custom tailoring, bespoke fittings, and wholesale inquiries.',
  },
  {
    name: 'Kempapura (Sahakara Nagar)',
    label: 'SAHAKARA NAGAR OUTLET',
    address: '78/52, 1st Main Road, Netajinagar, G Ramaiah Layout, Kempapura, Bangalore - 560024',
    hours: 'Monday – Sunday, 10 AM – 8 PM',
    phone: '+91 9035203203',
    email: 'stagbeetle0629@gmail.com',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=78/52,+1st+Main+Road,+Netajinagar,+G+Ramaiah+Layout,+Kempapura,+Bangalore+-+560024',
    note: 'Premium readymade collection showcasing and bespoke sizing consultations.',
  },
  {
    name: 'Hegde Nagar',
    label: 'HEGDE NAGAR OUTLET',
    address: 'Shop/Door No. 8, Basement, MCECHS Layout Main Road, Sri Balaji Krupa Layout, RK Hegde Nagar, Bangalore - 560077',
    hours: 'Monday – Sunday, 10 AM – 8 PM',
    phone: '+91 9035203203',
    email: 'stagbeetle0629@gmail.com',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Shop/Door+No.+8,+Basement,+MCECHS+Layout+Main+Road,+Sri+Balaji+Krupa+Layout,+RK+Hegde+Nagar,+Bangalore+-+560077',
    note: 'Exclusive readymade garments, accessories, and personalization counter.',
  },
];

export default function AtelierPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />
      <main className="flex-1 pt-8 pb-24">
        <div className="max-w-4xl mx-auto px-6 md:px-12">

          <nav className="flex items-center gap-2 text-[11px] font-label-caps tracking-widest text-on-surface-variant/60 mb-12">
            <Link href="/" className="hover:text-gold-leaf transition-colors">HOME</Link>
            <span>/</span>
            <span className="text-on-surface">ATELIER</span>
          </nav>

          <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-3">VISIT US</span>
          <h1 className="font-display text-[40px] font-semibold text-on-surface mb-4 leading-tight">
            Our Ateliers
          </h1>
          <p className="font-body text-body-lg text-on-surface-variant mb-16 leading-relaxed max-w-2xl">
            Experience Stag Beetle in person. Our ateliers are spaces for discovery — private viewings, bespoke consultations, and made-to-measure appointments with our master tailors.
          </p>

          <div className="grid md:grid-cols-1 gap-8 mb-20">
            {locations.map((loc) => (
              <div key={loc.name} className="border border-on-surface/8 p-8 bg-surface-dim/30 grid md:grid-cols-2 gap-8">
                <div>
                  <span className="font-label-caps text-[9px] text-gold-leaf tracking-[0.3em] block mb-2">{loc.label}</span>
                  <h2 className="font-display text-[24px] font-semibold text-on-surface mb-3">{loc.name}</h2>
                  <p className="text-[14px] text-on-surface-variant leading-relaxed mb-4">{loc.address}</p>
                  
                  {loc.mapUrl && (
                    <a
                      href={loc.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-label-caps tracking-widest text-[#C5A059] hover:underline mb-4 uppercase"
                    >
                      <span className="material-symbols-outlined text-[15px] align-middle">location_on</span>
                      View on Google Maps
                    </a>
                  )}
                  
                  <p className="text-[13px] text-on-surface-variant/70">{loc.hours}</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="font-label-caps text-[9px] text-on-surface-variant/50 tracking-widest block mb-1">PHONE</span>
                    <a href={`tel:${loc.phone.replace(/\s/g, '')}`} className="text-[14px] text-on-surface hover:text-gold-leaf transition-colors">{loc.phone}</a>
                  </div>
                  <div>
                    <span className="font-label-caps text-[9px] text-on-surface-variant/50 tracking-widest block mb-1">EMAIL</span>
                    <a href={`mailto:${loc.email}`} className="text-[14px] text-on-surface hover:text-gold-leaf transition-colors">{loc.email}</a>
                  </div>
                  <p className="text-[12px] text-on-surface-variant/60 italic border-l-2 border-gold-leaf/30 pl-3">{loc.note}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Booking CTA */}
          <div className="bg-primary text-white p-10 text-center">
            <span className="font-label-caps text-[9px] tracking-[0.4em] text-white/60 block mb-3">PRIVATE APPOINTMENT</span>
            <h3 className="font-display text-[28px] font-semibold mb-4">Book a Consultation</h3>
            <p className="font-body text-[14px] text-white/80 max-w-md mx-auto mb-8 leading-relaxed">
              For bespoke commissions, made-to-measure fittings, or a private viewing of the current collection, write to us and we will arrange a dedicated appointment.
            </p>
            <a
              href="mailto:stagbeetle0629@gmail.com?subject=Atelier Appointment Request"
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

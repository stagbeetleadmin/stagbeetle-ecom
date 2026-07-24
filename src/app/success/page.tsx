"use client";

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Order } from '@/lib/db';

interface SuccessPageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default function OrderSuccess({ searchParams }: SuccessPageProps) {
  const resolvedSearchParams = use(searchParams);
  const orderId = resolvedSearchParams.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch the order from persistent localStorage (mock fallback) or database
  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const fetchOrderData = () => {
      setLoading(true);
      
      // Look up in localStorage
      if (typeof window !== 'undefined') {
        const storedOrders = JSON.parse(localStorage.getItem('stag_beetle_orders') || '[]');
        const foundOrder = storedOrders.find((o: any) => o.id === orderId);
        if (foundOrder) {
          setOrder(foundOrder);
        }
      }
      
      setLoading(false);
    };

    fetchOrderData();
  }, [orderId]);

  return (
    <div className="flex flex-col min-h-screen bg-surface selection:bg-gold-leaf/20 selection:text-on-surface">
      <Header />

      <main className="flex-1 relative z-10 py-12 md:py-20 bg-white">
        <div className="fixed inset-0 marble-overlay z-0"></div>

        <div className="max-w-2xl mx-auto px-6 text-center relative z-10 space-y-8">
          
          {/* Animated checkmark icon */}
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-700 animate-float shadow-sm">
              <span className="material-symbols-outlined text-[42px] fill-1">check_circle</span>
            </div>
          </div>

          <div className="space-y-3">
            <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block uppercase">TRANSACTION AUTHORIZED</span>
            <h1 className="font-display text-[32px] md:text-[40px] font-semibold text-on-surface leading-tight">
              Order Confirmed
            </h1>
            <p className="font-body text-on-surface-variant max-w-md mx-auto leading-relaxed">
              Thank you for acquiring our creations. Your order has been registered in the atelier database and preparation has commenced.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gold-leaf"></div>
            </div>
          ) : order ? (
            <div className="border border-on-surface/5 p-6 bg-surface-dim/40 rounded-sm space-y-6 text-left max-w-lg mx-auto">
              <div className="flex justify-between items-baseline border-b border-on-surface/10 pb-3 text-[13px] font-label-caps text-on-surface-variant font-semibold">
                <span>ORDER SPECIFICATIONS</span>
                <span className="text-on-surface font-bold">{order.id}</span>
              </div>
              
              <div className="space-y-4 font-body text-[14px]">
                {/* Items */}
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-on-surface-variant font-medium">
                      <span className="truncate max-w-[70%]">
                        {item.title} ({item.selected_size} / {item.selected_color}) <span className="text-[12px] font-bold text-on-surface">x{item.quantity}</span>
                      </span>
                      <span className="text-on-surface font-semibold">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-on-surface/10 pt-4 space-y-2">
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Shipping Address</span>
                    <span className="text-on-surface font-semibold text-right truncate max-w-[60%]">{order.shipping_address}</span>
                  </div>

                  <div className="flex justify-between text-on-surface-variant">
                    <span>Payment Gateway</span>
                    <span className="text-primary font-bold text-[12px] tracking-wide flex items-center gap-1 uppercase">
                      Razorpay
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Payment Status</span>
                    <span className="text-green-700 font-semibold uppercase text-[11px] tracking-wider flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-700"></span> PAID
                    </span>
                  </div>
                  
                  <div className="flex justify-between font-display text-[18px] font-semibold border-t border-on-surface/10 pt-3 text-on-surface">
                    <span>Total Amount Charged</span>
                    <span className="text-gold-leaf">₹{order.total_price}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            orderId && (
              <p className="text-[13px] text-on-surface-variant italic">
                Specification details for Order ID <strong>{orderId}</strong> are available in the local database registry.
              </p>
            )
          )}

          <div className="pt-6">
            <Link 
              href="/"
              className="bg-primary text-white px-10 py-4 font-label-caps text-label-caps tracking-[0.2em] hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all shadow-md font-semibold inline-block"
            >
              CONTINUE THE EXPERIENCE
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}

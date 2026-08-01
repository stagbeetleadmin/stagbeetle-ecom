"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { createOrder, Product, validateCoupon, Coupon } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

// Razorpay global types
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Checkout() {
  const router = useRouter();
  const { cart, cartTotal, clearCart, suggestions, addToCart } = useCart();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
    country: 'India',
  });

  const { user, triggerLoginModal, saveAddress, updateProfile } = useAuth();
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);
  const [pinMessage, setPinMessage] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Sync user details to form fields on mount/login
  // Always overwrite with user data when user changes (covers Google OAuth redirect return)
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        // Only prefill address fields if user has saved them previously
        address: user.address || prev.address,
        city: user.city || prev.city,
        zip: user.zip || prev.zip,
        country: user.country || 'India',
      }));
    }
  }, [user?.id]); // re-run when user identity changes, not on every render

  // Postal PIN code auto-fill — uses India Post data via data.gov.in
  useEffect(() => {
    const lookupPincode = async () => {
      const cleanZip = formData.zip.trim();
      if (cleanZip.length !== 6 || !/^\d{6}$/.test(cleanZip)) {
        setPinMessage('');
        return;
      }
      setPinLoading(true);
      setPinMessage('');
      try {
        // Use the reliable India Post pincode API via a CORS-safe proxy
        const res = await fetch(
          `https://api.postalpincode.in/pincode/${cleanZip}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        if (data?.[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          setFormData(prev => ({
            ...prev,
            city: prev.city || po.District,
          }));
          setPinMessage(`✓ ${po.Name}, ${po.District}, ${po.State}`);
        } else {
          setPinMessage('PIN code not found');
        }
      } catch {
        // Silently fail — PIN lookup is a convenience, not required
        setPinMessage('');
      } finally {
        setPinLoading(false);
      }
    };
    lookupPincode();
  }, [formData.zip]);

  const [razorpayReady, setRazorpayReady] = useState(false);

  // Load Razorpay JS SDK once on mount and track when it's ready
  useEffect(() => {
    // Already loaded (e.g. hot-reload)
    if (window.Razorpay) {
      setRazorpayReady(true);
      return;
    }
    if (document.getElementById('razorpay-script')) return;
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayReady(true);
    script.onerror = () => console.error('Failed to load Razorpay SDK');
    document.body.appendChild(script);
  }, []);
  
  // Coupon states
  const [promoCode, setPromoCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const getDiscountAmount = () => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'percentage') {
      return Math.round((cartTotal * appliedCoupon.discount_value) / 100);
    } else {
      return appliedCoupon.discount_value;
    }
  };

  const discountAmount = getDiscountAmount();
  const finalTotal = Math.max(0, cartTotal - discountAmount);

  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promoCode.trim()) return;
    
    setIsVerifying(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      const response = await validateCoupon(promoCode, cartTotal);
      if (response.valid && response.coupon) {
        setAppliedCoupon(response.coupon);
        setCouponSuccess(response.message);
        setPromoCode('');
      } else {
        setCouponError(response.message);
      }
    } catch (err) {
      setCouponError('Failed to validate coupon.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponSuccess('');
    setCouponError('');
  };
  
  const [error, setError] = useState('');
  const [razorpayLoading, setRazorpayLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Called after Razorpay confirms a successful payment — creates the DB order
  const finalizeOrder = useCallback(async (paymentId: string) => {
    try {
      const orderItems = cart.map(item => ({
        product_id: item.product_id,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        selected_size: item.selected_size,
        selected_color: item.selected_color,
        image: item.image
      }));

      const result = await createOrder({
        customer_name: formData.name,
        customer_email: formData.email,
        shipping_address: `${formData.address}, ${formData.city}, ${formData.zip}, ${formData.country}`,
        total_price: finalTotal,
        items: orderItems,
        payment_status: 'paid',
        payment_method: 'Razorpay',
        coupon_applied: appliedCoupon ? appliedCoupon.code : undefined,
        discount_amount: appliedCoupon ? discountAmount : undefined,
        shipping_status: 'Scheduled',
        shipping_carrier: 'Delhivery',
        tracking_number: 'DKV' + Math.floor(100000000 + Math.random() * 900000000),
      });

      if (user) {
        if (saveAddressToProfile) {
          await saveAddress(formData.address, formData.city, formData.zip, formData.country, formData.phone);
        } else if (!user.phone && formData.phone.trim()) {
          // Even without saving the full address, remember the phone number for future prefills
          await updateProfile({ phone: formData.phone.trim() });
        }
      }

      clearCart();
      router.push(`/success?orderId=${result.id}`);
    } catch (e: any) {
      console.error('Order submission failed:', e);
      setError('Payment was received but order creation failed. Please contact support with Payment ID: ' + paymentId);
      setRazorpayLoading(false);
    }
  }, [cart, formData, finalTotal, appliedCoupon, discountAmount, saveAddressToProfile, user, clearCart, router, saveAddress, updateProfile]);

  // Opens the Razorpay payment popup
  const handleRazorpayPay = useCallback(async () => {
    if (!razorpayReady || !window.Razorpay) {
      setError('Payment gateway is still loading. Please wait a moment and try again.');
      return;
    }

    if (finalTotal <= 0) {
      setError('Order total must be greater than ₹0 to proceed.');
      return;
    }

    setRazorpayLoading(true);
    setError('');

    try {
      // Step 1: Create Razorpay order on our server
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalTotal, currency: 'INR' }),
      });

      const data = await res.json();

      if (!res.ok || !data.orderId) {
        throw new Error(data.error || 'Failed to initiate payment');
      }

      // Step 2: Open Razorpay popup
      // Use the key returned from API; fall back to the NEXT_PUBLIC env var
      const razorpayKey = data.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const rzp = new window.Razorpay({
        key: razorpayKey,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: 'STAGBEETLE India',
        description: `Order of ${cart.length} item(s)`,
        image: '/favicon.ico',
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        notes: {
          shipping_address: `${formData.address}, ${formData.city}, ${formData.zip}, ${formData.country}`,
        },
        theme: {
          color: '#1a1a1a',
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          // Step 3: Verify signature server-side
          const verifyRes = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();

          if (!verifyData.success) {
            setError('Payment verification failed. Please contact support with Payment ID: ' + response.razorpay_payment_id);
            setRazorpayLoading(false);
            return;
          }

          // Step 4: Create order in DB and redirect
          await finalizeOrder(response.razorpay_payment_id);
        },
        modal: {
          ondismiss: () => {
            setRazorpayLoading(false);
            // Keep a payment-failure message if one was already shown; otherwise report the cancellation
            setError(prev => prev || 'Payment was cancelled — you have not been charged. Your bag is untouched, so you can try again whenever you are ready.');
          },
        },
      });

      // Handle payment failure inside the Razorpay popup
      rzp.on('payment.failed', (response: any) => {
        setError(`Payment failed: ${response.error?.description || 'Unknown error'}. Please try again.`);
        setRazorpayLoading(false);
      });

      rzp.open();
    } catch (err: any) {
      console.error('Razorpay error:', err);
      setError(err.message || 'An error occurred. Please try again.');
      setRazorpayLoading(false);
    }
  }, [finalTotal, cart, formData, finalizeOrder, razorpayReady]);

  // Validates form and triggers Razorpay
  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setError('Your shopping bag is empty.');
      return;
    }

    if (!user) {
      setError('A signed-in profile is required to check out.');
      triggerLoginModal(() => {
        setError('');
        handleRazorpayPay();
      });
      return;
    }

    setError('');
    handleRazorpayPay();
  };

  const handleAddSuggestion = (product: Product) => {
    const defaultSize = product.sizes[0] || 'One Size';
    const defaultColor = product.colors[0] || 'Default';
    addToCart(product, defaultSize, defaultColor, 1);
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-surface">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-20">
          <span className="material-symbols-outlined text-[48px] text-outline opacity-40">shopping_bag</span>
          <h2 className="font-display text-headline-lg text-on-surface">Your Bag is Empty</h2>
          <p className="font-body text-on-surface-variant">Add items to your bag before checking out.</p>
          <Link 
            href="/"
            className="bg-primary text-white px-8 py-3 text-label-caps tracking-widest hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all"
          >
            SHOP LATEST ARRIVALS
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface selection:bg-gold-leaf/20 selection:text-on-surface">
      <Header />

      <main className="flex-1 relative z-10 py-12 md:py-20 bg-white">
        <div className="fixed inset-0 marble-overlay z-0"></div>

        <div className="max-w-container-max mx-auto px-6 md:px-12 relative z-10">
          
          <h1 className="font-display text-[36px] font-semibold text-on-surface mb-12 text-center md:text-left">
            Secure Checkout
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            
            {/* Left Column: Checkout Forms */}
            <div className="lg:col-span-7">
              <form onSubmit={handleCheckoutSubmit} className="space-y-10">
                
                {/* Shipping Details */}
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-2 border-b border-on-surface/10 pb-3">
                    <h2 className="font-display text-[22px] font-semibold text-on-surface">
                      Atelier Delivery Information
                    </h2>
                    {!user ? (
                      <button
                        type="button"
                        onClick={() => triggerLoginModal()}
                        className="text-[11px] font-label-caps tracking-widest text-[#5f259f] hover:underline font-bold text-left"
                      >
                        SIGN IN FOR COMPLIMENTARY SAVED PROFILE
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-green-700">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        SIGNED IN AS {user.name.toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[12px] font-label-caps font-semibold text-on-surface-variant">FULL NAME</label>
                      <input 
                        type="text" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleInputChange} 
                        required
                        placeholder="e.g. Eleanor Vance"
                        className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-3 px-4 text-[14px] outline-none"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[12px] font-label-caps font-semibold text-on-surface-variant">EMAIL ADDRESS</label>
                      <input 
                        type="email" 
                        name="email" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        required
                        placeholder="e.g. eleanor@example.com"
                        className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-3 px-4 text-[14px] outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] font-label-caps font-semibold text-on-surface-variant">PHONE NUMBER</label>
                      <input 
                        type="tel" 
                        name="phone" 
                        value={formData.phone} 
                        onChange={handleInputChange} 
                        required
                        placeholder="e.g. +91 98765 43210"
                        className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-3 px-4 text-[14px] outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] font-label-caps font-semibold text-on-surface-variant">PIN CODE</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          name="zip" 
                          value={formData.zip} 
                          onChange={handleInputChange} 
                          required
                          placeholder="e.g. 560001"
                          maxLength={6}
                          className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-3 px-4 text-[14px] outline-none"
                        />
                        {pinLoading && (
                          <div className="absolute right-3 top-3.5 animate-spin rounded-full h-4 w-4 border-2 border-gold-leaf border-t-transparent"></div>
                        )}
                      </div>
                      {pinMessage && (
                        <p className={`text-[11px] font-semibold mt-1 ${pinMessage.startsWith('✓') ? 'text-green-700' : 'text-red-700'}`}>
                          {pinMessage}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-[12px] font-label-caps font-semibold text-on-surface-variant">DELIVERY ADDRESS</label>
                      <input 
                        type="text" 
                        name="address" 
                        value={formData.address} 
                        onChange={handleInputChange} 
                        required
                        placeholder="Street address, apartment or estate details"
                        className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-3 px-4 text-[14px] outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] font-label-caps font-semibold text-on-surface-variant">CITY</label>
                      <input 
                        type="text" 
                        name="city" 
                        value={formData.city} 
                        onChange={handleInputChange} 
                        required
                        placeholder="e.g. Bengaluru"
                        className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-3 px-4 text-[14px] outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] font-label-caps font-semibold text-on-surface-variant">COUNTRY</label>
                      <select 
                        name="country" 
                        value={formData.country} 
                        onChange={handleInputChange}
                        className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-3 px-4 text-[14px] outline-none"
                      >
                        <option>India</option>
                        <option>United Kingdom</option>
                        <option>United States</option>
                        <option>France</option>
                        <option>Italy</option>
                      </select>
                    </div>
                  </div>

                  {user && (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="saveAddressToProfile"
                        checked={saveAddressToProfile}
                        onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                        className="h-4 w-4 text-gold-leaf focus:ring-gold-leaf border-zinc-300 rounded"
                      />
                      <label htmlFor="saveAddressToProfile" className="text-[12px] font-medium text-on-surface-variant select-none">
                        Save this address to my profile for future visits
                      </label>
                    </div>
                  )}
                </div>

                {/* Submit Checkout */}
                <div className="pt-4 space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 text-[13px] py-3 px-4 rounded-sm font-medium">
                      {error}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={razorpayLoading}
                    className="w-full bg-primary text-white py-4 font-label-caps text-label-caps tracking-[0.25em] hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all shadow-md font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {razorpayLoading ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                        PROCESSING...
                      </>
                    ) : (
                      <>PAY SECURELY — ₹{finalTotal}</>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-on-surface-variant/70">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                    <span>Secured by Razorpay · UPI · Cards · Net Banking · Wallets</span>
                  </div>
                </div>

              </form>
            </div>

            {/* Right Column: Order Summary & Shopify-Style recommendations */}
            <div className="lg:col-span-5 space-y-8">
              
              {/* Order list */}
              <div className="border border-on-surface/5 p-6 bg-surface-dim/40 space-y-6">
                <h3 className="font-display text-[18px] font-semibold text-on-surface border-b border-on-surface/10 pb-3">
                  Order Summary
                </h3>

                <div className="divide-y divide-on-surface/5 max-h-[300px] overflow-y-auto pr-2 hide-scrollbar">
                  {cart.map((item) => (
                    <div 
                      key={`${item.product_id}-${item.selected_size}-${item.selected_color}`}
                      className="flex items-center gap-4 py-4 first:pt-0"
                    >
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="w-12 h-16 object-cover object-top bg-white aspect-[3/4]"
                        />
                      ) : (
                        <div className="w-12 h-16 flex flex-col items-center justify-center bg-gray-50 border border-zinc-200 text-gray-400 text-[8px] font-label-caps tracking-wider text-center p-0.5 aspect-[3/4]">
                          No Image
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-body text-[14px] font-semibold truncate text-on-surface">{item.title}</h4>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Size: {item.selected_size} / Color: {item.selected_color} (x{item.quantity})
                        </p>
                      </div>
                      <span className="font-body text-[14px] font-semibold text-on-surface">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Promo Code Input Block */}
                <div className="border-t border-on-surface/10 pt-4 pb-2">
                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="ENTER PROMO CODE" 
                        value={promoCode} 
                        onChange={(e) => setPromoCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                        className="flex-1 bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2 px-3 text-[12px] tracking-wider outline-none uppercase font-semibold text-on-surface placeholder:text-on-surface-variant/40"
                      />
                      <button 
                        type="button"
                        onClick={() => handleApplyCoupon()}
                        disabled={isVerifying}
                        className="bg-primary text-white text-[11px] font-label-caps tracking-widest px-4 py-2 hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all disabled:opacity-50 font-semibold"
                      >
                        {isVerifying ? 'APPLYING...' : 'APPLY'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-gold-leaf/10 border border-gold-leaf/20 rounded-sm p-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-gold-leaf">sell</span>
                        <span className="text-[12px] font-semibold text-on-surface uppercase tracking-wider">
                          {appliedCoupon.code} Applied
                        </span>
                      </div>
                      <button 
                        type="button" 
                        onClick={handleRemoveCoupon}
                        className="text-[11px] font-semibold text-on-surface-variant hover:text-red-700 transition-colors uppercase tracking-wider"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {couponError && (
                    <p className="text-[11px] text-red-700 font-medium mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {couponError}
                    </p>
                  )}
                  {couponSuccess && (
                    <p className="text-[11px] text-green-700 font-medium mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      {couponSuccess}
                    </p>
                  )}
                </div>

                {/* Subtotals */}
                <div className="border-t border-on-surface/10 pt-4 space-y-3 font-body text-[14px]">
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Subtotal</span>
                    <span>₹{cartTotal}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-gold-leaf font-semibold">
                      <span>Discount ({appliedCoupon.code})</span>
                      <span>-₹{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Shipping</span>
                    <span className="text-green-700 font-semibold uppercase text-[11px] tracking-wide">Complimentary</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>GST (Sales Tax)</span>
                    <span>Included</span>
                  </div>
                  <div className="flex justify-between font-display text-[18px] font-semibold border-t border-on-surface/10 pt-3 text-on-surface">
                    <span>Total Due</span>
                    <span className="text-gold-leaf">₹{finalTotal}</span>
                  </div>
                </div>
              </div>

              {/* Shopify-Style Suggestions (Upsell panel) */}
              {suggestions.length > 0 && (
                <div className="border border-on-surface/5 p-6 bg-surface-dim/40 space-y-4">
                  <h3 className="font-label-caps text-[10px] text-gold-leaf tracking-[0.3em] font-semibold">
                    COMPLETE THE SILHOUETTE
                  </h3>
                  <p className="text-[12px] text-on-surface-variant font-body">
                    Add matching elements with a single click before payment authorization:
                  </p>
                  
                  <div className="space-y-4 pt-2">
                    {suggestions.map((product) => (
                      <div key={product.id} className="flex items-center justify-between gap-4 border-b border-on-surface/5 pb-4 last:border-b-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          {product.images && product.images[0] ? (
                            <img 
                              src={product.images[0]} 
                              alt={product.title} 
                              className="w-10 h-13 object-cover object-top bg-white aspect-[3/4]"
                            />
                          ) : (
                            <div className="w-10 h-13 flex flex-col items-center justify-center bg-gray-50 border border-zinc-200 text-gray-400 text-[8px] font-label-caps tracking-wider text-center p-0.5 aspect-[3/4]">
                              No Image
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-body text-[13px] font-semibold text-on-surface truncate">{product.title}</h4>
                            <p className="text-[11px] text-gold-leaf font-medium">₹{product.price}</p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleAddSuggestion(product)}
                          className="text-[10px] font-label-caps tracking-widest text-on-surface border border-on-surface/20 px-3 py-1.5 hover:bg-gold-leaf hover:border-gold-leaf hover:text-obsidian-charcoal transition-all font-semibold"
                        >
                          ADD +
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </main>

      {/* Payment is handled by the Razorpay JS SDK popup — no custom modal needed */}

      <Footer />
    </div>
  );
}

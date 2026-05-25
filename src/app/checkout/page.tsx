"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { createOrder, Product, validateCoupon, Coupon } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

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
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: ''
  });

  const { user, triggerLoginModal, saveAddress } = useAuth();
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);
  const [pinMessage, setPinMessage] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Sync user details to form fields on mount/login
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        address: user.address || prev.address,
        city: user.city || prev.city,
        zip: user.zip || prev.zip,
        country: user.country || prev.country
      }));
    }
  }, [user]);

  // Postal PIN code auto-fill trigger
  useEffect(() => {
    const lookupPincode = async () => {
      const cleanZip = formData.zip.trim();
      if (cleanZip.length === 6 && /^\d+$/.test(cleanZip)) {
        setPinLoading(true);
        setPinMessage('');
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${cleanZip}`);
          const data = await res.json();
          if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
            const po = data[0].PostOffice[0];
            setFormData(prev => ({
              ...prev,
              city: po.District,
              address: prev.address || po.Name
            }));
            setPinMessage(`✓ Verified: ${po.Name}, ${po.District}, ${po.State}`);
          } else {
            setPinMessage('❌ Pincode not registered');
          }
        } catch (err) {
          console.error("PIN Code lookup failed:", err);
          setPinMessage('⚠️ Verification services offline');
        } finally {
          setPinLoading(false);
        }
      } else {
        setPinMessage('');
      }
    };
    
    lookupPincode();
  }, [formData.zip]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
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
  
  // PhonePe Payment Simulation States
  const [showPhonePeModal, setShowPhonePeModal] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [phonePeStatus, setPhonePeStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes timer
  const [paymentTab, setPaymentTab] = useState<'qr' | 'upi'>('qr');

  // Timer logic for QR code
  useEffect(() => {
    if (!showPhonePeModal || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [showPhonePeModal, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Triggers the PhonePe gateway overlay
  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setError('Your shopping bag is empty.');
      return;
    }
    
    if (!user) {
      setError('A authenticated profile is required to check out.');
      triggerLoginModal(() => {
        setError('');
        setTimeLeft(300);
        setPhonePeStatus('idle');
        setShowPhonePeModal(true);
      });
      return;
    }

    setError('');
    setTimeLeft(300); // Reset timer
    setPhonePeStatus('idle');
    setShowPhonePeModal(true);
  };

  // Simulates PhonePe Payment Authorization
  const handlePhonePePay = async () => {
    if (paymentTab === 'upi' && !upiId) {
      alert('Please enter a valid UPI ID');
      return;
    }

    setPhonePeStatus('processing');
    
    // Simulate transaction processing (2 seconds)
    setTimeout(async () => {
      setPhonePeStatus('success');
      
      // Simulate database order creation after 1.5 seconds on success screen
      setTimeout(async () => {
        try {
          // Map cart items to Order Items
          const orderItems = cart.map(item => ({
            product_id: item.product_id,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            selected_size: item.selected_size,
            selected_color: item.selected_color,
            image: item.image
          }));

          // Create Order in DB (Supabase/localStorage)
          const result = await createOrder({
            customer_name: formData.name,
            customer_email: formData.email,
            shipping_address: `${formData.address}, ${formData.city}, ${formData.zip}, ${formData.country}`,
            total_price: finalTotal,
            items: orderItems,
            payment_status: "paid",
            payment_method: "PhonePe UPI",
            coupon_applied: appliedCoupon ? appliedCoupon.code : undefined,
            discount_amount: appliedCoupon ? discountAmount : undefined
          });

          // Save address back to user profile if checked
          if (saveAddressToProfile && user) {
            await saveAddress(formData.address, formData.city, formData.zip, formData.country);
          }

          // Clear the Cart on successful order
          clearCart();
          setShowPhonePeModal(false);
          
          // Redirect to Order Success Page
          router.push(`/success?orderId=${result.id}`);
        } catch (e: any) {
          console.error("Order submission failed:", e);
          setError('An error occurred while placing your order. Please try again.');
          setShowPhonePeModal(false);
        }
      }, 1500);

    }, 2000);
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
                    className="w-full bg-primary text-white py-4 font-label-caps text-label-caps tracking-[0.25em] hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all shadow-md font-semibold flex items-center justify-center gap-2"
                  >
                    CONTINUE TO PHONEPE GATEWAY (₹{finalTotal})
                  </button>
                  
                  <p className="text-[11px] text-center text-on-surface-variant/80 italic">
                    Payments are securely authorized using the official PhonePe UPI interface.
                  </p>
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
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="w-12 h-16 object-cover bg-white aspect-[3/4]"
                      />
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
                          <img 
                            src={product.images[0]} 
                            alt={product.title} 
                            className="w-10 h-13 object-cover bg-white aspect-[3/4]"
                          />
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

      {/* ========================================================================= */}
      {/* PHONEPE UPI PAYMENT INTEGRATION MODAL                                    */}
      {/* ========================================================================= */}
      {showPhonePeModal && (
        <div className="fixed inset-0 z-[200] overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-lg overflow-hidden shadow-2xl border border-purple-200 text-zinc-800">
            
            {/* PhonePe Branding Header */}
            <div className="bg-[#5f259f] px-6 py-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                {/* Simulated PhonePe Logo Icon */}
                <div className="h-8 w-8 bg-white rounded-md flex items-center justify-center font-bold text-[#5f259f] text-[20px] shadow-sm">
                  P
                </div>
                <div>
                  <h3 className="font-semibold text-body-lg tracking-tight">PhonePe</h3>
                  <p className="text-[10px] text-purple-200 uppercase font-semibold tracking-wider">UPI Payment Gateway</p>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  if (phonePeStatus !== 'processing' && phonePeStatus !== 'success') {
                    setShowPhonePeModal(false);
                  }
                }}
                className="text-white/70 hover:text-white material-symbols-outlined text-[20px]"
                disabled={phonePeStatus === 'processing' || phonePeStatus === 'success'}
              >
                close
              </button>
            </div>

            {/* Merchant Details */}
            <div className="bg-purple-50 px-6 py-3.5 flex justify-between items-center border-b border-purple-100">
              <div className="text-[12px] font-medium text-purple-900">
                Merchant: <span className="font-bold text-zinc-900">Stag Beetle India</span>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Amount to Pay</p>
                <p className="font-bold text-[18px] text-[#5f259f]">₹{finalTotal}</p>
              </div>
            </div>

            {/* Payment Content */}
            <div className="p-6">
              {phonePeStatus === 'idle' && (
                <div className="space-y-6">
                  {/* Tabs */}
                  <div className="flex border-b border-zinc-100 font-semibold text-[13px] tracking-wide">
                    <button
                      onClick={() => setPaymentTab('qr')}
                      className={`flex-1 pb-3 text-center border-b-2 transition-all ${
                        paymentTab === 'qr' 
                          ? 'border-[#5f259f] text-[#5f259f]' 
                          : 'border-transparent text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      SCAN UPI QR CODE
                    </button>
                    <button
                      onClick={() => setPaymentTab('upi')}
                      className={`flex-1 pb-3 text-center border-b-2 transition-all ${
                        paymentTab === 'upi' 
                          ? 'border-[#5f259f] text-[#5f259f]' 
                          : 'border-transparent text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      ENTER UPI ID
                    </button>
                  </div>

                  {/* TAB 1: QR Code Scanner */}
                  {paymentTab === 'qr' && (
                    <div className="flex flex-col items-center space-y-4">
                      {/* High-Fidelity Vector QR Code */}
                      <div className="border-2 border-dashed border-purple-200 p-3 bg-zinc-50 rounded-lg relative">
                        <svg className="w-40 h-40" viewBox="0 0 100 100" fill="currentColor">
                          {/* Corner Squares */}
                          <path d="M5,5 H25 V25 H5 Z M10,10 H20 V20 H10 Z" />
                          <path d="M75,5 H95 V25 H75 Z M80,10 H90 V20 H80 Z" />
                          <path d="M5,75 H25 V95 H5 Z M10,80 H20 V90 H10 Z" />
                          
                          {/* Fake QR code dot pattern */}
                          <rect x="35" y="5" width="5" height="15" />
                          <rect x="45" y="10" width="10" height="5" />
                          <rect x="60" y="5" width="10" height="5" />
                          
                          <rect x="35" y="25" width="20" height="5" />
                          <rect x="30" y="35" width="5" height="15" />
                          <rect x="45" y="45" width="15" height="5" />
                          <rect x="5" y="35" width="10" height="5" />
                          <rect x="15" y="45" width="5" height="10" />
                          
                          <rect x="75" y="35" width="15" height="5" />
                          <rect x="85" y="45" width="5" height="20" />
                          <rect x="65" y="50" width="10" height="5" />
                          
                          <rect x="35" y="60" width="5" height="15" />
                          <rect x="45" y="65" width="10" height="5" />
                          <rect x="5" y="60" width="10" height="5" />
                          <rect x="20" y="65" width="5" height="5" />
                          
                          <rect x="65" y="70" width="25" height="5" />
                          <rect x="75" y="80" width="5" height="15" />
                          <rect x="85" y="85" width="10" height="5" />
                          <rect x="55" y="85" width="10" height="5" />
                          
                          {/* PhonePe Center Icon */}
                          <rect x="42" y="42" width="16" height="16" fill="white" rx="2" />
                          <text x="47" y="54" fill="#5f259f" fontWeight="bold" fontSize="13px">P</text>
                        </svg>
                      </div>

                      <div className="text-center space-y-2">
                        <p className="text-[13px] font-semibold text-zinc-700">Scan QR using PhonePe or any UPI app</p>
                        <div className="flex items-center gap-1.5 justify-center text-[11px] text-zinc-500 font-semibold bg-zinc-100 py-1 px-3 rounded-full">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          QR expires in <span className="text-[#5f259f] font-bold">{formatTime(timeLeft)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handlePhonePePay}
                        className="w-full bg-[#5f259f] text-white py-3 rounded-md font-semibold text-[14px] hover:bg-[#4d1d82] transition-colors shadow-sm mt-2"
                      >
                        SIMULATE SUCCESSFUL SCAN
                      </button>
                    </div>
                  )}

                  {/* TAB 2: UPI ID payment */}
                  {paymentTab === 'upi' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">ENTER YOUR UPI ID</label>
                        <div className="flex items-center border border-zinc-200 rounded-md overflow-hidden bg-zinc-50 focus-within:border-purple-300">
                          <input 
                            type="text" 
                            placeholder="e.g. mobileNumber" 
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-[14px] px-3 py-3 w-full outline-none"
                          />
                          <span className="bg-zinc-200/50 px-4 py-3 text-[14px] text-zinc-500 font-semibold border-l border-zinc-100">
                            @ybl
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handlePhonePePay}
                        className="w-full bg-[#5f259f] text-white py-3 rounded-md font-semibold text-[14px] hover:bg-[#4d1d82] transition-colors shadow-sm"
                      >
                        VERIFY & PAY
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Processing State */}
              {phonePeStatus === 'processing' && (
                <div className="py-12 flex flex-col items-center justify-center space-y-6">
                  <div className="relative flex items-center justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#5f259f]"></div>
                    <span className="absolute text-[#5f259f] font-bold text-[18px]">P</span>
                  </div>
                  <div className="text-center space-y-1.5">
                    <h4 className="font-semibold text-zinc-800">Processing UPI Transaction</h4>
                    <p className="text-[12px] text-zinc-500">Do not refresh this page or press back button.</p>
                  </div>
                </div>
              )}

              {/* Success Screen */}
              {phonePeStatus === 'success' && (
                <div className="py-10 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 animate-bounce">
                    <span className="material-symbols-outlined text-[36px] fill-1">check_circle</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-[20px] text-green-800">Transaction Successful</h4>
                    <p className="text-[12px] text-zinc-500 font-semibold">Ref: TXN{Math.random().toString().substr(2, 9).toUpperCase()}</p>
                    <p className="text-[14px] text-zinc-700 font-medium mt-2">
                      Charged <span className="font-bold">₹{finalTotal}</span> successfully.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* PhonePe Footer Security Seal */}
            <div className="bg-zinc-50 border-t border-zinc-100 px-6 py-4 flex justify-between items-center text-[11px] text-zinc-400 font-semibold tracking-wider">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-green-600">lock</span> SECURED BY PHONEPE
              </span>
              <span>PCI-DSS COMPLIANT</span>
            </div>

          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

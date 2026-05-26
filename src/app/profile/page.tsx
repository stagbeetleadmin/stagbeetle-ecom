"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getOrders, Order, UserProfile } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, updateProfile, saveAddress, triggerLoginModal } = useAuth();
  
  // Local states for forms
  const [personalData, setPersonalData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [addressData, setAddressData] = useState({
    address: '',
    city: '',
    zip: '',
    country: 'India',
  });

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  
  // UI states
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [personalError, setPersonalError] = useState('');
  const [personalSuccess, setPersonalSuccess] = useState('');
  const [addressError, setAddressError] = useState('');
  const [addressSuccess, setAddressSuccess] = useState('');
  
  // PIN code states
  const [pinMessage, setPinMessage] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Sync profile details on user load
  useEffect(() => {
    if (user) {
      setPersonalData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
      setAddressData({
        address: user.address || '',
        city: user.city || '',
        zip: user.zip || '',
        country: user.country || 'India',
      });
      
      // Fetch user orders
      const fetchOrders = async () => {
        try {
          const allOrders = await getOrders();
          const userOrders = allOrders.filter(
            (order) => order.customer_email.toLowerCase() === user.email.toLowerCase()
          );
          setOrders(userOrders);
        } catch (err) {
          console.error("Error fetching orders:", err);
        } finally {
          setOrdersLoading(false);
        }
      };
      fetchOrders();
    } else if (!loading) {
      setOrdersLoading(false);
    }
  }, [user, loading]);

  // India Post PIN code lookup
  useEffect(() => {
    const lookupPincode = async () => {
      const cleanZip = addressData.zip.trim();
      if (cleanZip.length !== 6 || !/^\d{6}$/.test(cleanZip)) {
        setPinMessage('');
        return;
      }
      setPinLoading(true);
      setPinMessage('');
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleanZip}`);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        if (data?.[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          setAddressData(prev => ({
            ...prev,
            city: prev.city || po.District,
          }));
          setPinMessage(`✓ ${po.Name}, ${po.District}, ${po.State}`);
        } else {
          setPinMessage('PIN code not found');
        }
      } catch {
        setPinMessage('');
      } finally {
        setPinLoading(false);
      }
    };
    if (isEditingAddress) {
      lookupPincode();
    }
  }, [addressData.zip, isEditingAddress]);

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalError('');
    setPersonalSuccess('');

    if (!personalData.name.trim() || !personalData.email.trim()) {
      setPersonalError('Name and Email are required.');
      return;
    }

    try {
      await updateProfile({
        name: personalData.name.trim(),
        email: personalData.email.trim(),
        phone: personalData.phone.trim(),
      });
      setPersonalSuccess('Personal information updated successfully.');
      setIsEditingPersonal(false);
    } catch (err) {
      setPersonalError('Failed to update personal information.');
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError('');
    setAddressSuccess('');

    if (!addressData.address.trim() || !addressData.city.trim() || !addressData.zip.trim()) {
      setAddressError('Please fill in Address, City, and PIN code.');
      return;
    }

    try {
      await saveAddress(
        addressData.address.trim(),
        addressData.city.trim(),
        addressData.zip.trim(),
        addressData.country
      );
      setAddressSuccess('Shipping details updated successfully.');
      setIsEditingAddress(false);
    } catch (err) {
      setAddressError('Failed to update shipping details.');
    }
  };

  // Date formatting helper
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  // If loading user state
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-surface">
        <Header />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold-leaf"></div>
        </div>
        <Footer />
      </div>
    );
  }

  // If not logged in, show auth requirement page
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-surface">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center text-center p-6 py-20 bg-white relative">
          <div className="fixed inset-0 marble-overlay z-0"></div>
          <div className="max-w-md w-full space-y-6 relative z-10 p-8 border border-on-surface/5 bg-surface-dim/30 shadow-sm rounded-sm">
            <span className="material-symbols-outlined text-[48px] text-gold-leaf">account_circle</span>
            <h2 className="font-display text-[26px] font-semibold text-on-surface">Atelier Member Access</h2>
            <p className="font-body text-[14px] text-on-surface-variant leading-relaxed">
              Please sign in to view your profile details, manage shipping configurations, and trace your order history.
            </p>
            <button
              onClick={() => triggerLoginModal()}
              className="w-full bg-[#0D1B2A] text-white py-3.5 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all rounded-sm shadow-md"
            >
              Sign In to Profile
            </button>
            <div>
              <Link href="/" className="text-[12px] text-zinc-500 hover:text-zinc-800 underline">
                Return to Atelier Homepage
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface selection:bg-gold-leaf/20">
      <Header />

      <main className="flex-1 relative py-12 md:py-20 bg-white">
        <div className="fixed inset-0 marble-overlay z-0"></div>

        <div className="max-w-[1200px] mx-auto px-6 md:px-12 relative z-10">
          {/* Breadcrumb & Welcome */}
          <div className="flex flex-col items-center md:items-start mb-12">
            <p className="text-[10px] font-bold tracking-[0.3em] text-[#C5A059] uppercase mb-2">
              Atelier Member Portal
            </p>
            <h1 className="font-display text-[36px] font-semibold text-on-surface">
              Welcome, {user.name}
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Left Column: Forms */}
            <div className="lg:col-span-6 space-y-8">
              {/* Personal Information */}
              <div className="border border-on-surface/5 p-6 md:p-8 bg-surface-dim/20 rounded-sm space-y-6 shadow-sm">
                <div className="flex justify-between items-center border-b border-on-surface/10 pb-3">
                  <h2 className="font-display text-[20px] font-semibold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-gold-leaf">person</span>
                    Personal Details
                  </h2>
                  {!isEditingPersonal && (
                    <button
                      onClick={() => setIsEditingPersonal(true)}
                      className="text-[11px] font-label-caps tracking-widest text-[#0D1B2A] hover:text-gold-leaf font-bold flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span> EDIT
                    </button>
                  )}
                </div>

                {personalSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-800 text-[12px] py-2.5 px-3 rounded-sm font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    {personalSuccess}
                  </div>
                )}
                {personalError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 text-[12px] py-2.5 px-3 rounded-sm font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {personalError}
                  </div>
                )}

                {isEditingPersonal ? (
                  <form onSubmit={handlePersonalSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-on-surface-variant block uppercase">FULL NAME</label>
                      <input
                        type="text"
                        value={personalData.name}
                        onChange={(e) => setPersonalData({ ...personalData, name: e.target.value })}
                        required
                        className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3 text-[14px] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-on-surface-variant block uppercase">EMAIL ADDRESS</label>
                      <input
                        type="email"
                        value={personalData.email}
                        onChange={(e) => setPersonalData({ ...personalData, email: e.target.value })}
                        required
                        className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3 text-[14px] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-on-surface-variant block uppercase">PHONE NUMBER</label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={personalData.phone}
                        onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value })}
                        className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3 text-[14px] outline-none"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="bg-[#0D1B2A] text-white px-5 py-2.5 text-[11px] font-bold tracking-widest uppercase hover:bg-gold-leaf hover:text-obsidian-charcoal transition-colors rounded-sm"
                      >
                        SAVE DETAILS
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPersonalData({
                            name: user.name || '',
                            email: user.email || '',
                            phone: user.phone || '',
                          });
                          setPersonalError('');
                          setPersonalSuccess('');
                          setIsEditingPersonal(false);
                        }}
                        className="border border-zinc-200 text-zinc-500 px-5 py-2.5 text-[11px] font-bold tracking-widest uppercase hover:bg-zinc-50 transition-colors rounded-sm"
                      >
                        CANCEL
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4 font-body text-[14px] text-on-surface">
                    <div className="grid grid-cols-3 border-b border-zinc-50 pb-2">
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Name</span>
                      <span className="col-span-2 font-medium">{user.name}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-zinc-50 pb-2">
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Email</span>
                      <span className="col-span-2 font-medium truncate">{user.email}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-zinc-50 pb-2">
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Phone</span>
                      <span className="col-span-2 font-medium">{user.phone || <em className="text-zinc-400">Not set</em>}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Account Type</span>
                      <span className="col-span-2 font-semibold text-gold-leaf uppercase tracking-wider text-[11px]">
                        {user.id?.includes('google') ? 'Google Connected' : 'Email & Phone'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Shipping Configuration */}
              <div className="border border-on-surface/5 p-6 md:p-8 bg-surface-dim/20 rounded-sm space-y-6 shadow-sm">
                <div className="flex justify-between items-center border-b border-on-surface/10 pb-3">
                  <h2 className="font-display text-[20px] font-semibold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-gold-leaf">local_shipping</span>
                    Atelier Shipping Address
                  </h2>
                  {!isEditingAddress && (
                    <button
                      onClick={() => setIsEditingAddress(true)}
                      className="text-[11px] font-label-caps tracking-widest text-[#0D1B2A] hover:text-gold-leaf font-bold flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span> EDIT
                    </button>
                  )}
                </div>

                {addressSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-800 text-[12px] py-2.5 px-3 rounded-sm font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    {addressSuccess}
                  </div>
                )}
                {addressError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 text-[12px] py-2.5 px-3 rounded-sm font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {addressError}
                  </div>
                )}

                {isEditingAddress ? (
                  <form onSubmit={handleAddressSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-on-surface-variant block uppercase">STREET ADDRESS</label>
                      <input
                        type="text"
                        placeholder="House / Apartment number, street name"
                        value={addressData.address}
                        onChange={(e) => setAddressData({ ...addressData, address: e.target.value })}
                        required
                        className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3 text-[14px] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold tracking-wider text-on-surface-variant block uppercase">PIN CODE</label>
                        <div className="relative">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="e.g. 560001"
                            value={addressData.zip}
                            onChange={(e) => setAddressData({ ...addressData, zip: e.target.value })}
                            required
                            className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3 text-[14px] outline-none"
                          />
                          {pinLoading && (
                            <div className="absolute right-3 top-3 animate-spin rounded-full h-4 w-4 border-2 border-gold-leaf border-t-transparent"></div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold tracking-wider text-on-surface-variant block uppercase">CITY</label>
                        <input
                          type="text"
                          value={addressData.city}
                          onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                          required
                          className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3 text-[14px] outline-none"
                        />
                      </div>
                    </div>

                    {pinMessage && (
                      <p className={`text-[11px] font-semibold ${pinMessage.startsWith('✓') ? 'text-green-700' : 'text-red-700'}`}>
                        {pinMessage}
                      </p>
                    )}

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold tracking-wider text-on-surface-variant block uppercase">COUNTRY</label>
                      <select
                        value={addressData.country}
                        onChange={(e) => setAddressData({ ...addressData, country: e.target.value })}
                        className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf rounded-sm py-2.5 px-3 text-[14px] outline-none"
                      >
                        <option>India</option>
                        <option>United Kingdom</option>
                        <option>United States</option>
                        <option>France</option>
                        <option>Italy</option>
                      </select>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="bg-[#0D1B2A] text-white px-5 py-2.5 text-[11px] font-bold tracking-widest uppercase hover:bg-gold-leaf hover:text-obsidian-charcoal transition-colors rounded-sm"
                      >
                        SAVE ADDRESS
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddressData({
                            address: user.address || '',
                            city: user.city || '',
                            zip: user.zip || '',
                            country: user.country || 'India',
                          });
                          setPinMessage('');
                          setAddressError('');
                          setAddressSuccess('');
                          setIsEditingAddress(false);
                        }}
                        className="border border-zinc-200 text-zinc-500 px-5 py-2.5 text-[11px] font-bold tracking-widest uppercase hover:bg-zinc-50 transition-colors rounded-sm"
                      >
                        CANCEL
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4 font-body text-[14px] text-on-surface">
                    {user.address ? (
                      <div className="space-y-2">
                        <p className="font-semibold text-zinc-800">{user.name}</p>
                        <p className="text-on-surface-variant leading-relaxed">{user.address}</p>
                        <p className="text-on-surface-variant">{user.city} — {user.zip}</p>
                        <p className="text-on-surface-variant">{user.country}</p>
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-zinc-400 italic mb-3">No delivery address saved yet.</p>
                        <button
                          onClick={() => setIsEditingAddress(true)}
                          className="bg-white border border-zinc-200 hover:border-[#0D1B2A] px-4 py-2 text-[11px] font-bold tracking-widest uppercase transition-all rounded-sm text-zinc-600 hover:text-zinc-900"
                        >
                          Configure Address
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Order History */}
            <div className="lg:col-span-6 space-y-6">
              <div className="border border-on-surface/5 p-6 md:p-8 bg-surface-dim/20 rounded-sm space-y-6 shadow-sm">
                <h2 className="font-display text-[20px] font-semibold text-on-surface border-b border-on-surface/10 pb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-gold-leaf">history</span>
                  Order History
                </h2>

                {ordersLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-leaf"></div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-12 text-center space-y-4">
                    <span className="material-symbols-outlined text-[40px] text-zinc-300">shopping_bag</span>
                    <p className="text-zinc-500 font-body text-[14px]">You haven't placed any orders yet.</p>
                    <Link
                      href="/"
                      className="inline-block bg-[#0D1B2A] text-white px-6 py-2.5 text-[11px] font-bold tracking-widest uppercase hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all rounded-sm"
                    >
                      EXPLORE WEAVES
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1 hide-scrollbar">
                    {orders.map((order) => (
                      <div key={order.id} className="border border-zinc-100 hover:border-zinc-200 bg-white p-5 rounded-sm transition-all shadow-sm">
                        <div className="flex justify-between items-start gap-4 mb-4 border-b border-zinc-50 pb-3">
                          <div>
                            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">ORDER ID</p>
                            <p className="font-semibold text-zinc-800 text-[13px]">{order.id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">DATE</p>
                            <p className="text-zinc-600 text-[13px]">{formatDate(order.created_at)}</p>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-3 mb-4">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex gap-3 items-center">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="w-10 h-13 object-cover rounded-sm border border-zinc-100 aspect-[3/4]"
                                />
                              ) : (
                                <div className="w-10 h-13 bg-zinc-100 rounded-sm border border-zinc-100 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-[16px] text-zinc-400">image</span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-[13px] text-zinc-800 truncate">{item.title}</h4>
                                <p className="text-[10px] text-zinc-500">
                                  Size: {item.selected_size} &middot; Color: {item.selected_color} (x{item.quantity})
                                </p>
                              </div>
                              <span className="text-[13px] font-bold text-zinc-700">₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        {/* Order Footer */}
                        <div className="border-t border-zinc-50 pt-3 flex justify-between items-center">
                          <div className="flex gap-2 items-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-150">
                              {order.payment_status || 'paid'}
                            </span>
                            <span className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider">
                              via {order.payment_method || 'PhonePe UPI'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-zinc-400 mr-2">Total Paid</span>
                            <span className="text-[15px] font-bold text-gold-leaf">₹{order.total_price}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

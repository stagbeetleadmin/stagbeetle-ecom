"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/db';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface ProductDetailClientProps {
  product: Product;
  initialSuggestions: Product[];
}

export default function ProductDetailClient({ product, initialSuggestions }: ProductDetailClientProps) {
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || 'M');
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || 'Default');
  const [quantity, setQuantity] = useState(1);
  const [addedMessage, setAddedMessage] = useState(false);

  const handleAddToCart = () => {
    addToCart(product, selectedSize, selectedColor, quantity);
    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 2500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />

      <main className="flex-1">

        {/* ── Breadcrumb ── */}
        <div className="px-4 md:px-10 py-3 border-b border-gray-100 max-w-[1400px] mx-auto w-full">
          <nav className="flex items-center gap-2 text-[11px] text-gray-400">
            <Link href="/" className="hover:text-[#C5A059] transition-colors">Home</Link>
            <span>/</span>
            <Link href={`/?category=${product.category.toLowerCase()}`} className="hover:text-[#C5A059] transition-colors capitalize">
              {product.category}
            </Link>
            <span>/</span>
            <span className="text-gray-700 truncate max-w-[200px]">{product.title}</span>
          </nav>
        </div>

        {/* ── Product Detail ── */}
        <section className="px-4 md:px-10 py-6 max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

            {/* ── Left: Image Gallery ── */}
            <div className="flex gap-3">

              {/* Thumbnails — vertical strip */}
              {product.images.length > 1 && (
                <div className="flex flex-col gap-2 shrink-0">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-16 h-20 overflow-hidden border-2 transition-all shrink-0 ${
                        activeImageIndex === idx
                          ? 'border-[#C5A059]'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Main image — fixed height so it fits in viewport */}
              <div className="flex-1 relative overflow-hidden bg-gray-50 border border-gray-100" style={{ height: 'min(70vh, 560px)' }}>
                <img
                  src={product.images[activeImageIndex]}
                  alt={product.title}
                  className="w-full h-full object-cover object-top transition-all duration-400"
                />
                {/* View label */}
                <span className="absolute bottom-3 left-3 bg-white/90 text-[9px] font-bold tracking-[0.2em] uppercase px-2 py-1 text-gray-600">
                  {activeImageIndex === 0 ? 'Front' : activeImageIndex === 1 ? 'Back' : 'Detail'}
                </span>
                {/* Arrow nav on mobile */}
                {product.images.length > 1 && (
                  <div className="absolute inset-y-0 right-2 flex flex-col justify-center gap-2 lg:hidden">
                    <button
                      onClick={() => setActiveImageIndex(i => Math.max(0, i - 1))}
                      className="w-7 h-7 bg-white/80 flex items-center justify-center shadow text-gray-600 hover:text-[#C5A059]"
                    >
                      <span className="material-symbols-outlined text-[16px]">expand_less</span>
                    </button>
                    <button
                      onClick={() => setActiveImageIndex(i => Math.min(product.images.length - 1, i + 1))}
                      className="w-7 h-7 bg-white/80 flex items-center justify-center shadow text-gray-600 hover:text-[#C5A059]"
                    >
                      <span className="material-symbols-outlined text-[16px]">expand_more</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Product Info ── */}
            <div className="flex flex-col gap-5">

              {/* Title & price */}
              <div>
                <p className="text-[10px] font-bold tracking-[0.3em] text-[#C5A059] uppercase mb-1">
                  {product.category} Collection
                </p>
                <h1 className="text-[28px] md:text-[32px] font-bold text-gray-900 leading-tight mb-3">
                  {product.title}
                </h1>
                <div className="flex items-center gap-4">
                  <span className="text-[26px] font-bold text-[#0D1B2A]">
                    ₹{product.price.toLocaleString('en-IN')}
                  </span>
                  {product.rating && (
                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-sm">
                      <span className="material-symbols-outlined text-[13px] text-amber-500 fill-1">star</span>
                      <span className="text-[12px] font-bold text-amber-700">{product.rating}</span>
                    </div>
                  )}
                </div>
                <p className="text-[12px] text-gray-500 mt-2">
                  Material: <span className="font-semibold text-gray-700">{product.material}</span>
                </p>
                {product.sku && (
                  <p className="text-[12px] text-gray-500 mt-1">
                    SKU: <span className="font-semibold text-gray-700 uppercase">{product.sku}</span>
                  </p>
                )}
                {product.sleeve_type && (
                  <p className="text-[12px] text-gray-500 mt-1">
                    Sleeves: <span className="font-semibold text-gray-700">{product.sleeve_type}</span>
                  </p>
                )}
              </div>

              {/* Description */}
              <p className="text-[13px] text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                {product.description}
              </p>

              {isAdmin ? (
                <div className="border-t border-gray-100 pt-6">
                  <div className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-center py-5 px-6 rounded-sm space-y-3">
                    <span className="material-symbols-outlined text-[28px] text-gold-leaf">admin_panel_settings</span>
                    <p className="text-[12px] font-bold uppercase tracking-widest text-[#0D1B2A]">Logged in as Administrator</p>
                    <p className="text-[11px] text-zinc-500 font-body leading-relaxed">
                      Shopping operations and cart selections are disabled for administrative accounts.
                    </p>
                    <div className="pt-2">
                      <Link
                        href="/admin"
                        className="inline-block bg-[#0D1B2A] text-white hover:bg-[#C5A059] transition-colors px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-sm"
                      >
                        Go to Seller Dashboard
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Size selector */}
                  {product.sizes[0] !== 'One Size' && (
                    <div className="border-t border-gray-100 pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">Size</span>
                        <span className="text-[11px] text-[#C5A059] font-semibold cursor-pointer hover:underline">Size Guide</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {product.sizes.map(size => (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`px-4 py-2 text-[12px] font-bold border transition-all ${
                              selectedSize === size
                                ? 'bg-[#0D1B2A] border-[#0D1B2A] text-white'
                                : 'border-gray-200 text-gray-700 hover:border-gray-400 bg-white'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Color selector */}
                  <div className="border-t border-gray-100 pt-4">
                    <span className="text-[11px] font-bold tracking-widest text-gray-500 uppercase block mb-2">
                      Color: <span className="text-gray-800 normal-case font-semibold">{selectedColor}</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.map(color => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`px-3 py-1.5 text-[11px] border transition-all ${
                            selectedColor === color
                              ? 'border-[#C5A059] bg-[#C5A059]/10 text-gray-900 font-semibold'
                              : 'border-gray-200 text-gray-600 hover:border-gray-400 bg-white'
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quantity + Add to cart */}
                  <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                      <span className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">Qty</span>
                      <div className="flex items-center border border-gray-200 bg-white">
                        <button
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-900 text-lg font-bold"
                        >
                          −
                        </button>
                        <span className="w-10 text-center text-[14px] font-semibold text-gray-900">{quantity}</span>
                        <button
                          onClick={() => setQuantity(q => q + 1)}
                          className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-900 text-lg font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleAddToCart}
                      className="w-full bg-[#0D1B2A] text-white py-3.5 text-[11px] font-bold tracking-[0.25em] uppercase hover:bg-[#C5A059] transition-colors"
                    >
                      Add to Bag
                    </button>

                    {addedMessage && (
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-[12px] font-medium py-2.5 px-4 rounded-sm">
                        <span className="material-symbols-outlined text-[15px] text-green-600">check_circle</span>
                        Added {quantity} item{quantity > 1 ? 's' : ''} to your bag
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Trust badges */}
              <div className="border-t border-gray-100 pt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: 'local_shipping', label: 'Free Shipping' },
                  { icon: 'replay', label: '14-Day Returns' },
                  { icon: 'verified', label: 'Authentic Craft' },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <span className="material-symbols-outlined text-[18px] text-[#C5A059]">{icon}</span>
                    <span className="text-[10px] text-gray-500 font-medium">{label}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* ── You May Also Like ── */}
        {initialSuggestions.length > 0 && (
          <section className="px-4 md:px-10 py-10 border-t border-gray-100 max-w-[1400px] mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-bold tracking-[0.3em] text-[#C5A059] uppercase mb-1">You May Also Like</p>
                <h2 className="text-[20px] font-bold text-gray-900">Complete the Look</h2>
              </div>
              <Link href={`/?category=${product.category.toLowerCase()}`}
                className="text-[11px] font-bold tracking-wider text-gray-500 hover:text-[#C5A059] uppercase transition-colors">
                View All →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {initialSuggestions.map(item => (
                <Link
                  href={`/product/${item.id}`}
                  key={item.id}
                  className="group block bg-white border border-gray-100 hover:border-gray-300 transition-all"
                >
                  <div className="overflow-hidden bg-gray-50" style={{ aspectRatio: '3/4' }}>
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">{item.category}</p>
                    <h4 className="text-[13px] font-semibold text-gray-900 leading-snug mb-1">{item.title}</h4>
                    <span className="text-[13px] font-bold text-[#0D1B2A]">₹{item.price.toLocaleString('en-IN')}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </main>

      <Footer />
    </div>
  );
}

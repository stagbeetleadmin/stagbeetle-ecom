"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Product, InventoryRecord, getColorHex, getColorName, getProductById, subscribeToProductChanges, getInventoryForProduct, subscribeToInventoryChanges } from '@/lib/db';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductGallery from '@/components/ProductGallery';
import PriceDisplay from '@/components/PriceDisplay';
import RichText from '@/components/RichText';

interface ProductDetailClientProps {
  product: Product;
  initialSuggestions: Product[];
  colorVariants?: Product[];
}

export default function ProductDetailClient({ product: initialProduct, initialSuggestions, colorVariants = [] }: ProductDetailClientProps) {
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category') || '';
  // Seeded from the server-fetched product, then kept live if an admin edits
  // this exact product while it's open (price, description, images, etc.) —
  // the shopper's own size/color selection below is left untouched by that.
  const [product, setProduct] = useState(initialProduct);
  const [selectedSize, setSelectedSize] = useState(initialProduct.sizes[0] || 'M');
  const [selectedColor, setSelectedColor] = useState(getColorName(initialProduct.colors[0]) || 'Default');
  const [quantity, setQuantity] = useState(1);
  const [addedMessage, setAddedMessage] = useState(false);

  // Per-size stock — a size with no record at all is treated as available
  // (untracked, matches the same "don't block a sale we have no data on"
  // policy the backend uses), so this never breaks a product that hasn't
  // been synced with Galla yet.
  const [stockBySize, setStockBySize] = useState<Record<string, InventoryRecord>>({});
  const hasAutoSelectedRef = useRef(false);

  const refreshStock = useCallback(() => {
    getInventoryForProduct(initialProduct.id).then(records => {
      const bySize: Record<string, InventoryRecord> = {};
      records.forEach(r => { bySize[r.size] = r; });
      setStockBySize(bySize);

      // Once, on first load only: if the pre-selected size (just the first
      // in the list) turns out to already be sold out, quietly land on the
      // first available size instead. Never re-runs on a later live update,
      // so we don't yank the selection out from under someone mid-decision.
      if (!hasAutoSelectedRef.current) {
        hasAutoSelectedRef.current = true;
        setSelectedSize(current => {
          if (bySize[current]?.quantity_available !== 0) return current;
          const firstAvailable = initialProduct.sizes.find(s => bySize[s]?.quantity_available !== 0);
          return firstAvailable || current;
        });
      }
    });
  }, [initialProduct.id, initialProduct.sizes]);

  useEffect(() => { refreshStock(); }, [refreshStock]);

  useEffect(() => {
    const unsubscribe = subscribeToProductChanges(() => {
      getProductById(initialProduct.id).then(fresh => { if (fresh) setProduct(fresh); });
    });
    return unsubscribe;
  }, [initialProduct.id]);

  // Live "someone else just bought the last one" updates
  useEffect(() => {
    const unsubscribe = subscribeToInventoryChanges(refreshStock);
    return unsubscribe;
  }, [refreshStock]);

  const isSizeOutOfStock = (size: string) => stockBySize[size]?.quantity_available === 0;
  const selectedSizeOutOfStock = isSizeOutOfStock(selectedSize);

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
            {/* key={product.id} forces a clean remount (fresh active image, no leftover zoom state) when navigating between products */}
            <ProductGallery key={product.id} images={product.images} title={product.title} />

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
                  <PriceDisplay price={product.price} mrp={product.mrp} size="lg" />
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
              <div className="border-t border-gray-100 pt-4">
                <RichText html={product.description} className="text-[13px] text-gray-600 leading-relaxed" />
              </div>

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
                        {product.sizes.map(size => {
                          const outOfStock = isSizeOutOfStock(size);
                          return (
                            <button
                              key={size}
                              onClick={() => !outOfStock && setSelectedSize(size)}
                              disabled={outOfStock}
                              title={outOfStock ? `${size} is out of stock` : undefined}
                              className={`relative px-4 py-2 text-[12px] font-bold border transition-all ${
                                outOfStock
                                  ? 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed line-through'
                                  : selectedSize === size
                                    ? 'bg-[#0D1B2A] border-[#0D1B2A] text-white'
                                    : 'border-gray-200 text-gray-700 hover:border-gray-400 bg-white'
                              }`}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Color selector */}
                  <div className="border-t border-gray-100 pt-4">
                    <span className="text-[11px] font-bold tracking-widest text-gray-500 uppercase block mb-2">
                      Color: <span className="text-gray-800 normal-case font-semibold">{selectedColor}</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.map(color => {
                        const colorHex = getColorHex(color);
                        const cleanColorName = getColorName(color);
                        return (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(cleanColorName)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] border transition-all ${
                              selectedColor === cleanColorName
                                ? 'border-[#C5A059] bg-[#C5A059]/10 text-gray-900 font-semibold'
                                : 'border-gray-200 text-gray-600 hover:border-gray-400 bg-white'
                            }`}
                          >
                            <span 
                              className="w-2.5 h-2.5 rounded-full border border-gray-200/50 shrink-0" 
                              style={{ backgroundColor: colorHex }}
                            />
                            {cleanColorName}
                          </button>
                        );
                      })}

                      {/* Display other SKU variants as clickable color links */}
                      {colorVariants
                        .filter(variant => {
                          const variantColor = variant.colors[0];
                          return variantColor && !product.colors.some(c => getColorName(c).toLowerCase().trim() === getColorName(variantColor).toLowerCase().trim());
                        })
                        .map(variant => {
                          const variantColor = variant.colors[0] || 'Default';
                          const colorHex = getColorHex(variantColor);
                          return (
                            <Link
                              key={variant.id}
                              href={`/product/${variant.id}${activeCategory ? `?category=${activeCategory}` : ''}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 bg-white transition-all"
                              title={`Switch to ${getColorName(variantColor)}`}
                            >
                              <span 
                                className="w-2.5 h-2.5 rounded-full border border-gray-200/50 shrink-0" 
                                style={{ backgroundColor: colorHex }}
                              />
                              {getColorName(variantColor)}
                            </Link>
                          );
                        })
                      }
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
                      disabled={selectedSizeOutOfStock}
                      className="w-full bg-[#0D1B2A] text-white py-3.5 text-[11px] font-bold tracking-[0.25em] uppercase hover:bg-[#C5A059] transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-200"
                    >
                      {selectedSizeOutOfStock ? 'Out of Stock' : 'Add to Bag'}
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
                  href={`/product/${item.id}${activeCategory ? `?category=${activeCategory}` : ''}`}
                  key={item.id}
                  className="group block bg-white border border-gray-100 hover:border-gray-300 transition-all"
                >
                  <div className="overflow-hidden bg-gray-50" style={{ aspectRatio: '3/4' }}>
                    {item.images && item.images[0] ? (
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 text-[10px] font-label-caps tracking-wider text-center p-2">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">{item.category}</p>
                    <h4 className="text-[13px] font-semibold text-gray-900 leading-snug mb-1">{item.title}</h4>
                    <PriceDisplay price={item.price} mrp={item.mrp} size="sm" />
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

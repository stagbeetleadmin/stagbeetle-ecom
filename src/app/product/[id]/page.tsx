"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { getProductById, getSuggestions, Product } from '@/lib/db';
import { useCart } from '@/context/CartContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetail({ params }: ProductPageProps) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [addedMessage, setAddedMessage] = useState(false);

  // Fetch product data
  useEffect(() => {
    const fetchProductData = async () => {
      setLoading(true);
      const prod = await getProductById(id);
      if (prod) {
        setProduct(prod);
        setSelectedSize(prod.sizes[0] || 'One Size');
        setSelectedColor(prod.colors[0] || 'Default');
        
        // Fetch recommendations
        const recs = await getSuggestions([prod.id]);
        setSuggestions(recs);
      }
      setLoading(false);
    };

    fetchProductData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-surface">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-leaf"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col min-h-screen bg-surface">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-20">
          <span className="material-symbols-outlined text-[48px] text-outline">error_outline</span>
          <h2 className="font-display text-headline-lg text-on-surface">Product Not Found</h2>
          <p className="font-body text-on-surface-variant">The garment you are looking for does not exist in our catalog.</p>
          <Link 
            href="/"
            className="bg-primary text-white px-8 py-3 text-label-caps tracking-widest hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all"
          >
            RETURN TO CATALOG
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(product, selectedSize, selectedColor, quantity);
    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 3000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface selection:bg-gold-leaf/20 selection:text-on-surface">
      <Header />

      <main className="flex-1 relative z-10">
        <div className="fixed inset-0 marble-overlay z-0"></div>

        {/* Product Details Section */}
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-container-max mx-auto px-6 md:px-12">
            
            {/* Back to Catalog */}
            <div className="mb-8">
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-[12px] font-label-caps tracking-widest text-on-surface-variant hover:text-gold-leaf transition-colors font-semibold"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                BACK TO CATALOG
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
              
              {/* Left Column: Image Gallery (multiple angles) */}
              <div className="lg:col-span-7 flex flex-col md:flex-row-reverse gap-4">
                
                {/* Active Main Image */}
                <div className="flex-1 aspect-[3/4] bg-surface-dim overflow-hidden relative border border-on-surface/5">
                  <img 
                    src={product.images[activeImageIndex]} 
                    alt={`${product.title} view ${activeImageIndex + 1}`} 
                    className="w-full h-full object-cover transition-all duration-500"
                  />
                  
                  {/* Angle Label */}
                  <span className="absolute bottom-4 left-4 bg-white/75 backdrop-blur-md px-3 py-1 text-[10px] font-label-caps tracking-widest font-semibold border border-on-surface/10 uppercase">
                    {activeImageIndex === 0 ? 'FRONT VIEW' : activeImageIndex === 1 ? 'BACK VIEW' : 'DETAIL / SIDE VIEW'}
                  </span>
                </div>

                {/* Thumbnail list (multiple sides) */}
                <div className="flex md:flex-col gap-3 justify-center md:justify-start flex-wrap md:flex-nowrap">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-18 h-24 md:w-20 md:h-26 bg-surface-dim overflow-hidden border transition-all aspect-[3/4] ${
                        activeImageIndex === idx 
                          ? 'border-gold-leaf ring-1 ring-gold-leaf' 
                          : 'border-on-surface/10 hover:border-on-surface/30'
                      }`}
                    >
                      <img 
                        src={img} 
                        alt={`Thumbnail ${idx + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>

              </div>

              {/* Right Column: Garment Information & Purchase Controls */}
              <div className="lg:col-span-5 space-y-8 flex flex-col justify-start">
                
                <div className="space-y-4">
                  <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block uppercase">
                    {product.category} COLLECTION
                  </span>
                  
                  <h1 className="font-display text-[32px] md:text-[40px] font-semibold text-on-surface leading-tight">
                    {product.title}
                  </h1>
                  
                  <div className="flex items-center gap-6">
                    <span className="text-[24px] font-body font-semibold text-gold-leaf">${product.price}</span>
                    {product.rating && (
                      <div className="flex items-center gap-1 bg-surface-dim px-2.5 py-1 border border-on-surface/5 font-semibold text-[13px] text-gold-leaf">
                        <span className="material-symbols-outlined text-[14px] fill-1">star</span>
                        <span>{product.rating}</span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-[13px] text-on-surface-variant font-semibold tracking-wider uppercase bg-surface-dim/50 inline-block px-3 py-1.5 border border-on-surface/5">
                    Fabric: <span className="text-on-surface font-bold">{product.material}</span>
                  </p>
                </div>

                {/* Description */}
                <div className="border-t border-on-surface/10 pt-6">
                  <h3 className="font-label-caps text-[11px] tracking-widest text-on-surface-variant mb-3 font-semibold">DESCRIPTION</h3>
                  <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* Purchase Selectors */}
                <div className="border-t border-on-surface/10 pt-6 space-y-6">
                  
                  {/* Size Selector */}
                  {product.sizes[0] !== 'One Size' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[12px] font-label-caps font-semibold">
                        <span className="text-on-surface-variant tracking-wider">SELECT SIZE</span>
                        <a href="#" className="text-gold-leaf hover:underline">SIZE GUIDE</a>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {product.sizes.map((size) => (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`px-5 py-2.5 text-[12px] font-label-caps tracking-widest border transition-all ${
                              selectedSize === size
                                ? 'bg-primary border-primary text-white font-bold'
                                : 'border-on-surface/15 hover:border-on-surface text-on-surface bg-white'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Color Selector */}
                  {product.colors[0] !== 'Default' && (
                    <div className="space-y-3">
                      <span className="text-[12px] font-label-caps font-semibold text-on-surface-variant tracking-wider block">
                        SELECT COLOR: <span className="text-on-surface font-bold ml-1">{selectedColor}</span>
                      </span>
                      
                      <div className="flex flex-wrap gap-2">
                        {product.colors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`px-4 py-2 text-[12px] font-body border transition-all ${
                              selectedColor === color
                                ? 'border-gold-leaf bg-gold-leaf/5 text-on-surface font-semibold'
                                : 'border-on-surface/15 hover:border-on-surface text-on-surface bg-white'
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity selector */}
                  <div className="space-y-3">
                    <span className="text-[12px] font-label-caps font-semibold text-on-surface-variant tracking-wider block">QUANTITY</span>
                    <div className="flex items-center border border-on-surface/15 bg-white w-28 rounded-sm">
                      <button 
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="px-3 py-2 text-on-surface-variant hover:text-on-surface font-semibold text-[15px]"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-body font-semibold text-[14px]">{quantity}</span>
                      <button 
                        onClick={() => setQuantity(q => q + 1)}
                        className="px-3 py-2 text-on-surface-variant hover:text-on-surface font-semibold text-[15px]"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="pt-4 space-y-4">
                    <button
                      onClick={handleAddToCart}
                      className="w-full bg-primary text-white py-4 font-label-caps text-label-caps tracking-[0.25em] hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all shadow-md font-semibold"
                    >
                      ADD TO ATELIER BAG
                    </button>
                    
                    {addedMessage && (
                      <div className="bg-green-50 border border-green-200 text-green-800 text-[13px] py-3 px-4 flex items-center justify-center gap-2 rounded-sm font-medium">
                        <span className="material-symbols-outlined text-[16px] text-green-700">check_circle</span>
                        Successfully added {quantity} item(s) to your bag!
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>

          </div>
        </section>

        {/* Complete the Look Section */}
        {suggestions.length > 0 && (
          <section className="py-24 bg-surface-dim border-t border-on-surface/5">
            <div className="max-w-container-max mx-auto px-6 md:px-12">
              
              <div className="mb-12 text-center">
                <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-2">SHOP THE SILHOUETTE</span>
                <h2 className="font-display text-[32px] font-semibold">Complete the Look</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {suggestions.map((item) => (
                  <Link 
                    href={`/product/${item.id}`} 
                    key={item.id}
                    className="group border border-on-surface/5 p-4 bg-white hover:shadow-md transition-all"
                  >
                    <div className="aspect-[3/4] bg-surface-dim overflow-hidden mb-4">
                      <img 
                        src={item.images[0]} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-body text-[15px] font-semibold text-on-surface">{item.title}</h4>
                        <p className="text-[12px] text-on-surface-variant mt-0.5">{item.material}</p>
                      </div>
                      <span className="font-body text-[15px] font-semibold text-gold-leaf">${item.price}</span>
                    </div>
                  </Link>
                ))}
              </div>

            </div>
          </section>
        )}

      </main>

      <Footer />
    </div>
  );
}

"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getProducts, Product } from '@/lib/db';
import { useCart } from '@/context/CartContext';
import Logo from '@/components/Logo';

function StorefrontContent() {
  const { addToCart } = useCart();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') || 'all';

  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState(categoryParam);

  // Sync category state with search query parameter
  useEffect(() => {
    setActiveCategory(categoryParam);
  }, [categoryParam]);

  // Load products
  useEffect(() => {
    const fetchProducts = async () => {
      const allProducts = await getProducts();
      setProducts(allProducts);
    };
    fetchProducts();
  }, []);

  // Filter products based on search term and active category
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.material.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = activeCategory === 'all' || 
                            product.category.toLowerCase() === activeCategory.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    // Default to first size and color
    const defaultSize = product.sizes[0] || 'One Size';
    const defaultColor = product.colors[0] || 'Default';
    addToCart(product, defaultSize, defaultColor, 1);
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface selection:bg-gold-leaf/20 selection:text-on-surface">
      <Header />
      
      <main className="relative flex-1">
        <div className="fixed inset-0 marble-overlay z-0"></div>

        {/* Hero Section: Refined and Integrated Logo */}
        <section className="relative h-[80vh] min-h-[500px] flex items-center justify-center overflow-hidden z-10 bg-surface-dim">
          <div className="absolute inset-0 z-0">
            <img 
              alt="Hero background" 
              className="w-full h-full object-cover opacity-20 filter brightness-105 contrast-95 animate-ken-burns" 
              src="https://lh3.googleusercontent.com/aida/ADBb0ujFqGREaXGbZqXPiWZTGXRJaf0kINJx3qPJYP40zlBqBhncUNgCM3pNCDoacB_0zqZJWMC3EmsbEWq0ab9Z4i-VT4EdSuXp7mmrgfFQi0ZuT-dhB9cm3WPyTNKTFzXVsnk8by8m8O-Dy0r5iZk3_ojV7lPukEqqKPGqG6ebpPy3lLAg3Odnd4VepJimWhQPGDHcshqfLo7UF1mawnG3bxSFUkGqTaKx8tzW288dlSi3lhJgZRaJHHsH"
            />
            <div className="absolute inset-0 hero-gradient"></div>
          </div>
          
          <div className="relative z-20 text-center max-w-4xl px-margin-mobile flex flex-col items-center">
            {/* Crisp HD Vector Logo */}
            <div className="mb-8 animate-float">
              <div className="bg-white p-3 rounded-full border border-gold-leaf/30 shadow-xl">
                <Logo className="h-28 w-28 text-primary" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="font-display text-[42px] md:text-[64px] font-semibold leading-tight text-on-surface">
                The Anatomy of <span className="text-gold-leaf italic font-normal">Elegance</span>
              </h1>
              <p className="font-body text-body-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
                Heirloom garments designed for the modern sovereign. Architectural precision meets organic Indian textiles (Kashmir wool, Jaipur linen, and Banarasi silk) in our debut collection, now presented in an ethereal white palette.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                <a 
                  href="#collection" 
                  className="bg-primary text-white px-10 py-4 font-label-caps text-[11px] tracking-[0.2em] hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all shadow-md font-semibold"
                >
                  SHOP THE COLLECTION
                </a>
                <a 
                  href="#story" 
                  className="border border-primary/20 text-primary px-10 py-4 font-label-caps text-[11px] tracking-[0.2em] hover:bg-primary/5 transition-all"
                >
                  VIEW PHILOSOPHY
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Product Grid: Functional E-commerce Layout */}
        <section id="collection" className="py-24 relative z-10 bg-white">
          <div className="px-6 md:px-12 max-w-container-max mx-auto">
            
            <div className="flex flex-col md:flex-row justify-between items-baseline border-b border-on-surface/5 pb-8 mb-12">
              <div>
                <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-2">CURATED SELECTION</span>
                <h2 className="font-display text-[32px] font-semibold">Latest Arrivals</h2>
              </div>
              
              <div className="flex flex-wrap gap-x-8 gap-y-4 mt-6 md:mt-0 font-label-caps text-[11px] tracking-wider font-semibold">
                {['all', 'men', 'women', 'accessories'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`pb-1 border-b transition-all uppercase ${
                      activeCategory === cat 
                        ? 'border-gold-leaf text-gold-leaf' 
                        : 'border-transparent text-on-surface/55 hover:text-on-surface'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-12 max-w-md">
              <div className="flex items-center bg-surface-dim border border-on-surface/10 px-4 py-2.5 rounded-sm">
                <span className="material-symbols-outlined text-outline text-[20px] mr-3">search</span>
                <input 
                  type="text"
                  placeholder="Filter by title, fabric, or keyword..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-[14px] w-full text-on-surface placeholder:text-outline outline-none"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="material-symbols-outlined text-[18px] text-on-surface/40 hover:text-on-surface"
                  >
                    close
                  </button>
                )}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 text-on-surface-variant font-body text-body-lg">
                No products found matching your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-gutter gap-y-16">
                {filteredProducts.map((product) => (
                  <Link 
                    href={`/product/${product.id}`} 
                    key={product.id}
                    className="group product-card-hover block border border-on-surface/5 p-4 bg-surface/30"
                  >
                    <div className="aspect-[3/4] bg-surface-dim overflow-hidden relative mb-4">
                      <img 
                        alt={product.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        src={product.images[0]}
                      />
                      
                      {product.images[1] && (
                        <img 
                          alt={`${product.title} back`} 
                          className="w-full h-full object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" 
                          src={product.images[1]}
                        />
                      )}

                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <button 
                          onClick={(e) => handleQuickAdd(e, product)}
                          className="w-full bg-white text-on-surface py-3 text-[11px] font-label-caps tracking-widest border border-on-surface/10 hover:bg-gold-leaf hover:border-gold-leaf hover:text-obsidian-charcoal transition-all duration-300 shadow-md font-semibold"
                        >
                          QUICK ADD
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-body text-[16px] font-semibold text-on-surface">{product.title}</h3>
                        <span className="font-body text-[16px] font-semibold text-gold-leaf">₹{product.price}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="text-on-surface-variant font-medium truncate max-w-[70%]">{product.material}</span>
                        {product.rating && (
                          <div className="flex items-center gap-1 text-gold-leaf font-semibold">
                            <span className="material-symbols-outlined text-[13px] fill-1">star</span>
                            <span>{product.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="story" className="py-32 bg-surface-dim border-y border-on-surface/5 relative">
          <div className="px-6 md:px-12 max-w-container-max mx-auto grid md:grid-cols-12 gap-16 items-center">
            <div className="md:col-span-6">
              <div className="border border-on-surface/10 p-3 bg-white shadow-sm">
                <img 
                  alt="Atelier process" 
                  className="w-full h-[500px] object-cover filter contrast-90 brightness-95" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCF5Um0vG8hZDTlYGLD_QWO5Qoh7AeroSEEZlxaFZD2ePP1vZT-G8CBD_98y2tV-1egMQ4bXGOfLkiKTWxy0kz793zOiC-SfihaYaypM_HaBVNGgPQBTK7TSBW5YkZ55FhyLGlgEQ9pU7cPTVOAg35kSG27XnRoGXblLtQJ2PFYo6CvYzFzV2u9nSlAZdVcxuUfckCNPA1twhmb76abZ-GvC2HjWX82eZ-AIK453oJ1e2s-2DqCeXyiPcwbAMWxWxBV1F-0tz3TOQ"
                />
              </div>
            </div>
            
            <div className="md:col-span-5 md:col-start-8 space-y-8">
              <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block">OUR PHILOSOPHY</span>
              <h2 className="font-display text-[40px] font-semibold text-on-surface leading-tight">A Legacy in the Making</h2>
              
              <div className="space-y-6 text-on-surface-variant font-body">
                <p className="text-body-lg leading-relaxed font-light">
                  At Stag Beetle, we believe fashion is the ultimate protective carapace. Born from the intersection of biomimetic design and traditional Savile Row tailoring, integrated with heritage Indian textiles.
                </p>
                <p className="text-body-md leading-relaxed">
                  Every stitch is a conscious choice. We source our cottons, silks, and wools directly from weaver co-operatives in Banaras, Jaipur, and Kashmir. Designed in London, handcrafted in our Bengaluru atelier.
                </p>
              </div>
              
              <div className="pt-4">
                <a className="inline-flex items-center gap-4 text-gold-leaf font-label-caps text-[11px] tracking-widest group font-semibold" href="#">
                  EXPLORE THE WORLD OF SB
                  <span className="material-symbols-outlined text-[16px] group-hover:translate-x-2 transition-transform">trending_flat</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-white text-center">
          <div className="max-w-2xl mx-auto px-6 space-y-4">
            <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block">THE INNER CIRCLE</span>
            <h3 className="font-display text-[32px] font-semibold">Join the Registry</h3>
            <p className="font-body text-on-surface-variant mb-10 opacity-80 max-w-md mx-auto">
              Subscribe for early access to limited seasonal releases, private viewings, and our quarterly editorial.
            </p>
            
            <form className="flex flex-col sm:flex-row gap-4 border-b border-on-surface/20 focus-within:border-gold-leaf transition-colors max-w-lg mx-auto py-2">
              <input 
                className="flex-grow bg-transparent border-none focus:ring-0 text-center sm:text-left py-4 px-2 placeholder:text-outline text-on-surface outline-none" 
                placeholder="Your email address" 
                type="email"
                required
              />
              <button 
                className="py-4 px-8 font-label-caps text-[11px] tracking-[0.2em] text-gold-leaf hover:text-primary transition-colors font-semibold" 
                type="submit"
              >
                SUBSCRIBE
              </button>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen bg-surface items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-leaf"></div>
      </div>
    }>
      <StorefrontContent />
    </Suspense>
  );
}

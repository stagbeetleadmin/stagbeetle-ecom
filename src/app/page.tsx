"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getProducts, Product } from '@/lib/db';
import { useCart } from '@/context/CartContext';

// ─── Hero Carousel ────────────────────────────────────────────────────────────
const HERO_SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=85',
    tag: 'NEW COLLECTION',
    headline: 'Crafted for the\nModern Sovereign',
    sub: 'Heirloom garments in Kashmir wool, Banarasi silk & Jaipur linen.',
    cta: 'Shop Men',
    ctaHref: '/?category=men',
    cta2: 'Shop Women',
    cta2Href: '/?category=women',
    align: 'left',
  },
  {
    image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1600&q=85',
    tag: "WOMEN'S EDIT",
    headline: 'Elegance in\nEvery Thread',
    sub: 'Silk blouses, linen co-ords & Kanjivaram drapes — handcrafted in Bengaluru.',
    cta: 'Explore Women',
    ctaHref: '/?category=women',
    align: 'right',
  },
  {
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1600&q=85',
    tag: "MEN'S EDIT",
    headline: 'Architecture\nMeets Fabric',
    sub: 'Bandhgala jackets, ikat shirts & structured trousers for the discerning man.',
    cta: 'Explore Men',
    ctaHref: '/?category=men',
    align: 'left',
  },
];

function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback((idx: number) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 300);
  }, [animating]);

  useEffect(() => {
    const t = setInterval(() => goTo((current + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, [current, goTo]);

  const slide = HERO_SLIDES[current];

  return (
    <div className="relative w-full h-[70vh] min-h-[480px] overflow-hidden bg-gray-900">
      {/* Background images — preload all, show active */}
      {HERO_SLIDES.map((s, i) => (
        <img
          key={i}
          src={s.image}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

      {/* Content */}
      <div className={`absolute inset-0 flex items-center px-8 md:px-20 ${slide.align === 'right' ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xl text-white transition-all duration-500 ${animating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
          <span className="inline-block text-[10px] font-bold tracking-[0.35em] text-[#C5A059] mb-4 uppercase">{slide.tag}</span>
          <h1 className="font-display text-[40px] md:text-[58px] font-bold leading-tight mb-4 whitespace-pre-line drop-shadow-lg">
            {slide.headline}
          </h1>
          <p className="text-[14px] md:text-[16px] text-white/80 mb-8 leading-relaxed max-w-md">{slide.sub}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={slide.ctaHref}
              className="bg-[#C5A059] text-black px-8 py-3 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-white transition-colors">
              {slide.cta}
            </Link>
            {slide.cta2 && (
              <Link href={slide.cta2Href!}
                className="border border-white text-white px-8 py-3 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-colors">
                {slide.cta2}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {HERO_SLIDES.map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-[#C5A059] w-6' : 'bg-white/50'}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Arrows */}
      <button onClick={() => goTo((current - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
        aria-label="Previous">
        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
      </button>
      <button onClick={() => goTo((current + 1) % HERO_SLIDES.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
        aria-label="Next">
        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
      </button>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, onQuickAdd }: { product: Product; onQuickAdd: (e: React.MouseEvent, p: Product) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={`/product/${product.id}`}
      className="group block bg-white"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-gray-50" style={{ aspectRatio: '3/4' }}>
        <img
          src={hovered && product.images[1] ? product.images[1] : product.images[0]}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Quick Add */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button
            onClick={(e) => onQuickAdd(e, product)}
            className="w-full bg-[#0D1B2A] text-white py-3 text-[10px] font-bold tracking-[0.25em] uppercase hover:bg-[#C5A059] transition-colors"
          >
            Quick Add
          </button>
        </div>
        {/* Badge */}
        {product.rating && product.rating >= 4.9 && (
          <span className="absolute top-2 left-2 bg-[#C5A059] text-white text-[9px] font-bold px-2 py-0.5 tracking-wider uppercase">
            Bestseller
          </span>
        )}
      </div>
      {/* Info */}
      <div className="pt-3 pb-4 px-1">
        <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">{product.category}</p>
        <div className="flex justify-between items-start gap-2">
          <h3 className="text-[14px] font-semibold text-gray-900 leading-snug">{product.title}</h3>
          <span className="text-[14px] font-bold text-[#0D1B2A] shrink-0">₹{product.price.toLocaleString('en-IN')}</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1 truncate">{product.material}</p>
        {/* Color dots */}
        <div className="flex gap-1 mt-2">
          {product.colors.slice(0, 4).map((c, i) => (
            <span key={i} className="w-3 h-3 rounded-full border border-gray-200 bg-gray-300" title={c} />
          ))}
          {product.colors.length > 4 && <span className="text-[10px] text-gray-400 self-center">+{product.colors.length - 4}</span>}
        </div>
      </div>
    </Link>
  );
}

// ─── Horizontal Product Carousel ─────────────────────────────────────────────
function ProductCarousel({ title, products, onQuickAdd }: {
  title: string;
  products: Product[];
  onQuickAdd: (e: React.MouseEvent, p: Product) => void;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[20px] font-bold text-gray-900">{title}</h2>
        <div className="flex gap-2">
          <button onClick={() => scroll('left')} className="w-8 h-8 border border-gray-200 flex items-center justify-center hover:border-[#C5A059] hover:text-[#C5A059] transition-colors">
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button onClick={() => scroll('right')} className="w-8 h-8 border border-gray-200 flex items-center justify-center hover:border-[#C5A059] hover:text-[#C5A059] transition-colors">
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
        {products.map(p => (
          <div key={p.id} className="shrink-0 w-[220px] md:w-[240px]">
            <ProductCard product={p} onQuickAdd={onQuickAdd} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Storefront ──────────────────────────────────────────────────────────
function StorefrontContent() {
  const { addToCart } = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get('category') || 'all';
  const searchParam = searchParams.get('search') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState(categoryParam);
  const [searchTerm, setSearchTerm] = useState(searchParam);

  useEffect(() => { setActiveCategory(categoryParam); }, [categoryParam]);
  useEffect(() => { setSearchTerm(searchParam); }, [searchParam]);

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, product.sizes[0] || 'M', product.colors[0] || 'Default', 1);
  };

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    router.push(`/?category=${cat}`, { scroll: false });
  };

  const menProducts = products.filter(p => p.category.toLowerCase() === 'men');
  const womenProducts = products.filter(p => p.category.toLowerCase() === 'women');

  const filteredProducts = products.filter(p => {
    const matchCat = activeCategory === 'all' || p.category.toLowerCase() === activeCategory.toLowerCase();
    const matchSearch = !searchTerm ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.material.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  const isFiltering = activeCategory !== 'all' || !!searchTerm;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />

      <main className="flex-1">

        {/* ── Hero Carousel ── */}
        {!isFiltering && <HeroCarousel />}

        {/* ── Category Banners ── */}
        {!isFiltering && (
          <section className="py-10 px-4 md:px-10 max-w-[1400px] mx-auto">
            <div className="grid grid-cols-2 gap-4">
              <Link href="/?category=men" className="group relative overflow-hidden h-64 md:h-80 bg-gray-100">
                <img src="https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80"
                  alt="Men's Collection" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                <div className="absolute bottom-6 left-6">
                  <p className="text-white text-[10px] font-bold tracking-[0.3em] uppercase mb-1">Shop Now</p>
                  <h3 className="text-white text-[24px] md:text-[32px] font-bold">Men</h3>
                </div>
              </Link>
              <Link href="/?category=women" className="group relative overflow-hidden h-64 md:h-80 bg-gray-100">
                <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80"
                  alt="Women's Collection" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                <div className="absolute bottom-6 left-6">
                  <p className="text-white text-[10px] font-bold tracking-[0.3em] uppercase mb-1">Shop Now</p>
                  <h3 className="text-white text-[24px] md:text-[32px] font-bold">Women</h3>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* ── Men's Carousel ── */}
        {!isFiltering && menProducts.length > 0 && (
          <section className="py-8 px-4 md:px-10 max-w-[1400px] mx-auto border-t border-gray-100">
            <ProductCarousel title="Men's Edit" products={menProducts} onQuickAdd={handleQuickAdd} />
            <div className="mt-6 text-center">
              <Link href="/?category=men" className="inline-block border border-[#0D1B2A] text-[#0D1B2A] px-8 py-2.5 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-[#0D1B2A] hover:text-white transition-colors">
                View All Men
              </Link>
            </div>
          </section>
        )}

        {/* ── Promo Banner ── */}
        {!isFiltering && (
          <section className="mx-4 md:mx-10 my-8 max-w-[1400px] md:mx-auto">
            <div className="relative overflow-hidden h-40 md:h-52 bg-[#0D1B2A] flex items-center">
              <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80"
                alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
              <div className="relative z-10 px-8 md:px-16 flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-4">
                <div>
                  <p className="text-[#C5A059] text-[10px] font-bold tracking-[0.35em] uppercase mb-2">Limited Time</p>
                  <h3 className="text-white text-[22px] md:text-[32px] font-bold leading-tight">New Season Arrivals</h3>
                  <p className="text-white/60 text-[13px] mt-1">Free shipping on all orders · Use code WELCOME10</p>
                </div>
                <Link href="/?category=all"
                  className="shrink-0 bg-[#C5A059] text-black px-8 py-3 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-white transition-colors">
                  Shop Now
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── Women's Carousel ── */}
        {!isFiltering && womenProducts.length > 0 && (
          <section className="py-8 px-4 md:px-10 max-w-[1400px] mx-auto border-t border-gray-100">
            <ProductCarousel title="Women's Edit" products={womenProducts} onQuickAdd={handleQuickAdd} />
            <div className="mt-6 text-center">
              <Link href="/?category=women" className="inline-block border border-[#0D1B2A] text-[#0D1B2A] px-8 py-2.5 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-[#0D1B2A] hover:text-white transition-colors">
                View All Women
              </Link>
            </div>
          </section>
        )}

        {/* ── Filtered / All Products Grid ── */}
        <section className="py-10 px-4 md:px-10 max-w-[1400px] mx-auto border-t border-gray-100">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-[22px] font-bold text-gray-900">
                {searchTerm ? `Results for "${searchTerm}"` : activeCategory === 'all' ? 'All Products' : activeCategory === 'men' ? "Men's Collection" : "Women's Collection"}
              </h2>
              <p className="text-[12px] text-gray-400 mt-0.5">{filteredProducts.length} items</p>
            </div>

            {/* Category tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-sm">
              {['all', 'men', 'women'].map(cat => (
                <button key={cat} onClick={() => handleCategoryClick(cat)}
                  className={`px-4 py-1.5 text-[11px] font-bold tracking-wider uppercase transition-all rounded-sm ${activeCategory === cat ? 'bg-white text-[#0D1B2A] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="mb-6 max-w-sm">
            <div className="flex items-center border border-gray-200 focus-within:border-[#C5A059] transition-colors px-3 py-2 bg-white">
              <span className="material-symbols-outlined text-gray-400 text-[18px] mr-2">search</span>
              <input
                type="text"
                placeholder="Search by name or fabric..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="text-[13px] outline-none flex-1 bg-transparent text-gray-800 placeholder:text-gray-400"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-700">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <span className="material-symbols-outlined text-[48px] mb-3 block">search_off</span>
              <p className="text-[16px]">No products found.</p>
              <button onClick={() => { setSearchTerm(''); handleCategoryClick('all'); }} className="mt-4 text-[#C5A059] text-[13px] font-semibold hover:underline">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
              {filteredProducts.map(p => (
                <ProductCard key={p.id} product={p} onQuickAdd={handleQuickAdd} />
              ))}
            </div>
          )}
        </section>

        {/* ── Newsletter ── */}
        <section className="bg-[#F5F1E9] py-14 px-4 text-center">
          <p className="text-[10px] font-bold tracking-[0.4em] text-[#C5A059] uppercase mb-2">The Inner Circle</p>
          <h3 className="text-[26px] font-bold text-gray-900 mb-2">Join the Registry</h3>
          <p className="text-[14px] text-gray-500 mb-8 max-w-md mx-auto">Early access to seasonal releases, private viewings, and our quarterly editorial.</p>
          <form className="flex flex-col sm:flex-row gap-0 max-w-md mx-auto border border-gray-300 focus-within:border-[#C5A059] transition-colors">
            <input type="email" required placeholder="Your email address"
              className="flex-1 px-4 py-3 text-[13px] outline-none bg-white text-gray-800 placeholder:text-gray-400" />
            <button type="submit"
              className="bg-[#0D1B2A] text-white px-6 py-3 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-[#C5A059] transition-colors shrink-0">
              Subscribe
            </button>
          </form>
        </section>

      </main>

      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <StorefrontContent />
    </Suspense>
  );
}

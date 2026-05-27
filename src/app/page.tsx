"use client";

import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getProducts, Product } from '@/lib/db';
import { useCart } from '@/context/CartContext';

// ─── Hero Carousel ────────────────────────────────────────────────────────────
interface HeroSlide {
  image: string;
  tag: string;
  headline: string;
  sub: string;
  cta: string;
  ctaHref: string;
  cta2?: string;
  cta2Href?: string;
  align: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=1600&q=85',
    tag: 'LIMITED TIME OFFER',
    headline: 'Last chance!\nUP TO 30% OFF*',
    sub: 'Premium fabrics, modern silhouettes, tailored for the contemporary wardrobe.',
    cta: 'Shop Steals',
    ctaHref: '/?category=all',
    align: 'left',
  },
  {
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=85',
    tag: 'NEW COLLECTION',
    headline: 'Crafted for the\nModern Sovereign',
    sub: 'Heirloom garments in Kashmir wool, Banarasi silk & Jaipur linen.',
    cta: 'Shop Men',
    ctaHref: '/?category=men',
    align: 'left',
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
    const t = setInterval(() => goTo((current + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(t);
  }, [current, goTo]);

  const slide = HERO_SLIDES[current];

  return (
    <div className="relative w-full h-[70vh] min-h-[480px] overflow-hidden bg-gray-900">
      {/* Background images */}
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
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const list = JSON.parse(localStorage.getItem('stag_beetle_wishlist') || '[]');
    setIsWishlisted(list.includes(product.id));
  }, [product.id]);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const list = JSON.parse(localStorage.getItem('stag_beetle_wishlist') || '[]');
    let newList;
    if (isWishlisted) {
      newList = list.filter((id: string) => id !== product.id);
    } else {
      newList = [...list, product.id];
    }
    localStorage.setItem('stag_beetle_wishlist', JSON.stringify(newList));
    setIsWishlisted(!isWishlisted);
  };

  return (
    <Link href={`/product/${product.id}`}
      className="group block bg-white"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden bg-gray-50 aspect-[3/4]">
        <img
          src={hovered && product.images[1] ? product.images[1] : product.images[0]}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Wishlist Button */}
        <button
          onClick={toggleWishlist}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition-all"
        >
          <span
            className={`material-symbols-outlined text-[18px] transition-colors ${isWishlisted ? 'text-red-500' : 'text-gray-500'}`}
            style={{ fontVariationSettings: isWishlisted ? "'FILL' 1" : "'FILL' 0" }}
          >
            favorite
          </span>
        </button>

        {/* Quick Add */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10">
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
      <div className="pt-3 pb-4 px-1 text-left">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">{product.subcategory || product.category}</p>
        <div className="flex justify-between items-start gap-2">
          <h3 className="text-[13px] font-semibold text-gray-900 leading-snug truncate pr-2">{product.title}</h3>
          <span className="text-[13px] font-bold text-gray-900 shrink-0">₹{product.price.toLocaleString('en-IN')}</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{product.material}</p>
        {/* Color dots */}
        {product.colors && product.colors.length > 0 && (
          <div className="flex gap-1 mt-2">
            {product.colors.slice(0, 3).map((c, i) => (
              <span key={i} className="w-2.5 h-2.5 rounded-full border border-gray-200 bg-gray-300" title={c} />
            ))}
            {product.colors.length > 3 && <span className="text-[9px] text-gray-400 self-center">+{product.colors.length - 3}</span>}
          </div>
        )}
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[20px] font-bold text-gray-900 tracking-wide uppercase">{title}</h2>
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

// ─── Snitch Mock Content Lists ─────────────────────────────────────────────────
const FEATURED_CATEGORIES = [
  { name: 'SHIRT', image: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=500&q=80', href: '/?subcategory=Shirt' },
  { name: 'JEANS', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80', href: '/?subcategory=Jeans' },
  { name: 'TSHIRT', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&q=80', href: '/?subcategory=Tshirt' },
  { name: 'TRACK PANT', image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500&q=80', href: '/?subcategory=Track pant' },
  { name: 'SHORTS', image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=500&q=80', href: '/?subcategory=Shorts' },
  { name: 'JACKET', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80', href: '/?subcategory=Jacket' },
];

const MOODS = [
  { name: 'TRENDING', highlight: 'NOW', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80', href: '/?category=men' },
  { name: 'LUXURY', highlight: 'REFINED', image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80', href: '/?subcategory=Jacket' },
  { name: 'BASICS', highlight: 'DAILY', image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&q=80', href: '/?subcategory=Tshirt' },
  { name: 'HOLIDAY', highlight: 'ENERGY', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80', href: '/?subcategory=Shorts' },
  { name: 'FORMAL', highlight: 'WEAR', image: 'https://images.unsplash.com/photo-1593032465175-481ac7f401a0?w=600&q=80', href: '/?subcategory=Track pant' },
];

const STEALS = [
  {
    title: 'only SNITCH fans',
    subtitle: 'SALE EXTENDED',
    offer: 'FLAT 40% OFF',
    date: 'Ends 28th May',
    bgColor: 'bg-indigo-700',
    isBanner: true,
    href: '/?category=all'
  },
  {
    title: 'Shirt',
    label: 'Under',
    price: '₹999',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80',
    isBanner: false,
    href: '/?subcategory=Shirt'
  },
  {
    title: 'Tshirt',
    label: 'Starting at',
    price: '₹499',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80',
    isBanner: false,
    href: '/?subcategory=Tshirt'
  },
  {
    title: 'Jeans',
    label: 'Starting at',
    price: '₹1899',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80',
    isBanner: false,
    href: '/?subcategory=Jeans'
  },
];

// ─── Main Storefront ──────────────────────────────────────────────────────────
function StorefrontContent() {
  const { addToCart } = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();

  const categoryParam = searchParams.get('category') || 'all';
  const subcategoryParam = searchParams.get('subcategory') || '';
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

  const handleSubcategoryClick = (sub: string) => {
    if (sub === 'all') {
      router.push('/?category=all', { scroll: false });
    } else {
      router.push(`/?subcategory=${encodeURIComponent(sub)}`, { scroll: false });
    }
  };

  const menProducts = products.filter(p => p.category.toLowerCase() === 'men');

  // Filter Products based on category, subcategory, and search term
  const filteredProducts = products.filter(p => {
    const matchCat = activeCategory === 'all' || activeCategory === '' || p.category.toLowerCase() === activeCategory.toLowerCase();
    const matchSub = !subcategoryParam || p.subcategory?.toLowerCase() === subcategoryParam.toLowerCase();
    const matchSearch = !searchTerm ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.subcategory && p.subcategory.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchCat && matchSub && matchSearch;
  });

  const isFiltering = activeCategory !== 'all' || !!subcategoryParam || !!searchTerm;

  // Infinite Scroll Logic
  const ITEMS_PER_PAGE = 8;
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset pagination count on search or filter change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [activeCategory, subcategoryParam, searchTerm]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredProducts.length));
      }
    }, { threshold: 0.1 });

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [filteredProducts.length]);

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />

      <main className="flex-1">

        {/* ── Hero Carousel ── */}
        {!isFiltering && <HeroCarousel />}

        {/* ── Featured Categories Grid ── */}
        {!isFiltering && (
          <section className="py-12 px-4 md:px-10 max-w-[1400px] mx-auto text-center">
            <h2 className="text-[16px] font-bold text-gray-900 tracking-[0.25em] uppercase mb-8">Featured Categories</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar lg:grid lg:grid-cols-9 lg:gap-4">
              {FEATURED_CATEGORIES.map((cat, idx) => (
                <Link key={idx} href={cat.href} className="shrink-0 w-[140px] lg:w-auto group relative block bg-white border border-gray-100 overflow-hidden rounded-sm shadow-sm hover:shadow-md transition-shadow">
                  <div className="pt-4 px-2 text-center">
                    <span className="text-[11px] font-bold tracking-widest text-gray-800 uppercase">{cat.name}</span>
                  </div>
                  <div className="relative aspect-[3/4] mt-2 overflow-hidden bg-gradient-to-b from-transparent to-gray-50 flex items-end">
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/10 via-transparent to-transparent pointer-events-none" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Match the Mood (Lifestyle) ── */}
        {!isFiltering && (
          <section className="py-8 px-4 md:px-10 max-w-[1400px] mx-auto text-center border-t border-gray-100">
            <h2 className="text-[16px] font-bold text-gray-900 tracking-[0.25em] uppercase mb-8">Match The Mood</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {MOODS.map((mood, idx) => (
                <Link key={idx} href={mood.href} className="relative group overflow-hidden aspect-[4/5] bg-gray-900 rounded-sm">
                  <img src={mood.image} alt={mood.name} className="w-full h-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/60 group-hover:from-black/35 transition-all" />
                  <div className="absolute bottom-6 left-0 right-0 text-center text-white px-2">
                    <h4 className="text-[18px] font-bold leading-tight tracking-wide">{mood.name}</h4>
                    <span className="text-[12px] font-bold text-yellow-400 tracking-wider uppercase block mt-1">{mood.highlight}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Steals promotional Grid ── */}
        {!isFiltering && (
          <section className="py-12 px-4 md:px-10 max-w-[1400px] mx-auto text-center border-t border-gray-100">
            <h2 className="text-[16px] font-bold text-gray-900 tracking-[0.25em] uppercase mb-8">Steals</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {STEALS.map((steal, idx) => (
                steal.isBanner ? (
                  <Link key={idx} href={steal.href} className={`flex flex-col justify-center items-center p-6 text-white ${steal.bgColor} rounded-sm aspect-[4/5] text-center`}>
                    <p className="text-[11px] font-semibold tracking-widest uppercase mb-1">{steal.title}</p>
                    <h4 className="text-[18px] font-black tracking-wider uppercase">{steal.subtitle}</h4>
                    <div className="my-6 border-y border-white/20 py-4 w-full">
                      <span className="text-[28px] font-black tracking-tight block">{steal.offer}</span>
                    </div>
                    <span className="text-[10px] tracking-widest uppercase opacity-75">{steal.date}</span>
                  </Link>
                ) : (
                  <Link key={idx} href={steal.href} className="group relative overflow-hidden bg-gray-50 rounded-sm aspect-[4/5] block">
                    <img src={steal.image} alt={steal.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all" />
                    <div className="absolute bottom-6 left-6 text-left text-white z-10">
                      <span className="text-[12px] font-medium tracking-wide block uppercase opacity-80">{steal.title}</span>
                      <p className="text-[11px] font-bold uppercase tracking-wider mt-1 opacity-70">{steal.label}</p>
                      <h4 className="text-[26px] font-black leading-none">{steal.price}</h4>
                    </div>
                  </Link>
                )
              ))}
            </div>
          </section>
        )}

        {/* ── New & Popular Product Feed ── */}
        <section className="py-12 px-4 md:px-10 max-w-[1400px] mx-auto border-t border-gray-100">
          <div className="text-center mb-10">
            <h2 className="text-[16px] font-bold text-gray-900 tracking-[0.25em] uppercase">
              {searchTerm ? 'Search Results' : subcategoryParam ? `${subcategoryParam}` : 'New and Popular'}
            </h2>
            <p className="text-[12px] text-gray-400 mt-2">{filteredProducts.length} items available</p>

            {/* Filter Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {['all', 'Shirt', 'Jeans', 'Tshirt', 'Track pant', 'Shorts', 'Jacket'].map(tab => {
                const isActive = (tab === 'all' && !subcategoryParam) || (subcategoryParam.toLowerCase() === tab.toLowerCase());
                return (
                  <button
                    key={tab}
                    onClick={() => handleSubcategoryClick(tab)}
                    className={`px-6 py-2.5 text-[11px] font-bold tracking-widest uppercase transition-all border ${
                      isActive ? 'bg-black text-white border-black shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-900'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search bar */}
          <div className="mb-8 max-w-sm mx-auto">
            <div className="flex items-center border border-gray-200 focus-within:border-black transition-colors px-3.5 py-2.5 bg-white shadow-sm">
              <span className="material-symbols-outlined text-gray-400 text-[18px] mr-2">search</span>
              <input
                type="text"
                placeholder="Search catalog..."
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

          {/* Product Grid */}
          {displayedProducts.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <span className="material-symbols-outlined text-[48px] mb-3 block">search_off</span>
              <p className="text-[15px] font-medium">No garments found in this category.</p>
              <button onClick={() => { setSearchTerm(''); handleSubcategoryClick('all'); }} className="mt-4 text-[#C5A059] text-[13px] font-bold hover:underline uppercase tracking-wider">
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-x-4 gap-y-10">
              {displayedProducts.map(p => (
                <ProductCard key={p.id} product={p} onQuickAdd={handleQuickAdd} />
              ))}
            </div>
          )}

          {/* Infinite Scroll Sentinel */}
          {visibleCount < filteredProducts.length && (
            <div ref={sentinelRef} className="h-16 w-full flex items-center justify-center mt-12">
              <div className="w-8 h-8 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </section>

        {/* ── Newsletter / Register ── */}
        <section className="bg-gray-50 py-16 px-4 text-center border-t border-gray-100">
          <p className="text-[10px] font-bold tracking-[0.4em] text-[#C5A059] uppercase mb-2">The Inner Circle</p>
          <h3 className="text-[24px] font-bold text-gray-900 tracking-wide uppercase mb-2">Join the Registry</h3>
          <p className="text-[13px] text-gray-500 mb-8 max-w-md mx-auto">Get early access to seasonal streetwear releases, limited drops, and member-only pricing.</p>
          <form className="flex flex-col sm:flex-row gap-0 max-w-md mx-auto border border-gray-300 focus-within:border-black transition-colors bg-white">
            <input type="email" required placeholder="Your email address"
              className="flex-1 px-4 py-3.5 text-[13px] outline-none text-gray-800 placeholder:text-gray-400" />
            <button type="submit"
              className="bg-black text-white px-8 py-3.5 text-[11px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors shrink-0">
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

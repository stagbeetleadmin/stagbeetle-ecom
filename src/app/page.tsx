"use client";

import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Logo from '@/components/Logo';
import { getProducts, Product, getSkuBase, getColorHex, getColorName, subscribeToProductChanges, GARMENT_GROUPS, sortSizes } from '@/lib/db';
import { useCart } from '@/context/CartContext';
import PriceDisplay from '@/components/PriceDisplay';

// ─── Hero Carousel ────────────────────────────────────────────────────────────
interface HeroSlide {
  image?: string;
  video?: string;
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
    video: '/assets/people.mp4',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1600&q=85',
    tag: 'NEW SEASON',
    headline: 'Echoes of the\nStreet',
    sub: 'Tailored luxury meets raw energy. Explore the new capsule collection.',
    cta: 'Shop Collection',
    ctaHref: '/?category=all',
    align: 'left',
  },
];

function VideoSlide({ src, poster, isActive }: { src: string; poster?: string; isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.play().catch((err) => {
        console.warn("Video autoplay failed or was interrupted:", err);
      });
    } else {
      video.pause();
    }
  }, [isActive]);

  return (
    <div className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${isActive ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
      }`}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        className="w-full h-full object-cover object-top"
      />
      {/* Brand logo overlay watermark */}
      <div className="absolute top-6 right-6 md:top-8 md:right-8 z-10 pointer-events-none select-none text-white/30 transition-all duration-300">
        <Logo className="h-6 md:h-8 w-auto" showText={true} />
      </div>
    </div>
  );
}

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
    if (HERO_SLIDES.length <= 1) return;
    const t = setInterval(() => goTo((current + 1) % HERO_SLIDES.length), 8000);
    return () => clearInterval(t);
  }, [current, goTo]);

  const slide = HERO_SLIDES[current] || HERO_SLIDES[0];

  if (!slide) return null;

  return (
    <div className="relative w-full h-[70vh] min-h-[480px] overflow-hidden bg-gray-900">
      {/* Background media */}
      {HERO_SLIDES.map((s, i) => (
        s.video ? (
          <VideoSlide
            key={i}
            src={s.video}
            poster={s.image}
            isActive={i === current}
          />
        ) : (
          s.image && (
            <img
              key={i}
              src={s.image}
              alt=""
              fetchPriority={i === 0 ? "high" : "low"}
              loading={i === 0 ? "eager" : "lazy"}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
            />
          )
        )
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
      {HERO_SLIDES.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-[#C5A059] w-6' : 'bg-white/50'}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Arrows */}
      {HERO_SLIDES.length > 1 && (
        <>
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
        </>
      )}
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ 
  product: initialProduct, 
  variants = [], 
  onQuickAdd 
}: { 
  product: Product; 
  variants?: Product[]; 
  onQuickAdd: (e: React.MouseEvent, p: Product) => void 
}) {
  const [activeProduct, setActiveProduct] = useState(initialProduct);
  const [hovered, setHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category') || '';

  useEffect(() => {
    setActiveProduct(initialProduct);
  }, [initialProduct]);

  useEffect(() => {
    const list = JSON.parse(localStorage.getItem('stag_beetle_wishlist') || '[]');
    setIsWishlisted(list.includes(activeProduct.id));
  }, [activeProduct.id]);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const list = JSON.parse(localStorage.getItem('stag_beetle_wishlist') || '[]');
    let newList;
    if (isWishlisted) {
      newList = list.filter((id: string) => id !== activeProduct.id);
    } else {
      newList = [...list, activeProduct.id];
    }
    localStorage.setItem('stag_beetle_wishlist', JSON.stringify(newList));
    setIsWishlisted(!isWishlisted);
  };

  const allProductsInGroup = [initialProduct, ...variants];

  return (
    <Link href={`/product/${activeProduct.id}${activeCategory ? `?category=${activeCategory}` : ''}`}
      className="group block bg-white"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden bg-gray-50 aspect-[3/4]">
        {activeProduct.images && activeProduct.images[0] ? (
          <img
            src={hovered && activeProduct.images[1] ? activeProduct.images[1] : activeProduct.images[0]}
            alt={activeProduct.title}
            loading="lazy"
            className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 border-b border-gray-100 text-gray-400 text-[11px] font-label-caps tracking-wider p-4 text-center">
            <span className="material-symbols-outlined text-[32px] text-gray-300 mb-1">image</span>
            No Image Available
          </div>
        )}

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
            onClick={(e) => onQuickAdd(e, activeProduct)}
            className="w-full bg-[#0D1B2A] text-white py-3 text-[10px] font-bold tracking-[0.25em] uppercase hover:bg-[#C5A059] transition-colors"
          >
            Quick Add
          </button>
        </div>

        {/* Badge */}
        {activeProduct.rating && activeProduct.rating >= 4.9 && (
          <span className="absolute top-2 left-2 bg-[#C5A059] text-white text-[9px] font-bold px-2 py-0.5 tracking-wider uppercase">
            Bestseller
          </span>
        )}
      </div>

      {/* Info */}
      <div className="pt-3 pb-4 px-1 text-left">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">{activeProduct.subcategory || activeProduct.category}</p>
        <h3 className="text-[13px] font-semibold text-gray-900 leading-snug truncate pr-2">{activeProduct.title}</h3>
        <PriceDisplay price={activeProduct.price} mrp={activeProduct.mrp} size="sm" className="mt-0.5" />
        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{activeProduct.material}</p>
        
        {/* Color dots */}
        {allProductsInGroup.length > 1 ? (
          <div className="flex flex-col gap-1.5 mt-2">
            <div className="flex flex-wrap gap-1.5 items-center">
              {allProductsInGroup.map((p) => {
                const color = p.colors[0] || 'Default';
                const colorHex = getColorHex(color);
                const isActive = activeProduct.id === p.id;
                
                return (
                  <button
                    key={p.id}
                    title={getColorName(color)}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveProduct(p);
                    }}
                    onMouseEnter={() => {
                      setActiveProduct(p);
                    }}
                    className={`w-3.5 h-3.5 rounded-full border transition-all flex items-center justify-center ${
                      isActive ? 'border-[#C5A059] scale-110 shadow-sm ring-1 ring-[#C5A059]' : 'border-gray-200 hover:scale-105'
                    }`}
                    style={{ backgroundColor: colorHex }}
                  >
                    {colorHex.toLowerCase() === '#ffffff' && (
                      <span className="w-1 h-1 rounded-full bg-gray-200" />
                    )}
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] text-gray-400 font-medium">
              {variants.length + 1} colors available
            </span>
          </div>
        ) : (
          initialProduct.colors && initialProduct.colors.length > 0 && (
            <div className="flex gap-1 mt-2">
              {initialProduct.colors.slice(0, 3).map((c, i) => {
                const colorHex = getColorHex(c);
                return (
                  <span 
                    key={i} 
                    className="w-3 h-3 rounded-full border border-gray-200" 
                    style={{ backgroundColor: colorHex }} 
                    title={getColorName(c)} 
                  />
                );
              })}
              {initialProduct.colors.length > 3 && <span className="text-[9px] text-gray-400 self-center">+{initialProduct.colors.length - 3}</span>}
            </div>
          )
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

// ─── STAGBEETLE Mock Content Lists ─────────────────────────────────────────────────
interface FeaturedCategory {
  name: string;
  image: string;
  href: string;
  badge?: string;
}

const FEATURED_CATEGORIES: FeaturedCategory[] = [
  { name: 'SHIRT', image: '/assets/a_high_quality_product_photo_of_a_crisp_white_long_sleeved_button_down_shirt.png', href: '/?subcategory=Shirt' },
  { name: 'JEANS', image: '/assets/a_high_quality_product_photo_of_a_classic_pair_of_blue_denim_jeans_on_a_white.png', href: '/?subcategory=Jeans' },
  { name: 'TSHIRT', image: '/assets/a_high_quality_product_photo_of_a_plain_white_crew_neck_t_shirt_on_a_white.png', href: '/?subcategory=Tshirt' },
  { name: 'TRACK PANT', image: '/assets/a_high_quality_product_photo_of_grey_cotton_track_pants_on_a_white_background..png', href: '/?subcategory=Track pant' },
  { name: 'SHORTS', image: '/assets/a_high_quality_product_photo_of_olive_green_cargo_shorts_on_a_white_background..png', href: '/?subcategory=Shorts' },
  { name: 'JACKET', image: '/assets/a_high_quality_product_photo_of_a_black_bomber_jacket_on_a_white_background._at.png', href: '/?subcategory=Jacket' },
];

const MOODS = [
  { name: 'SUMMER', highlight: 'NOW', image: '/assets/a_bright_carefree_fashion_mood_banner_for_summer_style._a_person_in_a_light.png', href: '/?category=men' },
  { name: 'LUXURY', highlight: 'REFINED', image: '/assets/a_sophisticated_high_end_fashion_mood_banner_for_luxury_style._a_man_in_a.png', href: '/?subcategory=Jacket' },
  { name: 'BASICS', highlight: 'DAILY', image: '/assets/a_clean_minimalist_fashion_mood_banner_for_basics_style._a_person_in_a_high.png', href: '/?subcategory=Tshirt' },
  { name: 'HOLIDAY', highlight: 'ENERGY', image: '/assets/a_sun_drenched_relaxed_fashion_mood_banner_for_holiday_style._a_person_in_a.png', href: '/?subcategory=Shorts' },
  { name: 'FORMAL', highlight: 'WEAR', image: '/assets/a_sharp_professional_fashion_mood_banner_for_formal_style._a_man_in_a_crisp.png', href: '/?subcategory=Track pant' },
];

const STEALS = [
  {
    title: 'only STAGBEETLE fans',
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

// Catalog filter chips: "ALL", then every individual garment type — read off
// GARMENT_GROUPS so the list (including Joggers) stays in sync with the
// admin catalog's own taxonomy instead of a separately hardcoded array.
type CatalogFilterTab =
  | { label: string; kind: 'all' }
  | { label: string; kind: 'sub'; value: string };

const CATALOG_FILTER_TABS: CatalogFilterTab[] = [
  { label: 'All', kind: 'all' },
  ...GARMENT_GROUPS.Tops.map(sub => ({ label: sub, kind: 'sub' as const, value: sub })),
  ...GARMENT_GROUPS.Bottoms.map(sub => ({ label: sub, kind: 'sub' as const, value: sub })),
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
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(categoryParam);
  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchParam);

  useEffect(() => { setActiveCategory(categoryParam); }, [categoryParam]);
  useEffect(() => { setSearchTerm(searchParam); }, [searchParam]);

  const getPreservedHref = (baseHref: string) => {
    if (activeCategory && activeCategory !== 'all') {
      if (baseHref.includes('?')) {
        if (!baseHref.includes('category=')) {
          return `${baseHref}&category=${activeCategory}`;
        }
      } else {
        return `${baseHref}?category=${activeCategory}`;
      }
    }
    return baseHref;
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const loadProducts = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    getProducts()
      .then(res => {
        setProducts(res);
        setIsLoading(false);
      })
      .catch((e: Error) => {
        setLoadError(e.message || 'Failed to load products.');
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadProducts();

    // Live-refresh the storefront the moment an admin adds/edits/removes a
    // product in another tab — no polling, just a push over Supabase Realtime.
    // A failed refresh here just keeps whatever's already on screen; it
    // shouldn't wipe a working catalog because one background update failed.
    const unsubscribe = subscribeToProductChanges(() => {
      getProducts().then(setProducts).catch(e => {
        console.warn('[Storefront] Live product refresh failed:', e.message || e);
      });
    });
    return unsubscribe;
  }, [loadProducts]);

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, sortSizes(product.sizes)[0] || 'M', getColorName(product.colors[0]) || 'Default', 1);
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

    // Multi-word search query checking against multiple product fields (Title, Material, Subcategory, SKU, Description, Colors)
    const matchSearch = !debouncedSearchTerm || (() => {
      const queryWords = debouncedSearchTerm.toLowerCase().split(/\s+/).filter(Boolean);
      return queryWords.every(word => {
        const inTitle = p.title.toLowerCase().includes(word);
        const inMaterial = p.material.toLowerCase().includes(word);
        const inSubcategory = p.subcategory ? p.subcategory.toLowerCase().includes(word) : false;
        const inSku = p.sku ? p.sku.toLowerCase().includes(word) : false;
        const inDescription = p.description ? p.description.toLowerCase().includes(word) : false;
        const inColors = p.colors ? p.colors.some(c => c.toLowerCase().includes(word)) : false;
        return inTitle || inMaterial || inSubcategory || inSku || inDescription || inColors;
      });
    })();

    return matchCat && matchSub && matchSearch;
  });

  // Bare "/" (no query params at all) shows the full marketing homepage (hero
  // carousel, category tiles, mood banners, steals). Any explicit browsing action —
  // including clicking "ALL" to clear a subcategory, which still leaves `category=all`
  // in the URL — keeps the compact shopping grid instead of snapping back to the
  // marketing sections, which previously felt like an unexpected navigation.
  const isFiltering = searchParams.has('category') || !!subcategoryParam || !!debouncedSearchTerm;

  // Infinite Scroll Logic
  const ITEMS_PER_PAGE = 8;
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset pagination count on search or filter change
  // Group products by base SKU initials
  const groupedProducts = React.useMemo(() => {
    const groups: Record<string, Product[]> = {};
    
    filteredProducts.forEach(p => {
      const base = getSkuBase(p.sku);
      if (base) {
        if (!groups[base]) {
          groups[base] = [];
        }
        groups[base].push(p);
      } else {
        groups[`none-${p.id}`] = [p];
      }
    });

    return Object.entries(groups).map(([base, groupProducts]) => {
      const [representative, ...variants] = groupProducts;
      return {
        id: base,
        representative,
        variants
      };
    });
  }, [filteredProducts]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [activeCategory, subcategoryParam, debouncedSearchTerm]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, groupedProducts.length));
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
  }, [groupedProducts.length]);

  const displayedGroups = React.useMemo(() => {
    return groupedProducts.slice(0, visibleCount);
  }, [groupedProducts, visibleCount]);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />

      <main className="flex-1">

        {/* ── Hero Carousel ── */}
        {!isFiltering && <HeroCarousel />}

        {/* ── Featured Categories Grid ── */}
        {!isFiltering && (
          <section className="py-16 px-4 md:px-10 max-w-[1400px] mx-auto text-center border-t border-gray-100">
            <h2 className="text-[16px] font-bold text-gray-900 tracking-[0.25em] uppercase mb-10">Featured Categories</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {FEATURED_CATEGORIES.map((cat, idx) => (
                <Link
                  key={idx}
                  href={getPreservedHref(cat.href)}
                  className="group relative block overflow-hidden rounded-sm hover:-translate-y-1 transition-all duration-300 aspect-square"
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
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
                <Link
                  key={idx}
                  href={getPreservedHref(mood.href)}
                  className="group relative block overflow-hidden rounded-sm hover:-translate-y-1 transition-all duration-300 aspect-[3/4]"
                >
                  <img
                    src={mood.image}
                    alt={mood.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
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
                  <Link key={idx} href={getPreservedHref(steal.href)} className={`flex flex-col justify-center items-center p-6 text-white ${steal.bgColor} rounded-sm aspect-[4/5] text-center`}>
                    <p className="text-[11px] font-semibold tracking-widest uppercase mb-1">{steal.title}</p>
                    <h4 className="text-[18px] font-black tracking-wider uppercase">{steal.subtitle}</h4>
                    <div className="my-6 border-y border-white/20 py-4 w-full">
                      <span className="text-[28px] font-black tracking-tight block">{steal.offer}</span>
                    </div>
                    <span className="text-[10px] tracking-widest uppercase opacity-75">{steal.date}</span>
                  </Link>
                ) : (
                  <Link key={idx} href={getPreservedHref(steal.href)} className="group relative overflow-hidden bg-gray-50 rounded-sm aspect-[4/5] block">
                    <img src={steal.image} alt={steal.title} loading="lazy" className="w-full h-full object-cover object-top origin-top transition-transform duration-500 group-hover:scale-105" />
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
              {debouncedSearchTerm ? 'Search Results' : subcategoryParam ? subcategoryParam : 'New and Popular'}
            </h2>
            <p className="text-[12px] text-gray-400 mt-2">{filteredProducts.length} items available</p>

            {/* Filter Tabs — ALL, then every individual garment type */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {CATALOG_FILTER_TABS.map(tab => {
                const isActive = tab.kind === 'all'
                  ? !subcategoryParam
                  : subcategoryParam.toLowerCase() === tab.value.toLowerCase();
                return (
                  <button
                    key={tab.label}
                    onClick={() => handleSubcategoryClick(tab.kind === 'all' ? 'all' : tab.value)}
                    className={`px-6 py-2.5 text-[11px] font-bold tracking-widest uppercase transition-all border ${isActive
                        ? 'bg-black text-white border-black shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-900'
                      }`}
                  >
                    {tab.label}
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
          {isLoading ? (
            <div className="flex justify-center items-center py-32">
              <div className="w-8 h-8 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : loadError ? (
            <div className="max-w-[500px] mx-auto px-6 py-24 text-center">
              <span className="material-symbols-outlined text-[48px] text-gray-300 mb-4">wifi_off</span>
              <h2 className="text-[16px] font-bold text-gray-900 uppercase tracking-wide mb-2">Couldn&apos;t Load the Collection</h2>
              <p className="text-[13px] text-gray-500 mb-6">{loadError}</p>
              <button
                onClick={loadProducts}
                className="bg-black text-white px-8 py-3 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-[#C5A059] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="max-w-[700px] mx-auto px-6 py-24 text-center border border-dashed border-[#C5A059]/25 bg-gray-50/50 rounded-sm my-10">
              <span className="material-symbols-outlined text-[56px] text-[#C5A059] mb-4">temp_preferences_custom</span>
              <h2 className="font-display text-[22px] font-bold text-gray-900 tracking-wide uppercase mb-3">COLLECTION UNDER CRAFT</h2>
              <p className="font-body text-[14px] text-gray-500 max-w-md mx-auto leading-relaxed mb-6">
                Our master craftspeople are currently tailoring the upcoming seasonal collection. No garments are currently listed in our public catalog. Check back soon.
              </p>
              <p className="text-[10px] font-label-caps tracking-[0.3em] text-gray-400">
                STAGBEETLE PVT. LTD. &middot; BENGALURU
              </p>
            </div>
          ) : displayedGroups.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <span className="material-symbols-outlined text-[48px] mb-3 block">search_off</span>
              <p className="text-[15px] font-medium">No garments found in this category.</p>
              <button onClick={() => { setSearchTerm(''); handleSubcategoryClick('all'); }} className="mt-4 text-[#C5A059] text-[13px] font-bold hover:underline uppercase tracking-wider">
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-x-4 gap-y-10">
              {displayedGroups.map(group => (
                <ProductCard 
                  key={group.representative.id} 
                  product={group.representative} 
                  variants={group.variants}
                  onQuickAdd={handleQuickAdd} 
                />
              ))}
            </div>
          )}

          {/* Infinite Scroll Sentinel */}
          {visibleCount < groupedProducts.length && (
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

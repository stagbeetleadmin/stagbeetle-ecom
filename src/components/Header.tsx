"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import dynamic from 'next/dynamic';
import Logo from './Logo';

const CartDrawer = dynamic(() => import('./CartDrawer'), {
  ssr: false,
});
const LoginModal = dynamic(() => import('./LoginModal'), {
  ssr: false,
});
import { useAuth } from '@/context/AuthContext';

const SUBCATEGORIES = [
  { name: 'Discover', href: '/?category=all' },
  { name: 'Shirt', href: '/?subcategory=Shirt' },
  { name: 'Jeans', href: '/?subcategory=Jeans' },
  { name: 'Tshirt', href: '/?subcategory=Tshirt' },
  { name: 'Track pant', href: '/?subcategory=Track pant' },
  { name: 'Shorts', href: '/?subcategory=Shorts' },
  { name: 'Jacket', href: '/?subcategory=Jacket' },
];

function HeaderInner() {
  const { cartCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const { user, isAdmin, triggerLoginModal, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeCategory = searchParams.get('category') || '';
  const activeSubcategory = searchParams.get('subcategory') || '';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-[100] flex flex-col">
        {/* Announcement Banner */}
        {!isAdmin && (
          <div className={`w-full bg-gradient-to-r from-[#C5A059] via-[#F3D9A2] to-[#C5A059] text-[#052A42] text-[10px] font-semibold tracking-[0.2em] text-center transition-all duration-500 overflow-hidden ${isScrolled ? 'h-0 py-0 opacity-0' : 'py-2.5 opacity-100'}`}>
            FREE SHIPPING ACROSS INDIA &nbsp;·&nbsp; USE CODE <span className="text-[#052A42] font-extrabold underline">WELCOME10</span> FOR 10% OFF
          </div>
        )}

        {/* Main Nav */}
        <nav className={`w-full bg-white border-b border-gray-100 transition-all duration-300 ${isScrolled ? 'shadow-sm' : ''}`}>
          <div className={`flex items-center justify-between px-4 md:px-10 max-w-[1400px] mx-auto transition-all duration-300 ${isScrolled ? 'h-14' : 'h-16'}`}>

            {/* Logo & Mobile Hamburger */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-1.5 text-[#052A42] hover:text-[#C5A059] transition-colors"
                aria-label="Open Menu"
              >
                <span className="material-symbols-outlined text-[24px]">menu</span>
              </button>
              <Link href="/" className="flex items-center gap-2">
                <Logo className={`w-auto text-[#052A42] transition-all duration-300 ${isScrolled ? 'h-8' : 'h-9 md:h-10'}`} showText={true} />
              </Link>
            </div>

            {/* Center Nav */}
            <div className="hidden md:flex items-center gap-8">
              {isAdmin ? (
                <>
                  <Link href="/admin?tab=analytics" className="text-[12px] font-semibold tracking-[0.12em] text-[#C5A059] hover:text-[#052A42] transition-colors uppercase">Atelier Analytics</Link>
                  <Link href="/admin?tab=products" className="text-[12px] font-semibold tracking-[0.12em] text-[#052A42] hover:text-[#C5A059] transition-colors uppercase">Garment Catalog</Link>
                  <Link href="/admin?tab=coupons" className="text-[12px] font-semibold tracking-[0.12em] text-[#052A42] hover:text-[#C5A059] transition-colors uppercase">Discount Coupons</Link>
                  <Link href="/admin?tab=orders" className="text-[12px] font-semibold tracking-[0.12em] text-[#052A42] hover:text-[#C5A059] transition-colors uppercase">Order Registry</Link>
                </>
              ) : (
                <>
                  <Link href="/?category=all" className="text-[12px] font-semibold tracking-[0.12em] text-[#052A42] hover:text-[#C5A059] transition-colors uppercase">New Arrivals</Link>
                  <Link href="/?category=men" className="text-[12px] font-semibold tracking-[0.12em] text-[#052A42] hover:text-[#C5A059] transition-colors uppercase">Men</Link>
                  <Link href="/about" className="text-[12px] font-semibold tracking-[0.12em] text-[#052A42] hover:text-[#C5A059] transition-colors uppercase">Our Story</Link>
                </>
              )}
            </div>

            {/* Right Icons */}
            <div className="flex items-center gap-3">
              {/* Search */}
              {searchOpen ? (
                <form onSubmit={handleSearch} className="flex items-center border-b border-gray-300 focus-within:border-[#C5A059] transition-colors">
                  <input
                    ref={searchRef}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="text-[13px] outline-none bg-transparent py-1 px-2 w-36 md:w-48 text-gray-800"
                  />
                  <button type="button" onClick={() => setSearchOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </form>
              ) : (
                <button onClick={() => setSearchOpen(true)} className="p-1.5 text-[#052A42] hover:text-[#C5A059] transition-colors" aria-label="Search">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </button>
              )}

              {/* Cart */}
              {!isAdmin && (
                <button onClick={() => setIsCartOpen(true)} className="relative p-1.5 text-[#052A42] hover:text-[#C5A059] transition-colors" aria-label="Cart">
                  <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-[#C5A059] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
              )}

              {/* Account */}
              <div className="relative">
                <button
                  onClick={() => user ? setIsUserMenuOpen(!isUserMenuOpen) : triggerLoginModal()}
                  className="p-1.5 text-[#052A42] hover:text-[#C5A059] transition-colors"
                  aria-label="Account"
                >
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </button>

                {user && isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-100 shadow-xl rounded-sm z-[150] py-2">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-[11px] text-[#C5A059] font-semibold tracking-widest uppercase mb-0.5">Signed in as</p>
                      <p className="font-semibold text-[14px] text-gray-900 truncate">{user.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                    </div>
                    <div className="px-2 pt-2 space-y-1">
                      {isAdmin && (
                        <Link href="/admin" onClick={() => setIsUserMenuOpen(false)}
                          className="block w-full text-left px-3 py-2 text-[12px] font-semibold tracking-widest uppercase text-[#C5A059] hover:bg-gray-50 rounded-sm transition-colors">
                          Admin Portal
                        </Link>
                      )}
                      <Link href="/profile" onClick={() => setIsUserMenuOpen(false)}
                        className="block w-full text-left px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 rounded-sm transition-colors">
                        My Profile
                      </Link>
                      <button onClick={() => { logout(); setIsUserMenuOpen(false); }}
                        className="block w-full text-left px-3 py-2 text-[12px] text-gray-600 hover:bg-gray-50 rounded-sm transition-colors">
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Subcategory Bar (STAGBEETLE style) */}
        {!isAdmin && (
          <div className="w-full bg-white border-b border-gray-100 py-3 overflow-x-auto hide-scrollbar">
            <div className="flex gap-6 md:gap-8 px-4 max-w-[1400px] mx-auto whitespace-nowrap justify-start md:justify-center">
              {SUBCATEGORIES.map((sub) => {
                const isActive = (sub.name === 'Discover' && !activeSubcategory && activeCategory !== 'men') ||
                  (sub.name !== 'Discover' && activeSubcategory.toLowerCase() === sub.name.toLowerCase());
                return (
                  <Link
                    key={sub.name}
                    href={sub.href}
                    className={`text-[11px] font-bold tracking-widest uppercase transition-colors relative pb-1 ${isActive ? 'text-[#052A42] border-b border-[#052A42]' : 'text-gray-500 hover:text-[#C5A059]'
                      }`}
                  >
                    {sub.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Spacer */}
      <div className={isAdmin ? (isScrolled ? 'h-14' : 'h-16') : (isScrolled ? 'h-[92px]' : 'h-[130px]')} />

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-[140] transition-opacity duration-300 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-full max-w-[300px] bg-white shadow-2xl z-[150] flex flex-col transition-transform duration-300 border-r border-gray-100 md:hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <Logo className="h-8 w-auto text-[#052A42]" showText={true} />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-[#052A42] hover:text-[#C5A059] transition-colors"
                aria-label="Close Menu"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <div className="flex flex-col py-6 px-6 gap-5 overflow-y-auto">
              {isAdmin ? (
                <>
                  <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Atelier Console</span>
                  <Link href="/admin?tab=analytics" onClick={() => setIsMobileMenuOpen(false)} className="text-[13px] font-semibold tracking-[0.12em] text-[#C5A059] hover:text-[#052A42] transition-colors uppercase">Atelier Analytics</Link>
                  <Link href="/admin?tab=products" onClick={() => setIsMobileMenuOpen(false)} className="text-[13px] font-semibold tracking-[0.12em] text-[#052A42] hover:text-[#C5A059] transition-colors uppercase">Garment Catalog</Link>
                  <Link href="/admin?tab=coupons" onClick={() => setIsMobileMenuOpen(false)} className="text-[13px] font-semibold tracking-[0.12em] text-[#052A42] hover:text-[#C5A059] transition-colors uppercase">Discount Coupons</Link>
                  <Link href="/admin?tab=orders" onClick={() => setIsMobileMenuOpen(false)} className="text-[13px] font-semibold tracking-[0.12em] text-[#052A42] hover:text-[#C5A059] transition-colors uppercase">Order Registry</Link>
                </>
              ) : (
                <>
                  <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Collections</span>
                  <Link href="/?category=all" onClick={() => setIsMobileMenuOpen(false)} className="text-[13px] font-semibold tracking-[0.12em] text-[#052A42] hover:text-[#C5A059] transition-colors uppercase">New Arrivals</Link>
                  <Link href="/?category=men" onClick={() => setIsMobileMenuOpen(false)} className="text-[13px] font-semibold tracking-[0.12em] text-[#052A42] hover:text-[#C5A059] transition-colors uppercase">Men</Link>
                  <Link href="/about" onClick={() => setIsMobileMenuOpen(false)} className="text-[13px] font-semibold tracking-[0.12em] text-[#052A42] hover:text-[#C5A059] transition-colors uppercase">Our Story</Link>
                </>
              )}

              <hr className="border-gray-100 my-2" />
              <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Client Services</span>
              <Link href="/shipping" onClick={() => setIsMobileMenuOpen(false)} className="text-[12px] tracking-[0.1em] text-gray-600 hover:text-[#052A42] uppercase font-medium">Shipping Policy</Link>
              <Link href="/returns" onClick={() => setIsMobileMenuOpen(false)} className="text-[12px] tracking-[0.1em] text-gray-600 hover:text-[#052A42] uppercase font-medium">Cancellation & Refund</Link>
            </div>
          </div>
        </>
      )}

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <LoginModal />
    </>
  );
}

export default function Header() {
  return (
    <Suspense fallback={<div className="h-16 bg-white border-b border-gray-100" />}>
      <HeaderInner />
    </Suspense>
  );
}

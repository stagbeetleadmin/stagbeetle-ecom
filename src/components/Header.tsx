"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import CartDrawer from './CartDrawer';
import Logo from './Logo';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { cartCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { user, isAdmin, triggerLoginModal, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

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
        <div className={`w-full bg-[#0D1B2A] text-white text-[10px] font-medium tracking-[0.2em] text-center transition-all duration-500 overflow-hidden ${isScrolled ? 'h-0 py-0 opacity-0' : 'py-2.5 opacity-100'}`}>
          FREE SHIPPING ACROSS INDIA &nbsp;·&nbsp; USE CODE <span className="text-[#C5A059] font-bold">WELCOME10</span> FOR 10% OFF
        </div>

        {/* Main Nav */}
        <nav className={`w-full bg-white border-b border-gray-100 transition-all duration-300 ${isScrolled ? 'shadow-sm' : ''}`}>
          <div className={`flex items-center justify-between px-4 md:px-10 max-w-[1400px] mx-auto transition-all duration-300 ${isScrolled ? 'h-14' : 'h-16'}`}>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Logo className="h-8 w-8 text-[#0D1B2A]" showText={true} />
            </Link>

            {/* Center Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/?category=all" className="text-[12px] font-semibold tracking-[0.12em] text-gray-800 hover:text-[#C5A059] transition-colors uppercase">New Arrivals</Link>
              <Link href="/?category=men" className="text-[12px] font-semibold tracking-[0.12em] text-gray-800 hover:text-[#C5A059] transition-colors uppercase">Men</Link>
              <Link href="/?category=women" className="text-[12px] font-semibold tracking-[0.12em] text-gray-800 hover:text-[#C5A059] transition-colors uppercase">Women</Link>
              <Link href="/about" className="text-[12px] font-semibold tracking-[0.12em] text-gray-800 hover:text-[#C5A059] transition-colors uppercase">Our Story</Link>
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
                    className="text-[13px] outline-none bg-transparent py-1 px-2 w-36 md:w-48"
                  />
                  <button type="button" onClick={() => setSearchOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </form>
              ) : (
                <button onClick={() => setSearchOpen(true)} className="p-1.5 text-gray-600 hover:text-[#C5A059] transition-colors" aria-label="Search">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </button>
              )}

              {/* Cart */}
              <button onClick={() => setIsCartOpen(true)} className="relative p-1.5 text-gray-600 hover:text-[#C5A059] transition-colors" aria-label="Cart">
                <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#C5A059] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Account */}
              <div className="relative">
                <button
                  onClick={() => user ? setIsUserMenuOpen(!isUserMenuOpen) : triggerLoginModal()}
                  className="p-1.5 text-gray-600 hover:text-[#C5A059] transition-colors"
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
      </header>

      {/* Spacer */}
      <div className={`${isScrolled ? 'h-14' : 'h-[calc(2.5rem+4rem)]'} transition-all duration-300`} />

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}

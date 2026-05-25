"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import CartDrawer from './CartDrawer';
import Logo from './Logo';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const { cartCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const { user, isAdmin, triggerLoginModal, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Monitor scroll to shrink header and collapse notification banner
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-[100] flex flex-col">
        {/* Top Banner: Collapses smoothly on scroll */}
        <div 
          className={`w-full bg-primary text-white text-[9px] md:text-[10px] font-label-caps tracking-[0.25em] text-center border-b border-white/15 transition-all duration-500 ease-in-out overflow-hidden ${
            isScrolled ? 'h-0 py-0 opacity-0 border-b-0' : 'py-2.5 opacity-100'
          }`}
        >
          COMPLIMENTARY SHIPPING ACROSS INDIA | APPOINTMENTS AVAILABLE AT OUR BENGALURU ATELIER
        </div>

        {/* Navigation Bar */}
        <nav 
          className={`w-full bg-surface/95 backdrop-blur-md border-b border-on-surface/5 transition-all duration-500 ease-in-out ${
            isScrolled ? 'shadow-md' : ''
          }`}
        >
          <div 
            className={`flex justify-between items-center px-6 md:px-12 max-w-container-max mx-auto transition-all duration-500 ease-in-out ${
              isScrolled ? 'h-16' : 'h-20'
            }`}
          >
            {/* Left: Brand Logo (Crisp HD SVG) */}
            <div className="flex items-center">
              <Link href="/" className="hover:opacity-90 transition-opacity">
                <Logo className="h-9 w-9 text-primary transition-all duration-500" showText={true} />
              </Link>
            </div>

            {/* Center: Navigation Links */}
            <div className="hidden md:flex gap-10 items-center">
              <Link href="/?category=all" className="font-label-caps text-[11px] tracking-widest text-on-surface hover:text-gold-leaf transition-colors font-semibold">COLLECTIONS</Link>
              <Link href="/?category=men" className="font-label-caps text-[11px] tracking-widest text-on-surface/70 hover:text-gold-leaf transition-colors font-semibold">MEN</Link>
              <Link href="/?category=women" className="font-label-caps text-[11px] tracking-widest text-on-surface/70 hover:text-gold-leaf transition-colors font-semibold">WOMEN</Link>
              <Link href="/?category=accessories" className="font-label-caps text-[11px] tracking-widest text-on-surface/70 hover:text-gold-leaf transition-colors font-semibold">ACCESSORIES</Link>
            </div>

            {/* Right: Utilities */}
            <div className="flex items-center gap-6">
              <div className="hidden lg:flex items-center bg-on-surface/5 border border-on-surface/10 px-4 py-1.5 rounded-full">
                <span className="material-symbols-outlined text-outline text-[18px]">search</span>
                <input 
                  className="bg-transparent border-none focus:ring-0 text-[13px] ml-2 w-32 text-on-surface placeholder:text-outline outline-none" 
                  placeholder="Search" 
                  type="text"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <button className="material-symbols-outlined text-[20px] text-on-surface/80 hover:text-gold-leaf transition-colors">favorite</button>
                
                <button 
                  onClick={() => setIsCartOpen(true)}
                  className="material-symbols-outlined text-[20px] text-on-surface/80 hover:text-gold-leaf transition-colors relative"
                >
                  shopping_bag
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gold-leaf text-obsidian-charcoal font-semibold text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-surface animate-pulse">
                      {cartCount}
                    </span>
                  )}
                </button>
                
                {/* User Session Interface */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      if (!user) {
                        triggerLoginModal();
                      } else {
                        setIsUserMenuOpen(!isUserMenuOpen);
                      }
                    }}
                    className="flex items-center material-symbols-outlined text-[20px] text-on-surface/80 hover:text-gold-leaf transition-colors focus:outline-none"
                  >
                    person
                  </button>

                  {/* Dropdown Menu */}
                  {user && isUserMenuOpen && (
                    <div className="absolute right-0 mt-3 w-64 bg-white border border-on-surface/10 rounded-sm shadow-xl p-4 z-[150] text-zinc-800 animate-fade-in font-body text-[13px]">
                      <div className="border-b border-on-surface/5 pb-3 mb-2">
                        <span className="font-label-caps text-[9px] text-gold-leaf tracking-[0.2em] block mb-0.5">ACTIVE PATRON</span>
                        <p className="font-bold text-on-surface truncate text-[14px]">{user.name}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                      </div>

                      {user.phone && (
                        <div className="text-[11px] text-zinc-500 mb-2">
                          <span className="font-semibold">Phone:</span> {user.phone}
                        </div>
                      )}

                      {user.address && (
                        <div className="bg-surface-dim/40 p-2 rounded-sm mb-3">
                          <span className="font-label-caps text-[8px] text-zinc-400 block tracking-wider">SHIPPING ATELIER</span>
                          <p className="text-[11px] text-zinc-700 truncate" title={`${user.address}, ${user.city}, ${user.zip}`}>
                            {user.address}, {user.city}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-col gap-2 pt-1">
                        {isAdmin && (
                          <Link 
                            href="/admin" 
                            onClick={() => setIsUserMenuOpen(false)}
                            className="w-full text-center bg-gold-leaf text-obsidian-charcoal py-2 font-label-caps text-[10px] tracking-widest font-semibold hover:bg-gold-leaf/90 transition-all rounded-sm"
                          >
                            CRM ADMIN PORTAL
                          </Link>
                        )}
                        <button 
                          onClick={() => {
                            logout();
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-center border border-on-surface/20 py-2 font-label-caps text-[10px] tracking-widest font-semibold hover:bg-zinc-50 transition-all rounded-sm"
                        >
                          SIGN OUT
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>
      
      {/* Spacer to push content down initially (matches full header height) */}
      <div className="h-28" />

      {/* Cart Slide-out Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}

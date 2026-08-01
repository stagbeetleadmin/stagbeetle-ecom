"use client";

import React from 'react';
import { useCart } from '@/context/CartContext';
import { Product, getColorName } from '@/lib/db';
import Link from 'next/link';
import PriceDisplay from '@/components/PriceDisplay';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, removeFromCart, updateQuantity, cartTotal, suggestions, addToCart } = useCart();

  if (!isOpen) return null;

  const handleAddSuggestion = (product: Product) => {
    // Add suggestion with default first size/color
    const defaultSize = product.sizes[0] || 'One Size';
    const defaultColor = getColorName(product.colors[0]) || 'Default';
    addToCart(product, defaultSize, defaultColor, 1);
  };

  return (
    <div className="fixed inset-0 z-[150] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex">
        {/* Drawer Panel */}
        <div className="w-screen max-w-md glass-panel-heavy shadow-2xl flex flex-col h-full text-on-surface">
          {/* Header */}
          <div className="px-6 py-5 border-b border-on-surface/10 flex justify-between items-center bg-white/40">
            <h2 className="font-display text-headline-md tracking-tight">Your Atelier Bag</h2>
            <button 
              onClick={onClose}
              className="material-symbols-outlined text-on-surface/60 hover:text-on-surface transition-colors"
            >
              close
            </button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto py-6 px-6 space-y-8 hide-scrollbar">
            {cart.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <span className="material-symbols-outlined text-[48px] text-outline opacity-40">shopping_bag</span>
                <p className="font-body text-body-lg text-on-surface-variant">Your bag is currently empty.</p>
                <button 
                  onClick={onClose}
                  className="inline-block border border-gold-leaf text-gold-leaf px-8 py-3 text-label-caps tracking-widest hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all"
                >
                  CONTINUE BROWSING
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* List of Cart Items */}
                <div className="space-y-6">
                  {cart.map((item) => (
                    <div 
                      key={`${item.product_id}-${item.selected_size}-${item.selected_color}`}
                      className="flex items-center gap-4 py-4 border-b border-on-surface/5"
                    >
                      {/* Image */}
                      <div className="h-24 w-18 bg-surface-dim overflow-hidden flex-shrink-0 relative aspect-[3/4]">
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.title} 
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 border border-zinc-200 text-gray-400 text-[9px] font-label-caps tracking-wider p-1 text-center">
                            No Image
                          </div>
                        )}
                      </div>
                      
                      {/* Detail Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-body font-semibold text-body-md text-on-surface truncate">{item.title}</h4>
                        <p className="text-[12px] text-on-surface-variant font-medium mt-0.5">
                          {item.selected_color} / {item.selected_size}
                        </p>
                        
                        {/* Quantity controls */}
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex items-center border border-on-surface/10 rounded-sm bg-white/50">
                            <button 
                              onClick={() => updateQuantity(item.product_id, item.selected_size, item.selected_color, item.quantity - 1)}
                              className="px-2 py-0.5 text-on-surface/60 hover:text-on-surface text-[14px]"
                            >
                              -
                            </button>
                            <span className="px-2 text-[13px] font-medium">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.product_id, item.selected_size, item.selected_color, item.quantity + 1)}
                              className="px-2 py-0.5 text-on-surface/60 hover:text-on-surface text-[14px]"
                            >
                              +
                            </button>
                          </div>
                          
                          <button 
                            onClick={() => removeFromCart(item.product_id, item.selected_size, item.selected_color)}
                            className="text-[11px] font-label-caps text-red-600 tracking-wider hover:underline"
                          >
                            REMOVE
                          </button>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <span className="font-body text-body-md font-semibold">₹{item.price * item.quantity}</span>
                        {item.quantity > 1 && (
                          <div className="text-[11px] text-on-surface-variant font-medium">₹{item.price} each</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shopify-Style Suggestions Panel */}
                {suggestions.length > 0 && (
                  <div className="pt-6 border-t border-on-surface/10">
                    <h3 className="font-label-caps text-[10px] text-gold-leaf tracking-[0.3em] mb-4">COMPLETE THE LOOK</h3>
                    <div className="space-y-4 bg-surface-dim/80 p-4 border border-on-surface/5">
                      {suggestions.map((product) => (
                        <div key={product.id} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {product.images && product.images[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.title}
                                className="w-12 h-16 object-contain bg-surface aspect-[3/4]"
                              />
                            ) : (
                              <div className="w-12 h-16 flex flex-col items-center justify-center bg-gray-50 border border-zinc-200 text-gray-400 text-[8px] font-label-caps tracking-wider text-center p-0.5">
                                No Image
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-body text-[13px] font-semibold text-on-surface truncate">{product.title}</h4>
                              <PriceDisplay price={product.price} mrp={product.mrp} size="sm" />
                            </div>
                          </div>
                          <button 
                            onClick={() => handleAddSuggestion(product)}
                            className="text-[10px] font-label-caps tracking-widest text-on-surface border border-on-surface/20 px-3 py-1.5 hover:bg-gold-leaf hover:border-gold-leaf hover:text-obsidian-charcoal transition-all"
                          >
                            ADD
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer with Subtotal & Checkout */}
          {cart.length > 0 && (
            <div className="border-t border-on-surface/10 px-6 py-6 bg-white/40 space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="font-label-caps text-[11px] tracking-widest text-on-surface-variant">ESTIMATED TOTAL</span>
                <span className="font-display text-headline-md font-semibold">₹{cartTotal}</span>
              </div>
              <p className="text-[11px] text-on-surface-variant/80">Shipping, taxes, and duties calculated at checkout.</p>
              
              <div className="pt-2">
                <Link 
                  href="/checkout"
                  onClick={onClose}
                  className="w-full flex items-center justify-center bg-gold-leaf text-obsidian-charcoal py-4 font-label-caps text-label-caps tracking-[0.2em] hover:bg-gold-leaf/90 transition-all shadow-[0_4px_12px_rgba(175,141,17,0.15)] font-semibold"
                >
                  PROCEED TO CHECKOUT
                </Link>
                
                <button 
                  onClick={onClose}
                  className="w-full text-center mt-3 text-[11px] font-label-caps tracking-widest text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  OR CONTINUE BROWSING
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

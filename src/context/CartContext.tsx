"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, OrderItem, getSuggestions } from '@/lib/db';
import { useAuth } from './AuthContext';

interface CartItem extends OrderItem {}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, size: string, color: string, quantity?: number) => void;
  removeFromCart: (productId: string, size: string, color: string) => void;
  updateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  suggestions: Product[];
  refreshSuggestions: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const { user, loading: authLoading } = useAuth();

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCart = localStorage.getItem('stag_beetle_cart');
      if (storedCart) {
        try {
          setCart(JSON.parse(storedCart));
        } catch (e) {
          console.error("Failed to parse cart from storage", e);
        }
      }
    }
  }, []);

  // Tie the cart to the signed-in account. A cart saved while logged in must not
  // survive a logout, an expired session, or a different account on this browser.
  // Guest carts (no recorded owner) are kept, including through a sign-in at checkout.
  useEffect(() => {
    if (authLoading || typeof window === 'undefined') return;
    const owner = localStorage.getItem('stag_beetle_cart_owner');
    if (owner && (!user || user.id !== owner)) {
      setCart([]);
      localStorage.removeItem('stag_beetle_cart');
      localStorage.removeItem('stag_beetle_cart_owner');
    }
    if (user) {
      localStorage.setItem('stag_beetle_cart_owner', user.id);
    }
  }, [user, authLoading]);

  // Save cart to localStorage and update suggestions on cart change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('stag_beetle_cart', JSON.stringify(cart));
    }
    
    // Fetch suggestions
    const fetchSuggestions = async () => {
      const cartIds = cart.map(item => item.product_id);
      const recs = await getSuggestions(cartIds);
      setSuggestions(recs);
    };
    
    fetchSuggestions();
  }, [cart]);

  const addToCart = (product: Product, size: string, color: string, quantity: number = 1) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) =>
          item.product_id === product.id &&
          item.selected_size === size &&
          item.selected_color === color
      );

      if (existingItemIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingItemIndex].quantity += quantity;
        return newCart;
      } else {
        const newItem: CartItem = {
          product_id: product.id,
          title: product.title,
          price: product.price,
          quantity: quantity,
          selected_size: size,
          selected_color: color,
          image: (product.images && product.images[0]) || ''
        };
        return [...prevCart, newItem];
      }
    });
  };

  const removeFromCart = (productId: string, size: string, color: string) => {
    setCart((prevCart) =>
      prevCart.filter(
        (item) =>
          !(item.product_id === productId &&
            item.selected_size === size &&
            item.selected_color === color)
      )
    );
  };

  const updateQuantity = (productId: string, size: string, color: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product_id === productId &&
        item.selected_size === size &&
        item.selected_color === color
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const refreshSuggestions = async () => {
    const cartIds = cart.map(item => item.product_id);
    const recs = await getSuggestions(cartIds);
    setSuggestions(recs);
  };

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        suggestions,
        refreshSuggestions
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Product, OrderItem, getSuggestions, getCart, saveCart, getEffectivePrice, getPlusSizesConfig, subscribeToPlusSizesChanges } from '@/lib/db';
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

// Combine the server-side cart with items added locally (e.g. as a guest before
// signing in). Duplicate lines keep the larger quantity rather than summing, so
// a cart that was already synced doesn't double itself.
const mergeCarts = (server: CartItem[], local: CartItem[]): CartItem[] => {
  const merged = [...server];
  for (const item of local) {
    const idx = merged.findIndex(
      m =>
        m.product_id === item.product_id &&
        m.selected_size === item.selected_size &&
        m.selected_color === item.selected_color
    );
    if (idx > -1) {
      merged[idx] = { ...merged[idx], quantity: Math.max(merged[idx].quantity, item.quantity) };
    } else {
      merged.push(item);
    }
  }
  return merged;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const { user, loading: authLoading } = useAuth();
  // Which user's server cart has been fetched (guards against re-fetch loops)
  const fetchedUserRef = useRef<string | null>(null);
  // Which user's cart is fully hydrated (gates writes so we never overwrite the
  // server copy before it has been read and merged)
  const hydratedUserRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // CartProvider wraps every page (see layout.tsx), so this is the one place
  // that guarantees the plus-size config is fetched — and kept fresh via
  // realtime — for the whole app. addToCart below reads it synchronously
  // through getEffectivePrice/isPlusSize, not from state, so nothing else
  // needs to await this; it just needs to have been kicked off.
  useEffect(() => {
    getPlusSizesConfig();
    const unsubscribe = subscribeToPlusSizesChanges(() => {});
    return unsubscribe;
  }, []);

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
  // survive a logout, an expired session, or a different account on this browser —
  // but it stays in the server-side carts table, so signing back in restores it.
  // Guest carts (no recorded owner) are kept, including through a sign-in at checkout,
  // and are merged into the account's server cart on login.
  useEffect(() => {
    if (authLoading || typeof window === 'undefined') return;

    if (!user) {
      fetchedUserRef.current = null;
      hydratedUserRef.current = null;
      const owner = localStorage.getItem('stag_beetle_cart_owner');
      if (owner) {
        setCart([]);
        localStorage.removeItem('stag_beetle_cart');
        localStorage.removeItem('stag_beetle_cart_owner');
      }
      return;
    }

    const owner = localStorage.getItem('stag_beetle_cart_owner');
    if (owner && owner !== user.id) {
      // A different account's leftovers: drop them before hydrating this account
      setCart([]);
    }
    localStorage.setItem('stag_beetle_cart_owner', user.id);

    if (fetchedUserRef.current === user.id) return;
    fetchedUserRef.current = user.id;

    (async () => {
      const result = await getCart(user.id);
      if (result.status === 'unknown') {
        // Couldn't confirm the real server cart (timed out/errored) — do
        // NOT mark this user as hydrated. hydratedUserRef gates the save
        // effect below; marking it here on an unconfirmed read used to let
        // that effect write the local (possibly incomplete) cart back to
        // Supabase ~800ms later, silently overwriting whatever was really
        // saved there. Leave fetchedUserRef cleared too, so a later change
        // (e.g. the background auth verification updating `user`) retries
        // this fetch instead of being permanently skipped.
        console.warn('[Cart] Could not confirm server cart — skipping hydration to avoid overwriting it');
        fetchedUserRef.current = null;
        return;
      }
      const serverItems = result.status === 'found' ? result.items : [];
      hydratedUserRef.current = user.id;
      // New array identity also triggers the save effect, pushing the merge result up
      setCart(prev => mergeCarts(serverItems, owner && owner !== user.id ? [] : prev));
    })();
  }, [user, authLoading]);

  // Save cart to localStorage (and the server copy) and update suggestions on cart change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('stag_beetle_cart', JSON.stringify(cart));
    }

    // Persist to the server-side cart, debounced — but only after this user's
    // server cart has been read and merged, so we never clobber it with stale data
    if (user && hydratedUserRef.current === user.id) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const userId = user.id;
      saveTimerRef.current = setTimeout(() => saveCart(userId, cart), 800);
    }

    // Fetch suggestions — a "you might also like" widget, not core cart
    // functionality. A failed/timed-out fetch should just leave suggestions
    // as they were, not surface an error over someone's cart.
    const fetchSuggestions = async () => {
      const cartIds = cart.map(item => item.product_id);
      try {
        const recs = await getSuggestions(cartIds);
        setSuggestions(recs);
      } catch (e: any) {
        console.warn('[Cart] Failed to load suggestions:', e.message || e);
      }
    };

    fetchSuggestions();
  }, [cart, user]);

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
          price: getEffectivePrice(product, size), // includes the plus-size surcharge, if this size carries one
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
    try {
      const recs = await getSuggestions(cartIds);
      setSuggestions(recs);
    } catch (e: any) {
      console.warn('[Cart] Failed to refresh suggestions:', e.message || e);
    }
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

import { createClient } from '@supabase/supabase-js';

// Define TS Interfaces
export interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  material: string;
  description: string;
  images: string[]; // [Front, Back, Detail/Side]
  sizes: string[];
  colors: string[];
  rating?: number;
}

export interface OrderItem {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
  selected_size: string;
  selected_color: string;
  image: string;
}

export interface Order {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  total_price: number;
  items: OrderItem[];
  payment_status: string;
  payment_method: string;
  coupon_applied?: string;
  discount_amount?: number;
}

export interface Coupon {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number; // e.g. 10 for percentage, 1000 for fixed Rupees
  min_order_value?: number;
  active: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
}

// Initial seed products representing the Stag Beetle brand with Indian luxury touch
const SEED_PRODUCTS: Product[] = [
  // ── MEN ──────────────────────────────────────────────────────────────────
  {
    id: "prod_linen_kurta",
    title: "Structured Linen Kurta",
    price: 6800,
    category: "Men",
    material: "Jaipur Handloom Linen",
    description: "A contemporary take on the classic kurta, cut from crisp handloom linen woven in Jaipur. Mandarin collar, concealed placket, and side slits give it a clean architectural silhouette. Finished with hand-stitched buttonholes and a relaxed straight hem.",
    images: [
      "https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800&q=80",
      "https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=800&q=80",
      "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Ivory White", "Slate Grey", "Indigo"],
    rating: 4.7
  },
  {
    id: "prod_bandhgala_jacket",
    title: "Bandhgala Jacket",
    price: 12500,
    category: "Men",
    material: "Wool-Silk Blend, Bengaluru Atelier",
    description: "A Nehru-collar bandhgala jacket tailored in our Bengaluru atelier from a fine wool-silk blend. Slim-fit silhouette with a single-button closure, welt pockets, and a full Mashru silk lining. Equally at home at a formal dinner or a gallery opening.",
    images: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
      "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80",
      "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Midnight Black", "Ivory Cream", "Forest Green"],
    rating: 4.9
  },
  {
    id: "prod_mesh_shirt",
    title: "Geometric Mesh Shirt",
    price: 4500,
    category: "Men",
    material: "Hand-spun Banarasi Silk Blend",
    description: "An editorial silhouette made from an ultra-lightweight hand-spun Banarasi silk and cotton blend, featuring geometric structural knit patterns and premium ribbed finishing. Hand-woven by master craftsmen in Varanasi and tailored in our Bengaluru atelier with delicate stitching that echoes the natural carapace divisions of the stag beetle.",
    images: [
      "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&q=80",
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80",
      "https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=800&q=80"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Obsidian Black", "Iridescent Silver", "Beetle Navy"],
    rating: 4.8
  },
  {
    id: "prod_carapace_blouse",
    title: "Carapace Blouse",
    price: 8900,
    category: "Women",
    material: "Handloom Mulberry Silk",
    description: "An elegant, architectural blouse crafted from double-weight mulberry handloom silk from South India. The sleeves feature layered pleats resembling the organic segments of beetle armor, catching light with a high-end subtle pearlized finish.",
    images: [
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80",
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80",
      "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&q=80"
    ],
    sizes: ["XS", "S", "M", "L"],
    colors: ["Champagne Gold", "Iridescent Silver", "Ivory Cream"],
    rating: 4.9
  },
  {
    id: "prod_anarkali_gown",
    title: "Anarkali Silk Gown",
    price: 18500,
    category: "Women",
    material: "Pure Banarasi Silk",
    description: "A floor-length Anarkali gown in pure Banarasi silk with a fitted bodice and a dramatically flared skirt. Intricate zari embroidery at the neckline and cuffs, with a matching dupatta in sheer organza. Handcrafted in our Bengaluru atelier over 40 hours.",
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80",
      "https://images.unsplash.com/photo-1617019114583-affb34d1b3cd?w=800&q=80",
      "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&q=80"
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Deep Crimson", "Midnight Blue", "Champagne Gold"],
    rating: 5.0
  },
  {
    id: "prod_drape_saree",
    title: "Architectural Drape Saree",
    price: 22000,
    category: "Women",
    material: "Kanjivaram Silk",
    description: "A contemporary pre-draped saree in heavyweight Kanjivaram silk with a structured pleated front panel. The pallu features a bold geometric border in contrasting zari. Comes with a fitted sleeveless blouse with a deep back. A modern heirloom.",
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80",
      "https://images.unsplash.com/photo-1617019114583-affb34d1b3cd?w=800&q=80",
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80"
    ],
    sizes: ["XS", "S", "M", "L"],
    colors: ["Peacock Teal", "Ivory & Gold", "Burgundy"],
    rating: 4.9
  },
  {
    id: "prod_linen_coord",
    title: "Linen Co-ord Set",
    price: 11200,
    category: "Women",
    material: "Handloom Linen, Kutch Embroidery",
    description: "A relaxed co-ord set comprising a boxy cropped jacket and wide-leg trousers in handloom linen. The jacket features hand-embroidered Kutch mirror-work at the collar and cuffs. Effortlessly elegant for day or evening.",
    images: [
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80",
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80",
      "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&q=80"
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Natural Ecru", "Sage Green", "Dusty Rose"],
    rating: 4.7
  },
  {
    id: "prod_linen_trousers_women",
    title: "Wide-Leg Linen Trousers",
    price: 7800,
    category: "Women",
    material: "Handloom Linen, Jaipur",
    description: "Relaxed wide-leg trousers in crisp handloom linen from Jaipur. High-rise waist with a wide waistband, side pockets, and a clean straight hem. Pairs effortlessly with the Linen Co-ord jacket or a simple silk blouse.",
    images: [
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80",
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80"
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Natural Ecru", "Slate Blue", "Terracotta"],
    rating: 4.8
  },
  {
    id: "prod_obsidian_overcoat",
    title: "Obsidian Overcoat",
    price: 14500,
    category: "Men",
    material: "Fine Kashmir Wool & Silk",
    description: "A double-breasted structured overcoat constructed from ultra-dense premium Kashmir wool and lined with pure Mashru silk. Designed with a tall, protective collar, deep side slits, and a bespoke inner-lining displaying custom anatomical sketches.",
    images: [
      "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80",
      "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80"
    ],
    sizes: ["M", "L", "XL"],
    colors: ["Obsidian Black", "Charcoal Gray"],
    rating: 5.0
  },
  {
    id: "prod_silk_shirt",
    title: "Ikat Silk Shirt",
    price: 9200,
    category: "Men",
    material: "Pochampally Ikat Silk",
    description: "A statement shirt woven from authentic Pochampally ikat silk — each piece unique due to the resist-dyeing process. Relaxed fit with a camp collar, mother-of-pearl buttons, and a curved hem. A wearable piece of Telangana craft heritage.",
    images: [
      "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&q=80",
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80",
      "https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=800&q=80"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Indigo & Gold", "Rust & Ivory", "Teal & Black"],
    rating: 4.8
  },
  {
    id: "prod_armor_trousers",
    title: "Armor Trousers",
    price: 7200,
    category: "Men",
    material: "Jaipur Handloom Linen-Wool",
    description: "Mid-rise trousers crafted from a bespoke hand-woven Jaipur linen and wool blend. Features signature sharp double front pleats and side belt loops in structural shapes, with adjustable gold buckle details that let you define the fit at the waist.",
    images: [
      "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80",
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80",
      "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Charcoal Gray", "Obsidian Black", "Khaki"],
    rating: 4.6
  },
  {
    id: "prod_mulberry_silk_scarf",
    title: "Silk Kurta",
    price: 5800,
    category: "Men",
    material: "100% Banarasi Mulberry Silk",
    description: "A classic straight-cut kurta in pure Banarasi mulberry silk. Subtle self-woven texture, mandarin collar, and side slits. Pairs beautifully with churidar or straight trousers for festive occasions.",
    images: [
      "https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800&q=80",
      "https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=800&q=80",
      "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Ivory White", "Champagne Gold", "Midnight Blue"],
    rating: 4.8
  }
];

// Initial seed coupons for discount checks
const SEED_COUPONS: Coupon[] = [
  { code: "WELCOME10", discount_type: "percentage", discount_value: 10, active: true },
  { code: "STAGBEETLE20", discount_type: "percentage", discount_value: 20, active: true },
  { code: "FESTIVE1000", discount_type: "fixed", discount_value: 1000, min_order_value: 5000, active: true }
];

// Initialize Supabase Client
// Supports both NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (new) and NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// =========================================================================
// MOCK LOCALSTORAGE DATABASE STORAGE HELPERS
// =========================================================================
const getLocalProducts = (): Product[] => {
  if (typeof window === 'undefined') return SEED_PRODUCTS;
  const stored = localStorage.getItem('stag_beetle_products');
  if (!stored) {
    localStorage.setItem('stag_beetle_products', JSON.stringify(SEED_PRODUCTS));
    return SEED_PRODUCTS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return SEED_PRODUCTS;
  }
};

const setLocalProducts = (products: Product[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('stag_beetle_products', JSON.stringify(products));
};

const getLocalCoupons = (): Coupon[] => {
  if (typeof window === 'undefined') return SEED_COUPONS;
  const stored = localStorage.getItem('stag_beetle_coupons');
  if (!stored) {
    localStorage.setItem('stag_beetle_coupons', JSON.stringify(SEED_COUPONS));
    return SEED_COUPONS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return SEED_COUPONS;
  }
};

const setLocalCoupons = (coupons: Coupon[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('stag_beetle_coupons', JSON.stringify(coupons));
};

// =========================================================================
// PRODUCTS OPERATIONS
// =========================================================================

export const getProducts = async (): Promise<Product[]> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (!error && data && data.length > 0) return data as Product[];
    } catch (e) {
      console.warn("Supabase failed, falling back to mock database:", e);
    }
  }
  return getLocalProducts();
};

export const getProductById = async (id: string): Promise<Product | null> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (!error && data) return data as Product;
    } catch (e) {
      console.warn(`Supabase getProductById failed for id ${id}, falling back to mock:`, e);
    }
  }
  return getLocalProducts().find(p => p.id === id) || null;
};

export const addProduct = async (product: Omit<Product, 'id'>): Promise<Product> => {
  const newProduct: Product = {
    ...product,
    id: `prod_${Math.random().toString(36).substr(2, 9)}`,
    rating: 5.0
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('products').insert([newProduct]).select().single();
      if (!error && data) return data as Product;
    } catch (e) {
      console.warn("Supabase addProduct failed, falling back to mock:", e);
    }
  }

  const products = getLocalProducts();
  products.push(newProduct);
  setLocalProducts(products);
  return newProduct;
};

export const updateProduct = async (id: string, updatedFields: Partial<Product>): Promise<Product | null> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('products').update(updatedFields).eq('id', id).select().single();
      if (!error && data) return data as Product;
    } catch (e) {
      console.warn(`Supabase updateProduct failed for id ${id}, falling back to mock:`, e);
    }
  }

  const products = getLocalProducts();
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  const updatedProduct = { ...products[index], ...updatedFields };
  products[index] = updatedProduct;
  setLocalProducts(products);
  return updatedProduct;
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) return true;
    } catch (e) {
      console.warn(`Supabase deleteProduct failed for id ${id}, falling back to mock:`, e);
    }
  }

  const products = getLocalProducts();
  const filtered = products.filter(p => p.id !== id);
  if (products.length === filtered.length) return false;
  
  setLocalProducts(filtered);
  return true;
};

export const bulkUploadProducts = async (newProducts: Omit<Product, 'id'>[]): Promise<Product[]> => {
  const productsToInsert = newProducts.map(p => ({
    ...p,
    id: `prod_${Math.random().toString(36).substr(2, 9)}`,
    rating: p.rating || 4.5 + Math.random() * 0.5
  }));

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('products').insert(productsToInsert).select();
      if (!error && data) return data as Product[];
    } catch (e) {
      console.warn("Supabase bulkUploadProducts failed, falling back to mock:", e);
    }
  }

  const products = getLocalProducts();
  const combined = [...products, ...productsToInsert];
  setLocalProducts(combined);
  return productsToInsert;
};

// =========================================================================
// COUPONS OPERATIONS
// =========================================================================

export const getCoupons = async (): Promise<Coupon[]> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('coupons').select('*');
      if (!error && data && data.length > 0) return data as Coupon[];
    } catch (e) {
      console.warn("Supabase failed fetching coupons, falling back to mock:", e);
    }
  }
  return getLocalCoupons();
};

export const createCoupon = async (coupon: Coupon): Promise<Coupon> => {
  const uppercaseCoupon = { ...coupon, code: coupon.code.toUpperCase().trim() };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('coupons').insert([uppercaseCoupon]).select().single();
      if (!error && data) return data as Coupon;
    } catch (e) {
      console.warn("Supabase createCoupon failed, falling back to mock:", e);
    }
  }

  const coupons = getLocalCoupons();
  // Avoid duplicate coupon codes
  const filtered = coupons.filter(c => c.code !== uppercaseCoupon.code);
  filtered.push(uppercaseCoupon);
  setLocalCoupons(filtered);
  return uppercaseCoupon;
};

export const deleteCoupon = async (code: string): Promise<boolean> => {
  const cleanCode = code.toUpperCase().trim();

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('coupons').delete().eq('code', cleanCode);
      if (!error) return true;
    } catch (e) {
      console.warn(`Supabase deleteCoupon failed for code ${cleanCode}, falling back to mock:`, e);
    }
  }

  const coupons = getLocalCoupons();
  const filtered = coupons.filter(c => c.code !== cleanCode);
  if (coupons.length === filtered.length) return false;
  
  setLocalCoupons(filtered);
  return true;
};

export const validateCoupon = async (code: string, orderValue: number): Promise<{ valid: boolean; coupon?: Coupon; message: string }> => {
  const cleanCode = code.toUpperCase().trim();
  const coupons = await getCoupons();
  const coupon = coupons.find(c => c.code === cleanCode);

  if (!coupon) {
    return { valid: false, message: "Invalid discount code." };
  }
  if (!coupon.active) {
    return { valid: false, message: "This discount code is no longer active." };
  }
  if (coupon.min_order_value && orderValue < coupon.min_order_value) {
    return { 
      valid: false, 
      message: `Min order value of ₹${coupon.min_order_value} required for this coupon.` 
    };
  }

  return { valid: true, coupon, message: "Coupon applied successfully!" };
};

// =========================================================================
// ORDERS OPERATIONS
// =========================================================================

export const getOrders = async (): Promise<Order[]> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (!error && data) return data as Order[];
    } catch (e) {
      console.warn("Supabase failed fetching orders, falling back to mock:", e);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('stag_beetle_orders');
      if (stored) {
        return JSON.parse(stored).sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
    } catch (e) {
      console.error(e);
    }
  }
  return [];
};

export const createOrder = async (orderData: Omit<Order, 'id' | 'created_at'>): Promise<Order> => {
  const newOrder: Order = {
    ...orderData,
    id: `order_${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('orders').insert([newOrder]).select().single();
      if (!error && data) return data as Order;
    } catch (e) {
      console.warn("Supabase createOrder failed, falling back to mock:", e);
    }
  }

  // Fallback: save to LocalStorage for mock persistence
  if (typeof window !== 'undefined') {
    const localOrders = JSON.parse(localStorage.getItem('stag_beetle_orders') || '[]');
    localOrders.push(newOrder);
    localStorage.setItem('stag_beetle_orders', JSON.stringify(localOrders));
  }

  return newOrder;
};

// Shopify-style recommendations engine
export const getSuggestions = async (cartProductIds: string[]): Promise<Product[]> => {
  const products = await getProducts();
  const filtered = products.filter(p => !cartProductIds.includes(p.id));
  
  // Return up to 3 recommendations (prefer lower-priced items first as impulse buys)
  return filtered
    .sort((a, b) => a.price - b.price)
    .slice(0, 3);
};

// =========================================================================
// USER PROFILES OPERATIONS
// =========================================================================

export const getProfile = async (id: string): Promise<UserProfile | null> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (!error && data) return data as UserProfile;
    } catch (e) {
      console.warn(`Supabase getProfile failed for id ${id}, falling back to mock:`, e);
    }
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('stag_beetle_profiles');
    if (stored) {
      try {
        const profiles: UserProfile[] = JSON.parse(stored);
        return profiles.find(p => p.id === id) || null;
      } catch (e) {
        console.error(e);
      }
    }
  }
  return null;
};

export const upsertProfile = async (profile: UserProfile): Promise<UserProfile> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('profiles').upsert([profile]).select().single();
      if (!error && data) return data as UserProfile;
    } catch (e) {
      console.warn("Supabase upsertProfile failed, falling back to mock:", e);
    }
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('stag_beetle_profiles');
    let profiles: UserProfile[] = [];
    if (stored) {
      try {
        profiles = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    const index = profiles.findIndex(p => p.id === profile.id);
    if (index > -1) {
      profiles[index] = { ...profiles[index], ...profile };
    } else {
      profiles.push(profile);
    }
    localStorage.setItem('stag_beetle_profiles', JSON.stringify(profiles));
  }
  return profile;
};

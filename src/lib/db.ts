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
  {
    id: "prod_mesh_shirt",
    title: "Geometric Mesh Shirt",
    price: 4500,
    category: "Men",
    material: "Hand-spun Banarasi Silk Blend",
    description: "An editorial silhouette made from an ultra-lightweight hand-spun Banarasi silk and cotton blend, featuring geometric structural knit patterns and premium ribbed finishing. Hand-woven by master craftsmen in Varanasi and tailored in our Bengaluru atelier with delicate stitching that echoes the natural carapace divisions of the stag beetle.",
    images: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDmDzvAzJTmIHatCZxgSwlf1MmkVNyI4RiZnvsR2btkk-BB3MMifvBE5_p0Gnn8nmIB6Gl_FxOhmkNwmBzUvhZkCeBqkiKZtCXJf4yYQuqi8BHDChaHWqO-tIzBeNz43uIDnDloxVnK4VbbxtByCx90O7inKWzPtNsjIxUDOTdxTzdCGGRfowmN_GVzEYW4FDkRmxVRWHXWFKLQ0Ayo4P3i2fvQMgBjOz8tGHVAVupVEQaXcaIgoixS--KNwdqL5cg3yKEgCEeDOw",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCQ59ihterty67pzcAe4ayHiVOkTeMY5kAEsVoXzom_OrdNmNA_JRhlND4x5JrzlEvio5hZlZ3OCdXeYCTb9hyl6Cvvm6GPPC31pXpwf54S1j4QuvHr9E1R6S7-zkFTGnQ68W_mw-3dZ5Sa7uwi-qgKh20csPF5bzM-x2IpzX59fCId9ok5OxXLyDh5ECEWqDBkG4D5S4yuE7cKmsloyQexdSxmqao_E7BXOrv8YYmiWoIsnfG4bb8YgFikXsF1Bf9wlEfYCZ_wdg",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCXapvFHkOcx0WEucYZ-9tnMC1HH1a73LBj8kAzho0zr7iMjbZDHbDKOZfUEjz75_HRWLBFh-pd3JnUJCVYX04qIf6yd_26c--BD44-8Svegf6k1FaJ__T6H9oZI8XHOG7kRYaJ0YCxttox0uKgQ85slc__d2aN6NZZUig0h8_5srqYGO4-MEPZDdZu0dJdE6QDKOlhsfC69ak_xAuj5MYbCLx4V25Soq0B_GY4ApqGUVX6xcqw0hbPNdZC-lkbHn6CYowSwkEdiQ"
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
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD5e7Egs-WS54MBmdSXmNf_sktfUb4amxVc_IYDsJcgU914G1Yf_4MiacNatA957y1qBVLCpTNTAAZp2hhroZyHXUdw_Fw6k8E3BNP6TC2Gbj_cjmcofiU8eec6zTCSTXN-_HACfXBdhRSc5MPDnUXvHSL7knNdZk0ArOcB062vN1_syBPMo6vCpDvDqSnoib4lSuHT5VXaoNPhQelStsygck-demcFfAkmpCy_lfJkMyLOJQkcZpwkUDHDwjFpUG85CJxA6tv1ig",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDKTIPLINvzy8rl4Jv9mJRusZvRqrzeuDZA-jUMJ_mZdVunjXCqWtixJqChxDBoemXJlQkSkItaNVAmoCMKIbtVB_CID03e0SZD4NnAmZak4npW3Ro4CQy4CVHLun3zKaDyb5Ff0tTFySx4GgcwhGevUIAsm91UYmOc15k0hz8cxYt0frkuCAeQT8sYTXyJQXnyR26KWfYLX2qiu4-Tl3DCc6DD10toHv0hKszb44QLvqQh2LWGJyMOAps-rYO1Vl5NZeN7uzIJIQ",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCF5Um0vG8hZDTlYGLD_QWO5Qoh7AeroSEEZlxaFZD2ePP1vZT-G8CBD_98y2tV-1egMQ4bXGOfLkiKTWxy0kz793zOiC-SfihaYaypM_HaBVNGgPQBTK7TSBW5YkZ55FhyLGlgEQ9pU7cPTVOAg35kSG27XnRoGXblLtQJ2PFYo6CvYzFzV2u9nSlAZdVcxuUfckCNPA1twhmb76abZ-GvC2HjWX82eZ-AIK453oJ1e2s-2DqCeXyiPcwbAMWxWxBV1F-0tz3TOQ"
    ],
    sizes: ["XS", "S", "M", "L"],
    colors: ["Champagne Gold", "Iridescent Silver", "Ivory Cream"],
    rating: 4.9
  },
  {
    id: "prod_sovereign_pin",
    title: "Sovereign Pin",
    price: 5200,
    category: "Accessories",
    material: "Mysore Rosewood & 18k Gold Plated Brass",
    description: "Signature accessory of the Stag Beetle collection. Individually hand-carved Mysore rosewood accents set in heavy 18k gold-plated brass. Crafted by local artisans in Karnataka, featuring intricate beetle anatomy detailing.",
    images: [
      "https://lh3.googleusercontent.com/aida/ADBb0ujuI2_8xrZraVJUnvd0iMQhTBBGvO71ZKMNA7L_2DF2hMX7OoG5aTr2Ok__rSo5vB0hbinoZmKueQlo8Yp5bJHGUAFXkxSGWEG4vtJT2TWCgA449ufY9Rfz8Eb87ZEJ2Akff7ketGf3Zjn-ClMVjagRiHEhYD1aE2RUxGSt6WapI9nFZdmht7TuClPMbi3T9rYAZo9J2ACYt2D4mvgvPCq_qMb8BCaVPtJ4Kf7OAHACgHsVf_qB_C-lsw",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBIwkP4JUVEwGzJ45XcprVDwHKhS42AgqyueYItiyU0NG78lDp3prZHcWi-GC0qUk9_mwzfcmGaTNOXvrG-xHbmh1B6fVssXs1KqjblJ9G7bthDFoi_hQ-dtitLOuw3thVNZR6v1KpGeP-GlqufYdutBbE5qhfQ0C4DeG3AzoANvg8MfCFnEezQyM2F0_2xRw0XwLxKJHvLAT1nyHz7HPhD6Snwt6We686LRezw80SpkI59icKW4GIDoFU0hsTXOy74YoQJjxiCTw",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD-XAJYyw_4lInrQySV7ztvYtTm_CaUecoHtqA7yCHtHdlx-AdzpowZiufiYfyi07l4pqEHFfY8rVx5QhNmB-8AJ99CGqb22GOjDvF0_vYwi5rQZ_PEsGFwj0UMW-rc-DPvWFLabTohsLMfXY4IVx-6_mpyg_K789KiDk6RUbkNXhdRdkZjirif3ECufmqgfGMwZYHNaxRqPJnwjeGGUKB3kuRmIQo9c7ucwXngyBMlCOBy0drYO3Eq2Tg9ccjczOeQ8g2PO8CFTw"
    ],
    sizes: ["One Size"],
    colors: ["Gold Leaf / Mysore Rosewood", "Silver / Mysore Rosewood"],
    rating: 4.7
  },
  {
    id: "prod_obsidian_overcoat",
    title: "Obsidian Overcoat",
    price: 14500,
    category: "Men",
    material: "Fine Kashmir Wool & Silk",
    description: "A double-breasted structured overcoat constructed from ultra-dense premium Kashmir wool and lined with pure Mashru silk. Designed with a tall, protective collar, deep side slits, and a bespoke inner-lining displaying custom anatomical sketches.",
    images: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCXapvFHkOcx0WEucYZ-9tnMC1HH1a73LBj8kAzho0zr7iMjbZDHbDKOZfUEjz75_HRWLBFh-pd3JnUJCVYX04qIf6yd_26c--BD44-8Svegf6k1FaJ__T6H9oZI8XHOG7kRYaJ0YCxttox0uKgQ85slc__d2aN6NZZUig0h8_5srqYGO4-MEPZDdZu0dJdE6QDKOlhsfC69ak_xAuj5MYbCLx4V25Soq0B_GY4ApqGUVX6xcqw0hbPNdZC-lkbHn6CYowSwkEdiQ",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDnOmwMIE60ezysrVHLyPkkH7HSVRMP8a84q7z5wXkHkgB5h0PT8JstN7gp9Lno91of4-iqEtKNcDCnuZcqPt5ZPYMBgvOSitZTdyt5RhAD8VgA5HxQGqtlOcisVBfWChp-dp0Of9--STBgHMqkDg4ZKzM_hooAfJJ4FJXb-6ppn0_au6UWypGHjSEeKUThHzDL7fwVrqLWJsYB-Syfk6XUC10TGZtPuds87CrfpWcca6o-P1mrn0v8AMVitUFx5z4g2iInyTGGQA",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCQ59ihterty67pzcAe4ayHiVOkTeMY5kAEsVoXzom_OrdNmNA_JRhlND4x5JrzlEvio5hZlZ3OCdXeYCTb9hyl6Cvvm6GPPC31pXpwf54S1j4QuvHr9E1R6S7-zkFTGnQ68W_mw-3dZ5Sa7uwi-qgKh20csPF5bzM-x2IpzX59fCId9ok5OxXLyDh5ECEWqDBkG4D5S4yuE7cKmsloyQexdSxmqao_E7BXOrv8YYmiWoIsnfG4bb8YgFikXsF1Bf9wlEfYCZ_wdg"
    ],
    sizes: ["M", "L", "XL"],
    colors: ["Obsidian Black", "Charcoal Gray"],
    rating: 5.0
  },
  {
    id: "prod_armor_trousers",
    title: "Armor Trousers",
    price: 7200,
    category: "Men",
    material: "Jaipur Handloom Linen-Wool",
    description: "Mid-rise trousers crafted from a bespoke hand-woven Jaipur linen and wool blend. Features signature sharp double front pleats and side belt loops in structural shapes, with adjustable gold buckle details that let you define the fit at the waist.",
    images: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDnOmwMIE60ezysrVHLyPkkH7HSVRMP8a84q7z5wXkHkgB5h0PT8JstN7gp9Lno91of4-iqEtKNcDCnuZcqPt5ZPYMBgvOSitZTdyt5RhAD8VgA5HxQGqtlOcisVBfWChp-dp0Of9--STBgHMqkDg4ZKzM_hooAfJJ4FJXb-6ppn0_au6UWypGHjSEeKUThHzDL7fwVrqLWJsYB-Syfk6XUC10TGZtPuds87CrfpWcca6o-P1mrn0v8AMVitUFx5z4g2iInyTGGQA",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCQ59ihterty67pzcAe4ayHiVOkTeMY5kAEsVoXzom_OrdNmNA_JRhlND4x5JrzlEvio5hZlZ3OCdXeYCTb9hyl6Cvvm6GPPC31pXpwf54S1j4QuvHr9E1R6S7-zkFTGnQ68W_mw-3dZ5Sa7uwi-qgKh20csPF5bzM-x2IpzX59fCId9ok5OxXLyDh5ECEWqDBkG4D5S4yuE7cKmsloyQexdSxmqao_E7BXOrv8YYmiWoIsnfG4bb8YgFikXsF1Bf9wlEfYCZ_wdg",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDmDzvAzJTmIHatCZxgSwlf1MmkVNyI4RiZnvsR2btkk-BB3MMifvBE5_p0Gnn8nmIB6Gl_FxOhmkNwmBzUvhZkCeBqkiKZtCXJf4yYQuqi8BHDChaHWqO-tIzBeNz43uIDnDloxVnK4VbbxtByCx90O7inKWzPtNsjIxUDOTdxTzdCGGRfowmN_GVzEYW4FDkRmxVRWHXWFKLQ0Ayo4P3i2fvQMgBjOz8tGHVAVupVEQaXcaIgoixS--KNwdqL5cg3yKEgCEeDOw"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Charcoal Gray", "Obsidian Black"],
    rating: 4.6
  },
  {
    id: "prod_mulberry_silk_scarf",
    title: "Carapace Silk Scarf",
    price: 2800,
    category: "Accessories",
    material: "100% Banarasi Mulberry Silk",
    description: "A gorgeous, shimmering accessory showing stylized hand-sketched diagrams of beetle wings and anatomy. Printed on premium 100% Mulberry silk handloom woven in Varanasi, with delicate hand-rolled edges.",
    images: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBIwkP4JUVEwGzJ45XcprVDwHKhS42AgqyueYItiyU0NG78lDp3prZHcWi-GC0qUk9_mwzfcmGaTNOXvrG-xHbmh1B6fVssXs1KqjblJ9G7bthDFoi_hQ-dtitLOuw3thVNZR6v1KpGeP-GlqufYdutBbE5qhfQ0C4DeG3AzoANvg8MfCFnEezQyM2F0_2xRw0XwLxKJHvLAT1nyHz7HPhD6Snwt6We686LRezw80SpkI59icKW4GIDoFU0hsTXOy74YoQJjxiCTw",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD-XAJYyw_4lInrQySV7ztvYtTm_CaUecoHtqA7yCHtHdlx-AdzpowZiufiYfyi07l4pqEHFfY8rVx5QhNmB-8AJ99CGqb22GOjDvF0_vYwi5rQZ_PEsGFwj0UMW-rc-DPvWFLabTohsLMfXY4IVx-6_mpyg_K789KiDk6RUbkNXhdRdkZjirif3ECufmqgfGMwZYHNaxRqPJnwjeGGUKB3kuRmIQo9c7ucwXngyBMlCOBy0drYO3Eq2Tg9ccjczOeQ8g2PO8CFTw",
      "https://lh3.googleusercontent.com/aida/ADBb0ujuI2_8xrZraVJUnvd0iMQhTBBGvO71ZKMNA7L_2DF2hMX7OoG5aTr2Ok__rSo5vB0hbinoZmKueQlo8Yp5bJHGUAFXkxSGWEG4vtJT2TWCgA449ufY9Rfz8Eb87ZEJ2Akff7ketGf3Zjn-ClMVjagRiHEhYD1aE2RUxGSt6WapI9nFZdmht7TuClPMbi3T9rYAZo9J2ACYt2D4mvgvPCq_qMb8BCaVPtJ4Kf7OAHACgHsVf_qB_C-lsw"
    ],
    sizes: ["One Size"],
    colors: ["Champagne Gold", "Obsidian / Silver"],
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
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const isSupabaseConfigured = supabaseUrl && supabaseAnonKey;
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
  
  // Return up to 3 recommendations (prefer accessories or lower-priced items first as impulse buys)
  return filtered
    .sort((a, b) => {
      if (a.category === 'Accessories' && b.category !== 'Accessories') return -1;
      if (b.category === 'Accessories' && a.category !== 'Accessories') return 1;
      return a.price - b.price;
    })
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

import { createClient } from '@supabase/supabase-js';

// Define TS Interfaces
export interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  subcategory?: string; // e.g. "Shirt", "Jeans", "Tshirt", "Track pant", "Shorts", "Jacket"
  sleeve_type?: 'Half Sleeves' | 'Full Sleeves'; // applicable for Shirts
  sku?: string;
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
  shipping_status?: 'Processing' | 'Scheduled' | 'Shipped' | 'In Transit' | 'Delivered' | 'Returned';
  shipping_carrier?: 'India Post' | 'Delhivery' | 'Blue Dart' | 'DHL';
  tracking_number?: string;
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
    subcategory: "Shirt",
    sleeve_type: "Full Sleeves",
    sku: "SB-LN-KT-01",
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
    subcategory: "Jacket",
    sku: "SB-BG-JK-02",
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
    subcategory: "Shirt",
    sleeve_type: "Half Sleeves",
    sku: "SB-GM-SH-03",
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
  /*
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
  }
  */
  {
    id: "prod_obsidian_overcoat",
    title: "Obsidian Overcoat",
    price: 14500,
    category: "Men",
    subcategory: "Jacket",
    sku: "SB-MEN-OB-OC-04",
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
    subcategory: "Shirt",
    sleeve_type: "Full Sleeves",
    sku: "SB-MEN-IK-SH-05",
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
    subcategory: "Track pant",
    sku: "SB-MEN-AR-TR-06",
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
    subcategory: "Shirt",
    sleeve_type: "Full Sleeves",
    sku: "SB-MEN-SL-KT-07",
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
  },
  {
    id: "prod_retro_tshirt",
    title: "Retro Oversized Graphic Tee",
    price: 999,
    category: "Men",
    subcategory: "Tshirt",
    sku: "SB-MEN-RT-TS-08",
    material: "100% Heavyweight Cotton",
    description: "An oversized streetwear t-shirt with a vintage graphic print. Drop shoulders and double-needle stitching for a relaxed, robust look.",
    images: [
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80",
      "https://images.unsplash.com/photo-1554568218-0f1715e72254?w=800&q=80",
      "https://images.unsplash.com/photo-1527719327859-c6ce802585e4?w=800&q=80"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Off-White", "Vintage Black"],
    rating: 4.8
  },
  {
    id: "prod_flared_jeans",
    title: "Flared Fit Washed Jeans",
    price: 1899,
    category: "Men",
    subcategory: "Jeans",
    sku: "SB-MEN-FL-JN-09",
    material: "Premium Rigid Denim",
    description: "Throwback flared fit jeans with a classic mid-rise and heavily washed light indigo shade. Finished with signature pocket rivets and raw edges.",
    images: [
      "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80",
      "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=800&q=80"
    ],
    sizes: ["30", "32", "34", "36"],
    colors: ["Washed Indigo", "Charcoal Blue"],
    rating: 4.9
  },
  {
    id: "prod_bootcut_jeans",
    title: "Bootcut Stretch Washed Jeans",
    price: 1999,
    category: "Men",
    subcategory: "Jeans",
    sku: "SB-MEN-BC-JN-10",
    material: "Stretch Cotton Denim",
    description: "Bootcut leg profile with a touch of stretch for day-long comfort. Clean dark wash with light whiskers and a zip-fly.",
    images: [
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80",
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80"
    ],
    sizes: ["30", "32", "34", "36"],
    colors: ["Dark Blue", "Solid Black"],
    rating: 4.7
  },
  {
    id: "prod_cargo_pants",
    title: "Tactical Utility Cargo Pants",
    price: 2199,
    category: "Men",
    subcategory: "Track pant",
    sku: "SB-MEN-CG-PT-11",
    material: "Durable Ripstop Cotton",
    description: "Modern cargo pants cut from durable ripstop cotton. Equipped with multiple secure utility pockets, a relaxed silhouette, and drawcord adjustable cuffs.",
    images: [
      "https://images.unsplash.com/photo-1517423568366-8b83523034fd?w=800&q=80",
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Olive Green", "Desert Sand"],
    rating: 4.9
  },
  {
    id: "prod_knit_polo",
    title: "Cable-Knit Summer Polo",
    price: 1499,
    category: "Men",
    subcategory: "Tshirt",
    sku: "SB-MEN-KN-PL-12",
    material: "100% Knit Cotton",
    description: "Retro summer vibe polo styled with a classic collar and cable-knit texture. Super breathable and holds its structure perfectly.",
    images: [
      "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&q=80",
      "https://images.unsplash.com/photo-1578932750294-f5075e85f44a?w=800&q=80"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Mustard Yellow", "Ecru Cream"],
    rating: 4.8
  },
  {
    id: "prod_denim_overshirt",
    title: "Heavyweight Denim Overshirt",
    price: 2299,
    category: "Men",
    subcategory: "Jacket",
    sku: "SB-MEN-DN-OS-13",
    material: "12oz Organic Denim",
    description: "A heavyweight denim overshirt that functions as a light jacket. Boxy fit, dual-chest flap pockets, and metallic shank buttons.",
    images: [
      "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&q=80",
      "https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?w=800&q=80"
    ],
    sizes: ["M", "L", "XL"],
    colors: ["Light Indigo", "Acid Black"],
    rating: 4.9
  },
  {
    id: "prod_retro_sunglasses",
    title: "Vintage Square Sunglasses",
    price: 999,
    category: "Accessories",
    material: "Premium Acetate & Alloy",
    description: "Retro square frames inspired by 70s eyewear. Featuring tinted UV400 lenses and golden side accents for a sleek, bold profile.",
    images: [
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80",
      "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80"
    ],
    sizes: ["One Size"],
    colors: ["Tortoiseshell Brown", "Glossy Black"],
    rating: 4.6
  },
  {
    id: "prod_noir_perfume",
    title: "Noir Intense Eau De Parfum",
    price: 1799,
    category: "Accessories",
    material: "Natural Essential Oils & Bergamot",
    description: "An intense, woody fragrance combining base notes of cedarwood and patchouli with top notes of bergamot and dry amber. Long-lasting performance.",
    images: [
      "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80",
      "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=80"
    ],
    sizes: ["100ml"],
    colors: ["Matte Black"],
    rating: 4.8
  },
  {
    id: "prod_suede_loafers",
    title: "Classic Suede Loafers",
    price: 3499,
    category: "Accessories",
    material: "Italian Suede Leather",
    description: "Slip-on suede loafers crafted with clean apron stitching and a cushioned leather footbed. Sleek and perfect for both smart-casual and formal ensembles.",
    images: [
      "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&q=80",
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80"
    ],
    sizes: ["7", "8", "9", "10"],
    colors: ["Navy Blue", "Sandy Beige"],
    rating: 4.7
  },
  {
    id: "prod_knit_shorts",
    title: "Tailored Drawstring Shorts",
    price: 1199,
    category: "Men",
    subcategory: "Shorts",
    sku: "SB-MEN-KN-SH-14",
    material: "Premium Waffle Cotton",
    description: "Relaxed fit shorts in a structured waffle knit. Equipped with an elastic waistband, cotton drawstrings, and deep side slash pockets.",
    images: [
      "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&q=80",
      "https://images.unsplash.com/photo-15911954013-d485f30999de?w=800&q=80"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Sage Green", "Charcoal Gray"],
    rating: 4.5
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

export const supabaseTimeout = (promise: any, ms = 4000): Promise<any> => {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Query timeout')), ms))
  ]);
};

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
      console.log("[Atelier DB] Fetching products from Supabase...");
      const { data, error } = await supabaseTimeout(supabase.from('products').select('*'));
      if (!error && data && data.length > 0) {
        console.log("[Atelier DB] Successfully loaded products from Supabase.");
        return data as Product[];
      }
      if (error) console.warn("[Atelier DB] Supabase products query error:", error.message);
    } catch (e: any) {
      console.warn("[Atelier DB] Supabase products failed or timed out:", e.message || e);
    }
  }
  console.log("[Atelier DB] Returning local mock products.");
  return getLocalProducts();
};

export const getProductById = async (id: string): Promise<Product | null> => {
  if (isSupabaseConfigured && supabase) {
    try {
      console.log(`[Atelier DB] Fetching product ${id} from Supabase...`);
      const { data, error } = await supabaseTimeout(supabase.from('products').select('*').eq('id', id).single());
      if (!error && data) return data as Product;
      if (error) console.warn("[Atelier DB] Supabase product error:", error.message);
    } catch (e: any) {
      console.warn(`[Atelier DB] Supabase getProductById failed or timed out for ${id}:`, e.message || e);
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
  let imagesToDelete: string[] = [];

  // 1. Fetch product first to find images to delete
  if (isSupabaseConfigured && supabase) {
    try {
      console.log(`[Atelier DB] Fetching product ${id} images for deletion...`);
      const { data: prod, error } = await supabase.from('products').select('images').eq('id', id).single();
      if (!error && prod && prod.images) {
        imagesToDelete = prod.images;
      }
    } catch (e) {
      console.warn(`[Atelier DB] Failed to fetch product ${id} images for deletion:`, e);
    }
  } else {
    const products = getLocalProducts();
    const prod = products.find(p => p.id === id);
    if (prod && prod.images) {
      imagesToDelete = prod.images;
    }
  }

  // 2. Delete images from Supabase storage if they are Supabase storage URLs
  if (isSupabaseConfigured && supabase && imagesToDelete.length > 0) {
    const paths = imagesToDelete
      .map(url => {
        if (!url) return null;
        // Match both public and signed URLs and extract the relative path in the bucket
        const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/garment-images\/(.+)$/);
        if (match && match[1]) {
          return match[1].split('?')[0];
        }
        return null;
      })
      .filter((path): path is string => !!path);

    if (paths.length > 0) {
      try {
        console.log(`[Atelier Storage] Deleting associated images from Supabase storage:`, paths);
        const { data, error } = await supabase.storage.from('garment-images').remove(paths);
        if (error) {
          console.warn("[Atelier Storage] Failed to delete images from bucket:", error.message);
        } else {
          console.log("[Atelier Storage] Images deleted successfully from bucket:", data);
        }
      } catch (err) {
        console.warn("[Atelier Storage] Error deleting images from storage:", err);
      }
    }
  }

  // 3. Delete product from database
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
      console.log("[Atelier DB] Fetching coupons from Supabase...");
      const { data, error } = await supabaseTimeout(supabase.from('coupons').select('*'));
      if (!error && data && data.length > 0) {
        console.log("[Atelier DB] Successfully loaded coupons from Supabase.");
        return data as Coupon[];
      }
      if (error) console.warn("[Atelier DB] Supabase coupons error:", error.message);
    } catch (e: any) {
      console.warn("[Atelier DB] Supabase coupons failed or timed out:", e.message || e);
    }
  }
  console.log("[Atelier DB] Returning local mock coupons.");
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
      console.log("[Atelier DB] Fetching orders from Supabase...");
      const { data, error } = await supabaseTimeout(
        supabase.from('orders').select('*').order('created_at', { ascending: false })
      );
      if (!error && data) {
        console.log(`[Atelier DB] Successfully loaded ${data.length} orders from Supabase.`);
        return data as Order[];
      }
      if (error) console.warn("[Atelier DB] Supabase orders error:", error.message);
    } catch (e: any) {
      console.warn("Supabase failed fetching orders or timed out, falling back to mock:", e.message || e);
    }
  }
  console.log("[Atelier DB] Returning local mock orders.");
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('stag_beetle_orders');
  if (stored) {
    try {
      return JSON.parse(stored).sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
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

      // Handle missing shipping columns retry (Postgres code 42703 is undefined_column)
      if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
        console.warn("Supabase orders table missing shipping columns, retrying insert without them...");
        const { shipping_status, shipping_carrier, tracking_number, ...strippedOrderData } = newOrder as any;
        const { data: retryData, error: retryError } = await supabase
          .from('orders')
          .insert([strippedOrderData])
          .select()
          .single();
        if (!retryError && retryData) {
          // Return the full order (including shipping details) so the client has them
          return newOrder;
        } else if (retryError) {
          console.error("Retry insert failed:", retryError.message);
        }
      } else if (error) {
        console.error("Supabase insert error:", error.message);
      }
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

export const updateOrderShipping = async (
  id: string,
  shipping_carrier: 'India Post' | 'Delhivery' | 'Blue Dart' | 'DHL',
  tracking_number: string,
  shipping_status: 'Processing' | 'Scheduled' | 'Shipped' | 'In Transit' | 'Delivered' | 'Returned'
): Promise<Order | null> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ shipping_carrier, tracking_number, shipping_status })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as Order;

      // Check if error is due to missing columns
      if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
        console.warn("Supabase orders table missing shipping columns, skipping DB write during update.");
      }
    } catch (e) {
      console.warn(`Supabase updateOrderShipping failed for id ${id}:`, e);
    }
  }

  // Fallback: Update in LocalStorage
  if (typeof window !== 'undefined') {
    const localOrders = JSON.parse(localStorage.getItem('stag_beetle_orders') || '[]');
    const index = localOrders.findIndex((o: Order) => o.id === id);
    if (index > -1) {
      const updatedOrder = {
        ...localOrders[index],
        shipping_carrier,
        tracking_number,
        shipping_status
      };
      localOrders[index] = updatedOrder;
      localStorage.setItem('stag_beetle_orders', JSON.stringify(localOrders));
      return updatedOrder;
    }
  }
  return null;
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
  if (isSupabaseConfigured && supabase && !id.startsWith('usr_')) {
    try {
      console.log(`[Atelier DB] Fetching profile ${id} from Supabase...`);
      const { data, error } = await supabaseTimeout(supabase.from('profiles').select('*').eq('id', id).single());
      if (!error && data) return data as UserProfile;
      if (error) console.warn("[Atelier DB] Supabase getProfile error:", error.message);
    } catch (e: any) {
      console.warn(`Supabase getProfile failed or timed out for id ${id}, falling back to mock:`, e.message || e);
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
  if (isSupabaseConfigured && supabase && !profile.id.startsWith('usr_')) {
    try {
      console.log(`[Atelier DB] Upserting profile ${profile.id} to Supabase...`);
      const { data, error } = await supabaseTimeout(supabase.from('profiles').upsert([profile]).select().single());
      if (!error && data) return data as UserProfile;
      if (error) console.warn("[Atelier DB] Supabase upsertProfile error:", error.message);
    } catch (e: any) {
      console.warn("Supabase upsertProfile failed or timed out, falling back to mock:", e.message || e);
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

export const uploadGarmentImage = async (file: File, sku?: string, index?: number): Promise<string> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const fileExt = file.name.split('.').pop();
      // Clean SKU for safe filename
      const cleanSku = sku ? sku.trim().replace(/[^a-zA-Z0-9-_]/g, '_') : '';
      const fileName = cleanSku 
        ? `${cleanSku}_image${index || 1}_${Date.now()}.${fileExt}`
        : `${Math.random().toString(36).substring(2, 11)}_${Date.now()}.${fileExt}`;
      const filePath = cleanSku
        ? `products/${cleanSku}/${fileName}`
        : `products/${fileName}`;

      console.log(`[Atelier Storage] Uploading ${file.name} to Supabase bucket 'garment-images' as ${filePath}...`);
      const { data, error } = await supabase.storage
        .from('garment-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.warn("[Atelier Storage] Supabase upload failed:", error.message);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from('garment-images')
        .getPublicUrl(filePath);

      console.log("[Atelier Storage] Public URL resolved:", urlData.publicUrl);
      return urlData.publicUrl;
    } catch (e: any) {
      console.warn("[Atelier Storage] Supabase upload timed out or failed, using Base64 data URL fallback:", e.message || e);
    }
  }

  // Local fallback: convert to Base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

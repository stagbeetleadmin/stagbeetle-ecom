import { createClient } from '@supabase/supabase-js';
import { PRODUCT_COLORS } from './colors';

// Define TS Interfaces
export interface Product {
  id: string;
  title: string;
  price: number; // Selling Price (SP) — what the customer pays for a non-plus size
  mrp?: number; // Maximum Retail Price — shown struck-through when higher than price
  plus_size_surcharge?: number; // added to price when the selected size is a configured plus size
  category: string;
  subcategory?: string; // e.g. "Shirt", "Jeans", "Tshirt", "Track pant", "Shorts", "Jacket"
  sleeve_type?: 'Half Sleeves' | 'Full Sleeves'; // applicable for Shirts
  sku?: string;
  material: string;
  description: string; // may contain rich-text HTML (bold/italic/lists/headings) or legacy plain text
  images: string[]; // up to 6, in display order
  sizes: string[];
  colors: string[];
  rating?: number;
  size_chart?: SizeChart; // optional — powers the customer-facing "Size Guide"
}

// A per-product measurement table: which columns apply (Chest/Waist/…), the
// unit they're in, and the actual number for each of the product's sizes.
export interface SizeChart {
  unit: 'in' | 'cm';
  measurements: string[]; // ordered column names, e.g. ['Chest', 'Shoulder', 'Length']
  rows: Record<string, Record<string, string>>; // size -> { measurement -> value }
}

// Garment grouping used by the admin form so "Garment Type" only ever shows
// options relevant to what's actually being listed — picking "Bottoms" first
// means Jeans/Shorts/Track Pant/Joggers, never Shirt. This drives which
// measurement columns get suggested for the size chart (chest/shoulder vs
// waist/inseam — see SIZE_CHART_PRESETS below); it isn't persisted on the
// product — subcategory (already stored) is enough to derive the group back
// on edit, via GARMENT_GROUP_OF below. NOT the same axis as which size
// *scale* (S–3XL vs waist inches) applies — see NUMERIC_SIZED_TYPES below,
// since e.g. Shorts and Track pant are "Bottoms" for chart-column purposes
// but still sell on the S–3XL scale, not by waist inch.
export const GARMENT_GROUPS: Record<string, string[]> = {
  Tops: ['Shirt', 'Tshirt', 'Jacket'],
  Bottoms: ['Jeans', 'Track pant', 'Shorts', 'Joggers'],
};
export const GARMENT_GROUP_OF: Record<string, string> = Object.fromEntries(
  Object.entries(GARMENT_GROUPS).flatMap(([group, types]) => types.map(t => [t, group]))
);

// Canonical size scales — single source of truth for both which sizes are
// selectable per garment type in the admin form and the order they display
// in everywhere else (storefront size buttons, size chart rows, admin
// previews). Only Jeans are actually sized by waist inches; Shorts/Track
// pant/Joggers are "Bottoms" for measurement-column purposes above but are
// sold M/L/XL like a top, not by waist inch.
export const TOP_SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
export const BOTTOM_SIZE_OPTIONS = ['28', '30', '32', '34', '36', '38', '40'];
export const NUMERIC_SIZED_TYPES = ['Jeans'];
export const getSizeOptionsForType = (subcategory: string): string[] =>
  NUMERIC_SIZED_TYPES.includes(subcategory) ? BOTTOM_SIZE_OPTIONS : TOP_SIZE_OPTIONS;

const SIZE_DISPLAY_ORDER = [...TOP_SIZE_OPTIONS, ...BOTTOM_SIZE_OPTIONS];

// Sorts a product's sizes into a consistent, sensible display order instead
// of whatever order they happened to be added/selected in. Sizes used to
// just render in product.sizes' raw array order — fine when a product was
// created with all its sizes at once, but a size added later (e.g. "S"/"XS"
// added months after a product already had M/L/XL) landed at the END of
// that array, so it rendered after XL everywhere a shopper saw it. Anything
// outside the known scales (a free-typed custom size) sorts after every
// recognized size, keeping its own relative order among other custom sizes.
export const sortSizes = (sizes: string[]): string[] => {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_DISPLAY_ORDER.indexOf(a.toUpperCase());
    const bi = SIZE_DISPLAY_ORDER.indexOf(b.toUpperCase());
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
};

// Suggested measurement columns per group — a starting point admins can add
// to or trim, not a rigid schema.
export const SIZE_CHART_PRESETS: Record<string, string[]> = {
  Tops: ['Chest', 'Shoulder', 'Length', 'Sleeve Length'],
  Bottoms: ['Waist', 'Inseam', 'Hip', 'Height Range'],
};

// Typical men's measurements (inches) for each size on the standard scale —
// a fast starting point for "Load Standard Template" so most products need
// zero manual typing, just a glance-and-adjust. Approximate industry
// averages, not a precise spec; every cell stays freely editable.
const SIZE_CHART_DEFAULTS: Record<string, Record<string, Record<string, string>>> = {
  Tops: {
    XS: { Chest: '36', Shoulder: '16.5', Length: '26', 'Sleeve Length': '23' },
    S: { Chest: '38', Shoulder: '17', Length: '27', 'Sleeve Length': '23.5' },
    M: { Chest: '40', Shoulder: '17.5', Length: '28', 'Sleeve Length': '24' },
    L: { Chest: '42', Shoulder: '18', Length: '29', 'Sleeve Length': '24.5' },
    XL: { Chest: '44', Shoulder: '18.5', Length: '30', 'Sleeve Length': '25' },
    XXL: { Chest: '46', Shoulder: '19', Length: '31', 'Sleeve Length': '25.5' },
    '3XL': { Chest: '48', Shoulder: '19.5', Length: '32', 'Sleeve Length': '26' },
  },
  Bottoms: {
    '28': { Waist: '28', Inseam: '30', Hip: '36', 'Height Range': '5\'4"-5\'7"' },
    '30': { Waist: '30', Inseam: '30', Hip: '38', 'Height Range': '5\'5"-5\'8"' },
    '32': { Waist: '32', Inseam: '31', Hip: '40', 'Height Range': '5\'6"-5\'9"' },
    '34': { Waist: '34', Inseam: '31', Hip: '42', 'Height Range': '5\'7"-5\'10"' },
    '36': { Waist: '36', Inseam: '32', Hip: '44', 'Height Range': '5\'8"-5\'11"' },
    '38': { Waist: '38', Inseam: '32', Hip: '46', 'Height Range': '5\'9"-6\'0"' },
    '40': { Waist: '40', Inseam: '33', Hip: '48', 'Height Range': '5\'10"-6\'1"' },
  },
};

// Builds a ready-to-edit size chart for "Load Standard Template": the group's
// preset measurement columns, pre-filled with typical values for whichever
// of the product's currently-selected sizes fall on the standard scale. A
// custom, non-standard size (a one-off an admin typed in) just lands with a
// blank row — nothing breaks, it's simply left for manual entry.
export function getDefaultSizeChart(group: string, sizes: string[]): SizeChart {
  const measurements = SIZE_CHART_PRESETS[group] || SIZE_CHART_PRESETS.Tops;
  const defaultsForGroup = SIZE_CHART_DEFAULTS[group] || {};
  const rows: Record<string, Record<string, string>> = {};
  sizes.forEach(size => { rows[size] = { ...(defaultsForGroup[size] || {}) }; });
  return { unit: 'in', measurements, rows };
}

// The largest size in each scale — tops (…, XL, XXL, 3XL) and bottoms sized
// by waist inches (…, 36, 38, 40) — carries a plus-size surcharge if the
// product has one set. Admin-configurable (see getPlusSizesConfig /
// setPlusSizesConfig further down, near the other realtime config); these
// are just the starting defaults, live until that config is first fetched.
const DEFAULT_PLUS_SIZES = ['XXL', '3XL', '38', '40'];
let plusSizesSet = new Set<string>(DEFAULT_PLUS_SIZES);

export const isPlusSize = (size: string): boolean => plusSizesSet.has(size);
export const getPlusSizesList = (): string[] => Array.from(plusSizesSet);

// The actual price a customer pays for a given size — base price, plus the
// product's plus-size surcharge if that size qualifies. This is the one
// place that math happens; every add-to-cart and price display should route
// through it rather than reading product.price directly once a size is known.
export const getEffectivePrice = (product: Pick<Product, 'price' | 'plus_size_surcharge'>, size: string): number =>
  product.price + (isPlusSize(size) ? product.plus_size_surcharge || 0 : 0);

// One size of one product — the unit stock is actually tracked against.
// SKU convention matches the admin form's existing preview: STYLE-COLOR-SIZE.
export interface InventoryRecord {
  variant_id: string;
  sku: string;
  size: string;
  galla_sku: string | null; // Galla's own numeric product code for this size — not our sku; required for outbound order sync to reach the right item
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number; // on_hand - reserved, floored at 0
  low_stock_threshold: number;
  sync_source: 'external_pos' | 'manual_admin' | 'order_deduction';
  last_synced_at: string | null;
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
  updated_at?: string; // set by Supabase; absent for local-only (usr_*) mock profiles
}

// Initial seed products representing the Stag Beetle brand with Indian luxury touch
const SEED_PRODUCTS: Product[] = [
  {
    id: "prod_dolb8k9sa",
    title: "Essential Linen Shirt – Stone Gray",
    price: 2000,
    category: "Men",
    material: "Premium Cotton Linen Blend Soft-touch breathable weave Lightweight summer fabric",
    description: "The Stagbeetle Essential Linen Shirt is designed for modern minimalism and effortless comfort. Crafted from lightweight breathable linen-blend fabric, it features a tailored fit, half sleeves, clean front placket, and refined detailing suitable for both casual and smart occasions.\n\nBuilt for Indian summers while maintaining a premium structured silhouette.",
    images: [
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-SGR/SB-LNSH-SGR_image1_1780089214455.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-SGR/SB-LNSH-SGR_image2_1780089220272.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-SGR/SB-LNSH-SGR_image3_1780089227905.jpg"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Stone Grey"],
    rating: 5,
    sku: "SB-LNSH-SGR",
    subcategory: "Shirt",
    sleeve_type: "Half Sleeves"
  },
  {
    id: "prod_tnb3mzq8r",
    title: "Essential Linen Shirt – Grey",
    price: 2000,
    category: "Men",
    material: "Premium Cotton Linen Blend Soft-touch breathable weave Lightweight summer fabric",
    description: "The Stagbeetle Essential Linen Shirt is designed for modern minimalism and effortless comfort. Crafted from lightweight breathable linen-blend fabric, it features a tailored fit, half sleeves, clean front placket, and refined detailing suitable for both casual and smart occasions.\n\nBuilt for Indian summers while maintaining a premium structured silhouette.",
    images: [
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-GRY/SB-LNSH-GRY_image1_1780089858705.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-GRY/SB-LNSH-GRY_image2_1780089866007.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-GRY/SB-LNSH-GRY_image3_1780089872767.jpg"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Grey"],
    rating: 5,
    sku: "SB-LNSH-GRY",
    subcategory: "Shirt",
    sleeve_type: "Half Sleeves"
  },
  {
    id: "prod_4bmljdxan",
    title: "Essential Linen Shirt – Arctic White",
    price: 2000,
    category: "Men",
    material: "Premium Cotton Linen Blend Soft-touch breathable weave Lightweight summer fabric",
    description: "The Stagbeetle Essential Linen Shirt is designed for modern minimalism and effortless comfort. Crafted from lightweight breathable linen-blend fabric, it features a tailored fit, half sleeves, clean front placket, and refined detailing suitable for both casual and smart occasions.\n\nBuilt for Indian summers while maintaining a premium structured silhouette.",
    images: [
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-WHT/SB-LNSH-WHT_image1_1780088998466.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-WHT/SB-LNSH-WHT_image2_1780089008188.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-WHT/SB-LNSH-WHT_image3_1780089013944.jpg"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Arctic White"],
    rating: 5,
    sku: "SB-LNSH-WHT",
    subcategory: "Shirt",
    sleeve_type: "Half Sleeves"
  },
  {
    id: "prod_tlgcahpch",
    title: "Essential Linen Shirt – Sage Mint",
    price: 2000,
    category: "Men",
    material: "Premium Cotton Linen Blend Soft-touch breathable weave Lightweight summer fabric",
    description: "The Stagbeetle Essential Linen Shirt is designed for modern minimalism and effortless comfort. Crafted from lightweight breathable linen-blend fabric, it features a tailored fit, half sleeves, clean front placket, and refined detailing suitable for both casual and smart occasions.\n\nBuilt for Indian summers while maintaining a premium structured silhouette.",
    images: [
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-SGM/SB-LNSH-SGM_image1_1780089339973.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-SGM/SB-LNSH-SGM_image2_1780089334654.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-SGM/SB-LNSH-SGM_image3_1780089351905.jpg"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Sage Mint"],
    rating: 5,
    sku: "SB-LNSH-SGM",
    subcategory: "Shirt",
    sleeve_type: "Half Sleeves"
  },
  {
    id: "prod_rjqwo97qr",
    title: "Essential Linen Shirt – Forest Olive",
    price: 2000,
    category: "Men",
    material: "Premium Cotton Linen Blend Soft-touch breathable weave Lightweight summer fabric",
    description: "The Stagbeetle Essential Linen Shirt is designed for modern minimalism and effortless comfort. Crafted from lightweight breathable linen-blend fabric, it features a tailored fit, half sleeves, clean front placket, and refined detailing suitable for both casual and smart occasions.\n\nBuilt for Indian summers while maintaining a premium structured silhouette.",
    images: [
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-FOL/SB-LNSH-FOL_image1_1780089518124.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-FOL/SB-LNSH-FOL_image2_1780089529662.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-FOL/SB-LNSH-FOL_image3_1780089535441.jpg"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Forest Olive"],
    rating: 5,
    sku: "SB-LNSH-FOL",
    subcategory: "Shirt",
    sleeve_type: "Half Sleeves"
  },
  {
    id: "prod_7fmjzgpb7",
    title: "Essential Linen Shirt – Light Blue",
    price: 2000,
    category: "Men",
    material: "Premium Cotton Linen Blend Soft-touch breathable weave Lightweight summer fabric",
    description: "The Stagbeetle Essential Linen Shirt is designed for modern minimalism and effortless comfort. Crafted from lightweight breathable linen-blend fabric, it features a tailored fit, half sleeves, clean front placket, and refined detailing suitable for both casual and smart occasions.\n\nBuilt for Indian summers while maintaining a premium structured silhouette.",
    images: [
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-LBL/SB-LNSH-LBL_image1_1780090271576.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-LBL/SB-LNSH-LBL_image2_1780090279476.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-LBL/SB-LNSH-LBL_image3_1780090286859.jpg"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Light Blue"],
    rating: 5,
    sku: "SB-LNSH-LBL",
    subcategory: "Shirt",
    sleeve_type: "Half Sleeves"
  },
  {
    id: "prod_tab7ur6ks",
    title: "Essential Linen Shirt – Purple",
    price: 2000,
    category: "Men",
    material: "Premium Cotton Linen Blend Soft-touch breathable weave Lightweight summer fabric",
    description: "The Stagbeetle Essential Linen Shirt is designed for modern minimalism and effortless comfort. Crafted from lightweight breathable linen-blend fabric, it features a tailored fit, half sleeves, clean front placket, and refined detailing suitable for both casual and smart occasions.\n\nBuilt for Indian summers while maintaining a premium structured silhouette.",
    images: [
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-PRL/SB-LNSH-PRL_image1_1780090779850.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-PRL/SB-LNSH-PRL_image2_1780090791851.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-PRL/SB-LNSH-PRL_image3_1780090796628.jpg"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Purple"],
    rating: 5,
    sku: "SB-LNSH-PRL",
    subcategory: "Shirt",
    sleeve_type: "Half Sleeves"
  },
  {
    id: "prod_u6m12m18k",
    title: "Essential Linen Shirt – Blue",
    price: 2000,
    category: "Men",
    material: "Premium Cotton Linen Blend Soft-touch breathable weave Lightweight summer fabric",
    description: "The Stagbeetle Essential Linen Shirt is designed for modern minimalism and effortless comfort. Crafted from lightweight breathable linen-blend fabric, it features a tailored fit, half sleeves, clean front placket, and refined detailing suitable for both casual and smart occasions.\n\nBuilt for Indian summers while maintaining a premium structured silhouette.",
    images: [
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-BLU/SB-LNSH-BLU_image1_1780090954862.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-BLU/SB-LNSH-BLU_image2_1780090961757.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-BLU/SB-LNSH-BLU_image3_1780090968048.jpg"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Blue"],
    rating: 5,
    sku: "SB-LNSH-BLU",
    subcategory: "Shirt",
    sleeve_type: "Half Sleeves"
  },
  {
    id: "prod_diq2vn8lw",
    title: "Essential Linen Shirt – Black",
    price: 2000,
    category: "Men",
    material: "Premium Cotton Linen Blend Soft-touch breathable weave Lightweight summer fabric",
    description: "The Stagbeetle Essential Linen Shirt is designed for modern minimalism and effortless comfort. Crafted from lightweight breathable linen-blend fabric, it features a tailored fit, half sleeves, clean front placket, and refined detailing suitable for both casual and smart occasions.\n\nBuilt for Indian summers while maintaining a premium structured silhouette.",
    images: [
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-BLK/SB-LNSH-BLK_image1_1780091060064.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-BLK/SB-LNSH-BLK_image2_1780091065552.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-BLK/SB-LNSH-BLK_image3_1780091070968.jpg"
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Obsidian Black", "Iridescent Silver", "Beetle Navy"],
    rating: 5,
    sku: "SB-LNSH-BLK",
    subcategory: "Shirt",
    sleeve_type: "Half Sleeves"
  },
  {
    id: "prod_3dnbf87a4",
    title: "Essential Linen Shirt – Navy Blue",
    price: 2000,
    category: "Men",
    material: "Premium Cotton Linen Blend Soft-touch breathable weave Lightweight summer fabric",
    description: "The Stagbeetle Essential Linen Shirt is designed for modern minimalism and effortless comfort. Crafted from lightweight breathable linen-blend fabric, it features a tailored fit, half sleeves, clean front placket, and refined detailing suitable for both casual and smart occasions.\n\nBuilt for Indian summers while maintaining a premium structured silhouette.",
    images: [
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-PRP/SB-LNSH-PRP_image1_1780090073497.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-PRP/SB-LNSH-PRP_image2_1780090084045.jpg",
      "https://lpkasszpjklrmwugeupp.supabase.co/storage/v1/object/public/garment-images/products/SB-LNSH-PRP/SB-LNSH-PRP_image3_1780090090608.jpg"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Navy Blue"],
    rating: 5,
    sku: "SB-LNSH-NBL",
    subcategory: "Shirt",
    sleeve_type: "Half Sleeves"
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
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // GoTrue's default cross-tab lock (the Web Locks API) serializes every
        // getSession() / token-refresh call on a single lock name. On a slow
        // link one in-flight refresh holds that lock for the whole length of
        // its network call — and because supabaseTimeout() only aborts the
        // *caller*, never the underlying lock wait, withOneRetry then stacks
        // further getSession() calls behind the same lock. One slow refresh
        // becomes a pile-up that freezes auth (and, through AuthContext, admin
        // gating) for seconds. Run auth work immediately instead: a cross-tab
        // refresh race is harmless here — last write wins, and every read is
        // independently re-authorized by RLS regardless.
        lock: (_name, _acquireTimeout, fn) => fn(),
      },
    })
  : null;

// 3.5s: long enough for a genuinely slow-but-working query to finish, short
// enough that a dead/hung connection surfaces fast instead of freezing the
// UI. This used to be 8s, which — combined with withOneRetry below — meant a
// single stalled call could block a spinner for ~16s. Callers that need a
// longer budget (uploads, bulk writes) pass an explicit `ms`.
export const supabaseTimeout = (promise: any, ms = 3500): Promise<any> => {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Query timeout')), ms))
  ]);
};

// Retries a flaky/slow request once after a short pause before giving up —
// smooths over a single dropped packet or momentary network blip instead of
// immediately falling back to stale/demo data on the first hiccup. Exported
// so auth (AuthContext) gets the same resilience as the product catalog
// instead of a separately-maintained, easier-to-forget-about timeout.
export const withOneRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    await new Promise(res => setTimeout(res, 300));
    return fn();
  }
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

// In-memory cache for the product catalog — avoids re-fetching from Supabase on
// every StorefrontContent mount (e.g. home -> product -> home again within the
// same tab/session). Cleared automatically by any product write (add/update/
// delete/bulk-upload) so edits show up immediately instead of waiting out the TTL.
let productsCache: { data: Product[]; expiresAt: number } | null = null;
const PRODUCTS_CACHE_TTL_MS = 60_000;

// Tracks a fetch that's already in flight. Without this, several callers
// landing before the first one finishes (CartContext's suggestions effect
// alone fires 2-3x on a single page load, on every page, for every
// visitor — see AGENTS notes) each see productsCache as empty and each
// kick off their own independent Supabase query, turning one page load
// into a burst of duplicate network calls. Concurrent callers now share
// this one promise instead of racing separate requests.
let productsFetchInFlight: Promise<Product[]> | null = null;

// Per-product cache, keyed by id, for getProductById — the garment/product
// detail page (a server component) awaits this before rendering anything, and
// until now it had zero caching: every single page view/navigation paid for a
// full Supabase round trip (plus an 8s timeout + one retry on a slow/dropped
// connection), even when the full catalog was already cached a moment
// earlier. Same TTL/invalidation story as productsCache above. On Vercel this
// also survives across requests within a warm Fluid Compute instance, not
// just within one visitor's tab.
const productByIdCache = new Map<string, { data: Product; expiresAt: number }>();

const invalidateProductsCache = () => { productsCache = null; productByIdCache.clear(); };

// Persisted across page reloads — unlike productsCache above (in-memory,
// reset on every hard refresh), this survives one. Read once per session,
// on the very first getProducts() call, so a refresh can paint the last
// known catalog instantly instead of showing a spinner for however long a
// fresh Supabase round trip takes (or times out).
const PRODUCTS_LOCALSTORAGE_KEY = 'stag_beetle_products_cache';
// Deliberately short — just long enough to cover the burst of near-
// simultaneous callers a fresh page load produces (CartContext's
// suggestions effect + this page's own product list, all within one tick),
// so every one of them paints the same persisted snapshot immediately. Not
// a source of truth for freshness; the real fetch kicked off alongside it
// supersedes this the moment it lands.
const PRODUCTS_PERSISTED_GRACE_MS = 3_000;

const readPersistedProductsCache = (): Product[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PRODUCTS_LOCALSTORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: Product[] };
    return Array.isArray(parsed.data) ? parsed.data : null;
  } catch {
    return null;
  }
};

const persistProductsCache = (data: Product[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRODUCTS_LOCALSTORAGE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // Storage full/unavailable (private browsing, quota, etc.) — non-critical, just skip persisting.
  }
};

// Keep the catalog caches warm across a write instead of nuking them. After a
// successful add/update we already hold the authoritative saved row, so fold it
// straight into the in-memory list + per-id caches (and the persisted snapshot)
// rather than forcing the very next getProducts() — which the admin fires the
// instant a save returns — into a full cross-region refetch. A no-op on the
// list cache when it isn't populated yet (nothing to fold into); the next fetch
// builds it fresh.
const foldProductIntoCache = (p: Product) => {
  const expiresAt = Date.now() + PRODUCTS_CACHE_TTL_MS;
  if (productsCache) {
    const i = productsCache.data.findIndex(x => x.id === p.id);
    productsCache.data = i >= 0
      ? productsCache.data.map(x => (x.id === p.id ? p : x))
      : [...productsCache.data, p];
    productsCache.expiresAt = expiresAt;
    persistProductsCache(productsCache.data);
  }
  productByIdCache.set(p.id, { data: p, expiresAt });
};

const dropProductFromCache = (id: string) => {
  if (productsCache) {
    productsCache.data = productsCache.data.filter(x => x.id !== id);
    persistProductsCache(productsCache.data);
  }
  productByIdCache.delete(id);
};

// =========================================================================
// REALTIME PRODUCT CHANGE NOTIFICATIONS
// Uses Supabase Realtime's Broadcast channel — already part of
// @supabase/supabase-js, no new dependency — to push a "something changed"
// ping to every open tab the instant a product is written. Cheaper than
// polling (nothing sent unless a write actually happens) and simpler than
// Postgres Changes/CDC (no replication to configure on the table). It's a
// best-effort nudge, not a correctness guarantee: the 60s cache TTL above is
// the fallback if a tab misses the broadcast (e.g. reconnecting).
// =========================================================================

const PRODUCTS_CHANNEL_NAME = 'products-catalog';
const PRODUCTS_CHANGED_EVENT = 'products-changed';

type RealtimeChannel = ReturnType<NonNullable<typeof supabase>['channel']>;
let productsChannel: RealtimeChannel | null = null;
const productChangeListeners = new Set<() => void>();

const ensureProductsChannel = (): RealtimeChannel | null => {
  if (!isSupabaseConfigured || !supabase) return null;
  if (!productsChannel) {
    productsChannel = supabase
      .channel(PRODUCTS_CHANNEL_NAME)
      .on('broadcast', { event: PRODUCTS_CHANGED_EVENT }, () => {
        invalidateProductsCache();
        productChangeListeners.forEach(fn => fn());
      })
      .subscribe();
  }
  return productsChannel;
};

const broadcastProductsChanged = () => {
  const channel = ensureProductsChannel();
  channel?.send({ type: 'broadcast', event: PRODUCTS_CHANGED_EVENT, payload: {} }).catch(() => {});
};

// Subscribe to live product catalog changes from other tabs/admins — e.g. the
// storefront refreshing its grid the moment an admin edits a price elsewhere.
// Returns an unsubscribe function; safe to call from multiple components.
export const subscribeToProductChanges = (onChange: () => void): (() => void) => {
  if (!isSupabaseConfigured || !supabase) return () => {};
  ensureProductsChannel();
  productChangeListeners.add(onChange);
  return () => { productChangeListeners.delete(onChange); };
};

// =========================================================================
// PLUS-SIZE CONFIGURATION — admin-editable (which sizes carry a surcharge),
// live-synced across tabs the same way the product catalog is.
// =========================================================================

const PLUS_SIZES_CHANNEL_NAME = 'plus-sizes-config';
const PLUS_SIZES_CHANGED_EVENT = 'plus-sizes-changed';
let plusSizesChannel: RealtimeChannel | null = null;
const plusSizesChangeListeners = new Set<() => void>();

const loadPlusSizesFromServer = async (): Promise<string[]> => {
  if (!isSupabaseConfigured || !supabase) return Array.from(plusSizesSet);
  try {
    const { data } = await withOneRetry(() =>
      supabaseTimeout(
        supabase.from('app_settings').select('value').eq('key', 'plus_sizes').maybeSingle()
      )
    );
    if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
      plusSizesSet = new Set(data.value as string[]);
    }
  } catch (e: any) {
    // Already safe on failure — plusSizesSet only ever gets overwritten
    // above, on a confirmed successful response, never here. A timeout just
    // means this client keeps whatever it already had (its built-in
    // defaults, or the last successfully-synced value).
    console.warn('[Atelier DB] Failed to load plus-size config, keeping current defaults:', e.message || e);
  }
  return Array.from(plusSizesSet);
};

const ensurePlusSizesChannel = (): RealtimeChannel | null => {
  if (!isSupabaseConfigured || !supabase) return null;
  if (!plusSizesChannel) {
    plusSizesChannel = supabase
      .channel(PLUS_SIZES_CHANNEL_NAME)
      .on('broadcast', { event: PLUS_SIZES_CHANGED_EVENT }, () => {
        loadPlusSizesFromServer().then(() => {
          plusSizesChangeListeners.forEach(fn => fn());
        });
      })
      .subscribe();
  }
  return plusSizesChannel;
};

const broadcastPlusSizesChanged = () => {
  const channel = ensurePlusSizesChannel();
  channel?.send({ type: 'broadcast', event: PLUS_SIZES_CHANGED_EVENT, payload: {} }).catch(() => {});
};

// Fetches the current plus-size list and refreshes the shared cache that
// isPlusSize()/getEffectivePrice() read synchronously. Call this once on
// mount anywhere that displays or edits plus-size-dependent UI.
export const getPlusSizesConfig = loadPlusSizesFromServer;

// Admin-only: persists a new plus-size list and notifies every open tab immediately.
export const setPlusSizesConfig = async (sizes: string[]): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert([{ key: 'plus_sizes', value: sizes, updated_at: new Date().toISOString() }], { onConflict: 'key' });
    if (error) {
      console.warn('[Atelier DB] setPlusSizesConfig failed:', error.message);
      return false;
    }
    plusSizesSet = new Set(sizes);
    broadcastPlusSizesChanged();
    return true;
  } catch (e: any) {
    console.warn('[Atelier DB] setPlusSizesConfig failed:', e.message || e);
    return false;
  }
};

// Subscribe to live plus-size config changes (e.g. an admin edited the list
// in another tab). Returns an unsubscribe function.
export const subscribeToPlusSizesChanges = (onChange: () => void): (() => void) => {
  if (!isSupabaseConfigured || !supabase) return () => {};
  ensurePlusSizesChannel();
  plusSizesChangeListeners.add(onChange);
  return () => { plusSizesChangeListeners.delete(onChange); };
};

// Whether this tab has ever completed (attempted) a real Supabase fetch this
// session. Deliberately separate from productsCache: that gets nulled out by
// every write (add/update/delete/bulk), not just on a fresh page load, so
// `!productsCache` alone can't tell "first load ever" apart from "cache was
// just invalidated by my own write a moment ago". Only the former should get
// the instant-paint-from-localStorage treatment below — otherwise saving a
// product and immediately re-listing it serves back the pre-save snapshot.
let hasAttemptedFreshFetch = false;

// The actual network fetch, with in-flight de-duplication. Split out so it
// can be awaited directly (normal path) or fired-and-forgotten in the
// background (after an instant persisted-cache paint, below) while sharing
// identical caching/dedup/error-handling logic either way.
const fetchAndCacheProducts = (): Promise<Product[]> => {
  if (productsFetchInFlight) {
    console.log("[Atelier DB] Fetch already in flight — reusing it instead of firing a duplicate request.");
    return productsFetchInFlight;
  }

  hasAttemptedFreshFetch = true;
  const fetchPromise = (async (): Promise<Product[]> => {
    try {
      console.log("[Atelier DB] Fetching products from Supabase...");
      // No withOneRetry here: this is the storefront's first-paint read, the
      // single hottest path in the app. A retry on top of the timeout just
      // doubles worst-case wait (spinner up to ~16s before). One attempt,
      // bounded by supabaseTimeout; the persisted-cache paint + 60s TTL +
      // realtime nudge already cover a transient miss.
      const { data, error } = await supabaseTimeout(supabase!.from('products').select('*'));
      if (error) throw error;
      console.log(`[Atelier DB] Successfully loaded products from Supabase (count: ${data.length}).`);
      productsCache = { data: data as Product[], expiresAt: Date.now() + PRODUCTS_CACHE_TTL_MS };
      persistProductsCache(productsCache.data);
      return productsCache.data;
    } catch (e: any) {
      console.warn("[Atelier DB] Supabase products failed or timed out:", e.message || e);
      // A real catalog was loaded before (even if its TTL has since expired) —
      // showing that stale-but-real data beats swapping in unrelated demo
      // products whose images live on the very host that just failed.
      if (productsCache) {
        console.warn("[Atelier DB] Serving last known-good product list while the connection recovers.");
        return productsCache.data;
      }
      throw new Error("We couldn't load the product catalog. Please check your connection and try again.");
    } finally {
      // Cleared whether this succeeded or failed, so the *next* call (after
      // this one has actually settled) is free to try again rather than
      // being stuck replaying a stale result.
      productsFetchInFlight = null;
    }
  })();

  productsFetchInFlight = fetchPromise;
  return fetchPromise;
};

export const getProducts = async (): Promise<Product[]> => {
  if (productsCache && productsCache.expiresAt > Date.now()) {
    return productsCache.data;
  }

  // Not configured at all (no env vars, e.g. local dev without Supabase) —
  // the local/demo catalog is the intended experience, not a failure.
  if (!isSupabaseConfigured || !supabase) {
    console.log("[Atelier DB] Supabase not configured, returning local mock products.");
    return getLocalProducts();
  }

  // First call this session — nothing in memory yet and no real fetch has
  // been attempted. If a previous visit left a catalog persisted in
  // localStorage, paint it instantly (for every caller in the next few
  // seconds — see PRODUCTS_PERSISTED_GRACE_MS) and kick off a real fetch in
  // the background to confirm/replace it. A hard refresh no longer means a
  // spinner for however long Supabase takes (or times out) to respond — it
  // means showing what was there a moment ago while quietly checking for
  // changes. Gated on hasAttemptedFreshFetch (not just !productsCache) so
  // this only ever applies to that genuine first load — a write later in the
  // same session invalidates productsCache too, but must never fall back to
  // this now-stale snapshot; it needs the real, current data.
  if (!productsCache && !hasAttemptedFreshFetch) {
    const persisted = readPersistedProductsCache();
    if (persisted) {
      console.log(`[Atelier DB] Painting instantly from persisted cache (count: ${persisted.length}) while refreshing in the background.`);
      productsCache = { data: persisted, expiresAt: Date.now() + PRODUCTS_PERSISTED_GRACE_MS };
      fetchAndCacheProducts().catch(() => {}); // background refresh; errors already logged inside
      return persisted;
    }
  }

  return fetchAndCacheProducts();
};

export const getProductById = async (id: string): Promise<Product | null> => {
  // Already have the full catalog fresh in memory (e.g. this same page load
  // fetched it a moment ago, or a warm serverless instance served an earlier
  // request) — reuse it instead of paying for a second Supabase round trip
  // for a single row of the same table.
  if (productsCache && productsCache.expiresAt > Date.now()) {
    const cached = productsCache.data.find(p => p.id === id);
    if (cached) return cached;
  }

  const cachedById = productByIdCache.get(id);
  if (cachedById && cachedById.expiresAt > Date.now()) {
    return cachedById.data;
  }

  if (!isSupabaseConfigured || !supabase) {
    return getLocalProducts().find(p => p.id === id) || null;
  }

  try {
    console.log(`[Atelier DB] Fetching product ${id} from Supabase...`);
    // Single attempt (no withOneRetry): the product detail page's server
    // render awaits this before returning any HTML, so a doubled timeout
    // budget here directly becomes TTFB. The per-id + full-catalog caches
    // above absorb transient misses on the next hit.
    const { data, error } = await supabaseTimeout(
      supabase.from('products').select('*').eq('id', id).single()
    );
    if (error) {
      // PGRST116 = "no rows returned" — a legitimate answer (the product
      // genuinely doesn't exist), not a connection problem.
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    productByIdCache.set(id, { data: data as Product, expiresAt: Date.now() + PRODUCTS_CACHE_TTL_MS });
    return data as Product;
  } catch (e: any) {
    console.warn(`[Atelier DB] Supabase getProductById failed or timed out for ${id}:`, e.message || e);
    // Fall back to whatever cached data we have (avoids a false "not found"
    // for a product we already know exists), otherwise this is a real
    // connection failure the caller needs to know about — not a 404.
    if (productsCache) {
      const cached = productsCache.data.find(p => p.id === id);
      if (cached) return cached;
    }
    if (cachedById) return cachedById.data; // stale-but-real beats erroring, same policy as elsewhere in this file
    throw new Error("We couldn't load this product right now. Please check your connection and try again.");
  }
};

// Products with the same style code (different colours of the same physical
// cut — see getSkuBase, which strips the trailing colour segment) always
// share one size chart: a chest/waist measurement doesn't change by colour.
// Whenever a product is saved with a chart, every sibling colour is updated
// to match automatically — edit or add it on any one variant, the rest pick
// it up without the admin touching them. Deliberately never propagates a
// *cleared* chart (undefined): that would risk wiping a sibling's real data
// via something as unrelated as a plain price edit, or a bulk upload row
// that simply didn't carry a chart column.
async function syncSizeChartAcrossStyle(sku: string | undefined, chart: SizeChart | undefined, excludeId: string): Promise<void> {
  if (!chart || !supabase) return;
  const styleCode = getSkuBase(sku);
  if (!styleCode) return;
  try {
    const { error } = await supabase
      .from('products')
      .update({ size_chart: chart })
      .ilike('sku', `${styleCode}-%`)
      .neq('id', excludeId);
    if (error) {
      console.warn('[Atelier DB] Failed to sync size chart across style variants:', error.message);
      return;
    }
    invalidateProductsCache();
    broadcastProductsChanged();
  } catch (e) {
    console.warn('[Atelier DB] syncSizeChartAcrossStyle failed:', e);
  }
}

export const addProduct = async (product: Omit<Product, 'id'>): Promise<Product> => {
  const newProduct: Product = {
    ...product,
    id: `prod_${Math.random().toString(36).substr(2, 9)}`,
    rating: 5.0
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('products').insert([newProduct]).select().single();
      if (!error && data) {
        await ensureVariantsForProduct(data.id, data.sku, data.sizes || []);
        // syncSizeChartAcrossStyle invalidates the cache itself only when it
        // actually rewrites sibling rows — let it, then fold our own saved row
        // back in so the admin's immediate re-list stays a cache hit.
        await syncSizeChartAcrossStyle(data.sku, data.size_chart, data.id);
        foldProductIntoCache(data as Product);
        broadcastProductsChanged(); // after the write commits, so other tabs refetch real data
        return data as Product;
      }
    } catch (e) {
      console.warn("Supabase addProduct failed, falling back to mock:", e);
    }
  }

  invalidateProductsCache();
  broadcastProductsChanged();
  const products = getLocalProducts();
  products.push(newProduct);
  setLocalProducts(products);
  return newProduct;
};
export const updateProduct = async (id: string, updatedFields: Partial<Product>): Promise<Product | null> => {
  let finalFields = { ...updatedFields };

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Fetch current product to check if SKU is changing
      const { data: existingProduct, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (!fetchError && existingProduct) {
        const oldSku = existingProduct.sku;
        const newSku = updatedFields.sku;
        const imagesToProcess = updatedFields.images || existingProduct.images || [];

        if (newSku && oldSku && newSku.trim() !== oldSku.trim() && imagesToProcess.length > 0) {
          const cleanOldSku = oldSku.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
          const cleanNewSku = newSku.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
          
          console.log(`[Atelier SKU Sync] SKU changed from '${cleanOldSku}' to '${cleanNewSku}'. Moving files...`);
          
          const newImages: string[] = [];
          for (const url of imagesToProcess) {
            if (!url) continue;

            const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/garment-images\/(.+)$/);
            if (match && match[1]) {
              const oldFilePath = match[1].split('?')[0]; // products/OLD_SKU/filename.jpg
              
              // Only move if the path indeed belongs to the old SKU folder
              if (oldFilePath.includes(`products/${cleanOldSku}/`) || oldFilePath.includes(`/${cleanOldSku}_`)) {
                const oldFileName = oldFilePath.split('/').pop() || '';
                const newFileName = oldFileName.replace(cleanOldSku, cleanNewSku);
                const newFilePath = `products/${cleanNewSku}/${newFileName}`;

                try {
                  console.log(`[Atelier SKU Sync] Moving storage file: ${oldFilePath} -> ${newFilePath}`);
                  const { error: moveError } = await supabase.storage
                    .from('garment-images')
                    .move(oldFilePath, newFilePath);

                  if (!moveError) {
                    const { data: urlData } = supabase.storage
                      .from('garment-images')
                      .getPublicUrl(newFilePath);
                    newImages.push(urlData.publicUrl);
                  } else {
                    console.warn(`[Atelier SKU Sync] Move failed:`, moveError.message);
                    newImages.push(url);
                  }
                } catch (err) {
                  console.warn(`[Atelier SKU Sync] Error moving file:`, err);
                  newImages.push(url);
                }
              } else {
                newImages.push(url);
              }
            } else {
              newImages.push(url);
            }
          }

          if (newImages.length > 0) {
            finalFields.images = newImages;
          }
        }
      }
    } catch (e) {
      console.warn(`[Atelier DB] Pre-update SKU check failed:`, e);
    }

    try {
      const { data, error } = await supabase.from('products').update(finalFields).eq('id', id).select().single();
      if (!error && data) {
        await ensureVariantsForProduct(data.id, data.sku, data.sizes || []);
        await syncSizeChartAcrossStyle(data.sku, data.size_chart, data.id);
        foldProductIntoCache(data as Product);
        broadcastProductsChanged(); // after the write commits, so other tabs refetch real data
        return data as Product;
      }
      if (error) console.warn("Supabase updateProduct returned error:", error.message);
    } catch (e) {
      console.warn(`Supabase updateProduct failed for id ${id}, falling back to mock:`, e);
    }
  }

  invalidateProductsCache();
  broadcastProductsChanged();
  const products = getLocalProducts();
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return null;

  const updatedProduct = { ...products[index], ...finalFields };
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
      if (!error) {
        dropProductFromCache(id);
        broadcastProductsChanged(); // after the write commits, so other tabs refetch real data
        return true;
      }
    } catch (e) {
      console.warn(`Supabase deleteProduct failed for id ${id}, falling back to mock:`, e);
    }
  }

  invalidateProductsCache();
  broadcastProductsChanged();
  const products = getLocalProducts();
  const filtered = products.filter(p => p.id !== id);
  if (products.length === filtered.length) return false;

  setLocalProducts(filtered);
  return true;
};

export const deleteStorageImage = async (url: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase || !url) return false;
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/garment-images\/(.+)$/);
  if (match && match[1]) {
    const path = match[1].split('?')[0];
    try {
      console.log(`[Atelier Storage] Removing image from Supabase storage:`, path);
      const { error } = await supabase.storage.from('garment-images').remove([path]);
      if (!error) return true;
      console.warn("[Atelier Storage] Failed to delete image:", error.message);
    } catch (e) {
      console.warn("[Atelier Storage] Error deleting image:", e);
    }
  }
  return false;
};

export const bulkUploadProducts = async (newProducts: Omit<Product, 'id'>[]): Promise<Product[]> => {
  invalidateProductsCache();
  broadcastProductsChanged();
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
// INVENTORY OPERATIONS
//
// product_variants turns each size of a product into an addressable,
// stockable unit (SKU convention: STYLE-COLOR-SIZE). inventory holds the
// current count for that unit. Source of truth is the external POS
// (Galla) once /api/inventory/sync is wired up to it; sync_source stays
// 'manual_admin' until then. A variant with no inventory row at all is
// treated as "not yet tracked" — purchasable, not sold out — so a
// product never silently breaks just because its stock hasn't been
// synced yet.
// =========================================================================

const INVENTORY_CHANNEL_NAME = 'inventory-stock';
const INVENTORY_CHANGED_EVENT = 'inventory-changed';

let inventoryChannel: RealtimeChannel | null = null;
const inventoryChangeListeners = new Set<() => void>();

const ensureInventoryChannel = (): RealtimeChannel | null => {
  if (!isSupabaseConfigured || !supabase) return null;
  if (!inventoryChannel) {
    inventoryChannel = supabase
      .channel(INVENTORY_CHANNEL_NAME)
      .on('broadcast', { event: INVENTORY_CHANGED_EVENT }, () => {
        inventoryChangeListeners.forEach(fn => fn());
      })
      .subscribe();
  }
  return inventoryChannel;
};

const broadcastInventoryChanged = () => {
  const channel = ensureInventoryChannel();
  channel?.send({ type: 'broadcast', event: INVENTORY_CHANGED_EVENT, payload: {} }).catch(() => {});
};

// Subscribe to live stock changes — e.g. a product page flips a size to "Out
// of Stock" the moment someone else buys the last one. Returns an unsubscribe function.
export const subscribeToInventoryChanges = (onChange: () => void): (() => void) => {
  if (!isSupabaseConfigured || !supabase) return () => {};
  ensureInventoryChannel();
  inventoryChangeListeners.add(onChange);
  return () => { inventoryChangeListeners.delete(onChange); };
};

const toInventoryRecord = (variant: { id: string; sku: string; size: string; galla_sku?: string | null }, inv?: {
  quantity_on_hand: number; quantity_reserved: number; low_stock_threshold: number;
  sync_source: string; last_synced_at: string | null;
} | null): InventoryRecord => ({
  variant_id: variant.id,
  sku: variant.sku,
  size: variant.size,
  galla_sku: variant.galla_sku ?? null,
  quantity_on_hand: inv?.quantity_on_hand ?? 0,
  quantity_reserved: inv?.quantity_reserved ?? 0,
  quantity_available: inv ? Math.max(0, inv.quantity_on_hand - inv.quantity_reserved) : Infinity, // untracked = don't block a sale
  low_stock_threshold: inv?.low_stock_threshold ?? 3,
  sync_source: (inv?.sync_source as InventoryRecord['sync_source']) ?? 'manual_admin',
  last_synced_at: inv?.last_synced_at ?? null,
});

// In-flight de-dup keyed by product id — the product detail page's mount
// effect and its live-stock realtime subscription can both call this within
// the same tick (plus React StrictMode's double-invoke in dev), which used to
// mean two independent variants+inventory round trips for the same product.
// Deliberately not a TTL cache: stock needs to stay live-accurate, so nothing
// here serves data older than the request that's actually in flight.
const inventoryFetchInFlight = new Map<string, Promise<InventoryRecord[]>>();

export const getInventoryForProduct = async (productId: string): Promise<InventoryRecord[]> => {
  if (!isSupabaseConfigured || !supabase) return [];

  const existing = inventoryFetchInFlight.get(productId);
  if (existing) return existing;

  const fetchPromise = (async (): Promise<InventoryRecord[]> => {
    try {
      const { data: variants, error: vErr } = await supabaseTimeout(
        supabase.from('product_variants').select('id,sku,size,galla_sku').eq('product_id', productId)
      );
      if (vErr || !variants || variants.length === 0) return [];

      const variantIds = variants.map((v: any) => v.id);
      const { data: invRows } = await supabaseTimeout(
        supabase.from('inventory').select('*').in('variant_id', variantIds)
      );
      const invByVariant = new Map((invRows || []).map((r: any) => [r.variant_id, r]));

      return variants.map((v: any) => toInventoryRecord(v, invByVariant.get(v.id) as any));
    } catch (e: any) {
      console.warn('[Atelier DB] getInventoryForProduct failed:', e.message || e);
      return [];
    } finally {
      inventoryFetchInFlight.delete(productId);
    }
  })();

  inventoryFetchInFlight.set(productId, fetchPromise);
  return fetchPromise;
};

export interface ProductStockSummary {
  totalAvailable: number;
  trackedSizes: number;
  outOfStockSizes: number;
  lowStockSizes: number;
}

// One bulk fetch for the whole catalog rather than one query per product —
// keeps the admin table's stock column cheap even at a few thousand SKUs.
// If this ever needs to scale further (tens of thousands of variants), page
// it the same way the products table itself now does.
// Same reasoning as coupons/orders above: on a timeout this used to return
// {} (empty), which every caller reads as "0 stock everywhere" — an admin
// could see every product flagged out-of-stock purely because of a network
// blip. Stale-but-real numbers beat that.
let inventorySummaryCache: Record<string, ProductStockSummary> | null = null;

export const getInventorySummaryForProducts = async (): Promise<Record<string, ProductStockSummary>> => {
  if (!isSupabaseConfigured || !supabase) return {};
  try {
    const { data: variants } = await withOneRetry(() => supabaseTimeout(
      supabase.from('product_variants').select('id,product_id')
    ));
    if (!variants || variants.length === 0) return {};

    const { data: invRows } = await withOneRetry(() => supabaseTimeout(
      supabase.from('inventory').select('variant_id,quantity_on_hand,quantity_reserved,low_stock_threshold')
    ));
    const invByVariant = new Map<string, { quantity_on_hand: number; quantity_reserved: number; low_stock_threshold: number }>(
      (invRows || []).map((r: any) => [r.variant_id, r])
    );

    const summary: Record<string, ProductStockSummary> = {};
    for (const v of variants as any[]) {
      const inv = invByVariant.get(v.id);
      if (!summary[v.product_id]) {
        summary[v.product_id] = { totalAvailable: 0, trackedSizes: 0, outOfStockSizes: 0, lowStockSizes: 0 };
      }
      if (!inv) continue; // untracked size — doesn't count toward tracked totals
      const available = Math.max(0, inv.quantity_on_hand - inv.quantity_reserved);
      summary[v.product_id].totalAvailable += available;
      summary[v.product_id].trackedSizes += 1;
      if (available === 0) summary[v.product_id].outOfStockSizes += 1;
      else if (available <= inv.low_stock_threshold) summary[v.product_id].lowStockSizes += 1;
    }
    inventorySummaryCache = summary;
    return summary;
  } catch (e: any) {
    console.warn('[Atelier DB] getInventorySummaryForProducts failed:', e.message || e);
    if (inventorySummaryCache) {
      console.warn('[Atelier DB] Serving last known-good inventory summary while the connection recovers.');
      return inventorySummaryCache;
    }
    return {};
  }
};

export const getInventoryBySku = async (sku: string): Promise<InventoryRecord | null> => {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data: variant, error: vErr } = await supabaseTimeout(
      supabase.from('product_variants').select('id,sku,size,galla_sku').eq('sku', sku).maybeSingle()
    );
    if (vErr || !variant) return null;

    const { data: inv } = await supabaseTimeout(
      supabase.from('inventory').select('*').eq('variant_id', variant.id).maybeSingle()
    );
    return toInventoryRecord(variant, inv as any);
  } catch (e: any) {
    console.warn(`[Atelier DB] getInventoryBySku failed for ${sku}:`, e.message || e);
    return null;
  }
};

// Creates any missing size-variants for a product (e.g. a new size was added
// in the admin form). Never touches an existing variant's stock — only fills gaps.
export const ensureVariantsForProduct = async (productId: string, sku: string | undefined, sizes: string[]): Promise<void> => {
  if (!isSupabaseConfigured || !supabase || !sku?.trim()) return;
  const cleanSizes = sizes.filter(s => s && s !== 'One Size');
  if (cleanSizes.length === 0) return;

  try {
    const rows = cleanSizes.map(size => ({
      product_id: productId,
      sku: `${sku.trim().toUpperCase()}-${size.trim().toUpperCase()}`,
      size,
    }));
    await supabase.from('product_variants').upsert(rows, { onConflict: 'product_id,size', ignoreDuplicates: true });
  } catch (e: any) {
    console.warn(`[Atelier DB] ensureVariantsForProduct failed for ${sku}:`, e.message || e);
  }
};

// Admin manual stock entry/correction — the fallback before (and alongside) Galla sync.
export const setInventoryManual = async (productId: string, sku: string, size: string, quantity: number): Promise<InventoryRecord | null> => {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const variantSku = `${sku.trim().toUpperCase()}-${size.trim().toUpperCase()}`;
    const { data: variant, error: vErr } = await supabase
      .from('product_variants')
      .upsert([{ product_id: productId, sku: variantSku, size }], { onConflict: 'product_id,size' })
      .select('id,sku,size,galla_sku')
      .single();
    if (vErr || !variant) {
      console.warn('[Atelier DB] setInventoryManual variant upsert failed:', vErr?.message);
      return null;
    }

    const { data: inv, error: iErr } = await supabase
      .from('inventory')
      .upsert(
        [{ variant_id: variant.id, quantity_on_hand: Math.max(0, quantity), sync_source: 'manual_admin', last_synced_at: new Date().toISOString() }],
        { onConflict: 'variant_id' }
      )
      .select('*')
      .single();
    if (iErr) {
      console.warn('[Atelier DB] setInventoryManual inventory upsert failed:', iErr.message);
      return null;
    }

    broadcastInventoryChanged();
    return toInventoryRecord(variant, inv as any);
  } catch (e: any) {
    console.warn('[Atelier DB] setInventoryManual failed:', e.message || e);
    return null;
  }
};

// Records Galla's own numeric product code for one size of one product —
// their SKU scheme, not ours (see migration 20260812000000). Outbound order
// sync (notifyGallaOfSale) looks this up per line item and skips any size
// that has no mapping set, rather than sending our own SKU format, which
// Galla's catalog wouldn't recognize.
export const setGallaSkuForVariant = async (productId: string, sku: string, size: string, gallaSku: string): Promise<InventoryRecord | null> => {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const variantSku = `${sku.trim().toUpperCase()}-${size.trim().toUpperCase()}`;
    const { data: variant, error: vErr } = await supabase
      .from('product_variants')
      .upsert([{ product_id: productId, sku: variantSku, size, galla_sku: gallaSku.trim() || null }], { onConflict: 'product_id,size' })
      .select('id,sku,size,galla_sku')
      .single();
    if (vErr || !variant) {
      console.warn('[Atelier DB] setGallaSkuForVariant variant upsert failed:', vErr?.message);
      return null;
    }

    const { data: inv } = await supabase.from('inventory').select('*').eq('variant_id', variant.id).maybeSingle();
    return toInventoryRecord(variant, inv as any);
  } catch (e: any) {
    console.warn('[Atelier DB] setGallaSkuForVariant failed:', e.message || e);
    return null;
  }
};

// Atomically decrements stock for each purchased line item — via a Postgres
// function (see migration 20260802000100), not a JS read-then-write, so two
// simultaneous checkouts for the last unit can't both "succeed" client-side.
// Untracked variants (no inventory row) are treated as always-available and
// always report success, matching the "don't block a sale we have no data
// on" policy used everywhere else in this module.
export const decrementInventoryForOrder = async (
  items: { product_id: string; selected_size: string; quantity: number }[]
): Promise<{ product_id: string; selected_size: string; sku: string | null; galla_sku: string | null; success: boolean }[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return items.map(i => ({ product_id: i.product_id, selected_size: i.selected_size, sku: null, galla_sku: null, success: true }));
  }

  const results: { product_id: string; selected_size: string; sku: string | null; galla_sku: string | null; success: boolean }[] = [];

  for (const item of items) {
    try {
      const { data: variant } = await supabase
        .from('product_variants')
        .select('id,sku,galla_sku')
        .eq('product_id', item.product_id)
        .eq('size', item.selected_size)
        .maybeSingle();

      if (!variant) {
        // Not tracked — allow the sale, nothing to decrement.
        results.push({ product_id: item.product_id, selected_size: item.selected_size, sku: null, galla_sku: null, success: true });
        continue;
      }

      const { data: applied, error } = await supabase.rpc('decrement_inventory_on_hand', {
        p_variant_id: variant.id,
        p_qty: item.quantity,
      });

      await supabase.from('inventory_sync_log').insert([{
        direction: 'outbound',
        variant_sku: variant.sku,
        payload: { reason: 'order_deduction', quantity: item.quantity },
        status: error ? 'failed' : applied ? 'applied' : 'failed',
        error_message: error?.message || (!applied ? 'insufficient stock at time of decrement' : null),
      }]);

      results.push({ product_id: item.product_id, selected_size: item.selected_size, sku: variant.sku, galla_sku: variant.galla_sku, success: !error && !!applied });
    } catch (e: any) {
      console.warn(`[Atelier DB] decrementInventoryForOrder failed for ${item.product_id}/${item.selected_size}:`, e.message || e);
      results.push({ product_id: item.product_id, selected_size: item.selected_size, sku: null, galla_sku: null, success: false });
    }
  }

  broadcastInventoryChanged();
  return results;
};

// Read-only pre-payment check — surfaces an "out of stock" error before
// charging the customer, rather than after. Best-effort: on any lookup
// failure it fails open (assumes available) so a transient DB hiccup never
// blocks a sale outright; the atomic decrement after payment is still the
// real backstop against overselling.
export const checkStockForOrderItems = async (
  items: { product_id: string; title: string; selected_size: string; quantity: number }[]
): Promise<{ product_id: string; title: string; selected_size: string; available: boolean }[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return items.map(i => ({ product_id: i.product_id, title: i.title, selected_size: i.selected_size, available: true }));
  }

  const results: { product_id: string; title: string; selected_size: string; available: boolean }[] = [];
  for (const item of items) {
    try {
      const { data: variant } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', item.product_id)
        .eq('size', item.selected_size)
        .maybeSingle();

      if (!variant) {
        results.push({ ...item, available: true }); // untracked — don't block
        continue;
      }

      const { data: inv } = await supabase
        .from('inventory')
        .select('quantity_on_hand,quantity_reserved')
        .eq('variant_id', variant.id)
        .maybeSingle();

      const available = !inv || (inv.quantity_on_hand - inv.quantity_reserved) >= item.quantity;
      results.push({ ...item, available });
    } catch {
      results.push({ ...item, available: true }); // fail open
    }
  }
  return results;
};

export interface InboundInventoryEvent {
  external_event_id: string;
  sku: string; // variant SKU, e.g. SATN-CRM-M
  quantity_on_hand: number;
  occurred_at: string; // ISO timestamp
  location_code?: string; // accepted and logged, not yet used to split stock by location
}

export type InboundSyncStatus = 'applied' | 'skipped_duplicate' | 'skipped_stale' | 'sku_not_found' | 'failed';

// Applies a batch of inbound stock events (e.g. from Galla). Called by
// /api/inventory/sync after signature verification. Idempotent: a replayed
// external_event_id is a no-op. Out-of-order deliveries are handled by
// rejecting any event older than what's already stored for that SKU.
//
// dryRun: validates and reports what WOULD happen (unknown SKU, stale,
// duplicate, or applied) without writing to inventory or the sync log — lets
// an integration partner test their payload shape against real data before
// they're trusted to actually move stock.
export const applyInboundInventorySync = async (
  events: InboundInventoryEvent[],
  dryRun = false
): Promise<{ external_event_id: string; status: InboundSyncStatus }[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return events.map(e => ({ external_event_id: e.external_event_id, status: 'failed' as const }));
  }

  const results: { external_event_id: string; status: InboundSyncStatus }[] = [];
  let anyApplied = false;

  for (const event of events) {
    try {
      // Idempotency: has this exact event already been processed?
      const { data: existingLog } = await supabase
        .from('inventory_sync_log')
        .select('id')
        .eq('direction', 'inbound')
        .eq('external_event_id', event.external_event_id)
        .maybeSingle();

      if (existingLog) {
        results.push({ external_event_id: event.external_event_id, status: 'skipped_duplicate' });
        continue;
      }

      const { data: variant } = await supabase
        .from('product_variants')
        .select('id')
        .eq('sku', event.sku)
        .maybeSingle();

      if (!variant) {
        if (!dryRun) {
          await supabase.from('inventory_sync_log').insert([{
            direction: 'inbound', external_event_id: event.external_event_id, variant_sku: event.sku,
            payload: event, status: 'sku_not_found', error_message: `No product_variants row for SKU ${event.sku}`,
          }]);
        }
        results.push({ external_event_id: event.external_event_id, status: 'sku_not_found' });
        continue;
      }

      const { data: existingInv } = await supabase
        .from('inventory')
        .select('last_synced_at')
        .eq('variant_id', variant.id)
        .maybeSingle();

      if (existingInv?.last_synced_at && new Date(event.occurred_at) <= new Date(existingInv.last_synced_at)) {
        if (!dryRun) {
          await supabase.from('inventory_sync_log').insert([{
            direction: 'inbound', external_event_id: event.external_event_id, variant_sku: event.sku,
            payload: event, status: 'skipped_stale',
          }]);
        }
        results.push({ external_event_id: event.external_event_id, status: 'skipped_stale' });
        continue;
      }

      if (dryRun) {
        results.push({ external_event_id: event.external_event_id, status: 'applied' });
        continue;
      }

      // Direct inventory writes require the admin session (see RLS migration
      // 20260811000000) — this route authenticates the caller via HMAC
      // signature instead, so it goes through a narrow SECURITY DEFINER RPC
      // that does exactly this one upsert rather than needing a service-role key.
      const { error: upsertErr } = await supabase.rpc('upsert_inventory_from_sync', {
        p_variant_id: variant.id,
        p_quantity_on_hand: event.quantity_on_hand,
        p_last_synced_at: event.occurred_at,
      });

      await supabase.from('inventory_sync_log').insert([{
        direction: 'inbound', external_event_id: event.external_event_id, variant_sku: event.sku,
        payload: event, status: upsertErr ? 'failed' : 'applied', error_message: upsertErr?.message,
      }]);

      if (upsertErr) {
        results.push({ external_event_id: event.external_event_id, status: 'failed' });
      } else {
        anyApplied = true;
        results.push({ external_event_id: event.external_event_id, status: 'applied' });
      }
    } catch (e: any) {
      console.warn(`[Atelier DB] applyInboundInventorySync failed for ${event.external_event_id}:`, e.message || e);
      results.push({ external_event_id: event.external_event_id, status: 'failed' });
    }
  }

  if (anyApplied) broadcastInventoryChanged();
  return results;
};

// =========================================================================
// COUPONS OPERATIONS
// =========================================================================

// Coupons are admin-only and change often enough that every call after the
// first still goes live (no TTL short-circuit) — a write should be visible
// on the very next fetch. What WAS missing is any resilience for the first
// call of a cold session: on a hard refresh this used to always block on a
// live query with nothing to fall back on, which is exactly the kind of call
// that gets caught in the refresh-time network/CPU pileup (see AGENTS notes
// on getProducts). Same fix as products: persist the last known-good list to
// localStorage and paint it instantly on that first call, refreshing for
// real in the background — every call after that still goes live as before.
let couponsCache: Coupon[] | null = null;
let couponsFetchInFlight: Promise<Coupon[]> | null = null;
let couponsHasAttemptedFreshFetch = false;
const COUPONS_LOCALSTORAGE_KEY = 'stag_beetle_coupons_cache';

const readPersistedCoupons = (): Coupon[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COUPONS_LOCALSTORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: Coupon[] };
    return Array.isArray(parsed.data) ? parsed.data : null;
  } catch {
    return null;
  }
};

const persistCoupons = (data: Coupon[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COUPONS_LOCALSTORAGE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // Storage full/unavailable — non-critical, just skip persisting.
  }
};

const fetchAndCacheCoupons = (): Promise<Coupon[]> => {
  if (couponsFetchInFlight) return couponsFetchInFlight;

  couponsHasAttemptedFreshFetch = true;
  const fetchPromise = (async (): Promise<Coupon[]> => {
    try {
      console.log("[Atelier DB] Fetching coupons from Supabase...");
      const { data, error } = await withOneRetry(() => supabaseTimeout(supabase!.from('coupons').select('*')));
      if (error) throw error;
      console.log("[Atelier DB] Successfully loaded coupons from Supabase.");
      couponsCache = data as Coupon[];
      persistCoupons(couponsCache);
      return couponsCache;
    } catch (e: any) {
      console.warn("[Atelier DB] Supabase coupons failed or timed out:", e.message || e);
      // Real coupons loaded earlier this session beat showing fake/empty ones —
      // an admin seeing "no coupons" here could genuinely believe there are
      // none, when it's really just a timeout.
      if (couponsCache) {
        console.warn("[Atelier DB] Serving last known-good coupon list while the connection recovers.");
        return couponsCache;
      }
      throw new Error("We couldn't load coupons right now. Please check your connection and try again.");
    } finally {
      couponsFetchInFlight = null;
    }
  })();

  couponsFetchInFlight = fetchPromise;
  return fetchPromise;
};

export const getCoupons = async (): Promise<Coupon[]> => {
  if (!isSupabaseConfigured || !supabase) {
    console.log("[Atelier DB] Supabase not configured, returning local mock coupons.");
    return getLocalCoupons();
  }

  if (!couponsCache && !couponsHasAttemptedFreshFetch) {
    const persisted = readPersistedCoupons();
    if (persisted) {
      console.log(`[Atelier DB] Painting coupons instantly from persisted cache (count: ${persisted.length}) while refreshing in the background.`);
      couponsCache = persisted;
      fetchAndCacheCoupons().catch(() => {}); // background refresh; errors already logged inside
      return persisted;
    }
  }

  return fetchAndCacheCoupons();
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

// Same reasoning as couponsCache above — real (if slightly stale) orders
// beat an admin looking at an empty/fake order list and concluding the
// store has no orders, when it's really just a timed-out request. And, same
// fix as coupons: persist the last known-good list so the first call of a
// cold session (a hard refresh) can paint instantly instead of blocking on a
// live query during the refresh-time network/CPU pileup; every call after
// that still goes live.
let ordersCache: Order[] | null = null;
let ordersFetchInFlight: Promise<Order[]> | null = null;
let ordersHasAttemptedFreshFetch = false;
const ORDERS_LOCALSTORAGE_KEY = 'stag_beetle_orders_cache';

const readPersistedOrders = (): Order[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ORDERS_LOCALSTORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: Order[] };
    return Array.isArray(parsed.data) ? parsed.data : null;
  } catch {
    return null;
  }
};

const persistOrders = (data: Order[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ORDERS_LOCALSTORAGE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // Storage full/unavailable — non-critical, just skip persisting.
  }
};

const fetchAndCacheOrders = (): Promise<Order[]> => {
  if (ordersFetchInFlight) return ordersFetchInFlight;

  ordersHasAttemptedFreshFetch = true;
  const fetchPromise = (async (): Promise<Order[]> => {
    try {
      console.log("[Atelier DB] Fetching orders from Supabase...");
      const { data, error } = await withOneRetry(() =>
        supabaseTimeout(supabase!.from('orders').select('*').order('created_at', { ascending: false }))
      );
      if (error) throw error;
      console.log(`[Atelier DB] Successfully loaded ${data.length} orders from Supabase.`);
      ordersCache = data as Order[];
      persistOrders(ordersCache);
      return ordersCache;
    } catch (e: any) {
      console.warn("Supabase failed fetching orders or timed out:", e.message || e);
      if (ordersCache) {
        console.warn("[Atelier DB] Serving last known-good orders list while the connection recovers.");
        return ordersCache;
      }
      throw new Error("We couldn't load orders right now. Please check your connection and try again.");
    } finally {
      ordersFetchInFlight = null;
    }
  })();

  ordersFetchInFlight = fetchPromise;
  return fetchPromise;
};

export const getOrders = async (): Promise<Order[]> => {
  if (!isSupabaseConfigured || !supabase) {
    console.log("[Atelier DB] Supabase not configured, returning local mock orders.");
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
  }

  if (!ordersCache && !ordersHasAttemptedFreshFetch) {
    const persisted = readPersistedOrders();
    if (persisted) {
      console.log(`[Atelier DB] Painting orders instantly from persisted cache (count: ${persisted.length}) while refreshing in the background.`);
      ordersCache = persisted;
      fetchAndCacheOrders().catch(() => {}); // background refresh; errors already logged inside
      return persisted;
    }
  }

  return fetchAndCacheOrders();
};

// =========================================================================
// Cart persistence — one server-side cart per signed-in user so items can be
// restored after logout / on another device. Mock sessions (usr_*) get a new
// id every login, so persisting them is pointless and they are skipped, same
// as upsertProfile does.
// =========================================================================

// Discriminated result, same reasoning as fetchProfile in AuthContext: the
// caller (CartContext) needs to tell "confirmed: no server cart" apart from
// "couldn't check, the query timed out". Collapsing both into a plain `null`
// used to make a mere timeout look identical to a genuinely empty cart —
// CartContext would then mark itself "hydrated" regardless and, ~800ms
// later, write the local (incomplete) cart back to Supabase, silently
// overwriting whatever was really saved there (e.g. items added on another
// device) purely because of a network hiccup on this page load.
export type CartFetchResult =
  | { status: 'found'; items: OrderItem[] }
  | { status: 'confirmed_empty' }
  | { status: 'unknown' };

export const getCart = async (userId: string): Promise<CartFetchResult> => {
  // Email/phone (mock) sessions never had a server-side cart to begin with —
  // this isn't an unknown, it's correctly "nothing to sync".
  if (!isSupabaseConfigured || !supabase || userId.startsWith('usr_')) {
    return { status: 'confirmed_empty' };
  }
  try {
    const { data, error } = await withOneRetry(() =>
      supabaseTimeout(supabase.from('carts').select('items').eq('user_id', userId).maybeSingle())
    );
    if (error) {
      console.warn("[Atelier DB] Supabase getCart error:", error.message);
      return { status: 'unknown' };
    }
    if (!data) return { status: 'confirmed_empty' };
    return { status: 'found', items: (data.items as OrderItem[]) || [] };
  } catch (e: any) {
    console.warn("Supabase getCart failed or timed out:", e.message || e);
    return { status: 'unknown' };
  }
};

export const saveCart = async (userId: string, items: OrderItem[]): Promise<void> => {
  if (isSupabaseConfigured && supabase && !userId.startsWith('usr_')) {
    try {
      const { error } = await supabaseTimeout(
        supabase.from('carts').upsert([{ user_id: userId, items, updated_at: new Date().toISOString() }])
      );
      if (error) console.warn("[Atelier DB] Supabase saveCart error:", error.message);
    } catch (e: any) {
      console.warn("Supabase saveCart failed or timed out:", e.message || e);
    }
  }
};

export const getOrderById = async (id: string): Promise<Order | null> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabaseTimeout(
        supabase.from('orders').select('*').eq('id', id).single()
      );
      if (!error && data) return data as Order;
      if (error) console.warn("[Atelier DB] Supabase getOrderById error:", error.message);
    } catch (e: any) {
      console.warn("Supabase getOrderById failed or timed out, falling back to mock:", e.message || e);
    }
  }
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('stag_beetle_orders');
  if (stored) {
    try {
      const found = JSON.parse(stored).find((o: Order) => o.id === id);
      if (found) return found as Order;
    } catch (e) {
      console.error(e);
    }
  }
  return null;
};

export const createOrder = async (orderData: Omit<Order, 'id' | 'created_at'>): Promise<Order> => {
  const newOrder: Order = {
    ...orderData,
    id: `order_${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      // No .select() here — guest checkout (most orders) has no Supabase Auth
      // session for the post-insert read-back to authenticate under RLS, and
      // there's nothing it would tell us anyway: newOrder above already has
      // every field, exactly as sent. See the RLS hardening migration
      // (20260811000000) for why a SELECT-back would otherwise be blocked.
      const { error } = await supabase.from('orders').insert([newOrder]);
      if (!error) return newOrder;

      // Handle missing shipping columns retry (Postgres code 42703 is undefined_column)
      if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
        console.warn("Supabase orders table missing shipping columns, retrying insert without them...");
        const { shipping_status, shipping_carrier, tracking_number, ...strippedOrderData } = newOrder as any;
        const { error: retryError } = await supabase
          .from('orders')
          .insert([strippedOrderData]);
        if (!retryError) {
          // Return the full order (including shipping details) so the client has them
          return newOrder;
        } else {
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
// MEMBERSHIP — birthday/anniversary discounts.
//
// A member record is deliberately lightweight: name/email/phone/dates,
// captured either through the public /join page (e.g. an in-store QR code)
// or typed in by an admin — no password, no website login created. Someone
// who *also* wants a full account can sign up separately with the same
// email; the two are independent.
//
// Eligibility ("is this email/phone a member currently inside their
// discount window, and by how much") is answered by the get_member_discount
// Postgres RPC, never by reading the members table directly — there is no
// public SELECT policy on it, on purpose (see the migration). That's what
// lets checkout auto-apply a discount for a guest who's never logged in,
// without exposing every member's birthday/phone/email to anyone with the
// anon key (i.e. anyone with dev tools open on the site).
// =========================================================================

export interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  birthday?: string; // 'YYYY-MM-DD'
  anniversary?: string; // 'YYYY-MM-DD'
  source: 'online' | 'in_store_qr' | 'admin';
  created_at: string;
}

export interface MemberDiscountConfig {
  active: boolean;
  birthday_percent: number;
  anniversary_percent: number;
  window_days: number; // how many days before/after the actual date still qualifies
}

export interface MemberDiscountResult {
  discount_percent: number;
  reason: 'birthday' | 'anniversary';
  already_redeemed: boolean; // true = eligible window, but already used this year — don't apply again
  period_year: number; // which year this redemption counts against; pass straight through to redeemMemberDiscount
  redeemed_at: string | null; // when it was marked used, if it was — null while already_redeemed is false
}

const DEFAULT_MEMBER_DISCOUNT_CONFIG: MemberDiscountConfig = {
  active: true,
  birthday_percent: 15,
  anniversary_percent: 15,
  window_days: 3,
};

// Self-registration — the public /join page and the admin "add member"
// form both call this. No auth required (see the INSERT policy), so this
// works from an in-store kiosk that scanned a QR code with nobody logged in.
export const registerMember = async (input: {
  name: string;
  email: string;
  phone?: string;
  birthday?: string;
  anniversary?: string;
  source?: Member['source'];
}): Promise<{ ok: boolean; alreadyRegistered?: boolean; error?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Membership signup is not available right now.' };
  }
  try {
    const { error } = await supabase.from('members').insert([{
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      birthday: input.birthday || null,
      anniversary: input.anniversary || null,
      source: input.source || 'online',
    }]);
    if (error) {
      // Postgres unique_violation — this email already has a membership
      // record. Not a failure from the shopper's point of view.
      if (error.code === '23505') {
        return { ok: false, alreadyRegistered: true, error: 'This email is already registered as a member.' };
      }
      console.warn('[Atelier DB] registerMember failed:', error.message);
      return { ok: false, error: "We couldn't complete your registration. Please try again." };
    }
    invalidateMembersCache(); // so this tab's next Members List load is live, not the pre-signup snapshot
    return { ok: true };
  } catch (e: any) {
    console.warn('[Atelier DB] registerMember failed:', e.message || e);
    return { ok: false, error: "We couldn't complete your registration. Please try again." };
  }
};

// Checkout (guest or logged-in) and the in-store admin lookup both call
// this — the one place eligibility is actually computed, server-side.
// Returns null on "not a member" / "not currently eligible" / on any
// failure — callers should treat every null the same way (no discount),
// not surface a connection error over someone's checkout.
export const getMemberDiscount = async (email?: string, phone?: string): Promise<MemberDiscountResult | null> => {
  if (!isSupabaseConfigured || !supabase) return null;
  const cleanEmail = email?.trim();
  const cleanPhone = phone?.trim();
  if (!cleanEmail && !cleanPhone) return null;
  try {
    const { data, error } = await supabaseTimeout(
      supabase.rpc('get_member_discount', { p_email: cleanEmail || null, p_phone: cleanPhone || null })
    );
    if (error || !data || data.length === 0) return null;
    return data[0] as MemberDiscountResult;
  } catch (e: any) {
    console.warn('[Atelier DB] getMemberDiscount failed:', e.message || e);
    return null;
  }
};

// Marks this year's birthday/anniversary discount as used — call once an
// order that actually applied it has been confirmed (checkout), never at
// checkout-page-load time (that's just getMemberDiscount's eligibility
// check). `reason` and `periodYear` should be exactly what that eligibility
// check returned, so the redemption lands against the same year it was
// evaluated for. Returns false both on a genuine failure and on a
// double-redemption attempt — the DB's unique constraint is the real
// enforcement either way, so callers shouldn't need to tell the two apart.
export const redeemMemberDiscount = async (
  email: string | undefined,
  phone: string | undefined,
  reason: 'birthday' | 'anniversary',
  periodYear: number,
  orderId?: string
): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;
  const cleanEmail = email?.trim();
  const cleanPhone = phone?.trim();
  if (!cleanEmail && !cleanPhone) return false;
  try {
    const { data, error } = await supabaseTimeout(
      supabase.rpc('redeem_member_discount', {
        p_email: cleanEmail || null,
        p_phone: cleanPhone || null,
        p_reason: reason,
        p_period_year: periodYear,
        p_order_id: orderId || null,
      })
    );
    if (error) {
      console.warn('[Atelier DB] redeemMemberDiscount failed:', error.message);
      return false;
    }
    return !!data;
  } catch (e: any) {
    console.warn('[Atelier DB] redeemMemberDiscount failed:', e.message || e);
    return false;
  }
};

// Bulk version for the admin Members List table — one call for a whole page
// of members instead of one round trip per row. Admin-only; returns a map
// keyed by member id, with an entry only for members who are currently
// eligible (present in members.length calls, absent = not eligible right now).
export const getMembersBulkDiscountStatus = async (memberIds: string[]): Promise<Record<string, MemberDiscountResult>> => {
  if (!isSupabaseConfigured || !supabase || memberIds.length === 0) return {};
  try {
    const { data, error } = await supabaseTimeout(
      supabase.rpc('get_members_bulk_discount_status', { p_member_ids: memberIds })
    );
    if (error || !data) return {};
    const result: Record<string, MemberDiscountResult> = {};
    for (const row of data as (MemberDiscountResult & { member_id: string })[]) {
      const { member_id, ...rest } = row;
      result[member_id] = rest;
    }
    return result;
  } catch (e: any) {
    console.warn('[Atelier DB] getMembersBulkDiscountStatus failed:', e.message || e);
    return {};
  }
};

// Admin-only — cross-referenced against Registered Users so that page can
// show "already a member" instead of a "Make Member" button that implies
// they aren't one. Without this, the two admin lists (Registered Users and
// Members) had no way to know about each other at all — a real customer
// account and a real membership record for the exact same email/phone
// looked completely unrelated on screen, even though registerMember()
// itself already treats "same email" as one person (see the unique index
// on members.email).
export const getMemberContactSet = async (): Promise<{ emails: Set<string>; phones: Set<string> }> => {
  const empty = { emails: new Set<string>(), phones: new Set<string>() };
  if (!isSupabaseConfigured || !supabase) return empty;
  try {
    const { data, error } = await supabaseTimeout(supabase.from('members').select('email,phone'));
    if (error || !data) return empty;
    const phones: (string | null)[] = data.map((m: { phone: string | null }) => m.phone);
    return {
      emails: new Set(data.map((m: { email: string }) => m.email.toLowerCase())),
      phones: new Set(phones.filter((p): p is string => !!p)),
    };
  } catch (e: any) {
    console.warn('[Atelier DB] getMemberContactSet failed:', e.message || e);
    return empty;
  }
};

// Admin-only (RLS: no public SELECT on members) — the in-store lookup tool
// and the admin Members page both search this way. Matches on name, email,
// or phone; small result set, no pagination needed at this scale.
export const searchMembers = async (query: string): Promise<Member[]> => {
  if (!isSupabaseConfigured || !supabase) return [];
  const q = query.trim();
  if (!q) return [];
  try {
    const { data, error } = await supabaseTimeout(
      supabase.from('members')
        .select('*')
        .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
        .order('created_at', { ascending: false })
        .limit(25)
    );
    if (error) throw error;
    return data as Member[];
  } catch (e: any) {
    console.warn('[Atelier DB] searchMembers failed:', e.message || e);
    return [];
  }
};

export interface MembersPage {
  members: Member[];
  total: number; // total matching rows across every page, not just this one
}

// Last known-good total member count — same "stale beats broken" reasoning
// as couponsCache/ordersCache above: a timed-out count query showing "0
// members" (or the page silently erroring) would be actively misleading on
// an admin dashboard people are using to judge how the program is growing,
// far worse than a slightly-stale real number.
let membersCountCache: number | null = null;

// Instant-paint cache for the Members List page's default view (page 1, no
// search) — the same pattern getProducts() uses, and for the same reason:
// the very first load of a cold session used to always block on a live
// query with nothing to show meanwhile. Deliberately scoped to only that
// one case (page 1, no query) rather than every page/search combination —
// that default view is what nearly everyone actually lands on. A short
// in-memory TTL also collapses rapid duplicate calls (e.g. mount + a
// realtime refresh landing in the same tick).
const MEMBERS_PAGE1_LOCALSTORAGE_KEY = 'stag_beetle_members_page1_cache';
const MEMBERS_CACHE_TTL_MS = 60_000;
let membersPage1Cache: { data: MembersPage; expiresAt: number } | null = null;
let membersHasAttemptedFreshFetch = false;

const readPersistedMembersPage1 = (): MembersPage | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MEMBERS_PAGE1_LOCALSTORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: MembersPage };
    return parsed.data && Array.isArray(parsed.data.members) ? parsed.data : null;
  } catch {
    return null;
  }
};

const persistMembersPage1 = (data: MembersPage) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MEMBERS_PAGE1_LOCALSTORAGE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // Storage full/unavailable — non-critical, just skip persisting.
  }
};

// Called on every member write (add/remove) so the very next load — this
// tab or a fresh one — goes live instead of serving a snapshot from before
// the change. Doesn't reset membersHasAttemptedFreshFetch: once this
// session has done one real fetch, every call after a write should also go
// live, never fall back to the (now provably stale) persisted-disk
// snapshot — same reasoning as the equivalent products-cache fix.
const invalidateMembersCache = () => {
  membersPage1Cache = null;
  membersCountCache = null;
};

const fetchAndCacheMembersPage1 = (pageSize: number): Promise<MembersPage> => {
  membersHasAttemptedFreshFetch = true;
  return (async (): Promise<MembersPage> => {
    try {
      const { data, error, count } = await withOneRetry(() =>
        supabaseTimeout(
          supabase!.from('members').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(0, pageSize - 1)
        )
      );
      if (error) throw error;
      const resolved: MembersPage = { members: (data || []) as Member[], total: count ?? 0 };
      membersPage1Cache = { data: resolved, expiresAt: Date.now() + MEMBERS_CACHE_TTL_MS };
      membersCountCache = resolved.total;
      persistMembersPage1(resolved);
      return resolved;
    } catch (e: any) {
      console.warn('[Atelier DB] getMembersPage failed:', e.message || e);
      if (membersPage1Cache) return membersPage1Cache.data;
      return { members: [], total: membersCountCache ?? 0 };
    }
  })();
};

// Admin Members list page — page is 1-indexed. Optional `query` filters by
// name/email/phone server-side (same fields searchMembers checks) so
// pagination and search compose instead of being two separate code paths.
export const getMembersPage = async (page: number, pageSize = 100, query?: string): Promise<MembersPage> => {
  if (!isSupabaseConfigured || !supabase) return { members: [], total: 0 };

  // Only the plain "page 1, no search" view is cached/instant-painted —
  // any other page or an active search always goes live below.
  if (page === 1 && !query?.trim()) {
    if (membersPage1Cache && membersPage1Cache.expiresAt > Date.now()) {
      return membersPage1Cache.data;
    }
    if (!membersHasAttemptedFreshFetch) {
      const persisted = readPersistedMembersPage1();
      if (persisted) {
        membersPage1Cache = { data: persisted, expiresAt: Date.now() + 3_000 };
        fetchAndCacheMembersPage1(pageSize).catch(() => {}); // background refresh; errors already logged inside
        return persisted;
      }
    }
    return fetchAndCacheMembersPage1(pageSize);
  }

  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;
  try {
    let builder = supabase.from('members').select('*', { count: 'exact' });
    const q = query?.trim();
    if (q) builder = builder.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
    const { data, error, count } = await withOneRetry(() =>
      supabaseTimeout(builder.order('created_at', { ascending: false }).range(from, to))
    );
    if (error) throw error;
    if (typeof count === 'number') membersCountCache = count;
    return { members: (data || []) as Member[], total: count ?? membersCountCache ?? 0 };
  } catch (e: any) {
    console.warn('[Atelier DB] getMembersPage failed:', e.message || e);
    // No stale page of *rows* to fall back to (which page was requested
    // varies), but the last known-good total at least keeps the stat
    // honest instead of dropping to zero on a mere timeout.
    return { members: [], total: membersCountCache ?? 0 };
  }
};

// Lightweight — just the count, for the hub page's "Total Members" stat
// where fetching a full page of rows would be wasted work.
export const getMembersCount = async (): Promise<number> => {
  if (!isSupabaseConfigured || !supabase) return 0;
  try {
    const { count, error } = await withOneRetry(() =>
      supabaseTimeout(supabase.from('members').select('*', { count: 'exact', head: true }))
    );
    if (error) throw error;
    const resolved = count ?? 0;
    membersCountCache = resolved;
    return resolved;
  } catch (e: any) {
    console.warn('[Atelier DB] getMembersCount failed:', e.message || e);
    return membersCountCache ?? 0;
  }
};

export const deleteMember = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) return false;
    invalidateMembersCache();
    return true;
  } catch (e: any) {
    console.warn('[Atelier DB] deleteMember failed:', e.message || e);
    return false;
  }
};

// Store-wide discount settings (% for each occasion, how wide the window
// is, and a kill switch) — admin-editable, reuses the same app_settings
// key/value table plus_sizes already lives in. No realtime broadcast here
// unlike products/plus-sizes: nothing needs to react live to this changing
// mid-session — get_member_discount() reads it fresh on every call anyway,
// so the only consumer of this getter/setter pair is the admin settings form.
export const getMemberDiscountConfig = async (): Promise<MemberDiscountConfig> => {
  if (!isSupabaseConfigured || !supabase) return DEFAULT_MEMBER_DISCOUNT_CONFIG;
  try {
    const { data } = await withOneRetry(() =>
      supabaseTimeout(supabase.from('app_settings').select('value').eq('key', 'member_discount_config').maybeSingle())
    );
    if (data?.value) return { ...DEFAULT_MEMBER_DISCOUNT_CONFIG, ...(data.value as Partial<MemberDiscountConfig>) };
  } catch (e: any) {
    console.warn('[Atelier DB] getMemberDiscountConfig failed, using defaults:', e.message || e);
  }
  return DEFAULT_MEMBER_DISCOUNT_CONFIG;
};

export const setMemberDiscountConfig = async (config: MemberDiscountConfig): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert([{ key: 'member_discount_config', value: config, updated_at: new Date().toISOString() }], { onConflict: 'key' });
    if (error) {
      console.warn('[Atelier DB] setMemberDiscountConfig failed:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('[Atelier DB] setMemberDiscountConfig failed:', e.message || e);
    return false;
  }
};

// =========================================================================
// USER PROFILES OPERATIONS
// =========================================================================

// Used by the passwordless "quick email + phone" login to check whether
// either value already belongs to a real (Supabase Auth-backed) account
// before minting what would otherwise be a completely separate, untraceable
// local identity under the same contact details. Deliberately returns only
// a yes/no — never the matched profile itself — so this can't be used to
// silently sign in as someone else; it can only block the collision and
// point them at signing in properly instead.
export const isEmailOrPhoneAlreadyRegistered = async (email: string, phone?: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;
  const cleanEmail = email.trim();
  const cleanPhone = phone?.trim();
  if (!cleanEmail && !cleanPhone) return false;
  try {
    let builder = supabase.from('profiles').select('id').limit(1);
    builder = cleanPhone
      ? builder.or(`email.ilike.${cleanEmail},phone.eq.${cleanPhone}`)
      : builder.ilike('email', cleanEmail);
    const { data, error } = await supabaseTimeout(builder.maybeSingle());
    if (error) return false; // a lookup failure shouldn't block a legitimate signup
    return !!data;
  } catch {
    return false;
  }
};

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

// =========================================================================
// ADMIN: REGISTERED USERS — everyone with a real Supabase Auth account
// (email+password signup, or Google OAuth), as opposed to the membership
// program (a separate, opt-in loyalty list — see the MEMBERSHIP section
// above) or the passwordless "email + phone" quick-login, which is
// deliberately local-only and never reaches this table at all (see the
// `usr_*` id checks throughout this file) — those visitors simply don't
// have a server-side account for an admin view to show. This section is
// for the ones that do.
// =========================================================================

export interface ProfilesPage {
  profiles: UserProfile[];
  total: number;
}

// Same "stale beats broken" reasoning as membersCountCache — a timed-out
// count showing 0 registered users would be actively misleading, not just
// unavailable.
let profilesCountCache: number | null = null;

// Admin-only (RLS: "Admin reads all profiles" policy, added alongside this
// feature — see the migration). Page is 1-indexed; optional `query` filters
// server-side by name/email/phone.
// Internal/house accounts that are technically rows in `profiles` but are
// not customers — excluded from every admin-facing "registered users" view
// (list, count, search) so the admin doesn't see their own login, or a
// leftover test account, mixed in with real customers. Only
// stagbeetlebilling@gmail.com is actually privileged (see is_admin() in
// Postgres); admin@stagbeetle.co.in has no special access, it's just an old
// test signup with an obviously non-customer name/email.
const NON_CUSTOMER_PROFILE_EMAILS = ['stagbeetlebilling@gmail.com', 'admin@stagbeetle.co.in'];

const excludeNonCustomerProfiles = <T extends { not: (col: string, op: string, val: string) => T }>(builder: T): T =>
  NON_CUSTOMER_PROFILE_EMAILS.reduce((b, email) => b.not('email', 'ilike', email), builder);

export const getProfilesPage = async (page: number, pageSize = 100, query?: string): Promise<ProfilesPage> => {
  if (!isSupabaseConfigured || !supabase) return { profiles: [], total: 0 };
  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;
  try {
    let builder = supabase.from('profiles').select('*', { count: 'exact' });
    builder = excludeNonCustomerProfiles(builder);
    const q = query?.trim();
    if (q) builder = builder.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
    const { data, error, count } = await withOneRetry(() =>
      supabaseTimeout(builder.order('updated_at', { ascending: false }).range(from, to))
    );
    if (error) throw error;
    if (typeof count === 'number') profilesCountCache = count;
    return { profiles: (data || []) as UserProfile[], total: count ?? profilesCountCache ?? 0 };
  } catch (e: any) {
    console.warn('[Atelier DB] getProfilesPage failed:', e.message || e);
    return { profiles: [], total: profilesCountCache ?? 0 };
  }
};

export const getProfilesCount = async (): Promise<number> => {
  if (!isSupabaseConfigured || !supabase) return 0;
  try {
    let builder = supabase.from('profiles').select('*', { count: 'exact', head: true });
    builder = excludeNonCustomerProfiles(builder);
    const { count, error } = await withOneRetry(() => supabaseTimeout(builder));
    if (error) throw error;
    const resolved = count ?? 0;
    profilesCountCache = resolved;
    return resolved;
  } catch (e: any) {
    console.warn('[Atelier DB] getProfilesCount failed:', e.message || e);
    return profilesCountCache ?? 0;
  }
};

// Admin-only (RLS: "Admin updates profiles" policy) — lets the Registered
// Users page fix a customer's phone number (or name) directly, e.g. when
// they call in with a correction, without them needing to edit it themselves.
export const adminUpdateProfile = async (id: string, fields: Partial<Pick<UserProfile, 'name' | 'phone'>>): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from('profiles').update(fields).eq('id', id);
    if (error) {
      console.warn('[Atelier DB] adminUpdateProfile failed:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('[Atelier DB] adminUpdateProfile failed:', e.message || e);
    return false;
  }
};

export const uploadGarmentImage = async (file: File, sku?: string, index?: number): Promise<string> => {
  if (!isSupabaseConfigured || !supabase) {
    // No Supabase project configured at all (e.g. local dev without env
    // vars) — base64 is the only option here, always was.
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

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
  const { error } = await supabase.storage
    .from('garment-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    // Surfaced to the caller (handleImageUpload's own catch, which shows it
    // via triggerFeedback) instead of silently degrading to a base64 blob
    // embedded in the products row — that used to be a harmless fallback,
    // but storage writes now require an authenticated admin session, so
    // swallowing this error would hide exactly the kind of problem (session
    // expired, wrong account) an admin actually needs to see and fix. A
    // silent base64 fallback here also bloats the products table and slows
    // every later page load that reads it — the opposite of "helpful".
    console.error("[Atelier Storage] Supabase upload failed:", error.message);
    throw new Error(
      /row-level security|permission/i.test(error.message)
        ? 'Permission denied by the server — your admin session may have expired. Try logging out and back in.'
        : `Image upload failed: ${error.message}`
    );
  }

  const { data: urlData } = supabase.storage
    .from('garment-images')
    .getPublicUrl(filePath);

  console.log("[Atelier Storage] Public URL resolved:", urlData.publicUrl);
  return urlData.publicUrl;
};

/**
 * Helper to get the base prefix of a SKU by dropping the color/suffix.
 * E.g., SB-LNSH-SGR -> SB-LNSH
 *       SATN-CRM -> SATN
 */
export const getSkuBase = (sku?: string): string => {
  if (!sku) return '';
  const trimmed = sku.trim().toUpperCase();
  const parts = trimmed.split('-');
  if (parts.length > 1) {
    // Drop the last part which represents the color suffix
    return parts.slice(0, -1).join('-');
  }
  return trimmed;
};

/**
 * Helper to map a text color name to a hex color code for UI rendering.
 */
export const getColorHex = (colorName: string): string => {
  if (!colorName) return '#CCCCCC';
  
  // If the colorName contains a '|', extract the hex part directly!
  if (colorName.includes('|')) {
    const parts = colorName.split('|');
    const hex = parts[1]?.trim();
    if (hex && /^#[0-9A-F]{3,6}$/i.test(hex)) {
      return hex;
    }
  }

  const name = colorName.split('|')[0].toLowerCase().trim();

  // Centralised catalogue palette (src/lib/colors.ts) is the source of
  // truth for the colours the store officially supports — check it first
  // so those names render a consistent swatch even without an inline hex.
  const palette = PRODUCT_COLORS.find(c => c.name.toLowerCase() === name);
  if (palette) return palette.hex;

  const map: Record<string, string> = {
    'stone grey': '#8E9AAF',
    'stone gray': '#8E9AAF',
    'grey': '#A0AAB2',
    'gray': '#A0AAB2',
    'slate grey': '#5A6065',
    'ivory white': '#F2EFEC',
    'white': '#FFFFFF',
    'arctic white': '#F9FBFD',
    'sage mint': '#A3C1AD',
    'forest olive': '#4F5D2F',
    'forest green': '#2D4A22',
    'light blue': '#ADD8E6',
    'purple': '#800080',
    'blue': '#0000FF',
    'beetle navy': '#1B2A4A',
    'navy blue': '#000080',
    'midnight black': '#0B0C10',
    'obsidian black': '#0B0C10',
    'black': '#000000',
    'peacock teal': '#005F73',
    'burgundy': '#800020',
    'ivory cream': '#FFFDD0',
    'cream': '#FFFDD0',
    'maroon': '#800000',
    'mauve': '#E0B0FF',
    'crimson': '#DC143C',
    'olive': '#808000',
    'pista green': '#93C572',
    'light green': '#90EE90',
    'sky blue': '#87CEEB',
    'beige': '#F5F5DC',
    'sky beige': '#E2DFD2',
    'wine': '#722F37',
  };

  for (const key of Object.keys(map)) {
    if (name.includes(key)) {
      return map[key];
    }
  }
  return '#CCCCCC'; // default fallback
};

/**
 * Helper to get user-facing color name (strips hex part if stored as Name|Hex).
 */
export const getColorName = (colorName: string): string => {
  if (!colorName) return '';
  return colorName.split('|')[0].trim();
};


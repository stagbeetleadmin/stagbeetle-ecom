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
      if (!error && data) {
        console.log(`[Atelier DB] Successfully loaded products from Supabase (count: ${data.length}).`);
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
      if (!error && data) return data as Product;
      if (error) console.warn("Supabase updateProduct returned error:", error.message);
    } catch (e) {
      console.warn(`Supabase updateProduct failed for id ${id}, falling back to mock:`, e);
    }
  }

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


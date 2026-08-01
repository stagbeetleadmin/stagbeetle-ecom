"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Product, Coupon, Order,
  getProducts, addProduct, updateProduct, deleteProduct, bulkUploadProducts,
  getCoupons, createCoupon, deleteCoupon,
  getOrders, updateOrderShipping, uploadGarmentImage, deleteStorageImage,
  getSkuBase, getColorHex, getColorName
} from '@/lib/db';
import { compressImage } from '@/utils/image';
import PriceDisplay from '@/components/PriceDisplay';
import RichTextEditor from '@/components/RichTextEditor';
import ImageUploadGrid from '@/components/admin/ImageUploadGrid';
import ProductPreviewModal from '@/components/admin/ProductPreviewModal';

const CATEGORY_OPTIONS = ['Men', 'Accessories'];
const GARMENT_TYPE_OPTIONS = ['Shirt', 'Jeans', 'Tshirt', 'Track pant', 'Shorts', 'Jacket'];

const parseSku = (sku?: string) => {
  if (!sku) return { styleCode: '', colorCode: '' };
  const parts = sku.trim().toUpperCase().split('-');
  if (parts.length > 1) {
    const colorCode = parts[parts.length - 1];
    const styleCode = parts.slice(0, -1).join('-');
    return { styleCode, colorCode };
  }
  return { styleCode: sku, colorCode: '' };
};

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  // Navigation tabs: 'products' | 'coupons' | 'orders' | 'analytics'
  const [activeTab, setActiveTab] = useState<'products' | 'coupons' | 'orders' | 'analytics'>('analytics');

  useEffect(() => {
    if (tabParam && ['products', 'coupons', 'orders', 'analytics'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  // Database States
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  // Product catalog search + filters
  const [skuSearch, setSkuSearch] = useState('');
  const [debouncedSkuSearch, setDebouncedSkuSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [garmentTypeFilter, setGarmentTypeFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');

  // Debounce the search box (same 300ms convention as the storefront search) so
  // filtering — and the table re-render it triggers — doesn't run on every keystroke.
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSkuSearch(skuSearch), 300);
    return () => clearTimeout(handler);
  }, [skuSearch]);

  // Distinct material values present in the catalog, for the filter dropdown
  const materialOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => { if (p.material?.trim()) set.add(p.material.trim()); });
    return Array.from(set).sort();
  }, [products]);

  // Client-side filtering — the catalog is already loaded in memory (getProducts()),
  // so a memoized single-pass filter stays fast even with thousands of products.
  const filteredProducts = useMemo(() => {
    const query = debouncedSkuSearch.trim().toLowerCase();
    return products.filter(p => {
      if (query && !(p.sku || '').toLowerCase().includes(query) && !p.title.toLowerCase().includes(query)) return false;
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (garmentTypeFilter && p.subcategory !== garmentTypeFilter) return false;
      if (materialFilter && p.material !== materialFilter) return false;
      return true;
    });
  }, [products, debouncedSkuSearch, categoryFilter, garmentTypeFilter, materialFilter]);

  // Infinite scroll — keeps the DOM light regardless of catalog size (the filter
  // itself is cheap; rendering thousands of <tr> rows at once is what actually costs)
  // without splitting results across discrete pages a user can miss.
  const PRODUCTS_PER_CHUNK = 25;
  const [visibleProductCount, setVisibleProductCount] = useState(PRODUCTS_PER_CHUNK);
  // Clamped (not reset-via-effect) so a filter that shrinks the result set below the
  // current count never strands it — no effect needed to fix it up.
  const safeVisibleCount = Math.min(visibleProductCount, Math.max(filteredProducts.length, PRODUCTS_PER_CHUNK));
  const paginatedProducts = useMemo(() => (
    filteredProducts.slice(0, safeVisibleCount)
  ), [filteredProducts, safeVisibleCount]);

  // Sentinel element at the bottom of the table — loads the next chunk once it scrolls
  // into view. A callback ref (not useEffect+useRef) so the observer correctly
  // re-attaches if the sentinel unmounts/remounts as the result set changes.
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleProductCount(prev => prev + PRODUCTS_PER_CHUNK);
      }
    }, { rootMargin: '200px' });
    observerRef.current.observe(node);
  }, []);

  const { isAdmin, loading: authLoading, setAdminStatus, loginWithEmailPassword, logout } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  // Admin login states
  const [activeGateTab, setActiveGateTab] = useState<'login' | 'passcode'>('login');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === 'STAGADMIN2026') {
      setAdminStatus(true);
      setPasscodeError('');
    } else {
      setPasscodeError('Invalid Administrative Passcode.');
    }
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(false); // Reset just in case

    if (!adminEmail.trim() || !adminPassword.trim()) {
      setLoginError('Please enter both email and password.');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await loginWithEmailPassword(adminEmail.trim(), adminPassword.trim());
      if (res.error) {
        setLoginError(res.error);
      } else {
        // Successful login, check if they are the admin email
        if (adminEmail.trim().toLowerCase() !== 'admin@stagbeetle.co.in') {
          setLoginError('Access Denied: This account does not have administrative privileges.');
          await logout();
        }
      }
    } catch (err: any) {
      setLoginError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Form Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product Form Input State
  const [productForm, setProductForm] = useState({
    title: '',
    price: 0,
    mrp: 0,
    category: 'Men',
    subcategory: 'Shirt', // default garment type
    sleeve_type: 'Full Sleeves', // default sleeves for Shirt
    sku: '', // stock keeping unit
    material: '',
    description: '',
    images: [] as string[],
    sizes: 'S, M, L, XL',
    colors: 'Obsidian Black, Iridescent Silver, Beetle Navy'
  });

  const [showPreview, setShowPreview] = useState(false);

  // SKU, sizes, colors helper states
  const [styleCode, setStyleCode] = useState('');
  const [colorCode, setColorCode] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['S', 'M', 'L', 'XL']);
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHexState] = useState('#A0AAB2');

  useEffect(() => {
    const s = styleCode.trim().toUpperCase();
    const c = colorCode.trim().toUpperCase();
    const computedSku = s && c ? `${s}-${c}` : s || c || '';
    setProductForm(prev => ({ ...prev, sku: computedSku }));
  }, [styleCode, colorCode]);

  // Handles a single-file upload for a given image slot (0-indexed) — called by ImageUploadGrid
  const handleImageUpload = async (file: File, slotIndex: number): Promise<string | null> => {
    if (!productForm.sku.trim()) {
      triggerFeedback('error', 'Please fill in the SKU NUMBER first to automatically name and organize files in the storage bucket.');
      return null;
    }

    // Replacing an already-uploaded image in this slot — clean up the old file first
    const existingUrl = productForm.images[slotIndex];
    if (existingUrl && !existingUrl.startsWith('data:')) {
      console.log(`[Admin Portal] Cleaning up previous image from storage before re-upload: ${existingUrl}`);
      try {
        await deleteStorageImage(existingUrl);
      } catch (err) {
        console.warn("[Admin Portal] Failed to delete previous image:", err);
      }
    }

    try {
      console.log(`[Admin Portal] Compressing ${file.name} client-side...`);
      const compressedFile = await compressImage(file);
      console.log(`[Admin Portal] Uploading compressed image to Supabase storage...`);
      const publicUrl = await uploadGarmentImage(compressedFile, productForm.sku, slotIndex + 1);

      if (publicUrl) {
        triggerFeedback('success', publicUrl.startsWith('data:')
          ? 'Image processed as base64 fallback (Supabase not connected).'
          : 'Image uploaded to Supabase successfully.');
        return publicUrl;
      }
      triggerFeedback('error', 'Image upload failed. Fallback did not resolve.');
      return null;
    } catch (err: any) {
      triggerFeedback('error', `Image upload failed: ${err.message || err}`);
      return null;
    }
  };

  // Deletes an image from storage — called by ImageUploadGrid before it removes the slot.
  // Throwing here (on cancel) stops ImageUploadGrid from removing the slot from the form.
  const handleRemoveImage = async (imageUrl: string) => {
    if (!confirm('Are you sure you want to remove this image? This action will permanently delete it from storage.')) {
      throw new Error('cancelled');
    }
    if (!imageUrl || imageUrl.startsWith('data:')) return;
    try {
      console.log(`[Admin Portal] Deleting image from storage: ${imageUrl}`);
      const ok = await deleteStorageImage(imageUrl);
      triggerFeedback('success', ok ? 'Image removed from Supabase storage.' : 'Image slot cleared.');
    } catch (err: any) {
      console.error('Error deleting image:', err);
      triggerFeedback('error', `Failed to delete from storage: ${err.message || err}`);
    }
  };

  // Coupon Form State
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    min_order_value: 0,
    active: true
  });

  // Bulk Upload State
  const [bulkJsonText, setBulkJsonText] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');

  // Notifications
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const allProducts = await getProducts();
      setProducts(allProducts);
      const allCoupons = await getCoupons();
      setCoupons(allCoupons);
      const allOrders = await getOrders();
      setOrders(allOrders);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col min-h-screen bg-surface selection:bg-gold-leaf/20 selection:text-on-surface">
        <Header />

        <main className="flex-1 flex items-center justify-center py-20 relative z-10 bg-white">
          <div className="fixed inset-0 marble-overlay z-0"></div>

          <div className="w-full max-w-md bg-white border border-on-surface/15 rounded-sm p-8 shadow-2xl relative z-10 text-zinc-800">
            <div className="text-center mb-6">
              <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-1">STAGBEETLE SELLER PORTAL</span>
              <h2 className="font-display text-[26px] font-semibold text-on-surface">Atelier Access Gate</h2>
              <p className="text-[12px] text-zinc-500 font-body mt-2">
                Log in with your administrator account or enter the administrative passcode.
              </p>
            </div>

            {/* Gate Tabs */}
            <div className="flex border-b border-on-surface/10 mb-6 text-[10px] font-bold uppercase tracking-wider">
              <button
                type="button"
                onClick={() => { setActiveGateTab('login'); setLoginError(''); setPasscodeError(''); }}
                className={`flex-1 pb-2.5 transition-colors border-b-2 text-center font-semibold tracking-widest ${activeGateTab === 'login'
                    ? 'border-gold-leaf text-on-surface'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                  }`}
              >
                Admin Sign In
              </button>
              <button
                type="button"
                onClick={() => { setActiveGateTab('passcode'); setLoginError(''); setPasscodeError(''); }}
                className={`flex-1 pb-2.5 transition-colors border-b-2 text-center font-semibold tracking-widest ${activeGateTab === 'passcode'
                    ? 'border-gold-leaf text-on-surface'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                  }`}
              >
                Atelier Passcode
              </button>
            </div>

            {activeGateTab === 'login' ? (
              <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-label-caps font-semibold text-zinc-400 uppercase tracking-widest block">ADMIN EMAIL</label>
                  <input
                    type="email"
                    placeholder="admin@stagbeetle.co.in"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                    className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2.5 px-3 text-[14px] outline-none text-left"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-label-caps font-semibold text-zinc-400 uppercase tracking-widest block">PASSWORD</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2.5 px-3 text-[14px] outline-none text-left"
                  />
                </div>

                {loginError && (
                  <p className="text-[11px] text-red-600 font-medium text-center">{loginError}</p>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-primary text-white py-3 font-label-caps text-label-caps tracking-[0.2em] font-semibold hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {loginLoading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {loginLoading ? 'AUTHORIZING…' : 'SIGN IN TO PORTAL'}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePasscodeSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-label-caps font-semibold text-zinc-400 uppercase tracking-widest block">PASSCODE</label>
                  <input
                    type="password"
                    placeholder="••••••••••••••"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    required
                    className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-3 px-4 text-center text-[16px] tracking-[0.25em] outline-none"
                  />
                </div>

                {passcodeError && (
                  <p className="text-[11px] text-red-600 font-medium text-center">{passcodeError}</p>
                )}

                <button
                  type="submit"
                  className="w-full bg-primary text-white py-3.5 font-label-caps text-label-caps tracking-[0.2em] font-semibold hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all shadow-md"
                >
                  AUTHORIZE ACCESS
                </button>
              </form>
            )}

            <div className="text-center mt-6">
              <Link href="/" className="text-[11px] font-semibold text-zinc-400 hover:text-gold-leaf transition-colors uppercase tracking-wider">
                ← Return to Storefront
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  const triggerFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4000);
  };

  // =========================================================================
  // PRODUCT CRUD HANDLERS
  // =========================================================================
  const openAddProduct = () => {
    setEditingProduct(null);
    setStyleCode('');
    setColorCode('');
    setSelectedSizes(['S', 'M', 'L', 'XL']);
    setColorName('');
    setColorHexState('#A0AAB2');
    setProductForm({
      title: '',
      price: 0,
      mrp: 0,
      category: 'Men',
      subcategory: 'Shirt',
      sleeve_type: 'Full Sleeves',
      sku: '',
      material: '',
      description: '',
      images: [],
      sizes: 'S, M, L, XL',
      colors: ''
    });
    setShowProductModal(true);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    const { styleCode: parsedStyle, colorCode: parsedColor } = parseSku(prod.sku);
    setStyleCode(parsedStyle);
    setColorCode(parsedColor);
    setSelectedSizes(prod.sizes);

    const rawColor = prod.colors[0] || '';
    const namePart = rawColor.split('|')[0] || '';
    const hexPart = rawColor.split('|')[1] || getColorHex(namePart);
    setColorName(namePart);
    setColorHexState(hexPart);

    setProductForm({
      title: prod.title,
      price: prod.price,
      mrp: prod.mrp || 0,
      category: prod.category,
      subcategory: prod.subcategory || 'Shirt',
      sleeve_type: prod.sleeve_type || 'Full Sleeves',
      sku: prod.sku || '',
      material: prod.material,
      description: prod.description,
      images: prod.images || [],
      sizes: prod.sizes.join(', '),
      colors: prod.colors.join(', ')
    });
    setShowProductModal(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // The rich-text description editor isn't a native <textarea>, so `required` doesn't apply — check manually
    if (!productForm.description.replace(/<[^>]*>/g, '').trim()) {
      triggerFeedback('error', 'Please provide a garment description.');
      return;
    }

    const imagesArray = productForm.images.filter(url => url.trim() !== '');

    const productPayload = {
      title: productForm.title,
      price: Number(productForm.price),
      mrp: Number(productForm.mrp) > 0 ? Number(productForm.mrp) : undefined,
      category: productForm.category,
      subcategory: productForm.subcategory,
      sleeve_type: productForm.subcategory === 'Shirt' ? (productForm.sleeve_type as any) : undefined,
      sku: productForm.sku.trim() || undefined,
      material: productForm.material,
      description: productForm.description,
      images: imagesArray,
      sizes: selectedSizes.length > 0 ? selectedSizes : ["One Size"],
      colors: colorName.trim() ? [`${colorName.trim()}|${colorHex.trim()}`] : ["Default"]
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productPayload);
        triggerFeedback('success', `Product "${productForm.title}" updated successfully!`);
      } else {
        await addProduct(productPayload);
        triggerFeedback('success', `Product "${productForm.title}" added to catalog!`);
      }
      setShowProductModal(false);
      loadData();
    } catch (err) {
      triggerFeedback('error', 'Failed to save product details.');
    }
  };

  // Builds a Product-shaped object from the in-progress form so the Preview
  // modal can render it through the exact same components as the live site.
  const buildPreviewProduct = (): Product => ({
    id: editingProduct?.id || 'preview',
    title: productForm.title,
    price: Number(productForm.price) || 0,
    mrp: Number(productForm.mrp) > 0 ? Number(productForm.mrp) : undefined,
    category: productForm.category,
    subcategory: productForm.subcategory,
    sleeve_type: productForm.subcategory === 'Shirt' ? (productForm.sleeve_type as any) : undefined,
    sku: productForm.sku,
    material: productForm.material,
    description: productForm.description,
    images: productForm.images,
    sizes: selectedSizes.length > 0 ? selectedSizes : ['One Size'],
    colors: colorName.trim() ? [`${colorName.trim()}|${colorHex.trim()}`] : ['Default'],
    rating: editingProduct?.rating,
  });

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from the catalog?`)) return;
    try {
      const ok = await deleteProduct(id);
      if (ok) {
        triggerFeedback('success', `Product "${name}" deleted.`);
        loadData();
      } else {
        triggerFeedback('error', 'Product not found.');
      }
    } catch (e) {
      triggerFeedback('error', 'Error deleting product.');
    }
  };

  // =========================================================================
  // BULK CATALOG UPLOADER
  // =========================================================================
  const handleBulkUpload = async () => {
    setBulkError('');
    setBulkSuccess('');
    try {
      const parsed = JSON.parse(bulkJsonText);
      if (!Array.isArray(parsed)) {
        setBulkError('Catalog must be a JSON array of products.');
        return;
      }

      // Quick validation
      for (const item of parsed) {
        if (!item.title || !item.price || !item.category || !item.material || !item.description) {
          setBulkError('Each product must include: title, price, category, material, description.');
          return;
        }
        if (!item.images || !Array.isArray(item.images)) {
          item.images = [];
        }
        if (!item.sizes || !Array.isArray(item.sizes)) {
          item.sizes = ["One Size"];
        }
        if (!item.colors || !Array.isArray(item.colors)) {
          item.colors = ["Default"];
        }
      }

      const uploaded = await bulkUploadProducts(parsed);
      setBulkSuccess(`Successfully imported ${uploaded.length} products to catalog!`);
      setBulkJsonText('');
      loadData();
    } catch (e: any) {
      setBulkError(`JSON Parsing Error: ${e.message}`);
    }
  };

  // =========================================================================
  // COUPON CREATION HANDLERS
  // =========================================================================
  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.code) {
      triggerFeedback('error', 'Please enter a coupon code.');
      return;
    }

    try {
      await createCoupon({
        code: couponForm.code,
        discount_type: couponForm.discount_type,
        discount_value: Number(couponForm.discount_value),
        min_order_value: couponForm.min_order_value > 0 ? Number(couponForm.min_order_value) : undefined,
        active: couponForm.active
      });

      triggerFeedback('success', `Promo code ${couponForm.code.toUpperCase()} registered!`);
      setCouponForm({
        code: '',
        discount_type: 'percentage',
        discount_value: 0,
        min_order_value: 0,
        active: true
      });
      loadData();
    } catch (err) {
      triggerFeedback('error', 'Error creating discount code.');
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    if (!confirm(`Remove coupon code "${code}"?`)) return;
    try {
      const ok = await deleteCoupon(code);
      if (ok) {
        triggerFeedback('success', `Coupon code "${code}" removed.`);
        loadData();
      }
    } catch (e) {
      triggerFeedback('error', 'Error deleting coupon.');
    }
  };

  const sampleJson = JSON.stringify([
    {
      "title": "Jaipur Summer Kurta",
      "price": 3200,
      "category": "Men",
      "material": "100% Organic Jaipur Linen",
      "description": "A crisp, lightweight summer kurta tailored with premium Mandarin collar and subtle gold button detailing.",
      "images": ["https://images.unsplash.com/photo-1597983073492-bc24058bd37f?q=80&w=2670"],
      "sizes": ["S", "M", "L", "XL"],
      "colors": ["Ivory White", "Sky Blue"]
    }
  ], null, 2);

  return (
    <div className="flex flex-col min-h-screen bg-surface selection:bg-gold-leaf/20 selection:text-on-surface">
      <Header />

      <main className="flex-1 relative z-10 py-12 md:py-16 bg-white">
        <div className="fixed inset-0 marble-overlay z-0"></div>

        <div className="max-w-container-max mx-auto px-6 md:px-12 relative z-10">

          {/* Page Title & Status */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-on-surface/10 pb-6 mb-8 gap-4">
            <div>
              <span className="font-label-caps text-[10px] text-gold-leaf tracking-[0.4em] block mb-1">STAGBEETLE SELLER PORTAL</span>
              <h1 className="font-display text-[32px] font-semibold text-on-surface">Atelier Dashboard</h1>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-green-600 animate-pulse"></span>
                <span className="text-[12px] font-semibold font-label-caps tracking-widest text-zinc-500">
                  ACTIVE ATELIER DEV ENGINE
                </span>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await logout();
                  window.location.href = '/';
                }}
                className="border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 text-[11px] font-bold tracking-widest uppercase transition-all rounded-sm flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[15px]">logout</span>
                Sign Out
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {feedbackMsg.text && (
            <div className={`mb-6 p-4 rounded-sm border text-[13px] font-medium transition-all ${feedbackMsg.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
              }`}>
              {feedbackMsg.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Sidebar Navigation */}
            <div className="lg:col-span-3 bg-surface-dim/40 border border-on-surface/5 p-4 rounded-sm space-y-2">
              <button
                type="button"
                onClick={() => router.push('/admin?tab=analytics')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-[12px] font-label-caps tracking-wider transition-all font-semibold ${activeTab === 'analytics'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-dim hover:text-on-surface'
                  }`}
              >
                <span className="material-symbols-outlined text-[18px]">query_stats</span>
                ATELIER ANALYTICS
              </button>

              <button
                type="button"
                onClick={() => router.push('/admin?tab=products')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-[12px] font-label-caps tracking-wider transition-all font-semibold ${activeTab === 'products'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-dim hover:text-on-surface'
                  }`}
              >
                <span className="material-symbols-outlined text-[18px]">apparel</span>
                GARMENT CATALOG
              </button>

              <button
                onClick={() => router.push('/admin?tab=coupons')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-[12px] font-label-caps tracking-wider transition-all font-semibold ${activeTab === 'coupons'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-dim hover:text-on-surface'
                  }`}
              >
                <span className="material-symbols-outlined text-[18px]">sell</span>
                DISCOUNT COUPONS
              </button>

              <button
                onClick={() => router.push('/admin?tab=orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-[12px] font-label-caps tracking-wider transition-all font-semibold ${activeTab === 'orders'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-dim hover:text-on-surface'
                  }`}
              >
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                ORDER REGISTRY
              </button>
            </div>

            {/* Dashboard Workspace */}
            <div className="lg:col-span-9 bg-white border border-on-surface/5 p-6 md:p-8 min-h-[500px]">

              {loading ? (
                <div className="flex justify-center py-24">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-leaf"></div>
                </div>
              ) : (
                <>
                  {/* TAB: ATELIER ANALYTICS */}
                  {activeTab === 'analytics' && (() => {
                    // 1. KPI Calculations
                    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
                    const totalOrders = orders.length;
                    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

                    const returnedOrders = orders.filter(o => o.shipping_status === 'Returned').length;
                    const returnRate = totalOrders > 0 ? ((returnedOrders / totalOrders) * 100).toFixed(1) : '0.0';

                    const deliveredOrders = orders.filter(o => o.shipping_status === 'Delivered').length;
                    const processingOrders = orders.filter(o => o.shipping_status === 'Processing' || !o.shipping_status).length;
                    const transitOrders = orders.filter(o => o.shipping_status === 'Shipped' || o.shipping_status === 'In Transit' || o.shipping_status === 'Scheduled').length;
                    const undeliveredOrders = orders.filter(o => o.shipping_status !== 'Delivered' && o.shipping_status !== 'Returned').length;

                    // Payment collections calculations
                    const paymentSuccessCount = orders.filter(o => (o.payment_status || '').toLowerCase() === 'paid').length;
                    const paymentFailedCount = orders.filter(o => (o.payment_status || '').toLowerCase() !== 'paid').length;

                    // 2. Category Sales Calculations
                    const categoryCounts: Record<string, number> = { Men: 0, Accessories: 0 };
                    const categoryRevenue: Record<string, number> = { Men: 0, Accessories: 0 };
                    let totalItemsSold = 0;

                    orders.forEach(o => {
                      o.items?.forEach(item => {
                        const prod = products.find(p => p.id === item.product_id);
                        const cat = prod?.category || 'Men';
                        const resolvedCat = ['Men', 'Accessories'].includes(cat) ? cat : 'Men';
                        categoryCounts[resolvedCat] += item.quantity;
                        categoryRevenue[resolvedCat] += item.price * item.quantity;
                        totalItemsSold += item.quantity;
                      });
                    });

                    // 3. Best Selling Products
                    const productSalesMap: Record<string, { title: string; count: number; revenue: number; image?: string }> = {};
                    orders.forEach(o => {
                      o.items?.forEach(item => {
                        if (!productSalesMap[item.product_id]) {
                          productSalesMap[item.product_id] = {
                            title: item.title,
                            count: 0,
                            revenue: 0,
                            image: item.image
                          };
                        }
                        productSalesMap[item.product_id].count += item.quantity;
                        productSalesMap[item.product_id].revenue += item.price * item.quantity;
                      });
                    });
                    const popularProducts = Object.values(productSalesMap).sort((a, b) => b.count - a.count).slice(0, 4);

                    // 4. Sales Trend Line Chart (Last 7 Days)
                    const last7Days = Array.from({ length: 7 }).map((_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - i);
                      return d;
                    }).reverse();

                    const dailyStats = last7Days.map(date => {
                      const dayStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                      const dayOrders = orders.filter(o => {
                        const oDate = new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                        return oDate === dayStr;
                      });
                      const revenue = dayOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
                      return {
                        label: dayStr,
                        revenue,
                        count: dayOrders.length
                      };
                    });

                    // Compute SVG line chart paths
                    const chartWidth = 500;
                    const chartHeight = 150;
                    const maxRevenue = Math.max(...dailyStats.map(d => d.revenue), 1000);

                    const chartPoints = dailyStats.map((d, index) => {
                      const x = (index / (dailyStats.length - 1)) * chartWidth;
                      // Max height minus padding
                      const y = chartHeight - (d.revenue / maxRevenue) * (chartHeight - 40) - 20;
                      return { x, y, ...d };
                    });

                    const pathD = chartPoints.reduce((acc, p, index) => {
                      return acc + (index === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
                    }, "");

                    const areaD = chartPoints.length > 0
                      ? `${pathD} L ${chartPoints[chartPoints.length - 1].x} ${chartHeight} L ${chartPoints[0].x} ${chartHeight} Z`
                      : "";

                    return (
                      <div className="space-y-8 animate-fade-in text-zinc-800">
                        {/* Tab Header */}
                        <div className="border-b border-on-surface/5 pb-4">
                          <h2 className="font-display text-[20px] font-semibold text-on-surface">Atelier Performance Analytics</h2>
                        </div>

                        {/* KPI Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Revenue Card */}
                          <div className="border border-on-surface/5 bg-surface-dim/20 p-5 rounded-sm flex items-center justify-between shadow-sm">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">TOTAL REVENUE</span>
                              <p className="font-display text-[24px] font-bold text-on-surface">₹{totalRevenue.toLocaleString('en-IN')}</p>
                              <span className="text-[10px] text-green-600 font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">trending_up</span> Live Atelier Sales
                              </span>
                            </div>
                            <span className="material-symbols-outlined text-[28px] text-gold-leaf bg-white p-3 rounded-full border shadow-sm">payments</span>
                          </div>

                          {/* Orders Card */}
                          <div className="border border-on-surface/5 bg-surface-dim/20 p-5 rounded-sm flex items-center justify-between shadow-sm">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">TOTAL RECEIPTS</span>
                              <p className="font-display text-[24px] font-bold text-on-surface">{totalOrders}</p>
                              <span className="text-[10px] text-zinc-500 font-medium">Receipt registry total</span>
                            </div>
                            <span className="material-symbols-outlined text-[28px] text-gold-leaf bg-white p-3 rounded-full border shadow-sm">receipt_long</span>
                          </div>

                          {/* AOV Card */}
                          <div className="border border-on-surface/5 bg-surface-dim/20 p-5 rounded-sm flex items-center justify-between shadow-sm">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">AVERAGE BASKET</span>
                              <p className="font-display text-[24px] font-bold text-on-surface">₹{avgOrderValue.toLocaleString('en-IN')}</p>
                              <span className="text-[10px] text-zinc-500 font-medium">Per order average</span>
                            </div>
                            <span className="material-symbols-outlined text-[28px] text-gold-leaf bg-white p-3 rounded-full border shadow-sm">shopping_bag</span>
                          </div>

                          {/* Returns Card */}
                          <div className="border border-on-surface/5 bg-surface-dim/20 p-5 rounded-sm flex items-center justify-between shadow-sm">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">RETURN RATE</span>
                              <p className="font-display text-[24px] font-bold text-on-surface">{returnRate}%</p>
                              <span className="text-[10px] text-zinc-500 font-medium">{returnedOrders} returned receipts</span>
                            </div>
                            <span className="material-symbols-outlined text-[28px] text-red-400 bg-white p-3 rounded-full border shadow-sm">assignment_return</span>
                          </div>
                        </div>

                        {/* Chart & Category Distribution */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                          {/* Daily Sales Trend SVG Chart */}
                          <div className="lg:col-span-8 border border-on-surface/5 p-6 rounded-sm space-y-4 shadow-sm bg-white">
                            <div className="flex justify-between items-center pb-2 border-b border-zinc-50">
                              <h3 className="font-label-caps text-[11px] text-[#0D1B2A] tracking-[0.25em] font-semibold uppercase">
                                WEEKLY REVENUE TREND (₹)
                              </h3>
                              <span className="text-[10px] bg-gold-leaf/10 text-gold-leaf font-bold px-2 py-0.5 rounded-sm">7-Day Horizon</span>
                            </div>

                            <div className="w-full relative pt-2">
                              {/* Responsive SVG Chart */}
                              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full overflow-visible">
                                <defs>
                                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#C5A059" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#C5A059" stopOpacity="0.0" />
                                  </linearGradient>
                                </defs>

                                {/* Grid Lines */}
                                <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#f4f4f5" strokeWidth="1" strokeDasharray="4 4" />
                                <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="#f4f4f5" strokeWidth="1" strokeDasharray="4 4" />
                                <line x1="0" y1={chartHeight - 20} x2={chartWidth} y2={chartHeight - 20} stroke="#f4f4f5" strokeWidth="1" strokeDasharray="4 4" />

                                {/* Filled Area */}
                                {areaD && <path d={areaD} fill="url(#chartGradient)" />}

                                {/* Line Path */}
                                {pathD && <path d={pathD} fill="none" stroke="#C5A059" strokeWidth="2.5" strokeLinecap="round" />}

                                {/* Data Points & Labels */}
                                {chartPoints.map((p, i) => (
                                  <g key={i} className="group cursor-pointer">
                                    <circle cx={p.x} cy={p.y} r="4" fill="#0D1B2A" stroke="#C5A059" strokeWidth="2" />
                                    {/* Tooltip on hover */}
                                    <text x={p.x} y={p.y - 12} textAnchor="middle" className="text-[9px] font-bold fill-[#0D1B2A] opacity-0 group-hover:opacity-100 transition-opacity bg-white">
                                      ₹{p.revenue}
                                    </text>
                                    <text x={p.x} y={chartHeight + 14} textAnchor="middle" className="text-[9px] font-semibold fill-zinc-400">
                                      {p.label}
                                    </text>
                                  </g>
                                ))}
                              </svg>
                            </div>
                          </div>

                          {/* Category Share */}
                          <div className="lg:col-span-4 border border-on-surface/5 p-6 rounded-sm space-y-6 shadow-sm bg-white">
                            <div className="space-y-4">
                              <h3 className="font-label-caps text-[11px] text-[#0D1B2A] tracking-[0.25em] font-semibold uppercase border-b border-zinc-50 pb-2">
                                SHARE BY CATEGORY
                              </h3>
                              <div className="space-y-3.5 text-[12px] font-medium">
                                {['Men', 'Accessories'].map(cat => {
                                  const count = categoryCounts[cat] || 0;
                                  const rev = categoryRevenue[cat] || 0;
                                  const pct = totalItemsSold > 0 ? Math.round((count / totalItemsSold) * 100) : 0;
                                  return (
                                    <div key={cat} className="space-y-1">
                                      <div className="flex justify-between items-baseline text-zinc-700">
                                        <span className="font-semibold">{cat}</span>
                                        <span>₹{rev.toLocaleString('en-IN')} ({pct}%)</span>
                                      </div>
                                      <div className="h-1.5 w-full bg-zinc-150 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-gold-leaf transition-all duration-500"
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Fulfillment and Payment Auditing Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Fulfillment Radar */}
                          <div className="border border-on-surface/5 p-6 rounded-sm space-y-6 shadow-sm bg-white">
                            <h3 className="font-label-caps text-[11px] text-[#0D1B2A] tracking-[0.25em] font-semibold uppercase border-b border-zinc-50 pb-2 flex items-center justify-between">
                              FULFILLMENT LOGISTICS RADAR
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded-sm">Shipping Status</span>
                            </h3>

                            {(() => {
                              const total = deliveredOrders + undeliveredOrders + returnedOrders;
                              const deliveredPct = total > 0 ? (deliveredOrders / total) * 100 : 0;
                              const undeliveredPct = total > 0 ? (undeliveredOrders / total) * 100 : 0;
                              const returnedPct = total > 0 ? (returnedOrders / total) * 100 : 0;

                              const R = 36;
                              const C = 2 * Math.PI * R; // ~226.195

                              const dashDelivered = `${(deliveredPct / 100) * C} ${C}`;
                              const offsetDelivered = 0;

                              const dashUndelivered = `${(undeliveredPct / 100) * C} ${C}`;
                              const offsetUndelivered = -((deliveredPct / 100) * C);

                              const dashReturned = `${(returnedPct / 100) * C} ${C}`;
                              const offsetReturned = -(((deliveredPct + undeliveredPct) / 100) * C);

                              return (
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                  {/* Donut Graphic */}
                                  <div className="relative w-32 h-32 shrink-0">
                                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                      <circle
                                        cx="50"
                                        cy="50"
                                        r={R}
                                        fill="transparent"
                                        stroke="#F4F4F5"
                                        strokeWidth="8"
                                      />
                                      {total > 0 ? (
                                        <>
                                          {deliveredPct > 0 && (
                                            <circle
                                              cx="50"
                                              cy="50"
                                              r={R}
                                              fill="transparent"
                                              stroke="#10B981"
                                              strokeWidth="8"
                                              strokeDasharray={dashDelivered}
                                              strokeDashoffset={offsetDelivered}
                                              strokeLinecap="round"
                                            />
                                          )}
                                          {undeliveredPct > 0 && (
                                            <circle
                                              cx="50"
                                              cy="50"
                                              r={R}
                                              fill="transparent"
                                              stroke="#C5A059"
                                              strokeWidth="8"
                                              strokeDasharray={dashUndelivered}
                                              strokeDashoffset={offsetUndelivered}
                                              strokeLinecap="round"
                                            />
                                          )}
                                          {returnedPct > 0 && (
                                            <circle
                                              cx="50"
                                              cy="50"
                                              r={R}
                                              fill="transparent"
                                              stroke="#EF4444"
                                              strokeWidth="8"
                                              strokeDasharray={dashReturned}
                                              strokeDashoffset={offsetReturned}
                                              strokeLinecap="round"
                                            />
                                          )}
                                        </>
                                      ) : (
                                        <circle
                                          cx="50"
                                          cy="50"
                                          r={R}
                                          fill="transparent"
                                          stroke="#E4E4E7"
                                          strokeWidth="8"
                                        />
                                      )}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                      <span className="text-[20px] font-bold text-[#0D1B2A]">{totalOrders}</span>
                                      <span className="text-[8px] font-bold tracking-widest text-zinc-400 uppercase">ORDERS</span>
                                    </div>
                                  </div>

                                  {/* Metrics List */}
                                  <div className="flex-1 w-full space-y-2.5">
                                    <div className="flex items-center justify-between p-2 rounded-sm border border-zinc-50 bg-zinc-50/50">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                                        <span className="text-[12px] font-semibold text-zinc-700">Delivered</span>
                                      </div>
                                      <span className="text-[12px] font-bold text-zinc-800">{deliveredOrders} ({Math.round(deliveredPct)}%)</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-sm border border-zinc-50 bg-zinc-50/50">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#C5A059]" />
                                        <span className="text-[12px] font-semibold text-zinc-700">Undelivered</span>
                                      </div>
                                      <span className="text-[12px] font-bold text-zinc-800">{undeliveredOrders} ({Math.round(undeliveredPct)}%)</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-sm border border-zinc-50 bg-zinc-50/50">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                                        <span className="text-[12px] font-semibold text-zinc-700">Returned</span>
                                      </div>
                                      <span className="text-[12px] font-bold text-zinc-800">{returnedOrders} ({Math.round(returnedPct)}%)</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Payment Collection */}
                          <div className="border border-on-surface/5 p-6 rounded-sm space-y-6 shadow-sm bg-white">
                            <h3 className="font-label-caps text-[11px] text-[#0D1B2A] tracking-[0.25em] font-semibold uppercase border-b border-zinc-50 pb-2 flex items-center justify-between">
                              PAYMENT COLLECTION AUDITING
                              <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded-sm">Ledger Status</span>
                            </h3>

                            {(() => {
                              const totalPayments = paymentSuccessCount + paymentFailedCount;
                              const paymentSuccessPct = totalPayments > 0 ? (paymentSuccessCount / totalPayments) * 100 : 0;
                              const paymentFailedPct = totalPayments > 0 ? (paymentFailedCount / totalPayments) * 100 : 0;

                              const R = 36;
                              const C = 2 * Math.PI * R;

                              const dashSuccess = `${(paymentSuccessPct / 100) * C} ${C}`;
                              const offsetSuccess = 0;

                              const dashFailed = `${(paymentFailedPct / 100) * C} ${C}`;
                              const offsetFailed = -((paymentSuccessPct / 100) * C);

                              return (
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                  {/* Donut Graphic */}
                                  <div className="relative w-32 h-32 shrink-0">
                                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                      <circle
                                        cx="50"
                                        cy="50"
                                        r={R}
                                        fill="transparent"
                                        stroke="#F4F4F5"
                                        strokeWidth="8"
                                      />
                                      {totalPayments > 0 ? (
                                        <>
                                          {paymentSuccessPct > 0 && (
                                            <circle
                                              cx="50"
                                              cy="50"
                                              r={R}
                                              fill="transparent"
                                              stroke="#10B981"
                                              strokeWidth="8"
                                              strokeDasharray={dashSuccess}
                                              strokeDashoffset={offsetSuccess}
                                              strokeLinecap="round"
                                            />
                                          )}
                                          {paymentFailedPct > 0 && (
                                            <circle
                                              cx="50"
                                              cy="50"
                                              r={R}
                                              fill="transparent"
                                              stroke="#EF4444"
                                              strokeWidth="8"
                                              strokeDasharray={dashFailed}
                                              strokeDashoffset={offsetFailed}
                                              strokeLinecap="round"
                                            />
                                          )}
                                        </>
                                      ) : (
                                        <circle
                                          cx="50"
                                          cy="50"
                                          r={R}
                                          fill="transparent"
                                          stroke="#E4E4E7"
                                          strokeWidth="8"
                                        />
                                      )}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                      <span className="text-[18px] font-bold text-green-600">{Math.round(paymentSuccessPct)}%</span>
                                      <span className="text-[8px] font-bold tracking-widest text-zinc-400 uppercase">SUCCESS</span>
                                    </div>
                                  </div>

                                  {/* Metrics List */}
                                  <div className="flex-1 w-full space-y-2.5">
                                    <div className="flex items-center justify-between p-2 rounded-sm border border-zinc-50 bg-zinc-50/50">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                                        <span className="text-[12px] font-semibold text-zinc-700">Payment Success</span>
                                      </div>
                                      <span className="text-[12px] font-bold text-zinc-800">{paymentSuccessCount} ({Math.round(paymentSuccessPct)}%)</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-sm border border-zinc-50 bg-zinc-50/50">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                                        <span className="text-[12px] font-semibold text-zinc-700">Payment Failed/Pending</span>
                                      </div>
                                      <span className="text-[12px] font-bold text-zinc-800">{paymentFailedCount} ({Math.round(paymentFailedPct)}%)</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Best Selling Products */}
                        <div className="border border-on-surface/5 p-6 rounded-sm bg-white shadow-sm space-y-4">
                          <h3 className="font-label-caps text-[11px] text-[#0D1B2A] tracking-[0.25em] font-semibold uppercase border-b border-zinc-50 pb-2">
                            BEST SELLING MASTER WEAVES
                          </h3>

                          {popularProducts.length === 0 ? (
                            <p className="text-zinc-400 text-center py-6 text-[13px] italic">No product sales recorded yet.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {popularProducts.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 border border-zinc-100 rounded-sm hover:bg-zinc-50 transition-colors">
                                  {p.image ? (
                                    <img src={p.image} alt={p.title} className="w-10 h-13 object-cover object-top rounded-sm aspect-[3/4]" />
                                  ) : (
                                    <div className="w-10 h-13 bg-zinc-50 rounded-sm flex items-center justify-center border text-zinc-400">
                                      <span className="material-symbols-outlined text-[18px]">image</span>
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1 text-[13px]">
                                    <h4 className="font-semibold text-zinc-800 truncate" title={p.title}>{p.title}</h4>
                                    <p className="text-zinc-400 text-[11px] font-medium">{p.count} units sold</p>
                                    <p className="text-gold-leaf font-bold text-[12px] mt-0.5">₹{p.revenue.toLocaleString('en-IN')}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    )
                  })()}

                  {/* TAB 1: PRODUCT CATALOG */}
                  {activeTab === 'products' && (
                    <div className="space-y-8">
                      <div className="flex justify-between items-baseline border-b border-on-surface/5 pb-4">
                        <h2 className="font-display text-[20px] font-semibold text-on-surface">Product Catalog Management</h2>
                        <button
                          onClick={openAddProduct}
                          className="bg-gold-leaf text-obsidian-charcoal px-5 py-2.5 text-[11px] font-label-caps tracking-widest font-semibold hover:bg-gold-leaf/90 transition-all shadow-sm"
                        >
                          ADD NEW GARMENT
                        </button>
                      </div>

                      {/* Search + Filters */}
                      {products.length > 0 && (
                        <div className="border border-on-surface/5 bg-surface-dim/30 p-4 rounded-sm space-y-3">
                          <div className="relative">
                            <span className="material-symbols-outlined text-[16px] text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2">search</span>
                            <input
                              type="text"
                              value={skuSearch}
                              onChange={(e) => { setSkuSearch(e.target.value); setVisibleProductCount(PRODUCTS_PER_CHUNK); }}
                              placeholder="Search by SKU or garment name..."
                              className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2.5 pl-9 pr-3 text-[13px] outline-none font-mono"
                            />
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <select
                              value={categoryFilter}
                              onChange={(e) => { setCategoryFilter(e.target.value); setVisibleProductCount(PRODUCTS_PER_CHUNK); }}
                              className="bg-white border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2 px-3 text-[12px] outline-none"
                            >
                              <option value="">All Categories</option>
                              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select
                              value={garmentTypeFilter}
                              onChange={(e) => { setGarmentTypeFilter(e.target.value); setVisibleProductCount(PRODUCTS_PER_CHUNK); }}
                              className="bg-white border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2 px-3 text-[12px] outline-none"
                            >
                              <option value="">All Garment Types</option>
                              {GARMENT_TYPE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <select
                              value={materialFilter}
                              onChange={(e) => { setMaterialFilter(e.target.value); setVisibleProductCount(PRODUCTS_PER_CHUNK); }}
                              className="bg-white border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2 px-3 text-[12px] outline-none max-w-[220px]"
                            >
                              <option value="">All Materials</option>
                              {materialOptions.map(m => <option key={m} value={m}>{m.length > 40 ? m.slice(0, 40) + '…' : m}</option>)}
                            </select>
                            {(skuSearch || categoryFilter || garmentTypeFilter || materialFilter) && (
                              <button
                                type="button"
                                onClick={() => { setSkuSearch(''); setCategoryFilter(''); setGarmentTypeFilter(''); setMaterialFilter(''); setVisibleProductCount(PRODUCTS_PER_CHUNK); }}
                                className="text-[11px] font-semibold text-zinc-500 hover:text-red-600 underline"
                              >
                                Clear Filters
                              </button>
                            )}
                            <span className="text-[11px] text-zinc-400 font-medium self-center ml-auto">
                              {filteredProducts.length} of {products.length} garments
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Products list table */}
                      {products.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-zinc-200 bg-zinc-50/50 rounded-sm">
                          <span className="material-symbols-outlined text-[48px] text-zinc-400 mb-3 block">inventory_2</span>
                          <p className="text-[14px] text-zinc-600 font-semibold mb-1">Your product catalog is empty</p>
                          <p className="text-[12px] text-zinc-400 max-w-sm mx-auto mb-4">
                            Get started by adding a new garment manually or pasting a JSON catalog array in the bulk uploader below.
                          </p>
                          <button
                            onClick={openAddProduct}
                            className="bg-gold-leaf text-obsidian-charcoal px-4 py-2 text-[10px] font-label-caps tracking-widest font-semibold hover:bg-gold-leaf/90 transition-all shadow-sm"
                          >
                            ADD YOUR FIRST GARMENT
                          </button>
                        </div>
                      ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-zinc-200 bg-zinc-50/50 rounded-sm">
                          <span className="material-symbols-outlined text-[36px] text-zinc-400 mb-2 block">search_off</span>
                          <p className="text-[13px] text-zinc-500 font-medium">No garments match your search or filters.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[13px]">
                            <thead>
                              <tr className="border-b border-on-surface/10 font-label-caps text-[10px] tracking-wider text-on-surface-variant font-bold">
                                <th className="pb-3">GARMENT DETAILS</th>
                                <th className="pb-3">SKU</th>
                                <th className="pb-3">CATEGORY</th>
                                <th className="pb-3 text-right">PRICE</th>
                                <th className="pb-3 text-center">RATING</th>
                                <th className="pb-3 text-right">CONTROLS</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-on-surface/5">
                              {paginatedProducts.map(prod => (
                                <tr key={prod.id} className="hover:bg-surface-dim/20 transition-colors">
                                  <td className="py-4 flex items-center gap-3">
                                    {prod.images && prod.images[0] ? (
                                      <img
                                        src={prod.images[0]}
                                        alt={prod.title}
                                        className="w-10 h-13 object-contain aspect-[3/4] border bg-zinc-50"
                                      />
                                    ) : (
                                      <div className="w-10 h-13 border border-dashed border-zinc-300 flex flex-col items-center justify-center bg-zinc-50 text-zinc-400 aspect-[3/4] text-[9px] font-semibold text-center leading-tight">
                                        No Image
                                      </div>
                                    )}
                                    <div>
                                      <div className="font-bold text-on-surface text-[14px]">{prod.title}</div>
                                      <div className="text-[11px] text-zinc-400 font-medium truncate max-w-sm">{prod.material}</div>
                                    </div>
                                  </td>
                                  <td className="py-4 font-mono text-[11px] text-zinc-500 uppercase">{prod.sku || '—'}</td>
                                  <td className="py-4 font-semibold uppercase text-[11px] text-zinc-500">{prod.subcategory ? `${prod.category} · ${prod.subcategory}` : prod.category}</td>
                                  <td className="py-4 text-right">
                                    <PriceDisplay price={prod.price} mrp={prod.mrp} size="sm" className="justify-end" />
                                  </td>
                                  <td className="py-4 text-center font-semibold text-on-surface-variant">{prod.rating || 5.0}</td>
                                  <td className="py-4 text-right space-x-2 whitespace-nowrap">
                                    <Link
                                      href={`/product/${prod.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] font-label-caps font-semibold text-zinc-500 hover:underline uppercase tracking-wider"
                                    >
                                      VIEW
                                    </Link>
                                    <button
                                      onClick={() => openEditProduct(prod)}
                                      className="text-[11px] font-label-caps font-semibold text-primary hover:underline uppercase tracking-wider"
                                    >
                                      EDIT
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProduct(prod.id, prod.title)}
                                      className="text-[11px] font-label-caps font-semibold text-red-600 hover:underline uppercase tracking-wider"
                                    >
                                      DELETE
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* Infinite scroll sentinel — every garment is reachable by scrolling, none hidden behind a page click */}
                          {paginatedProducts.length < filteredProducts.length ? (
                            <div ref={loadMoreRef} className="flex items-center justify-center py-5">
                              <span className="animate-spin border-2 border-gold-leaf border-t-transparent w-4 h-4 rounded-full" />
                            </div>
                          ) : (
                            <div className="text-center py-4 text-[11px] text-zinc-400 font-medium border-t border-on-surface/5 mt-2">
                              All {filteredProducts.length} garment{filteredProducts.length === 1 ? '' : 's'} loaded
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bulk Catalog Uploader Panel */}
                      <div className="border border-on-surface/5 p-6 bg-surface-dim/40 rounded-sm space-y-4">
                        <h3 className="font-label-caps text-[11px] text-gold-leaf tracking-[0.25em] font-semibold uppercase">
                          BULK CATALOG UPLOADER (JSON FORMAT)
                        </h3>
                        <p className="text-[12px] text-on-surface-variant leading-relaxed font-body">
                          Paste a JSON array of products to seed or bulk-update your shopify-style inventory catalog.
                        </p>

                        <textarea
                          rows={6}
                          placeholder={`[\n  {\n    "title": "Product Title",\n    "price": 1000,\n    ...\n  }\n]`}
                          value={bulkJsonText}
                          onChange={(e) => setBulkJsonText(e.target.value)}
                          className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm p-4 text-[12px] font-mono outline-none"
                        />

                        <div className="flex flex-col sm:flex-row justify-between items-baseline gap-4 pt-2">
                          <button
                            onClick={() => setBulkJsonText(sampleJson)}
                            className="text-[10px] font-label-caps tracking-widest text-[#5f259f] hover:underline uppercase font-bold"
                          >
                            LOAD MOCK SAMPLE JSON
                          </button>

                          <button
                            onClick={handleBulkUpload}
                            className="bg-primary text-white px-6 py-2.5 text-[11px] font-label-caps tracking-widest font-semibold hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all shadow-sm"
                          >
                            IMPORT BULK CATALOG
                          </button>
                        </div>

                        {bulkError && (
                          <div className="bg-red-50 border border-red-200 text-red-800 text-[12px] py-3 px-4 font-mono rounded-sm">
                            {bulkError}
                          </div>
                        )}
                        {bulkSuccess && (
                          <div className="bg-green-50 border border-green-200 text-green-800 text-[12px] py-3 px-4 rounded-sm font-semibold">
                            {bulkSuccess}
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  {/* TAB 2: COUPONS & DISCOUNTS */}
                  {activeTab === 'coupons' && (
                    <div className="space-y-8">
                      <div className="border-b border-on-surface/5 pb-4">
                        <h2 className="font-display text-[20px] font-semibold text-on-surface">Discount Coupons Management</h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        {/* Left Side: Create Coupon Form */}
                        <form onSubmit={handleCouponSubmit} className="md:col-span-5 border border-on-surface/5 p-5 bg-surface-dim/20 space-y-4">
                          <h3 className="font-label-caps text-[11px] text-gold-leaf tracking-[0.2em] font-semibold uppercase">
                            CREATE PROMO CODE
                          </h3>

                          <div className="space-y-1">
                            <label className="text-[10px] font-label-caps font-semibold text-on-surface-variant">COUPON CODE</label>
                            <input
                              type="text"
                              placeholder="e.g. WELCOME30"
                              value={couponForm.code}
                              onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value }))}
                              className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2 px-3 text-[13px] uppercase outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-label-caps font-semibold text-on-surface-variant">DISCOUNT METHOD</label>
                            <select
                              value={couponForm.discount_type}
                              onChange={(e) => setCouponForm(prev => ({ ...prev, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                              className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2 px-3 text-[13px] outline-none"
                            >
                              <option value="percentage">Percentage Deduction (%)</option>
                              <option value="fixed">Flat Rupee Amount (₹)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-label-caps font-semibold text-on-surface-variant">
                              DISCOUNT VALUE {couponForm.discount_type === 'percentage' ? '(%)' : '(₹)'}
                            </label>
                            <input
                              type="number"
                              value={couponForm.discount_value || ''}
                              onChange={(e) => setCouponForm(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
                              placeholder={couponForm.discount_type === 'percentage' ? 'e.g. 20' : 'e.g. 1000'}
                              className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2 px-3 text-[13px] outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-label-caps font-semibold text-on-surface-variant">MIN ORDER AMOUNT REQUIRED (₹)</label>
                            <input
                              type="number"
                              value={couponForm.min_order_value || ''}
                              onChange={(e) => setCouponForm(prev => ({ ...prev, min_order_value: Number(e.target.value) }))}
                              placeholder="e.g. 3000 (Optional)"
                              className="w-full bg-white border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2 px-3 text-[13px] outline-none"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-primary text-white py-3 font-label-caps text-label-caps tracking-widest font-semibold hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all shadow-sm"
                          >
                            REGISTER DISCOUNT
                          </button>
                        </form>

                        {/* Right Side: Coupons List */}
                        <div className="md:col-span-7 space-y-4">
                          <h3 className="font-label-caps text-[11px] text-zinc-500 tracking-[0.2em] font-semibold uppercase">
                            ACTIVE PROMO CODES
                          </h3>

                          <div className="border border-on-surface/5 rounded-sm divide-y divide-on-surface/5 text-[13px]">
                            {coupons.map(coupon => (
                              <div key={coupon.code} className="p-4 flex items-center justify-between hover:bg-surface-dim/20 transition-colors">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-purple-100 text-[#5f259f] font-mono font-bold px-2 py-0.5 rounded-sm uppercase text-[12px] border border-purple-200">
                                      {coupon.code}
                                    </span>
                                    <span className={`h-1.5 w-1.5 rounded-full ${coupon.active ? 'bg-green-600' : 'bg-zinc-400'}`}></span>
                                  </div>
                                  <p className="text-zinc-500 text-[12px]">
                                    Worth: <span className="font-bold text-zinc-800">{coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`} off</span>
                                    {coupon.min_order_value && ` | Min Order: ₹${coupon.min_order_value}`}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteCoupon(coupon.code)}
                                  className="material-symbols-outlined text-[18px] text-red-500 hover:text-red-700 transition-colors"
                                >
                                  delete
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 3: ORDER REGISTRY */}
                  {activeTab === 'orders' && (
                    <div className="space-y-8">
                      <div className="border-b border-on-surface/5 pb-4">
                        <h2 className="font-display text-[20px] font-semibold text-on-surface">Order Registry Log (CRM)</h2>
                      </div>

                      {orders.length === 0 ? (
                        <div className="text-center py-20 text-on-surface-variant font-body">
                          No order receipts logged in the database yet.
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {orders.map(order => (
                            <div key={order.id} className="border border-on-surface/5 p-5 bg-surface-dim/10 rounded-sm space-y-4 text-[13px]">

                              {/* Order Header */}
                              <div className="flex justify-between items-baseline border-b border-on-surface/10 pb-2.5">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-on-surface text-[14px]">{order.id}</span>
                                  <p className="text-[11px] text-zinc-400">{new Date(order.created_at).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                  <span className="bg-green-100 text-green-800 text-[10px] font-label-caps tracking-widest px-2.5 py-0.5 rounded-sm font-bold uppercase">
                                    {order.payment_method}
                                  </span>
                                </div>
                              </div>

                              {/* Customer Details */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-on-surface-variant border-b border-on-surface/5 pb-4">
                                <div>
                                  <h4 className="text-[10px] font-label-caps font-semibold text-zinc-400 mb-0.5">CUSTOMER</h4>
                                  <p className="font-bold text-zinc-800">{order.customer_name}</p>
                                  <p className="text-[12px]">{order.customer_email}</p>
                                </div>
                                <div>
                                  <h4 className="text-[10px] font-label-caps font-semibold text-zinc-400 mb-0.5">DELIVERY ADDRESS</h4>
                                  <p className="text-[12px] truncate max-w-sm" title={order.shipping_address}>{order.shipping_address}</p>
                                </div>
                              </div>

                              {/* Order Items */}
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-label-caps font-semibold text-zinc-400">ORDERED PIECES</h4>
                                <div className="divide-y divide-on-surface/5 font-body">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-2 first:pt-0 last:pb-0">
                                      <span className="font-medium text-zinc-800 truncate max-w-[80%]">
                                        {item.title} ({item.selected_size} / {item.selected_color}) <span className="font-bold text-zinc-400">x{item.quantity}</span>
                                      </span>
                                      <span className="font-semibold text-zinc-800">₹{item.price * item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Totals */}
                              <div className="border-t border-on-surface/10 pt-3 flex justify-between items-baseline font-body">
                                <div className="text-[11px] text-on-surface-variant font-semibold">
                                  {order.coupon_applied && (
                                    <span className="text-[#5f259f] font-mono font-bold uppercase">
                                      COUPON: {order.coupon_applied} (-₹{order.discount_amount})
                                    </span>
                                  )}
                                </div>

                                <div className="text-right flex items-baseline gap-2">
                                  <span className="text-on-surface-variant text-[11px] font-label-caps">Total Charged:</span>
                                  <span className="text-gold-leaf font-bold text-[18px]">₹{order.total_price}</span>
                                </div>
                              </div>

                              {/* Shipment Controls */}
                              <div className="border-t border-on-surface/5 pt-4 mt-4 space-y-3 bg-zinc-50/50 p-4 rounded-sm text-[13px]">
                                <h4 className="text-[10px] font-label-caps font-semibold text-zinc-400">SHIPMENT TRACKING DETAILS</h4>
                                <div className="flex flex-wrap gap-4 items-end">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Carrier</label>
                                    <select
                                      value={order.shipping_carrier || 'Delhivery'}
                                      onChange={async (e) => {
                                        const carrier = e.target.value as any;
                                        await updateOrderShipping(
                                          order.id,
                                          carrier,
                                          order.tracking_number || `DEL${Math.floor(100000000 + Math.random() * 900000000)}`,
                                          order.shipping_status || 'Scheduled'
                                        );
                                        loadData();
                                      }}
                                      className="bg-white border border-zinc-200 rounded-sm py-1.5 px-3 text-[12px] outline-none"
                                    >
                                      <option value="Delhivery">Delhivery</option>
                                      <option value="India Post">India Post</option>
                                      <option value="Blue Dart">Blue Dart</option>
                                      <option value="DHL">DHL</option>
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Status</label>
                                    <select
                                      value={order.shipping_status || 'Scheduled'}
                                      onChange={async (e) => {
                                        const status = e.target.value as any;
                                        await updateOrderShipping(
                                          order.id,
                                          order.shipping_carrier || 'Delhivery',
                                          order.tracking_number || `DEL${Math.floor(100000000 + Math.random() * 900000000)}`,
                                          status
                                        );
                                        loadData();
                                      }}
                                      className="bg-white border border-zinc-200 rounded-sm py-1.5 px-3 text-[12px] outline-none font-semibold text-zinc-700"
                                    >
                                      <option value="Processing">Processing</option>
                                      <option value="Scheduled">Scheduled</option>
                                      <option value="Shipped">Shipped</option>
                                      <option value="In Transit">In Transit</option>
                                      <option value="Delivered">Delivered</option>
                                      <option value="Returned">Returned</option>
                                    </select>
                                  </div>

                                  <div className="space-y-1 flex-1 min-w-[200px]">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Tracking ID</label>
                                    <input
                                      type="text"
                                      defaultValue={order.tracking_number || ''}
                                      placeholder="e.g. DKV123456789"
                                      onBlur={async (e) => {
                                        const val = e.target.value.trim();
                                        if (val && val !== order.tracking_number) {
                                          await updateOrderShipping(
                                            order.id,
                                            order.shipping_carrier || 'Delhivery',
                                            val,
                                            order.shipping_status || 'Scheduled'
                                          );
                                          loadData();
                                        }
                                      }}
                                      className="bg-white border border-zinc-200 rounded-sm py-1.5 px-3 text-[12px] outline-none w-full"
                                    />
                                  </div>
                                </div>
                              </div>

                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  )}
                </>
              )}

            </div>

          </div>

        </div>
      </main>

      {/* ========================================================================= */}
      {/* PRODUCT FORM MODAL (Add/Edit)                                            */}
      {/* ========================================================================= */}
      {showProductModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm">
          <form
            onSubmit={handleProductSubmit}
            className="bg-white w-full max-w-2xl rounded-sm shadow-2xl border border-on-surface/10 overflow-hidden text-zinc-800 max-h-[90vh] flex flex-col"
          >
            <div className="px-6 py-4 border-b border-on-surface/10 bg-surface-dim/40 flex justify-between items-center shrink-0">
              <h3 className="font-display text-[18px] font-semibold text-on-surface">
                {editingProduct ? `Edit Garment Specifications: ${editingProduct.title}` : 'Add New Garment to Catalog'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="material-symbols-outlined text-[20px] text-zinc-400 hover:text-zinc-600"
              >
                close
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-label-caps font-semibold text-on-surface-variant">GARMENT NAME</label>
                  <input
                    type="text"
                    required
                    value={productForm.title}
                    onChange={(e) => setProductForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Structured Linen Kurta"
                    className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
                  />
                </div>

                {/* Style Code & Color Code (SKU Auto-generation) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-label-caps font-semibold text-on-surface-variant">STYLE CODE</label>
                    <input
                      type="text"
                      required
                      value={styleCode}
                      onChange={(e) => setStyleCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SATN"
                      className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2.5 px-3.5 text-[13px] outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-label-caps font-semibold text-on-surface-variant">COLOR CODE</label>
                    <input
                      type="text"
                      required
                      value={colorCode}
                      onChange={(e) => setColorCode(e.target.value.toUpperCase())}
                      placeholder="e.g. CRM"
                      className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2.5 px-3.5 text-[13px] outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Derived SKU preview */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-label-caps font-semibold text-on-surface-variant">GENERATED SKU</label>
                  <div className="w-full bg-zinc-50 border border-zinc-200 rounded-sm py-2.5 px-3.5 text-[13px] font-mono text-zinc-600">
                    {productForm.sku || 'Please enter Style Code & Color Code'}
                  </div>
                  {(() => {
                    const currentSkuBase = getSkuBase(productForm.sku);
                    const referencedColorVariants = currentSkuBase
                      ? products.filter(p => p.sku !== productForm.sku && getSkuBase(p.sku) === currentSkuBase)
                      : [];
                    if (referencedColorVariants.length === 0) return null;
                    return (
                      <div className="mt-1.5 p-2 bg-[#F9F6F0] border border-[#C5A059]/20 rounded-sm text-[11px] text-[#0D1B2A] space-y-1">
                        <p className="font-bold uppercase tracking-wider text-[9px] text-[#C5A059]">
                          {currentSkuBase} has {referencedColorVariants.length + (editingProduct ? 1 : 0)} color variant{referencedColorVariants.length + (editingProduct ? 1 : 0) > 1 ? 's' : ''} in catalog:
                        </p>
                        <ul className="list-disc list-inside space-y-0.5 font-medium text-zinc-600">
                          {referencedColorVariants.map(v => (
                            <li key={v.id}>
                              <span className="font-mono font-bold text-zinc-800">{v.sku}</span>: {v.colors.map(getColorName).join(', ')} ({v.title})
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </div>

                {/* Selling Price & MRP */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-label-caps font-semibold text-on-surface-variant">SELLING PRICE (₹)</label>
                    <input
                      type="number"
                      required
                      value={productForm.price || ''}
                      onChange={(e) => setProductForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                      placeholder="e.g. 3200"
                      className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-label-caps font-semibold text-on-surface-variant">MRP (₹) — OPTIONAL</label>
                    <input
                      type="number"
                      value={productForm.mrp || ''}
                      onChange={(e) => setProductForm(prev => ({ ...prev, mrp: Number(e.target.value) }))}
                      placeholder="e.g. 4500"
                      className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
                    />
                    {productForm.mrp > 0 && productForm.mrp <= productForm.price && (
                      <p className="text-[10px] text-amber-600">MRP must be higher than Selling Price to show a discount.</p>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-label-caps font-semibold text-on-surface-variant">CATEGORY</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
                  >
                    <option value="Men">Men</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>

                {/* Garment Type (Subcategory) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-label-caps font-semibold text-on-surface-variant">GARMENT TYPE (SUBCATEGORY)</label>
                  <select
                    value={productForm.subcategory}
                    onChange={(e) => setProductForm(prev => ({ ...prev, subcategory: e.target.value }))}
                    className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
                  >
                    <option value="Shirt">Shirt</option>
                    <option value="Jeans">Jeans</option>
                    <option value="Tshirt">Tshirt</option>
                    <option value="Track pant">Track pant</option>
                    <option value="Shorts">Shorts</option>
                    <option value="Jacket">Jacket</option>
                  </select>
                </div>

                {/* Sleeve Type dropdown - Visible only for Shirts */}
                {productForm.subcategory === 'Shirt' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-label-caps font-semibold text-on-surface-variant">SLEEVES</label>
                    <select
                      value={productForm.sleeve_type}
                      onChange={(e) => setProductForm(prev => ({ ...prev, sleeve_type: e.target.value }))}
                      className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
                    >
                      <option value="Half Sleeves">Half Sleeves</option>
                      <option value="Full Sleeves">Full Sleeves</option>
                    </select>
                  </div>
                )}

                {/* Material */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-label-caps font-semibold text-on-surface-variant">FABRIC SPECIFICATION</label>
                  <input
                    type="text"
                    required
                    value={productForm.material}
                    onChange={(e) => setProductForm(prev => ({ ...prev, material: e.target.value }))}
                    placeholder="e.g. 100% Organic Jaipur Linen"
                    className="w-full bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-label-caps font-semibold text-on-surface-variant">DESCRIPTION</label>
                  <RichTextEditor
                    key={editingProduct?.id || 'new'}
                    value={productForm.description}
                    onChange={(html) => setProductForm(prev => ({ ...prev, description: html }))}
                    placeholder="Provide details about weave, cuts, tailoring..."
                  />
                </div>

                {/* Color Name and Color Hex */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-label-caps font-semibold text-on-surface-variant block">GARMENT COLOR</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={colorName}
                      onChange={(e) => setColorName(e.target.value)}
                      placeholder="e.g. Sage Mint"
                      className="flex-1 bg-surface-dim border border-on-surface/15 focus:border-gold-leaf focus:ring-0 rounded-sm py-2.5 px-3.5 text-[13px] outline-none"
                    />
                    <div className="flex items-center gap-1.5 border border-on-surface/15 bg-surface-dim rounded-sm px-2 shrink-0">
                      <input
                        type="color"
                        value={colorHex}
                        onChange={(e) => setColorHexState(e.target.value)}
                        className="w-7 h-7 border-0 cursor-pointer bg-transparent rounded-sm"
                      />
                      <input
                        type="text"
                        value={colorHex}
                        onChange={(e) => setColorHexState(e.target.value)}
                        placeholder="#A0AAB2"
                        maxLength={7}
                        className="w-16 bg-transparent border-0 text-[11px] font-mono text-zinc-600 outline-none p-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Sizes Toggles */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-label-caps font-semibold text-on-surface-variant block">AVAILABLE SIZES</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'].map(sz => {
                      const isSelected = selectedSizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => {
                            setSelectedSizes(prev => 
                              prev.includes(sz) ? prev.filter(s => s !== sz) : [...prev, sz]
                            );
                          }}
                          className={`min-w-[40px] h-9 border text-[11px] font-bold rounded-sm flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'bg-[#052A42] border-[#052A42] text-white' 
                              : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Generated Size SKUs Preview */}
                <div className="sm:col-span-2 space-y-1.5 bg-zinc-50 border border-zinc-200 rounded-sm p-3">
                  <span className="text-[10px] font-label-caps font-bold text-[#C5A059] block tracking-wider">
                    Generated Size-Specific SKUs Naming Preview:
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    {selectedSizes.map(sz => (
                      <span key={sz} className="bg-white border border-zinc-200 text-zinc-600 font-mono text-[11px] px-2 py-1 rounded-sm">
                        {styleCode && colorCode ? `${styleCode}-${colorCode}-${sz}`.toUpperCase() : `[STYLE]-[COLOR]-${sz}`}
                      </span>
                    ))}
                    {selectedSizes.length === 0 && (
                      <span className="text-zinc-400 text-[11px] italic">No sizes selected.</span>
                    )}
                  </div>
                </div>

                {/* Images */}
                <div className="sm:col-span-2 space-y-2">
                  <span className="text-[11px] font-label-caps font-semibold text-on-surface-variant block border-b pb-1">
                    GARMENT IMAGES (UP TO 6)
                  </span>
                  <ImageUploadGrid
                    images={productForm.images}
                    onChange={(images) => setProductForm(prev => ({ ...prev, images }))}
                    onUploadFile={handleImageUpload}
                    onRemoveFile={handleRemoveImage}
                    disabled={!productForm.sku.trim()}
                    disabledReason="Please fill in the Style Code & Color Code first, so uploaded files can be named and organized in storage."
                    maxImages={6}
                  />
                </div>

              </div>

            </div>

            <div className="px-6 py-4 border-t border-on-surface/10 flex justify-between items-center gap-3 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                disabled={!productForm.title.trim() || productForm.images.length === 0}
                className="border border-[#0D1B2A]/20 text-[#0D1B2A] px-5 py-2.5 text-[11px] font-label-caps tracking-widest font-semibold hover:bg-[#0D1B2A] hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#0D1B2A]"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                PREVIEW
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="border border-on-surface/15 text-on-surface-variant px-5 py-2.5 text-[11px] font-label-caps tracking-widest font-semibold hover:bg-zinc-50"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-8 py-2.5 text-[11px] font-label-caps tracking-widest font-semibold hover:bg-gold-leaf hover:text-obsidian-charcoal transition-all shadow-sm"
                >
                  {editingProduct ? 'SAVE CHANGES' : 'PUBLISH GARMENT'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {showPreview && (
        <ProductPreviewModal product={buildPreviewProduct()} onClose={() => setShowPreview(false)} />
      )}

      <Footer />
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}

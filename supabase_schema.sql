-- Database Schema for Stag Beetle E-commerce
-- Run this in your Supabase SQL Editor to initialize the tables.

-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    price NUMERIC NOT NULL,
    category TEXT NOT NULL,
    material TEXT NOT NULL,
    description TEXT NOT NULL,
    images TEXT[] NOT NULL,
    sizes TEXT[] NOT NULL,
    colors TEXT[] NOT NULL,
    rating NUMERIC
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow public read access to products
CREATE POLICY "Allow public read access to products" 
ON public.products FOR SELECT 
USING (true);

-- Allow public management of products (admin CRM actions)
CREATE POLICY "Allow public product administration"
ON public.products FOR ALL
USING (true);

-- 2. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    total_price NUMERIC NOT NULL,
    items JSONB NOT NULL,
    payment_status TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    coupon_applied TEXT,
    discount_amount NUMERIC
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (checkout)
CREATE POLICY "Allow public order placement" 
ON public.orders FOR INSERT 
WITH CHECK (true);

-- Allow public select (order logs & tracking)
CREATE POLICY "Allow public order administration" 
ON public.orders FOR SELECT 
USING (true);

-- 3. Create Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
    code TEXT PRIMARY KEY,
    discount_type TEXT NOT NULL,
    discount_value NUMERIC NOT NULL,
    min_order_value NUMERIC,
    active BOOLEAN DEFAULT true NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Allow public select (coupon verification)
CREATE POLICY "Allow public read access to coupons" 
ON public.coupons FOR SELECT 
USING (true);

-- Allow public administration (coupon creation/deletion)
CREATE POLICY "Allow public coupon administration"
ON public.coupons FOR ALL
USING (true);

-- 4. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    zip TEXT,
    country TEXT DEFAULT 'India',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public profiles management (reads/writes)
CREATE POLICY "Allow public profiles management" 
ON public.profiles FOR ALL
USING (true);

-- 5. Seed Initial Products Data
INSERT INTO public.products (id, title, price, category, material, description, images, sizes, colors, rating)
VALUES 
(
    'prod_mesh_shirt', 
    'Geometric Mesh Shirt', 
    4500, 
    'Men', 
    'Hand-spun Banarasi Silk Blend', 
    'An editorial silhouette made from an ultra-lightweight hand-spun Banarasi silk and cotton blend, featuring geometric structural knit patterns and premium ribbed finishing. Hand-woven by master craftsmen in Varanasi and tailored in our Bengaluru atelier with delicate stitching that echoes the natural carapace divisions of the stag beetle.', 
    ARRAY[
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDmDzvAzJTmIHatCZxgSwlf1MmkVNyI4RiZnvsR2btkk-BB3MMifvBE5_p0Gnn8nmIB6Gl_FxOhmkNwmBzUvhZkCeBqkiKZtCXJf4yYQuqi8BHDChaHWqO-tIzBeNz43uIDnDloxVnK4VbbxtByCx90O7inKWzPtNsjIxUDOTdxTzdCGGRfowmN_GVzEYW4FDkRmxVRWHXWFKLQ0Ayo4P3i2fvQMgBjOz8tGHVAVupVEQaXcaIgoixS--KNwdqL5cg3yKEgCEeDOw',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCQ59ihterty67pzcAe4ayHiVOkTeMY5kAEsVoXzom_OrdNmNA_JRhlND4x5JrzlEvio5hZlZ3OCdXeYCTb9hyl6Cvvm6GPPC31pXpwf54S1j4QuvHr9E1R6S7-zkFTGnQ68W_mw-3dZ5Sa7uwi-qgKh20csPF5bzM-x2IpzX59fCId9ok5OxXLyDh5ECEWqDBkG4D5S4yuE7cKmsloyQexdSxmqao_E7BXOrv8YYmiWoIsnfG4bb8YgFikXsF1Bf9wlEfYCZ_wdg',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCXapvFHkOcx0WEucYZ-9tnMC1HH1a73LBj8kAzho0zr7iMjbZDHbDKOZfUEjz75_HRWLBFh-pd3JnUJCVYX04qIf6yd_26c--BD44-8Svegf6k1FaJ__T6H9oZI8XHOG7kRYaJ0YCxttox0uKgQ85slc__d2aN6NZZUig0h8_5srqYGO4-MEPZDdZu0dJdE6QDKOlhsfC69ak_xAuj5MYbCLx4V25Soq0B_GY4ApqGUVX6xcqw0hbPNdZC-lkbHn6CYowSwkEdiQ'
    ], 
    ARRAY['S', 'M', 'L', 'XL'], 
    ARRAY['Obsidian Black', 'Iridescent Silver', 'Beetle Navy'], 
    4.8
),
(
    'prod_carapace_blouse', 
    'Carapace Blouse', 
    8900, 
    'Women', 
    'Handloom Mulberry Silk', 
    'An elegant, architectural blouse crafted from double-weight mulberry handloom silk from South India. The sleeves feature layered pleats resembling the organic segments of beetle armor, catching light with a high-end subtle pearlized finish.', 
    ARRAY[
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD5e7Egs-WS54MBmdSXmNf_sktfUb4amxVc_IYDsJcgU914G1Yf_4MiacNatA957y1qBVLCpTNTAAZp2hhroZyHXUdw_Fw6k8E3BNP6TC2Gbj_cjmcofiU8eec6zTCSTXN-_HACfXBdhRSc5MPDnUXvHSL7knNdZk0ArOcB062vN1_syBPMo6vCpDvDqSnoib4lSuHT5VXaoNPhQelStsygck-demcFfAkmpCy_lfJkMyLOJQkcZpwkUDHDwjFpUG85CJxA6tv1ig',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDKTIPLINvzy8rl4Jv9mJRusZvRqrzeuDZA-jUMJ_mZdVunjXCqWtixJqChxDBoemXJlQkSkItaNVAmoCMKIbtVB_CID03e0SZD4NnAmZak4npW3Ro4CQy4CVHLun3zKaDyb5Ff0tTFySx4GgcwhGevUIAsm91UYmOc15k0hz8cxYt0frkuCAeQT8sYTXyJQXnyR26KWfYLX2qiu4-Tl3DCc6DD10toHv0hKszb44QLvqQh2LWGJyMOAps-rYO1Vl5NZeN7uzIJIQ',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCF5Um0vG8hZDTlYGLD_QWO5Qoh7AeroSEEZlxaFZD2ePP1vZT-G8CBD_98y2tV-1egMQ4bXGOfLkiKTWxy0kz793zOiC-SfihaYaypM_HaBVNGgPQBTK7TSBW5YkZ55FhyLGlgEQ9pU7cPTVOAg35kSG27XnRoGXblLtQJ2PFYo6CvYzFzV2u9nSlAZdVcxuUfckCNPA1twhmb76abZ-GvC2HjWX82eZ-AIK453oJ1e2s-2DqCeXyiPcwbAMWxWxBV1F-0tz3TOQ'
    ], 
    ARRAY['XS', 'S', 'M', 'L'], 
    ARRAY['Champagne Gold', 'Iridescent Silver', 'Ivory Cream'], 
    4.9
),
(
    'prod_sovereign_pin', 
    'Sovereign Pin', 
    5200, 
    'Accessories', 
    'Mysore Rosewood & 18k Gold Plated Brass', 
    'Signature accessory of the Stag Beetle collection. Individually hand-carved Mysore rosewood accents set in heavy 18k gold-plated brass. Crafted by local artisans in Karnataka, featuring intricate beetle anatomy detailing.', 
    ARRAY[
        'https://lh3.googleusercontent.com/aida/ADBb0ujuI2_8xrZraVJUnvd0iMQhTBBGvO71ZKMNA7L_2DF2hMX7OoG5aTr2Ok__rSo5vB0hbinoZmKueQlo8Yp5bJHGUAFXkxSGWEG4vtJT2TWCgA449ufY9Rfz8Eb87ZEJ2Akff7ketGf3Zjn-ClMVjagRiHEhYD1aE2RUxGSt6WapI9nFZdmht7TuClPMbi3T9rYAZo9J2ACYt2D4mvgvPCq_qMb8BCaVPtJ4Kf7OAHACgHsVf_qB_C-lsw',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBIwkP4JUVEwGzJ45XcprVDwHKhS42AgqyueYItiyU0NG78lDp3prZHcWi-GC0qUk9_mwzfcmGaTNOXvrG-xHbmh1B6fVssXs1KqjblJ9G7bthDFoi_hQ-dtitLOuw3thVNZR6v1KpGeP-GlqufYdutBbE5qhfQ0C4DeG3AzoANvg8MfCFnEezQyM2F0_2xRw0XwLxKJHvLAT1nyHz7HPhD6Snwt6We686LRezw80SpkI59icKW4GIDoFU0hsTXOy74YoQJjxiCTw',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD-XAJYyw_4lInrQySV7ztvYtTm_CaUecoHtqA7yCHtHdlx-AdzpowZiufiYfyi07l4pqEHFfY8rVx5QhNmB-8AJ99CGqb22GOjDvF0_vYwi5rQZ_PEsGFwj0UMW-rc-DPvWFLabTohsLMfXY4IVx-6_mpyg_K789KiDk6RUbkNXhdRdkZjirif3ECufmqgfGMwZYHNaxRqPJnwjeGGUKB3kuRmIQo9c7ucwXngyBMlCOBy0drYO3Eq2Tg9ccjczOeQ8g2PO8CFTw'
    ], 
    ARRAY['One Size'], 
    ARRAY['Gold Leaf / Mysore Rosewood', 'Silver / Mysore Rosewood'], 
    4.7
),
(
    'prod_obsidian_overcoat', 
    'Obsidian Overcoat', 
    14500, 
    'Men', 
    'Fine Kashmir Wool & Silk', 
    'A double-breasted structured overcoat constructed from ultra-dense premium Kashmir wool and lined with pure Mashru silk. Designed with a tall, protective collar, deep side slits, and a bespoke inner-lining displaying custom anatomical sketches.', 
    ARRAY[
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCXapvFHkOcx0WEucYZ-9tnMC1HH1a73LBj8kAzho0zr7iMjbZDHbDKOZfUEjz75_HRWLBFh-pd3JnUJCVYX04qIf6yd_26c--BD44-8Svegf6k1FaJ__T6H9oZI8XHOG7kRYaJ0YCxttox0uKgQ85slc__d2aN6NZZUig0h8_5srqYGO4-MEPZDdZu0dJdE6QDKOlhsfC69ak_xAuj5MYbCLx4V25Soq0B_GY4ApqGUVX6xcqw0hbPNdZC-lkbHn6CYowSwkEdiQ',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDnOmwMIE60ezysrVHLyPkkH7HSVRMP8a84q7z5wXkHkgB5h0PT8JstN7gp9Lno91of4-iqEtKNcDCnuZcqPt5ZPYMBgvOSitZTdyt5RhAD8VgA5HxQGqtlOcisVBfWChp-dp0Of9--STBgHMqkDg4ZKzM_hooAfJJ4FJXb-6ppn0_au6UWypGHjSEeKUThHzDL7fwVrqLWJsYB-Syfk6XUC10TGZtPuds87CrfpWcca6o-P1mrn0v8AMVitUFx5z4g2iInyTGGQA',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCQ59ihterty67pzcAe4ayHiVOkTeMY5kAEsVoXzom_OrdNmNA_JRhlND4x5JrzlEvio5hZlZ3OCdXeYCTb9hyl6Cvvm6GPPC31pXpwf54S1j4QuvHr9E1R6S7-zkFTGnQ68W_mw-3dZ5Sa7uwi-qgKh20csPF5bzM-x2IpzX59fCId9ok5OxXLyDh5ECEWqDBkG4D5S4yuE7cKmsloyQexdSxmqao_E7BXOrv8YYmiWoIsnfG4bb8YgFikXsF1Bf9wlEfYCZ_wdg'
    ], 
    ARRAY['M', 'L', 'XL'], 
    ARRAY['Obsidian Black', 'Charcoal Gray'], 
    5.0
),
(
    'prod_armor_trousers', 
    'Armor Trousers', 
    7200, 
    'Men', 
    'Jaipur Handloom Linen-Wool', 
    'Mid-rise trousers crafted from a bespoke hand-woven Jaipur linen and wool blend. Features signature sharp double front pleats and side belt loops in structural shapes, with adjustable gold buckle details that let you define the fit at the waist.', 
    ARRAY[
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDnOmwMIE60ezysrVHLyPkkH7HSVRMP8a84q7z5wXkHkgB5h0PT8JstN7gp9Lno91of4-iqEtKNcDCnuZcqPt5ZPYMBgvOSitZTdyt5RhAD8VgA5HxQGqtlOcisVBfWChp-dp0Of9--STBgHMqkDg4ZKzM_hooAfJJ4FJXb-6ppn0_au6UWypGHjSEeKUThHzDL7fwVrqLWJsYB-Syfk6XUC10TGZtPuds87CrfpWcca6o-P1mrn0v8AMVitUFx5z4g2iInyTGGQA',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCQ59ihterty67pzcAe4ayHiVOkTeMY5kAEsVoXzom_OrdNmNA_JRhlND4x5JrzlEvio5hZlZ3OCdXeYCTb9hyl6Cvvm6GPPC31pXpwf54S1j4QuvHr9E1R6S7-zkFTGnQ68W_mw-3dZ5Sa7uwi-qgKh20csPF5bzM-x2IpzX59fCId9ok5OxXLyDh5ECEWqDBkG4D5S4yuE7cKmsloyQexdSxmqao_E7BXOrv8YYmiWoIsnfG4bb8YgFikXsF1Bf9wlEfYCZ_wdg',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDmDzvAzJTmIHatCZxgSwlf1MmkVNyI4RiZnvsR2btkk-BB3MMifvBE5_p0Gnn8nmIB6Gl_FxOhmkNwmBzUvhZkCeBqkiKZtCXJf4yYQuqi8BHDChaHWqO-tIzBeNz43uIDnDloxVnK4VbbxtByCx90O7inKWzPtNsjIxUDOTdxTzdCGGRfowmN_GVzEYW4FDkRmxVRWHXWFKLQ0Ayo4P3i2fvQMgBjOz8tGHVAVupVEQaXcaIgoixS--KNwdqL5cg3yKEgCEeDOw'
    ], 
    ARRAY['S', 'M', 'L', 'XL'], 
    ARRAY['Charcoal Gray', 'Obsidian Black'], 
    4.6
),
(
    'prod_mulberry_silk_scarf', 
    'Carapace Silk Scarf', 
    2800, 
    'Accessories', 
    '100% Banarasi Mulberry Silk', 
    'A gorgeous, shimmering accessory showing stylized hand-sketched diagrams of beetle wings and anatomy. Printed on premium 100% Mulberry silk handloom woven in Varanasi, with delicate hand-rolled edges.', 
    ARRAY[
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBIwkP4JUVEwGzJ45XcprVDwHKhS42AgqyueYItiyU0NG78lDp3prZHcWi-GC0qUk9_mwzfcmGaTNOXvrG-xHbmh1B6fVssXs1KqjblJ9G7bthDFoi_hQ-dtitLOuw3thVNZR6v1KpGeP-GlqufYdutBbE5qhfQ0C4DeG3AzoANvg8MfCFnEezQyM2F0_2xRw0XwLxKJHvLAT1nyHz7HPhD6Snwt6We686LRezw80SpkI59icKW4GIDoFU0hsTXOy74YoQJjxiCTw',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD-XAJYyw_4lInrQySV7ztvYtTm_CaUecoHtqA7yCHtHdlx-AdzpowZiufiYfyi07l4pqEHFfY8rVx5QhNmB-8AJ99CGqb22GOjDvF0_vYwi5rQZ_PEsGFwj0UMW-rc-DPvWFLabTohsLMfXY4IVx-6_mpyg_K789KiDk6RUbkNXhdRdkZjirif3ECufmqgfGMwZYHNaxRqPJnwjeGGUKB3kuRmIQo9c7ucwXngyBMlCOBy0drYO3Eq2Tg9ccjczOeQ8g2PO8CFTw',
        'https://lh3.googleusercontent.com/aida/ADBb0ujuI2_8xrZraVJUnvd0iMQhTBBGvO71ZKMNA7L_2DF2hMX7OoG5aTr2Ok__rSo5vB0hbinoZmKueQlo8Yp5bJHGUAFXkxSGWEG4vtJT2TWCgA449ufY9Rfz8Eb87ZEJ2Akff7ketGf3Zjn-ClMVjagRiHEhYD1aE2RUxGSt6WapI9nFZdmht7TuClPMbi3T9rYAZo9J2ACYt2D4mvgvPCq_qMb8BCaVPtJ4Kf7OAHACgHsVf_qB_C-lsw'
    ], 
    ARRAY['One Size'], 
    ARRAY['Champagne Gold', 'Obsidian / Silver'], 
    4.8
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    material = EXCLUDED.material,
    description = EXCLUDED.description,
    images = EXCLUDED.images,
    sizes = EXCLUDED.sizes,
    colors = EXCLUDED.colors,
    rating = EXCLUDED.rating;

-- 6. Seed Coupons
INSERT INTO public.coupons (code, discount_type, discount_value, min_order_value, active)
VALUES
('WELCOME10', 'percentage', 10, NULL, true),
('STAGBEETLE20', 'percentage', 20, NULL, true),
('FESTIVE1000', 'fixed', 1000, 5000, true)
ON CONFLICT (code) DO UPDATE SET
    discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    min_order_value = EXCLUDED.min_order_value,
    active = EXCLUDED.active;

-- ============================================================
-- Stag Beetle E-commerce — Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to re-run: uses IF NOT EXISTS and ON CONFLICT DO UPDATE
-- ============================================================

-- ── 1. PROFILES ─────────────────────────────────────────────
-- Linked to auth.users via UUID. Auto-populated on Google OAuth.
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL DEFAULT '',
    email       TEXT NOT NULL DEFAULT '',
    phone       TEXT,
    address     TEXT,
    city        TEXT,
    zip         TEXT,
    country     TEXT DEFAULT 'India',
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Service role (used by server-side code) can do everything
CREATE POLICY "Service role full access to profiles"
    ON public.profiles FOR ALL
    USING (auth.role() = 'service_role');

-- ── Trigger: auto-create profile on new auth.users row ──────
-- This fires when a user signs up via Google OAuth or any provider.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'User'),
        COALESCE(NEW.email, ''),
        COALESCE(NEW.phone, '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 2. PRODUCTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    price       NUMERIC NOT NULL,
    category    TEXT NOT NULL,
    material    TEXT NOT NULL,
    description TEXT NOT NULL,
    images      TEXT[] NOT NULL DEFAULT '{}',
    sizes       TEXT[] NOT NULL DEFAULT '{}',
    colors      TEXT[] NOT NULL DEFAULT '{}',
    rating      NUMERIC
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read products"
    ON public.products FOR SELECT USING (true);

CREATE POLICY "Service role manages products"
    ON public.products FOR ALL USING (auth.role() = 'service_role');

-- Allow anon/authenticated to manage products (for admin CRM without service role)
CREATE POLICY "Authenticated admin manages products"
    ON public.products FOR ALL USING (true);


-- ── 3. ORDERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
    id               TEXT PRIMARY KEY,
    created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
    customer_name    TEXT NOT NULL,
    customer_email   TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    total_price      NUMERIC NOT NULL,
    items            JSONB NOT NULL DEFAULT '[]',
    payment_status   TEXT NOT NULL DEFAULT 'pending',
    payment_method   TEXT NOT NULL DEFAULT 'card',
    coupon_applied   TEXT,
    discount_amount  NUMERIC,
    user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Anyone can place an order (checkout)
CREATE POLICY "Public can insert orders"
    ON public.orders FOR INSERT WITH CHECK (true);

-- Users can view their own orders; admins via service role see all
CREATE POLICY "Users can view own orders"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Allow anon select for admin CRM
CREATE POLICY "Admin CRM can view all orders"
    ON public.orders FOR SELECT USING (true);


-- ── 4. COUPONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coupons (
    code             TEXT PRIMARY KEY,
    discount_type    TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value   NUMERIC NOT NULL,
    min_order_value  NUMERIC,
    active           BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active coupons"
    ON public.coupons FOR SELECT USING (true);

CREATE POLICY "Admin manages coupons"
    ON public.coupons FOR ALL USING (true);


-- ── 5. SEED PRODUCTS (updated Unsplash images) ──────────────
INSERT INTO public.products (id, title, price, category, material, description, images, sizes, colors, rating)
VALUES
(
    'prod_linen_kurta', 'Structured Linen Kurta', 6800, 'Men', 'Jaipur Handloom Linen',
    'A contemporary take on the classic kurta, cut from crisp handloom linen woven in Jaipur. Mandarin collar, concealed placket, and side slits give it a clean architectural silhouette.',
    ARRAY['https://images.unsplash.com/photo-1594938298603-c8148c4b4357?w=800&q=80','https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800&q=80','https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=800&q=80'],
    ARRAY['S','M','L','XL','XXL'], ARRAY['Ivory White','Slate Grey','Indigo'], 4.7
),
(
    'prod_bandhgala_jacket', 'Bandhgala Jacket', 12500, 'Men', 'Wool-Silk Blend, Bengaluru Atelier',
    'A Nehru-collar bandhgala jacket tailored in our Bengaluru atelier from a fine wool-silk blend. Slim-fit with single-button closure, welt pockets, and full Mashru silk lining.',
    ARRAY['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80','https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80','https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80'],
    ARRAY['S','M','L','XL'], ARRAY['Midnight Black','Ivory Cream','Forest Green'], 4.9
),
(
    'prod_mesh_shirt', 'Geometric Mesh Shirt', 4500, 'Men', 'Hand-spun Banarasi Silk Blend',
    'An editorial silhouette in ultra-lightweight Banarasi silk and cotton blend with geometric structural knit patterns. Hand-woven in Varanasi, tailored in our Bengaluru atelier.',
    ARRAY['https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&q=80','https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80','https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=800&q=80'],
    ARRAY['S','M','L','XL'], ARRAY['Obsidian Black','Iridescent Silver','Beetle Navy'], 4.8
),
(
    'prod_silk_shirt', 'Ikat Silk Shirt', 9200, 'Men', 'Pochampally Ikat Silk',
    'A statement shirt woven from authentic Pochampally ikat silk — each piece unique due to the resist-dyeing process. Camp collar, mother-of-pearl buttons, curved hem.',
    ARRAY['https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&q=80','https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80','https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=800&q=80'],
    ARRAY['S','M','L','XL'], ARRAY['Indigo & Gold','Rust & Ivory','Teal & Black'], 4.8
),
(
    'prod_obsidian_overcoat', 'Obsidian Overcoat', 14500, 'Men', 'Fine Kashmir Wool & Silk',
    'Double-breasted structured overcoat in ultra-dense Kashmir wool lined with pure Mashru silk. Tall protective collar, deep side slits, bespoke anatomical inner-lining.',
    ARRAY['https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80','https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80'],
    ARRAY['M','L','XL'], ARRAY['Obsidian Black','Charcoal Gray'], 5.0
),
(
    'prod_armor_trousers', 'Armor Trousers', 7200, 'Men', 'Jaipur Handloom Linen-Wool',
    'Mid-rise trousers in bespoke Jaipur linen-wool blend. Sharp double front pleats, structural belt loops, adjustable gold buckle details.',
    ARRAY['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80','https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80','https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80'],
    ARRAY['S','M','L','XL'], ARRAY['Charcoal Gray','Obsidian Black','Khaki'], 4.6
),
(
    'prod_mulberry_silk_kurta', 'Silk Kurta', 5800, 'Men', '100% Banarasi Mulberry Silk',
    'Classic straight-cut kurta in pure Banarasi mulberry silk. Subtle self-woven texture, mandarin collar, side slits. Pairs beautifully with churidar or straight trousers.',
    ARRAY['https://images.unsplash.com/photo-1594938298603-c8148c4b4357?w=800&q=80','https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800&q=80','https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=800&q=80'],
    ARRAY['S','M','L','XL','XXL'], ARRAY['Ivory White','Champagne Gold','Midnight Blue'], 4.8
),
(
    'prod_carapace_blouse', 'Carapace Blouse', 8900, 'Women', 'Handloom Mulberry Silk',
    'Architectural blouse in double-weight mulberry handloom silk. Layered pleated sleeves catch light with a pearlized finish. Handcrafted in our Bengaluru atelier.',
    ARRAY['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80','https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80','https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&q=80'],
    ARRAY['XS','S','M','L'], ARRAY['Champagne Gold','Iridescent Silver','Ivory Cream'], 4.9
),
(
    'prod_anarkali_gown', 'Anarkali Silk Gown', 18500, 'Women', 'Pure Banarasi Silk',
    'Floor-length Anarkali gown in pure Banarasi silk. Fitted bodice, dramatically flared skirt, intricate zari embroidery at neckline and cuffs. Handcrafted over 40 hours.',
    ARRAY['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80','https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800&q=80','https://images.unsplash.com/photo-1617019114583-affb34d1b3cd?w=800&q=80'],
    ARRAY['XS','S','M','L','XL'], ARRAY['Deep Crimson','Midnight Blue','Champagne Gold'], 5.0
),
(
    'prod_drape_saree', 'Architectural Drape Saree', 22000, 'Women', 'Kanjivaram Silk',
    'Contemporary pre-draped saree in heavyweight Kanjivaram silk. Structured pleated front panel, bold geometric zari border. Comes with fitted sleeveless blouse.',
    ARRAY['https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800&q=80','https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80','https://images.unsplash.com/photo-1617019114583-affb34d1b3cd?w=800&q=80'],
    ARRAY['XS','S','M','L'], ARRAY['Peacock Teal','Ivory & Gold','Burgundy'], 4.9
),
(
    'prod_linen_coord', 'Linen Co-ord Set', 11200, 'Women', 'Handloom Linen, Kutch Embroidery',
    'Boxy cropped jacket and wide-leg trousers in handloom linen. Hand-embroidered Kutch mirror-work at collar and cuffs. Effortlessly elegant for day or evening.',
    ARRAY['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80','https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80','https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&q=80'],
    ARRAY['XS','S','M','L','XL'], ARRAY['Natural Ecru','Sage Green','Dusty Rose'], 4.7
),
(
    'prod_linen_trousers_women', 'Wide-Leg Linen Trousers', 7800, 'Women', 'Handloom Linen, Jaipur',
    'Relaxed wide-leg trousers in crisp handloom linen. High-rise waist, wide waistband, side pockets, clean straight hem.',
    ARRAY['https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80','https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80','https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80'],
    ARRAY['XS','S','M','L','XL'], ARRAY['Natural Ecru','Slate Blue','Terracotta'], 4.8
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, price = EXCLUDED.price, category = EXCLUDED.category,
    material = EXCLUDED.material, description = EXCLUDED.description,
    images = EXCLUDED.images, sizes = EXCLUDED.sizes,
    colors = EXCLUDED.colors, rating = EXCLUDED.rating;


-- ── 6. SEED COUPONS ─────────────────────────────────────────
INSERT INTO public.coupons (code, discount_type, discount_value, min_order_value, active)
VALUES
    ('WELCOME10',    'percentage', 10,   NULL, true),
    ('STAGBEETLE20', 'percentage', 20,   NULL, true),
    ('FESTIVE1000',  'fixed',      1000, 5000, true)
ON CONFLICT (code) DO UPDATE SET
    discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    min_order_value = EXCLUDED.min_order_value,
    active = EXCLUDED.active;

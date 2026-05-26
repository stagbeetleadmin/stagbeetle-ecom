-- ============================================================
-- Stag Beetle E-commerce — Supabase Schema
-- SAFE RE-RUNNABLE VERSION
-- ============================================================

-- ============================================================
-- 1. PROFILES
-- ============================================================

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

-- Drop existing policies before recreating
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access to profiles" ON public.profiles;

-- Policies
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role full access to profiles"
ON public.profiles
FOR ALL
USING (auth.role() = 'service_role');


-- ============================================================
-- AUTO CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        name,
        email,
        phone
    )
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1),
            'User'
        ),
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
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 2. PRODUCTS
-- ============================================================

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

-- Drop old policies
DROP POLICY IF EXISTS "Public read products" ON public.products;
DROP POLICY IF EXISTS "Service role manages products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users manage products" ON public.products;

-- Public can read
CREATE POLICY "Public read products"
ON public.products
FOR SELECT
USING (true);

-- Backend/service role full access
CREATE POLICY "Service role manages products"
ON public.products
FOR ALL
USING (auth.role() = 'service_role');

-- Authenticated admins/users only
CREATE POLICY "Authenticated users manage products"
ON public.products
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);


-- ============================================================
-- 3. ORDERS
-- ============================================================

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

-- Drop policies
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Service role manages orders" ON public.orders;

-- Checkout allowed
CREATE POLICY "Public can insert orders"
ON public.orders
FOR INSERT
WITH CHECK (true);

-- Users view only their orders
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
USING (
    auth.uid() = user_id
    OR auth.role() = 'service_role'
);

-- Backend full access
CREATE POLICY "Service role manages orders"
ON public.orders
FOR ALL
USING (auth.role() = 'service_role');


-- ============================================================
-- 4. COUPONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coupons (
    code             TEXT PRIMARY KEY,
    discount_type    TEXT NOT NULL CHECK (
        discount_type IN ('percentage', 'fixed')
    ),
    discount_value   NUMERIC NOT NULL,
    min_order_value  NUMERIC,
    active           BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY IF EXISTS "Public read active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Service role manages coupons" ON public.coupons;

-- Public can read
CREATE POLICY "Public read active coupons"
ON public.coupons
FOR SELECT
USING (true);

-- Backend manages
CREATE POLICY "Service role manages coupons"
ON public.coupons
FOR ALL
USING (auth.role() = 'service_role');


-- ============================================================
-- 5. SEED PRODUCTS
-- ============================================================

INSERT INTO public.products (
    id,
    title,
    price,
    category,
    material,
    description,
    images,
    sizes,
    colors,
    rating
)
VALUES

(
    'prod_linen_kurta',
    'Structured Linen Kurta',
    6800,
    'Men',
    'Jaipur Handloom Linen',
    'A contemporary take on the classic kurta.',
    ARRAY[
        'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
        'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800&q=80'
    ],
    ARRAY['S','M','L','XL'],
    ARRAY['Ivory White','Slate Grey'],
    4.7
),

(
    'prod_bandhgala_jacket',
    'Bandhgala Jacket',
    12500,
    'Men',
    'Wool-Silk Blend',
    'A Nehru-collar bandhgala jacket.',
    ARRAY[
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
        'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80'
    ],
    ARRAY['S','M','L','XL'],
    ARRAY['Midnight Black','Forest Green'],
    4.9
),

(
    'prod_drape_saree',
    'Architectural Drape Saree',
    22000,
    'Women',
    'Kanjivaram Silk',
    'Contemporary pre-draped saree.',
    ARRAY[
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80',
        'https://images.unsplash.com/photo-1617019114583-affb34d1b3cd?w=800&q=80'
    ],
    ARRAY['XS','S','M','L'],
    ARRAY['Peacock Teal','Burgundy'],
    4.9
)

ON CONFLICT (id)
DO UPDATE SET
    title = EXCLUDED.title,
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    material = EXCLUDED.material,
    description = EXCLUDED.description,
    images = EXCLUDED.images,
    sizes = EXCLUDED.sizes,
    colors = EXCLUDED.colors,
    rating = EXCLUDED.rating;


-- ============================================================
-- 6. SEED COUPONS
-- ============================================================

INSERT INTO public.coupons (
    code,
    discount_type,
    discount_value,
    min_order_value,
    active
)
VALUES
(
    'WELCOME10',
    'percentage',
    10,
    NULL,
    true
),
(
    'STAGBEETLE20',
    'percentage',
    20,
    NULL,
    true
),
(
    'FESTIVE1000',
    'fixed',
    1000,
    5000,
    true
)

ON CONFLICT (code)
DO UPDATE SET
    discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    min_order_value = EXCLUDED.min_order_value,
    active = EXCLUDED.active;
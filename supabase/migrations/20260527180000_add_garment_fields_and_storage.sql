-- ============================================================
-- Add SKU, subcategory, and sleeve type to products
-- ============================================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sleeve_type TEXT;

-- ============================================================
-- Initialize Storage Bucket for garment images
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('garment-images', 'garment-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop policies if they already exist
DROP POLICY IF EXISTS "Allow Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Delete" ON storage.objects;

-- Create policies for storage.objects
CREATE POLICY "Allow Public Insert"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'garment-images');

CREATE POLICY "Allow Public Select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'garment-images');

CREATE POLICY "Allow Public Update"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'garment-images');

CREATE POLICY "Allow Public Delete"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'garment-images');

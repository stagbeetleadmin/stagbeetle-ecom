ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_status TEXT DEFAULT 'Scheduled';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_carrier TEXT DEFAULT 'Delhivery';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;

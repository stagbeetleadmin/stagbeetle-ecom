-- ============================================================
-- Add MRP (list price) to products. `price` continues to be the
-- Selling Price (SP) — no rename, so existing orders/cart/checkout
-- code that reads product.price / item.price keeps working as-is.
-- ============================================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS mrp NUMERIC;

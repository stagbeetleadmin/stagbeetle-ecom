-- Orders were never linked to the customer's account: user_id was NULL on
-- every row, and the "Users can view own orders" policy only shows rows where
-- user_id = auth.uid() — so a customer's profile showed none of their orders.
-- /api/orders/finalize now sets user_id from the caller's verified session.
--
-- Link existing orders to the account with the same (confirmed) email. Rows
-- already linked, and orders with no matching account, are left alone. Safe
-- to re-run.
UPDATE public.orders o
SET user_id = u.id
FROM auth.users u
WHERE o.user_id IS NULL
  AND u.email_confirmed_at IS NOT NULL
  AND lower(u.email) = lower(o.customer_email);

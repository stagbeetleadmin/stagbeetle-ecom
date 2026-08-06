-- Atomic, race-safe stock decrement. A JS-side "read quantity, check, then
-- write" is exactly the race two simultaneous checkouts would exploit to both
-- "win" the last unit. Doing the check and the write in one SQL statement,
-- inside Postgres, is what actually prevents that — only one concurrent
-- caller can ever see quantity_on_hand >= p_qty become false first.
CREATE OR REPLACE FUNCTION public.decrement_inventory_on_hand(p_variant_id UUID, p_qty INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE public.inventory
  SET quantity_on_hand = quantity_on_hand - p_qty,
      version = version + 1,
      updated_at = now()
  WHERE variant_id = p_variant_id
    AND quantity_on_hand >= p_qty;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

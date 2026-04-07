-- Fix table-level permissions for inventory_location_stock and inventory_transactions
-- This resolves "permission denied for table inventory_location_stock" during inserts

GRANT ALL PRIVILEGES ON TABLE public.inventory_locations TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.inventory_locations TO service_role;

GRANT ALL PRIVILEGES ON TABLE public.inventory_location_stock TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.inventory_location_stock TO service_role;

GRANT ALL PRIVILEGES ON TABLE public.inventory_transactions TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.inventory_transactions TO service_role;

GRANT ALL PRIVILEGES ON TABLE public.price_list TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.price_list TO service_role;

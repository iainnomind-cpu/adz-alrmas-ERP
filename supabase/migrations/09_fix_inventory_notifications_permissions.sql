-- Fix table-level permissions for inventory_notifications and material requests
-- This resolves "permission denied for table inventory_notifications" during product creation or stock updates when triggers fire

GRANT ALL PRIVILEGES ON TABLE public.inventory_notifications TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.inventory_notifications TO service_role;

GRANT ALL PRIVILEGES ON TABLE public.inventory_material_requests TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.inventory_material_requests TO service_role;

GRANT ALL PRIVILEGES ON TABLE public.inventory_material_request_items TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.inventory_material_request_items TO service_role;

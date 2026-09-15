-- Add warranty and audit columns to service_orders
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS is_warranty boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS warranty_type text,
  ADD COLUMN IF NOT EXISTS warranty_device_count integer,
  ADD COLUMN IF NOT EXISTS warranty_brand text,
  ADD COLUMN IF NOT EXISTS warranty_model text,
  ADD COLUMN IF NOT EXISTS warranty_device_description text,
  ADD COLUMN IF NOT EXISTS warranty_fault_reported text,
  ADD COLUMN IF NOT EXISTS warranty_adz_review_date date,
  ADD COLUMN IF NOT EXISTS warranty_adz_comments text,
  ADD COLUMN IF NOT EXISTS warranty_sent_to_supplier_date date,
  ADD COLUMN IF NOT EXISTS warranty_supplier_resolution text,
  ADD COLUMN IF NOT EXISTS warranty_delivery_date date,
  ADD COLUMN IF NOT EXISTS warranty_resolution_type text,
  ADD COLUMN IF NOT EXISTS warranty_followup_order_id uuid REFERENCES service_orders(id),
  ADD COLUMN IF NOT EXISTS created_by_name text,
  ADD COLUMN IF NOT EXISTS created_at_display text;

-- Add system_type to service_orders if not exists (may already exist on customers)
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS system_type text;

/*
  # Add Installation Tracking Fields

  Adds fields to track installation cost, the technician who installed, and the
  original service order for both assets and customer_equipment tables.

  ## Changes
    - Add `installation_cost` (decimal) - Cost of the installation
    - Add `installed_by` (uuid) - Reference to technician who performed installation
    - Add `service_order_id` (uuid) - Reference to the originating service order
*/

-- Add installation tracking fields to assets table
ALTER TABLE assets ADD COLUMN IF NOT EXISTS installation_cost decimal(10, 2) DEFAULT 0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS installed_by uuid REFERENCES technicians(id) ON DELETE SET NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS service_order_id uuid REFERENCES service_orders(id) ON DELETE SET NULL;

-- Add installation tracking fields to customer_equipment table
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS installation_cost decimal(10, 2) DEFAULT 0;
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS installed_by uuid REFERENCES technicians(id) ON DELETE SET NULL;
ALTER TABLE customer_equipment ADD COLUMN IF NOT EXISTS service_order_id uuid REFERENCES service_orders(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_assets_installed_by ON assets(installed_by);
CREATE INDEX IF NOT EXISTS idx_assets_service_order_id ON assets(service_order_id);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_installed_by ON customer_equipment(installed_by);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_service_order_id ON customer_equipment(service_order_id);

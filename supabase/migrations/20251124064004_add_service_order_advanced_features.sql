/*
  # Service Order Advanced Features
  
  ## Overview
  Adds comprehensive check-in/check-out system, time tracking, geolocation,
  payment methods, digital signatures, and automatic report generation.
  
  ## 1. New Tables
    - `service_order_time_logs` - Detailed time tracking with GPS
    - `service_order_photos` - Before/after photos with timestamps
    - `service_order_signatures` - Digital customer signatures
    - `service_order_comments` - Internal and external comments
    - `service_order_status_history` - Status change audit trail
    - `service_order_reports` - Auto-generated completion reports
  
  ## 2. New Columns
    - `service_orders.check_in_latitude` - GPS at check-in
    - `service_orders.check_in_longitude` - GPS at check-in
    - `service_orders.check_out_latitude` - GPS at check-out
    - `service_orders.check_out_longitude` - GPS at check-out
    - `service_orders.payment_method` - Cash or credit
    - `service_orders.payment_terms` - Credit terms if applicable
    - `service_orders.hourly_rate` - Labor cost per hour
    - `service_orders.is_paused` - Current pause state
  
  ## 3. Key Features
    - GPS-based check-in/check-out validation
    - Real-time pause/resume functionality
    - Automatic cost calculation (labor + materials)
    - Auto-generated service reports on completion
    - Digital signature capture
    - Payment method tracking
    - Complete audit trail
  
  ## 4. Security
    - RLS enabled on all new tables
    - Authenticated user policies
    - Immutable audit records
*/

-- Add new columns to service_orders
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS check_in_latitude decimal(10,7);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS check_in_longitude decimal(10,7);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS check_out_latitude decimal(10,7);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS check_out_longitude decimal(10,7);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS hourly_rate decimal(10,2) DEFAULT 150.00;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS is_paused boolean DEFAULT false;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS pause_reason text;

-- Create service_order_time_logs table for detailed time tracking
CREATE TABLE IF NOT EXISTS service_order_time_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('check_in', 'check_out', 'pause', 'resume')),
  timestamp timestamptz NOT NULL DEFAULT now(),
  latitude decimal(10,7),
  longitude decimal(10,7),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create service_order_photos table
CREATE TABLE IF NOT EXISTS service_order_photos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  photo_type text NOT NULL CHECK (photo_type IN ('before', 'during', 'after')),
  caption text,
  latitude decimal(10,7),
  longitude decimal(10,7),
  created_at timestamptz DEFAULT now()
);

-- Create service_order_signatures table
CREATE TABLE IF NOT EXISTS service_order_signatures (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  signature_data text NOT NULL,
  signer_name text NOT NULL,
  signer_role text DEFAULT 'customer',
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create service_order_comments table
CREATE TABLE IF NOT EXISTS service_order_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  comment_type text NOT NULL CHECK (comment_type IN ('internal', 'external')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create service_order_status_history table
CREATE TABLE IF NOT EXISTS service_order_status_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Create service_order_reports table
CREATE TABLE IF NOT EXISTS service_order_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id uuid UNIQUE NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  report_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  customer_address text,
  service_date date NOT NULL,
  technician_name text NOT NULL,
  service_description text NOT NULL,
  work_performed text,
  materials_used jsonb DEFAULT '[]'::jsonb,
  labor_hours decimal(10,2) NOT NULL,
  labor_cost decimal(10,2) NOT NULL,
  materials_cost decimal(10,2) NOT NULL,
  total_cost decimal(10,2) NOT NULL,
  payment_method text,
  payment_terms text,
  customer_signature_url text,
  notes text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_logs_order ON service_order_time_logs(service_order_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_timestamp ON service_order_time_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_photos_order ON service_order_photos(service_order_id);
CREATE INDEX IF NOT EXISTS idx_signatures_order ON service_order_signatures(service_order_id);
CREATE INDEX IF NOT EXISTS idx_comments_order ON service_order_comments(service_order_id);
CREATE INDEX IF NOT EXISTS idx_status_history_order ON service_order_status_history(service_order_id);
CREATE INDEX IF NOT EXISTS idx_reports_order ON service_order_reports(service_order_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_paused ON service_orders(is_paused);

-- Enable Row Level Security
ALTER TABLE service_order_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_order_time_logs
CREATE POLICY "Authenticated users can view time logs"
  ON service_order_time_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert time logs"
  ON service_order_time_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for service_order_photos
CREATE POLICY "Authenticated users can view photos"
  ON service_order_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert photos"
  ON service_order_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete photos"
  ON service_order_photos FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for service_order_signatures
CREATE POLICY "Authenticated users can view signatures"
  ON service_order_signatures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert signatures"
  ON service_order_signatures FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for service_order_comments
CREATE POLICY "Authenticated users can view comments"
  ON service_order_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert comments"
  ON service_order_comments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for service_order_status_history
CREATE POLICY "Authenticated users can view status history"
  ON service_order_status_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert status history"
  ON service_order_status_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for service_order_reports
CREATE POLICY "Authenticated users can view reports"
  ON service_order_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert reports"
  ON service_order_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to calculate labor cost based on time worked
CREATE OR REPLACE FUNCTION calculate_labor_cost(
  p_service_order_id uuid
)
RETURNS decimal AS $$
DECLARE
  v_total_minutes integer;
  v_hourly_rate decimal(10,2);
  v_labor_cost decimal(10,2);
BEGIN
  -- Get hourly rate
  SELECT hourly_rate INTO v_hourly_rate
  FROM service_orders
  WHERE id = p_service_order_id;
  
  -- Get total time in minutes
  SELECT total_time_minutes INTO v_total_minutes
  FROM service_orders
  WHERE id = p_service_order_id;
  
  -- Calculate labor cost (minutes / 60 * hourly_rate)
  IF v_total_minutes IS NOT NULL AND v_hourly_rate IS NOT NULL THEN
    v_labor_cost := (v_total_minutes::decimal / 60.0) * v_hourly_rate;
  ELSE
    v_labor_cost := 0;
  END IF;
  
  RETURN ROUND(v_labor_cost, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate service report on completion
CREATE OR REPLACE FUNCTION generate_service_report()
RETURNS TRIGGER AS $$
DECLARE
  v_report_number text;
  v_customer_name text;
  v_customer_address text;
  v_technician_name text;
  v_materials jsonb;
  v_labor_hours decimal(10,2);
  v_signature_url text;
BEGIN
  -- Only generate report when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Generate report number
    v_report_number := 'RPT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    
    -- Get customer info
    SELECT name, address INTO v_customer_name, v_customer_address
    FROM customers
    WHERE id = NEW.customer_id;
    
    -- Get technician name
    SELECT full_name INTO v_technician_name
    FROM technicians
    WHERE id = NEW.technician_id;
    
    -- Get materials used
    SELECT jsonb_agg(
      jsonb_build_object(
        'name', i.name,
        'sku', i.sku,
        'quantity', m.quantity_used,
        'unit_cost', m.unit_cost,
        'total_cost', m.total_cost
      )
    ) INTO v_materials
    FROM service_order_materials m
    JOIN inventory_items i ON i.id = m.inventory_item_id
    WHERE m.service_order_id = NEW.id;
    
    -- Calculate labor hours
    v_labor_hours := COALESCE(NEW.total_time_minutes, 0)::decimal / 60.0;
    
    -- Get signature URL if exists
    SELECT signature_data INTO v_signature_url
    FROM service_order_signatures
    WHERE service_order_id = NEW.id
    ORDER BY signed_at DESC
    LIMIT 1;
    
    -- Insert report
    INSERT INTO service_order_reports (
      service_order_id,
      report_number,
      customer_name,
      customer_address,
      service_date,
      technician_name,
      service_description,
      work_performed,
      materials_used,
      labor_hours,
      labor_cost,
      materials_cost,
      total_cost,
      payment_method,
      payment_terms,
      customer_signature_url,
      notes
    ) VALUES (
      NEW.id,
      v_report_number,
      COALESCE(v_customer_name, 'N/A'),
      v_customer_address,
      COALESCE(NEW.completed_at::date, CURRENT_DATE),
      COALESCE(v_technician_name, 'N/A'),
      NEW.description,
      NEW.notes,
      COALESCE(v_materials, '[]'::jsonb),
      v_labor_hours,
      COALESCE(NEW.labor_cost, 0),
      COALESCE(NEW.materials_cost, 0),
      COALESCE(NEW.total_cost, 0),
      NEW.payment_method,
      NEW.payment_terms,
      v_signature_url,
      NEW.notes
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic report generation
DROP TRIGGER IF EXISTS trigger_generate_service_report ON service_orders;
CREATE TRIGGER trigger_generate_service_report
  AFTER UPDATE ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_service_report();

-- Function to track status changes
CREATE OR REPLACE FUNCTION track_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO service_order_status_history (
      service_order_id,
      previous_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status tracking
DROP TRIGGER IF EXISTS trigger_track_status_change ON service_orders;
CREATE TRIGGER trigger_track_status_change
  AFTER UPDATE ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION track_status_change();

-- Function to update labor cost and total cost on time changes
CREATE OR REPLACE FUNCTION update_labor_cost_on_time_change()
RETURNS TRIGGER AS $$
DECLARE
  v_new_labor_cost decimal(10,2);
BEGIN
  -- Calculate new labor cost
  v_new_labor_cost := calculate_labor_cost(NEW.id);
  
  -- Update labor_cost and total_cost
  NEW.labor_cost := v_new_labor_cost;
  NEW.total_cost := v_new_labor_cost + COALESCE(NEW.materials_cost, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for labor cost calculation
DROP TRIGGER IF EXISTS trigger_update_labor_cost ON service_orders;
CREATE TRIGGER trigger_update_labor_cost
  BEFORE UPDATE OF total_time_minutes, hourly_rate ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_labor_cost_on_time_change();

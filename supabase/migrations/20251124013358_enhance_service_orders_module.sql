/*
  # Enhance Service Orders Module - Complete Field Service Management

  ## Overview
  Complete enhancement of the service orders module with advanced tracking, geolocation,
  photo uploads, digital signatures, time tracking, and full lifecycle management.

  ## 1. New Tables

  ### Service Order Enhancements
  - `service_order_photos` - Before/after photos of completed work
  - `service_order_signatures` - Digital customer signatures
  - `service_order_time_logs` - Detailed time tracking with pause/resume
  - `service_order_comments` - Internal and external notes/comments
  - `service_order_templates` - Reusable service templates
  - `technician_locations` - Real-time technician GPS tracking
  - `service_order_status_history` - Complete audit trail of status changes

  ## 2. Enhanced Fields
  - Add geolocation fields to service_orders
  - Add payment terms and method tracking
  - Add service type and recurrence fields
  - Add labor cost calculation fields

  ## 3. Security
  - Enable RLS on all new tables
  - Policies for authenticated users with technician-specific access
  - Audit trail protection

  ## 4. Indexes
  - Performance indexes for geolocation queries
  - Time-based searches
  - Status filtering
*/

-- Add new fields to service_orders table
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS service_type text DEFAULT 'reactive',
  ADD COLUMN IF NOT EXISTS check_in_latitude decimal(10,7),
  ADD COLUMN IF NOT EXISTS check_in_longitude decimal(10,7),
  ADD COLUMN IF NOT EXISTS check_out_latitude decimal(10,7),
  ADD COLUMN IF NOT EXISTS check_out_longitude decimal(10,7),
  ADD COLUMN IF NOT EXISTS labor_cost decimal(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS materials_cost decimal(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_name text,
  ADD COLUMN IF NOT EXISTS recurrence_pattern text,
  ADD COLUMN IF NOT EXISTS next_service_date date,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS customer_rating integer,
  ADD COLUMN IF NOT EXISTS customer_feedback text;

-- Create service_order_photos table
CREATE TABLE IF NOT EXISTS service_order_photos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  photo_type text NOT NULL DEFAULT 'during',
  caption text,
  latitude decimal(10,7),
  longitude decimal(10,7),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create service_order_signatures table
CREATE TABLE IF NOT EXISTS service_order_signatures (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  signature_data text NOT NULL,
  signer_name text NOT NULL,
  signer_role text NOT NULL DEFAULT 'customer',
  signed_at timestamptz DEFAULT now(),
  ip_address text,
  device_info text,
  created_at timestamptz DEFAULT now()
);

-- Create service_order_time_logs table
CREATE TABLE IF NOT EXISTS service_order_time_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  latitude decimal(10,7),
  longitude decimal(10,7),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create service_order_comments table
CREATE TABLE IF NOT EXISTS service_order_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  comment_type text NOT NULL DEFAULT 'internal',
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create service_order_templates table
CREATE TABLE IF NOT EXISTS service_order_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_name text NOT NULL,
  description text NOT NULL,
  service_type text NOT NULL,
  estimated_duration_minutes integer NOT NULL,
  default_priority text DEFAULT 'medium',
  checklist_items jsonb,
  required_materials jsonb,
  instructions text,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create technician_locations table
CREATE TABLE IF NOT EXISTS technician_locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id uuid NOT NULL REFERENCES auth.users(id),
  latitude decimal(10,7) NOT NULL,
  longitude decimal(10,7) NOT NULL,
  accuracy_meters decimal(10,2),
  speed_kmh decimal(10,2),
  heading_degrees integer,
  is_active boolean DEFAULT true,
  battery_level integer,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create service_order_status_history table
CREATE TABLE IF NOT EXISTS service_order_status_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  reason text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_order_photos_order ON service_order_photos(service_order_id);
CREATE INDEX IF NOT EXISTS idx_service_order_signatures_order ON service_order_signatures(service_order_id);
CREATE INDEX IF NOT EXISTS idx_service_order_time_logs_order ON service_order_time_logs(service_order_id);
CREATE INDEX IF NOT EXISTS idx_service_order_time_logs_technician ON service_order_time_logs(technician_id);
CREATE INDEX IF NOT EXISTS idx_service_order_comments_order ON service_order_comments(service_order_id);
CREATE INDEX IF NOT EXISTS idx_service_order_templates_active ON service_order_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_technician_locations_technician ON technician_locations(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_locations_active ON technician_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_technician_locations_timestamp ON technician_locations(timestamp);
CREATE INDEX IF NOT EXISTS idx_service_order_status_history_order ON service_order_status_history(service_order_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_type ON service_orders(service_type);
CREATE INDEX IF NOT EXISTS idx_service_orders_next_service ON service_orders(next_service_date);

-- Create spatial indexes for geolocation queries
CREATE INDEX IF NOT EXISTS idx_technician_locations_coords ON technician_locations(latitude, longitude);

-- Enable Row Level Security
ALTER TABLE service_order_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_order_photos
CREATE POLICY "Authenticated users can view service order photos"
  ON service_order_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert service order photos"
  ON service_order_photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own photos"
  ON service_order_photos FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- RLS Policies for service_order_signatures
CREATE POLICY "Authenticated users can view signatures"
  ON service_order_signatures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert signatures"
  ON service_order_signatures FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for service_order_time_logs
CREATE POLICY "Authenticated users can view time logs"
  ON service_order_time_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Technicians can insert their own time logs"
  ON service_order_time_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = technician_id);

-- RLS Policies for service_order_comments
CREATE POLICY "Authenticated users can view comments"
  ON service_order_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert comments"
  ON service_order_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON service_order_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON service_order_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for service_order_templates
CREATE POLICY "Authenticated users can view templates"
  ON service_order_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can insert templates"
  ON service_order_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their templates"
  ON service_order_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- RLS Policies for technician_locations
CREATE POLICY "Authenticated users can view technician locations"
  ON technician_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Technicians can insert their own location"
  ON technician_locations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = technician_id);

CREATE POLICY "Technicians can update their own location"
  ON technician_locations FOR UPDATE
  TO authenticated
  USING (auth.uid() = technician_id)
  WITH CHECK (auth.uid() = technician_id);

-- RLS Policies for service_order_status_history
CREATE POLICY "Authenticated users can view status history"
  ON service_order_status_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert status history"
  ON service_order_status_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = changed_by);

-- Create function to automatically log status changes
CREATE OR REPLACE FUNCTION log_service_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO service_order_status_history (
      service_order_id,
      previous_status,
      new_status,
      changed_by,
      metadata
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      jsonb_build_object(
        'check_in_time', NEW.check_in_time,
        'check_out_time', NEW.check_out_time,
        'total_cost', NEW.total_cost
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for status change logging
DROP TRIGGER IF EXISTS trigger_log_service_order_status_change ON service_orders;
CREATE TRIGGER trigger_log_service_order_status_change
  AFTER UPDATE ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_service_order_status_change();

-- Create function to calculate total service order cost
CREATE OR REPLACE FUNCTION calculate_service_order_cost(order_id uuid)
RETURNS decimal AS $$
DECLARE
  materials_total decimal(10,2);
  labor_total decimal(10,2);
BEGIN
  SELECT COALESCE(SUM(total_cost), 0)
  INTO materials_total
  FROM service_order_materials
  WHERE service_order_id = order_id;
  
  SELECT COALESCE(labor_cost, 0)
  INTO labor_total
  FROM service_orders
  WHERE id = order_id;
  
  RETURN materials_total + labor_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get technician active service orders count
CREATE OR REPLACE FUNCTION get_technician_active_orders(tech_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM service_orders
    WHERE technician_id = tech_id
    AND status IN ('assigned', 'in_progress', 'paused')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for service order full details
CREATE OR REPLACE VIEW service_orders_full_view AS
SELECT 
  so.*,
  c.name as customer_name,
  c.address as customer_address,
  c.phone as customer_phone,
  a.alarm_model as asset_model,
  (SELECT COUNT(*) FROM service_order_photos WHERE service_order_id = so.id) as photo_count,
  (SELECT COUNT(*) FROM service_order_comments WHERE service_order_id = so.id) as comment_count,
  (SELECT COUNT(*) FROM service_order_materials WHERE service_order_id = so.id) as materials_count,
  (SELECT signature_data FROM service_order_signatures WHERE service_order_id = so.id ORDER BY created_at DESC LIMIT 1) as signature,
  calculate_service_order_cost(so.id) as calculated_total_cost
FROM service_orders so
LEFT JOIN customers c ON so.customer_id = c.id
LEFT JOIN assets a ON so.asset_id = a.id;

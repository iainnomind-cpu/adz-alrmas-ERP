/*
  # Fix Service Order System - Add Missing Tables and Columns
  
  1. Tables Created
    - service_order_signatures: Store customer signatures
    - service_order_time_logs: Track all time events (check-in, check-out, pause, resume)
    - service_order_comments: Store comments on service orders
    - service_order_photos: Store photos taken during service
    - service_order_status_history: Track status changes
    - service_order_reports: Store generated service reports
  
  2. Columns Added to service_orders
    - check_in_latitude, check_in_longitude
    - check_out_latitude, check_out_longitude
    - payment_method, payment_terms
    - completed_at timestamp
  
  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Add missing columns to service_orders if they don't exist
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS check_in_latitude numeric,
ADD COLUMN IF NOT EXISTS check_in_longitude numeric,
ADD COLUMN IF NOT EXISTS check_out_latitude numeric,
ADD COLUMN IF NOT EXISTS check_out_longitude numeric,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_terms text,
ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Create service_order_signatures table
CREATE TABLE IF NOT EXISTS service_order_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid REFERENCES service_orders(id) ON DELETE CASCADE NOT NULL,
  signature_data text NOT NULL,
  signer_name text NOT NULL,
  signer_role text NOT NULL DEFAULT 'customer',
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create service_order_time_logs table
CREATE TABLE IF NOT EXISTS service_order_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid REFERENCES service_orders(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  latitude numeric,
  longitude numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create service_order_comments table
CREATE TABLE IF NOT EXISTS service_order_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid REFERENCES service_orders(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  comment_type text NOT NULL DEFAULT 'internal',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create service_order_photos table
CREATE TABLE IF NOT EXISTS service_order_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid REFERENCES service_orders(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  photo_type text NOT NULL DEFAULT 'during',
  caption text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create service_order_status_history table
CREATE TABLE IF NOT EXISTS service_order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid REFERENCES service_orders(id) ON DELETE CASCADE NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  reason text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create service_order_reports table
CREATE TABLE IF NOT EXISTS service_order_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid REFERENCES service_orders(id) ON DELETE CASCADE NOT NULL,
  report_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  customer_address text,
  service_date timestamptz NOT NULL,
  technician_name text NOT NULL,
  service_description text NOT NULL,
  work_performed text,
  materials_used jsonb,
  labor_hours numeric NOT NULL,
  labor_cost numeric NOT NULL,
  materials_cost numeric NOT NULL,
  total_cost numeric NOT NULL,
  payment_method text,
  payment_terms text,
  customer_signature_url text,
  notes text,
  generated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE service_order_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view signatures" ON service_order_signatures;
DROP POLICY IF EXISTS "Users can insert signatures" ON service_order_signatures;
DROP POLICY IF EXISTS "Users can view time logs" ON service_order_time_logs;
DROP POLICY IF EXISTS "Users can insert time logs" ON service_order_time_logs;
DROP POLICY IF EXISTS "Users can view comments" ON service_order_comments;
DROP POLICY IF EXISTS "Users can insert comments" ON service_order_comments;
DROP POLICY IF EXISTS "Users can view photos" ON service_order_photos;
DROP POLICY IF EXISTS "Users can insert photos" ON service_order_photos;
DROP POLICY IF EXISTS "Users can view status history" ON service_order_status_history;
DROP POLICY IF EXISTS "Users can insert status history" ON service_order_status_history;
DROP POLICY IF EXISTS "Users can view reports" ON service_order_reports;
DROP POLICY IF EXISTS "Users can insert reports" ON service_order_reports;

-- Create policies for service_order_signatures
CREATE POLICY "Users can view signatures"
  ON service_order_signatures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert signatures"
  ON service_order_signatures FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policies for service_order_time_logs
CREATE POLICY "Users can view time logs"
  ON service_order_time_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert time logs"
  ON service_order_time_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policies for service_order_comments
CREATE POLICY "Users can view comments"
  ON service_order_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert comments"
  ON service_order_comments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policies for service_order_photos
CREATE POLICY "Users can view photos"
  ON service_order_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert photos"
  ON service_order_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policies for service_order_status_history
CREATE POLICY "Users can view status history"
  ON service_order_status_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert status history"
  ON service_order_status_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policies for service_order_reports
CREATE POLICY "Users can view reports"
  ON service_order_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert reports"
  ON service_order_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_signatures_service_order ON service_order_signatures(service_order_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_service_order ON service_order_time_logs(service_order_id);
CREATE INDEX IF NOT EXISTS idx_comments_service_order ON service_order_comments(service_order_id);
CREATE INDEX IF NOT EXISTS idx_photos_service_order ON service_order_photos(service_order_id);
CREATE INDEX IF NOT EXISTS idx_status_history_service_order ON service_order_status_history(service_order_id);
CREATE INDEX IF NOT EXISTS idx_reports_service_order ON service_order_reports(service_order_id);
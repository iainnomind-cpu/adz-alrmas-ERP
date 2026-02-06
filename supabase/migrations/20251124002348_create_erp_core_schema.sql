/*
  # ERP Project Tracker - Core Schema Migration
  
  ## Overview
  Complete ERP system for Field Service Management with modules for FSM, Billing, CRM, Assets, and BI.
  
  ## 1. New Tables
  
  ### Customer Management (CRM)
  - `customers` - Master customer data
  - `emergency_contacts` - Emergency contact validation
  
  ### Asset Management
  - `assets` - Installed equipment tracking
  - `inventory_items` - Inventory management
  
  ### Field Service Management (FSM)
  - `service_orders` - Work orders for technicians
  - `service_order_materials` - Materials used per order
  
  ### Billing & Collections
  - `invoices` - Invoice management
  - `payment_transactions` - Payment history
  - `dunning_actions` - Automated dunning process
  
  ### Sales Opportunities
  - `opportunities` - Sales leads from EOL assets
  
  ## 2. Security
  - Enable RLS on all tables
  - Add policies for authenticated users based on roles
  
  ## 3. Indexes
  - Performance indexes on foreign keys and frequently queried fields
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  owner_name text,
  email text,
  phone text,
  address text,
  customer_type text NOT NULL DEFAULT 'comercio',
  communication_tech text NOT NULL DEFAULT 'telefono',
  monitoring_plan text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create emergency_contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  relationship text,
  is_validated boolean DEFAULT false,
  last_validated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  alarm_model text NOT NULL,
  keyboard_model text,
  communicator_model text,
  serial_number text,
  installation_date date,
  is_eol boolean DEFAULT false,
  eol_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  category text NOT NULL,
  unit_cost decimal(10,2) NOT NULL DEFAULT 0,
  quantity_available integer NOT NULL DEFAULT 0,
  min_stock_level integer NOT NULL DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create service_orders table
CREATE TABLE IF NOT EXISTS service_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  technician_id uuid NOT NULL REFERENCES auth.users(id),
  order_number text UNIQUE NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  check_in_time timestamptz,
  check_out_time timestamptz,
  total_time_minutes integer,
  total_cost decimal(10,2) DEFAULT 0,
  payment_amount decimal(10,2),
  payment_condition text,
  notes text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create service_order_materials table
CREATE TABLE IF NOT EXISTS service_order_materials (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id),
  quantity_used integer NOT NULL,
  unit_cost decimal(10,2) NOT NULL,
  total_cost decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_order_id uuid REFERENCES service_orders(id) ON DELETE SET NULL,
  invoice_number text UNIQUE NOT NULL,
  invoice_type text NOT NULL DEFAULT 'service',
  payment_type text NOT NULL DEFAULT 'contado',
  amount decimal(10,2) NOT NULL,
  tax_amount decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) NOT NULL,
  due_date date NOT NULL,
  paid_date date,
  status text NOT NULL DEFAULT 'pending',
  days_overdue integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL,
  transaction_date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create dunning_actions table
CREATE TABLE IF NOT EXISTS dunning_actions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  days_overdue integer NOT NULL,
  message_sent text,
  channel text NOT NULL DEFAULT 'email',
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  opportunity_type text NOT NULL DEFAULT 'upgrade',
  estimated_value decimal(10,2),
  status text NOT NULL DEFAULT 'open',
  priority_score integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_customer ON emergency_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_assets_customer ON assets(customer_id);
CREATE INDEX IF NOT EXISTS idx_assets_eol ON assets(is_eol);
CREATE INDEX IF NOT EXISTS idx_service_orders_customer ON service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_technician ON service_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_overdue ON invoices(days_overdue);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for emergency_contacts
CREATE POLICY "Authenticated users can view emergency contacts"
  ON emergency_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert emergency contacts"
  ON emergency_contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update emergency contacts"
  ON emergency_contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for assets
CREATE POLICY "Authenticated users can view assets"
  ON assets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert assets"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update assets"
  ON assets FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for inventory_items
CREATE POLICY "Authenticated users can view inventory"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert inventory"
  ON inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory"
  ON inventory_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for service_orders
CREATE POLICY "Authenticated users can view service orders"
  ON service_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert service orders"
  ON service_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update service orders"
  ON service_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for service_order_materials
CREATE POLICY "Authenticated users can view materials"
  ON service_order_materials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert materials"
  ON service_order_materials FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for invoices
CREATE POLICY "Authenticated users can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for payment_transactions
CREATE POLICY "Authenticated users can view payments"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert payments"
  ON payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for dunning_actions
CREATE POLICY "Authenticated users can view dunning actions"
  ON dunning_actions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert dunning actions"
  ON dunning_actions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for opportunities
CREATE POLICY "Authenticated users can view opportunities"
  ON opportunities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert opportunities"
  ON opportunities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update opportunities"
  ON opportunities FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
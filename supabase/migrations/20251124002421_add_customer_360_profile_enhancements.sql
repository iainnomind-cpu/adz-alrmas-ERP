/*
  # Enhance Customer Profile for 360° View

  ## New Tables
    1. `customer_contacts` - All customer contacts including emergency contacts
    2. `customer_equipment` - Detailed equipment inventory per customer
    3. `customer_payment_history` - Complete payment history
    4. `monitoring_plans` - Available monitoring plan catalog
    5. `customer_monitoring_subscriptions` - Customer subscription management

  ## Enhanced Existing Tables
    - Add fields to `customers` for 360° profile:
      - `business_name` (text) - Business name if applicable
      - `gps_latitude`, `gps_longitude` (decimal) - GPS coordinates
      - `property_type` (text) - comercio, casa, banco, rancho, gobierno, pozo
      - `credit_classification` (text) - puntual, 15_dias, moroso
      - `account_type` (text) - normal, consolidada
      - `billing_preference` (text) - contado, credito
      - `billing_cycle` (text) - mensual, anual
      - `consolidation_parent_id` (uuid) - Parent customer for consolidated accounts

  ## Security
    - Enable RLS on all new tables
    - Add comprehensive policies for authenticated users
*/

-- Add new columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gps_latitude decimal(10, 8);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gps_longitude decimal(11, 8);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS property_type text DEFAULT 'casa';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_classification text DEFAULT 'puntual';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'normal';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_preference text DEFAULT 'contado';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'mensual';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS consolidation_parent_id uuid REFERENCES customers(id);

-- Create customer_contacts table (replaces emergency_contacts with more comprehensive solution)
CREATE TABLE IF NOT EXISTS customer_contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  contact_type text DEFAULT 'emergency',
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  relationship text,
  is_primary boolean DEFAULT false,
  is_validated boolean DEFAULT false,
  last_validated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customer_equipment table
CREATE TABLE IF NOT EXISTS customer_equipment (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  equipment_type text DEFAULT 'alarm',
  brand text NOT NULL,
  model text NOT NULL,
  quantity integer DEFAULT 1,
  serial_number text,
  installation_date date,
  warranty_expires date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customer_payment_history table
CREATE TABLE IF NOT EXISTS customer_payment_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  payment_date date DEFAULT CURRENT_DATE,
  amount decimal(10, 2) NOT NULL,
  payment_method text NOT NULL,
  reference text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create monitoring_plans table
CREATE TABLE IF NOT EXISTS monitoring_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_name text NOT NULL,
  billing_cycle text DEFAULT 'monthly',
  price decimal(10, 2) NOT NULL,
  features text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create customer_monitoring_subscriptions table
CREATE TABLE IF NOT EXISTS customer_monitoring_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES monitoring_plans(id) ON DELETE SET NULL,
  start_date date DEFAULT CURRENT_DATE,
  renewal_date date NOT NULL,
  status text DEFAULT 'active',
  auto_renew boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_monitoring_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_contacts
CREATE POLICY "Authenticated users can view customer contacts"
  ON customer_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customer contacts"
  ON customer_contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customer contacts"
  ON customer_contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customer contacts"
  ON customer_contacts FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for customer_equipment
CREATE POLICY "Authenticated users can view equipment"
  ON customer_equipment FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert equipment"
  ON customer_equipment FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update equipment"
  ON customer_equipment FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete equipment"
  ON customer_equipment FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for customer_payment_history
CREATE POLICY "Authenticated users can view payment history"
  ON customer_payment_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert payment history"
  ON customer_payment_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update payment history"
  ON customer_payment_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete payment history"
  ON customer_payment_history FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for monitoring_plans
CREATE POLICY "Authenticated users can view monitoring plans"
  ON monitoring_plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert monitoring plans"
  ON monitoring_plans FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update monitoring plans"
  ON monitoring_plans FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete monitoring plans"
  ON monitoring_plans FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for customer_monitoring_subscriptions
CREATE POLICY "Authenticated users can view subscriptions"
  ON customer_monitoring_subscriptions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert subscriptions"
  ON customer_monitoring_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update subscriptions"
  ON customer_monitoring_subscriptions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete subscriptions"
  ON customer_monitoring_subscriptions FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_customer_id ON customer_equipment(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payment_history_customer_id ON customer_payment_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_monitoring_subscriptions_customer_id ON customer_monitoring_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_property_type ON customers(property_type);
CREATE INDEX IF NOT EXISTS idx_customers_credit_classification ON customers(credit_classification);
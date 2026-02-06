/*
  # Fix Authentication and Complete Database Setup
  
  1. Tables Created/Fixed
    - `technicians` - User profiles for technicians (linked to auth.users)
    - `user_profiles` - Extended user profiles
    - `roles` - User roles in the system
    - `permissions` - System permissions
    - `role_permissions` - Many-to-many relationship
    - `user_roles` - User role assignments
    - All missing inventory tables
    
  2. Security Fixes
    - Add DELETE policies to all tables
    - Add trigger to auto-create technician profile on user signup
    - Enable RLS on all new tables
    
  3. Data Initialization
    - Create default admin role
    - Create basic permissions
*/

-- ============================================
-- 1. Create technicians table (user profiles)
-- ============================================
CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  employee_number text,
  specialty text,
  hourly_rate numeric DEFAULT 0,
  hire_date date,
  work_schedule_start time,
  work_schedule_end time,
  available_monday boolean DEFAULT true,
  available_tuesday boolean DEFAULT true,
  available_wednesday boolean DEFAULT true,
  available_thursday boolean DEFAULT true,
  available_friday boolean DEFAULT true,
  available_saturday boolean DEFAULT false,
  available_sunday boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view technicians"
  ON technicians FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert technicians"
  ON technicians FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update technicians"
  ON technicians FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete technicians"
  ON technicians FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 2. Create roles and permissions tables
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  action text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(module, action)
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage role permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 3. Create complete inventory system tables
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  parent_category_id uuid REFERENCES inventory_categories(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories"
  ON inventory_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage categories"
  ON inventory_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS inventory_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  tax_id text,
  payment_terms text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view suppliers"
  ON inventory_suppliers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage suppliers"
  ON inventory_suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS inventory_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES inventory_categories(id),
  brand text,
  model text,
  unit_of_measure text DEFAULT 'piece',
  unit_cost numeric DEFAULT 0,
  selling_price numeric DEFAULT 0,
  min_stock_level integer DEFAULT 10,
  max_stock_level integer DEFAULT 100,
  reorder_point integer DEFAULT 20,
  reorder_quantity integer DEFAULT 50,
  primary_supplier_id uuid REFERENCES inventory_suppliers(id),
  is_serialized boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products"
  ON inventory_products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage products"
  ON inventory_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS inventory_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid UNIQUE REFERENCES inventory_products(id) ON DELETE CASCADE,
  quantity_available integer DEFAULT 0,
  quantity_reserved integer DEFAULT 0,
  quantity_on_order integer DEFAULT 0,
  average_cost numeric DEFAULT 0,
  last_restocked_at timestamptz,
  last_counted_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock"
  ON inventory_stock FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage stock"
  ON inventory_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES inventory_products(id),
  transaction_type text NOT NULL,
  quantity integer NOT NULL,
  unit_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  reference_type text,
  reference_id uuid,
  supplier_id uuid REFERENCES inventory_suppliers(id),
  service_order_id uuid REFERENCES service_orders(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transactions"
  ON inventory_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create transactions"
  ON inventory_transactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS inventory_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES inventory_products(id),
  alert_type text NOT NULL,
  severity text DEFAULT 'medium',
  message text NOT NULL,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view alerts"
  ON inventory_alerts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage alerts"
  ON inventory_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS inventory_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES inventory_suppliers(id),
  status text DEFAULT 'pending',
  order_date date DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  received_date date,
  total_amount numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE inventory_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view purchase orders"
  ON inventory_purchase_orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage purchase orders"
  ON inventory_purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 4. Add DELETE policies to existing tables
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON customers;
CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete assets" ON assets;
CREATE POLICY "Authenticated users can delete assets"
  ON assets FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete service orders" ON service_orders;
CREATE POLICY "Authenticated users can delete service orders"
  ON service_orders FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON invoices;
CREATE POLICY "Authenticated users can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete inventory" ON inventory_items;
CREATE POLICY "Authenticated users can delete inventory"
  ON inventory_items FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete materials" ON service_order_materials;
CREATE POLICY "Authenticated users can delete materials"
  ON service_order_materials FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete emergency contacts" ON emergency_contacts;
CREATE POLICY "Authenticated users can delete emergency contacts"
  ON emergency_contacts FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 5. Create trigger for auto-creating technician profile
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.technicians (id, full_name, email, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    true
  );
  
  INSERT INTO public.user_profiles (id, full_name, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    true
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 6. Initialize default data
-- ============================================
INSERT INTO roles (name, description, is_active)
VALUES 
  ('admin', 'Administrator with full system access', true),
  ('technician', 'Field service technician', true),
  ('customer_service', 'Customer service representative', true),
  ('collector', 'Collections and billing specialist', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (module, action, description)
VALUES
  ('dashboard', 'view', 'View dashboard'),
  ('customers', 'view', 'View customers'),
  ('customers', 'create', 'Create customers'),
  ('customers', 'edit', 'Edit customers'),
  ('customers', 'delete', 'Delete customers'),
  ('service_orders', 'view', 'View service orders'),
  ('service_orders', 'create', 'Create service orders'),
  ('service_orders', 'edit', 'Edit service orders'),
  ('service_orders', 'assign', 'Assign service orders'),
  ('service_orders', 'complete', 'Complete service orders'),
  ('invoices', 'view', 'View invoices'),
  ('invoices', 'create', 'Create invoices'),
  ('invoices', 'edit', 'Edit invoices'),
  ('assets', 'view', 'View assets'),
  ('assets', 'create', 'Create assets'),
  ('assets', 'edit', 'Edit assets'),
  ('inventory', 'view', 'View inventory'),
  ('inventory', 'create', 'Create inventory items'),
  ('inventory', 'edit', 'Edit inventory items'),
  ('inventory', 'adjust', 'Adjust inventory levels'),
  ('settings', 'view', 'View settings'),
  ('settings', 'manage_users', 'Manage users'),
  ('settings', 'manage_roles', 'Manage roles and permissions')
ON CONFLICT (module, action) DO NOTHING;

-- Grant all permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. Create system settings table
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view settings"
  ON system_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage settings"
  ON system_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 8. Create indexes for better performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_technicians_is_active ON technicians(is_active);
CREATE INDEX IF NOT EXISTS idx_technicians_email ON technicians(email);
CREATE INDEX IF NOT EXISTS idx_inventory_products_sku ON inventory_products(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_products_category ON inventory_products(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_product ON inventory_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_service_orders_technician ON service_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_customer ON service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);

-- ============================================
-- 9. Create update triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_technicians_updated_at ON technicians;
CREATE TRIGGER update_technicians_updated_at
  BEFORE UPDATE ON technicians
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_products_updated_at ON inventory_products;
CREATE TRIGGER update_inventory_products_updated_at
  BEFORE UPDATE ON inventory_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_suppliers_updated_at ON inventory_suppliers;
CREATE TRIGGER update_inventory_suppliers_updated_at
  BEFORE UPDATE ON inventory_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. Create function to auto-create stock record
-- ============================================
CREATE OR REPLACE FUNCTION create_stock_record_for_product()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory_stock (product_id, quantity_available)
  VALUES (NEW.id, 0)
  ON CONFLICT (product_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_product_created ON inventory_products;
CREATE TRIGGER on_product_created
  AFTER INSERT ON inventory_products
  FOR EACH ROW
  EXECUTE FUNCTION create_stock_record_for_product();

/*
  # Sistema ERP Completo - Configuración Base
  
  1. Tablas Principales
    - customers: Gestión de clientes
    - assets: Activos instalados
    - inventory_items: Gestión de inventario
    - service_orders: Órdenes de servicio
    - invoices: Facturación
    - technicians: Técnicos (sincronizado con auth.users)
    
  2. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas permisivas para usuarios autenticados
    - Trigger automático para crear técnicos
    
  3. Funcionalidad
    - Auto-sincronización de usuarios con técnicos
    - Índices para optimización
    - Triggers para campos updated_at
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
  business_name text,
  gps_latitude decimal(10,7),
  gps_longitude decimal(10,7),
  property_type text DEFAULT 'casa',
  credit_classification text DEFAULT 'puntual',
  account_type text DEFAULT 'individual',
  billing_preference text DEFAULT 'electronic',
  billing_cycle text DEFAULT 'monthly',
  consolidation_parent_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
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

-- Create technicians table
CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  employee_number text UNIQUE,
  specialty text,
  hourly_rate numeric(10,2) DEFAULT 0,
  hire_date date,
  work_schedule_start time DEFAULT '08:00',
  work_schedule_end time DEFAULT '17:00',
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

-- Create service_orders table
CREATE TABLE IF NOT EXISTS service_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  technician_id uuid NOT NULL REFERENCES technicians(id),
  order_number text UNIQUE NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  service_type text NOT NULL DEFAULT 'reactive',
  status text NOT NULL DEFAULT 'requested',
  estimated_duration_minutes integer DEFAULT 60,
  check_in_time timestamptz,
  check_out_time timestamptz,
  total_time_minutes integer,
  labor_cost decimal(10,2) DEFAULT 0,
  materials_cost decimal(10,2) DEFAULT 0,
  total_cost decimal(10,2) DEFAULT 0,
  payment_amount decimal(10,2),
  payment_condition text,
  payment_method text,
  payment_terms text,
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

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Permitir todas las operaciones a usuarios autenticados
CREATE POLICY "Allow all for authenticated users" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON assets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON inventory_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON technicians FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON service_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON service_order_materials FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON payment_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Función para auto-crear técnico cuando se registra un usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO technicians (
    id,
    full_name,
    email,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Usuario'),
    NEW.email,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auto-crear técnico
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Trigger para updated_at en technicians
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER technicians_updated_at
  BEFORE UPDATE ON technicians
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Crear índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_assets_customer ON assets(customer_id);
CREATE INDEX IF NOT EXISTS idx_assets_eol ON assets(is_eol);
CREATE INDEX IF NOT EXISTS idx_service_orders_customer ON service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_technician ON service_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_technicians_email ON technicians(email);
CREATE INDEX IF NOT EXISTS idx_technicians_is_active ON technicians(is_active);

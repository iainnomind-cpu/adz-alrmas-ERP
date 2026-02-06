/*
  # Inventory Management Module
  
  Complete inventory control system with product catalog, stock tracking, 
  purchase/usage transactions, and full traceability to field services.

  ## New Tables
    1. `inventory_categories` - Product categories (alarms, keyboards, sensors, etc.)
    2. `inventory_products` - Master product catalog
    3. `inventory_stock` - Real-time stock levels per product
    4. `inventory_transactions` - All inventory movements (purchases, usage, adjustments)
    5. `inventory_suppliers` - Supplier catalog
    6. `inventory_purchase_orders` - Purchase orders tracking
    7. `inventory_purchase_order_items` - Line items for purchase orders
    8. `inventory_alerts` - Stock alerts and notifications

  ## Features
    - Product catalog with categories
    - Real-time stock tracking
    - Purchase order management
    - Automatic stock adjustments on transactions
    - Service order integration for traceability
    - Low stock alerts
    - Cost tracking with average cost calculation

  ## Security
    - Enable RLS on all tables
    - Comprehensive policies for authenticated users
*/

-- Create inventory_categories table
CREATE TABLE IF NOT EXISTS inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  parent_category_id uuid REFERENCES inventory_categories(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inventory_suppliers table
CREATE TABLE IF NOT EXISTS inventory_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  address text,
  tax_id text,
  payment_terms text DEFAULT '30_days',
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inventory_products table
CREATE TABLE IF NOT EXISTS inventory_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES inventory_categories(id) ON DELETE SET NULL,
  brand text,
  model text,
  unit_of_measure text DEFAULT 'piece',
  unit_cost decimal(10, 2) DEFAULT 0,
  selling_price decimal(10, 2) DEFAULT 0,
  min_stock_level integer DEFAULT 10,
  max_stock_level integer DEFAULT 100,
  reorder_point integer DEFAULT 20,
  reorder_quantity integer DEFAULT 50,
  primary_supplier_id uuid REFERENCES inventory_suppliers(id) ON DELETE SET NULL,
  is_serialized boolean DEFAULT false,
  is_active boolean DEFAULT true,
  specifications jsonb,
  images text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inventory_stock table
CREATE TABLE IF NOT EXISTS inventory_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES inventory_products(id) ON DELETE CASCADE NOT NULL UNIQUE,
  quantity_available integer DEFAULT 0,
  quantity_reserved integer DEFAULT 0,
  quantity_on_order integer DEFAULT 0,
  last_purchase_date timestamptz,
  last_purchase_cost decimal(10, 2),
  average_cost decimal(10, 2) DEFAULT 0,
  location text DEFAULT 'main_warehouse',
  updated_at timestamptz DEFAULT now()
);

-- Create inventory_purchase_orders table
CREATE TABLE IF NOT EXISTS inventory_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE,
  supplier_id uuid REFERENCES inventory_suppliers(id) ON DELETE SET NULL NOT NULL,
  order_date date DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  actual_delivery_date date,
  status text DEFAULT 'pending',
  subtotal decimal(10, 2) DEFAULT 0,
  tax_amount decimal(10, 2) DEFAULT 0,
  total_amount decimal(10, 2) DEFAULT 0,
  payment_status text DEFAULT 'pending',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inventory_purchase_order_items table
CREATE TABLE IF NOT EXISTS inventory_purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES inventory_purchase_orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES inventory_products(id) ON DELETE CASCADE NOT NULL,
  quantity_ordered integer NOT NULL,
  quantity_received integer DEFAULT 0,
  unit_cost decimal(10, 2) NOT NULL,
  total_cost decimal(10, 2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES inventory_products(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL,
  quantity integer NOT NULL,
  unit_cost decimal(10, 2) DEFAULT 0,
  total_cost decimal(10, 2) DEFAULT 0,
  reference_type text,
  reference_id uuid,
  service_order_id uuid,
  purchase_order_id uuid REFERENCES inventory_purchase_orders(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES inventory_suppliers(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create inventory_alerts table
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES inventory_products(id) ON DELETE CASCADE NOT NULL,
  alert_type text NOT NULL,
  severity text DEFAULT 'medium',
  message text NOT NULL,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_categories
CREATE POLICY "Authenticated users can view categories"
  ON inventory_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON inventory_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON inventory_categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON inventory_categories FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for inventory_suppliers
CREATE POLICY "Authenticated users can view suppliers"
  ON inventory_suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert suppliers"
  ON inventory_suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update suppliers"
  ON inventory_suppliers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete suppliers"
  ON inventory_suppliers FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for inventory_products
CREATE POLICY "Authenticated users can view products"
  ON inventory_products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON inventory_products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON inventory_products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
  ON inventory_products FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for inventory_stock
CREATE POLICY "Authenticated users can view stock"
  ON inventory_stock FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stock"
  ON inventory_stock FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stock"
  ON inventory_stock FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete stock"
  ON inventory_stock FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for inventory_transactions
CREATE POLICY "Authenticated users can view transactions"
  ON inventory_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert transactions"
  ON inventory_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update transactions"
  ON inventory_transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete transactions"
  ON inventory_transactions FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for inventory_purchase_orders
CREATE POLICY "Authenticated users can view purchase orders"
  ON inventory_purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert purchase orders"
  ON inventory_purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update purchase orders"
  ON inventory_purchase_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete purchase orders"
  ON inventory_purchase_orders FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for inventory_purchase_order_items
CREATE POLICY "Authenticated users can view purchase order items"
  ON inventory_purchase_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert purchase order items"
  ON inventory_purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update purchase order items"
  ON inventory_purchase_order_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete purchase order items"
  ON inventory_purchase_order_items FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for inventory_alerts
CREATE POLICY "Authenticated users can view alerts"
  ON inventory_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert alerts"
  ON inventory_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update alerts"
  ON inventory_alerts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete alerts"
  ON inventory_alerts FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_products_category_id ON inventory_products(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_products_sku ON inventory_products(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_products_supplier_id ON inventory_products(primary_supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_product_id ON inventory_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_service_order_id ON inventory_transactions(service_order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_po_id ON inventory_transactions(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_po_supplier_id ON inventory_purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_po_status ON inventory_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_inventory_po_items_po_id ON inventory_purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_po_items_product_id ON inventory_purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_product_id ON inventory_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_resolved ON inventory_alerts(is_resolved);

-- Insert default categories
INSERT INTO inventory_categories (name, description) VALUES
  ('Alarmas', 'Sistemas de alarma completos'),
  ('Teclados', 'Teclados y paneles de control'),
  ('Sensores', 'Sensores de movimiento, puertas, ventanas'),
  ('Comunicadores', 'Dispositivos de comunicación telefónica y celular'),
  ('Cámaras', 'Cámaras de seguridad y vigilancia'),
  ('Cables', 'Cables y conectores'),
  ('Sirenas', 'Sirenas y dispositivos de alerta'),
  ('Baterías', 'Baterías y fuentes de alimentación'),
  ('Accesorios', 'Accesorios diversos'),
  ('Herramientas', 'Herramientas de instalación')
ON CONFLICT (name) DO NOTHING;

-- Create function to update stock automatically
CREATE OR REPLACE FUNCTION update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stock based on transaction type
  IF NEW.transaction_type IN ('purchase', 'adjustment_in', 'return') THEN
    UPDATE inventory_stock
    SET 
      quantity_available = quantity_available + NEW.quantity,
      updated_at = now()
    WHERE product_id = NEW.product_id;
  ELSIF NEW.transaction_type IN ('usage', 'adjustment_out', 'damage', 'loss') THEN
    UPDATE inventory_stock
    SET 
      quantity_available = GREATEST(0, quantity_available - NEW.quantity),
      updated_at = now()
    WHERE product_id = NEW.product_id;
  END IF;
  
  -- Update average cost for purchases
  IF NEW.transaction_type = 'purchase' AND NEW.unit_cost > 0 THEN
    UPDATE inventory_stock s
    SET 
      average_cost = CASE 
        WHEN s.quantity_available = 0 THEN NEW.unit_cost
        ELSE ((s.average_cost * s.quantity_available) + (NEW.unit_cost * NEW.quantity)) / (s.quantity_available + NEW.quantity)
      END,
      last_purchase_date = NEW.created_at,
      last_purchase_cost = NEW.unit_cost
    WHERE s.product_id = NEW.product_id;
  END IF;
  
  -- Check for low stock and create alert
  PERFORM check_low_stock(NEW.product_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to check low stock
CREATE OR REPLACE FUNCTION check_low_stock(p_product_id uuid)
RETURNS void AS $$
DECLARE
  v_current_stock integer;
  v_reorder_point integer;
  v_product_name text;
  v_alert_exists boolean;
BEGIN
  SELECT s.quantity_available, p.reorder_point, p.name
  INTO v_current_stock, v_reorder_point, v_product_name
  FROM inventory_stock s
  JOIN inventory_products p ON s.product_id = p.id
  WHERE s.product_id = p_product_id;
  
  -- Check if unresolved alert already exists
  SELECT EXISTS(
    SELECT 1 FROM inventory_alerts 
    WHERE product_id = p_product_id 
      AND alert_type = 'low_stock' 
      AND is_resolved = false
  ) INTO v_alert_exists;
  
  IF v_current_stock <= v_reorder_point AND NOT v_alert_exists THEN
    INSERT INTO inventory_alerts (product_id, alert_type, severity, message)
    VALUES (
      p_product_id,
      'low_stock',
      CASE 
        WHEN v_current_stock = 0 THEN 'critical'
        WHEN v_current_stock <= v_reorder_point / 2 THEN 'high'
        ELSE 'medium'
      END,
      format('Stock bajo para %s: %s unidades disponibles (punto de reorden: %s)', 
        v_product_name, v_current_stock, v_reorder_point)
    );
  ELSIF v_current_stock > v_reorder_point AND v_alert_exists THEN
    -- Auto-resolve alert if stock is above reorder point
    UPDATE inventory_alerts
    SET is_resolved = true, resolved_at = now()
    WHERE product_id = p_product_id 
      AND alert_type = 'low_stock' 
      AND is_resolved = false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update stock automatically
DROP TRIGGER IF EXISTS trigger_update_inventory_stock ON inventory_transactions;
CREATE TRIGGER trigger_update_inventory_stock
AFTER INSERT ON inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION update_inventory_stock();

-- Create function to initialize stock when product is created
CREATE OR REPLACE FUNCTION initialize_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory_stock (product_id, quantity_available)
  VALUES (NEW.id, 0)
  ON CONFLICT (product_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize stock
DROP TRIGGER IF EXISTS trigger_initialize_product_stock ON inventory_products;
CREATE TRIGGER trigger_initialize_product_stock
AFTER INSERT ON inventory_products
FOR EACH ROW
EXECUTE FUNCTION initialize_product_stock();
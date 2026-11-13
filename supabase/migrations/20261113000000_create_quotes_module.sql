-- =====================================================================
-- MÓDULO DE COTIZACIONES
-- Ejecutar completo en el Editor SQL de Supabase. Es idempotente y no
-- modifica ni borra datos de otras tablas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Cotizaciones
--    Una cotización puede ser para un cliente existente (customer_id) o
--    para un prospecto que todavía no es cliente (campos prospect_*).
--    Los importes se guardan NETOS (IVA incluido) con su desglose.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text NOT NULL UNIQUE,

  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  prospect_name text,
  prospect_phone text,
  prospect_email text,
  prospect_address text,

  title text NOT NULL,
  system_type text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),

  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,

  pricing_tier integer DEFAULT 1,
  tax_rate numeric(5, 2) NOT NULL DEFAULT 16,
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  tax numeric(12, 2) NOT NULL DEFAULT 0,
  discount numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL DEFAULT 0,

  notes text,            -- visibles para el cliente
  terms text,            -- condiciones comerciales
  internal_notes text,   -- solo uso interno
  rejection_reason text,

  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,

  -- Enlaces con otros módulos
  service_order_id uuid REFERENCES service_orders(id) ON DELETE SET NULL,
  billing_document_id uuid REFERENCES billing_documents(id) ON DELETE SET NULL,
  calendar_concept_id uuid REFERENCES calendar_concepts(id) ON DELETE SET NULL,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_issue_date ON quotes(issue_date);

-- ---------------------------------------------------------------------
-- 2. Partidas de la cotización
--    price_list_id es opcional: también se permiten partidas libres.
--    unit_price es el precio unitario NETO (IVA incluido).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  price_list_id uuid REFERENCES price_list(id) ON DELETE SET NULL,
  code text,
  description text NOT NULL,
  category text,
  quantity numeric(12, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(12, 2) NOT NULL DEFAULT 0,
  discount_percent numeric(5, 2) NOT NULL DEFAULT 0,
  line_total numeric(12, 2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);

-- updated_at automático
CREATE OR REPLACE FUNCTION set_quotes_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quotes_updated_at ON quotes;
CREATE TRIGGER trg_quotes_updated_at
BEFORE UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION set_quotes_updated_at();

-- ---------------------------------------------------------------------
-- 3. Seguridad (RLS)
-- ---------------------------------------------------------------------
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotes_all_authenticated" ON quotes;
CREATE POLICY "quotes_all_authenticated" ON quotes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "quote_items_all_authenticated" ON quote_items;
CREATE POLICY "quote_items_all_authenticated" ON quote_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 4. Permisos del módulo (Configuración → Roles y permisos)
--    Los administradores ya tienen acceso total. Se da acceso inicial a
--    atención a clientes; los demás roles se configuran desde la app.
-- ---------------------------------------------------------------------
INSERT INTO permissions (module, action, description)
SELECT v.module, v.action, v.description
FROM (VALUES
  ('quotes', 'view', 'Ver cotizaciones'),
  ('quotes', 'create', 'Crear cotizaciones'),
  ('quotes', 'edit', 'Editar cotizaciones'),
  ('quotes', 'delete', 'Eliminar cotizaciones')
) AS v(module, action, description)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p WHERE p.module = v.module AND p.action = v.action
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.module = 'quotes'
WHERE r.name IN ('admin', 'customer_service')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- ---------------------------------------------------------------------
-- 5. Privilegios de tabla
--    En este proyecto las tablas nuevas no quedan expuestas a la app por
--    defecto: sin estos GRANT la app recibe "permission denied for table".
--    Las políticas RLS de arriba siguen controlando qué filas se ven.
-- ---------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON quotes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON quote_items TO authenticated;
GRANT ALL ON quotes TO service_role;
GRANT ALL ON quote_items TO service_role;

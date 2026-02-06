/*
  # Sistema de Tracking de Facturación y Cobranza

  1. Nueva Tabla: billing_documents
    - Sistema completo de tracking de facturas y tickets
    - Múltiples tipos de cobranza
    - NO emite facturas, solo tracking y gestión
    - Relación con clientes
    - Información de pago y vencimientos
    - Estados de cobranza
    - Notas y observaciones

  2. Tipos de Cobranza
    - ticket_remision: Tickets remisión (no requiere factura)
    - ticket_remision_foraneo: Tickets remisión foráneos
    - ticket_whatsapp: Tickets por WhatsApp con transferencia
    - factura_credito_local: Facturas a crédito Ciudad Guzmán
    - factura_credito_foraneo: Facturas a crédito foráneos
    - factura_credito_maestra: Facturas a crédito cuentas maestras
    - factura_credito_corporativa: Facturas a crédito corporativas (5+ cuentas)
    - ticket_contado: Tickets de contado
    - anualidad: Anualidades (distribuidas en todos los meses)

  3. Estados de Cobranza
    - pending: Pendiente de pago
    - partial: Pago parcial
    - paid: Pagado completamente
    - overdue: Vencido
    - cancelled: Cancelado

  4. Tabla: billing_payments
    - Registro de pagos parciales y completos
    - Métodos de pago
    - Comprobantes

  5. Índices para búsqueda rápida
    - Por cliente, folio, tipo de documento
    - Por estado, fechas de emisión y vencimiento
    - Por montos pendientes

  6. RLS habilitado
    - Usuarios autenticados pueden gestionar documentos
*/

-- Crear tabla de documentos de facturación/tickets
CREATE TABLE IF NOT EXISTS billing_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  
  -- Tipo de documento
  document_type text NOT NULL CHECK (document_type IN (
    'ticket_remision',
    'ticket_remision_foraneo',
    'ticket_whatsapp',
    'factura_credito_local',
    'factura_credito_foraneo',
    'factura_credito_maestra',
    'factura_credito_corporativa',
    'ticket_contado',
    'anualidad'
  )),
  
  -- Información básica
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  period_start date,
  period_end date,
  
  -- Montos
  subtotal decimal(10, 2) NOT NULL DEFAULT 0,
  tax decimal(10, 2) NOT NULL DEFAULT 0,
  discount decimal(10, 2) NOT NULL DEFAULT 0,
  total decimal(10, 2) NOT NULL DEFAULT 0,
  paid_amount decimal(10, 2) NOT NULL DEFAULT 0,
  balance decimal(10, 2) NOT NULL DEFAULT 0,
  
  -- Estado
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
    'pending',
    'partial',
    'paid',
    'overdue',
    'cancelled'
  )),
  
  -- Información de facturación (si aplica)
  fiscal_folio text,
  rfc text,
  legal_name text,
  tax_regime text,
  cfdi_use text,
  payment_method text,
  payment_form text,
  
  -- Detalles del servicio/concepto
  concept text,
  description text,
  service_period text,
  
  -- Información de pago
  credit_days integer DEFAULT 0,
  late_payment_fee decimal(10, 2) DEFAULT 0,
  
  -- Para anualidades
  is_annual boolean DEFAULT false,
  annual_total decimal(10, 2),
  monthly_installment decimal(10, 2),
  installment_number integer,
  total_installments integer DEFAULT 12,
  
  -- Archivos y referencias
  file_url text,
  external_reference text,
  whatsapp_number text,
  transfer_reference text,
  
  -- Notas
  notes text,
  internal_notes text,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cancellation_reason text
);

-- Crear tabla de pagos
CREATE TABLE IF NOT EXISTS billing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_document_id uuid NOT NULL REFERENCES billing_documents(id) ON DELETE CASCADE,
  
  -- Información del pago
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount decimal(10, 2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN (
    'efectivo',
    'transferencia',
    'tarjeta_debito',
    'tarjeta_credito',
    'cheque',
    'whatsapp',
    'deposito',
    'otro'
  )),
  
  -- Referencias
  reference_number text,
  authorization_code text,
  bank_name text,
  account_number text,
  
  -- Comprobantes
  receipt_number text,
  receipt_url text,
  
  -- Notas
  notes text,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Función para calcular balance automáticamente
CREATE OR REPLACE FUNCTION calculate_billing_balance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.balance = NEW.total - NEW.paid_amount;
  
  -- Actualizar estado según el balance
  IF NEW.balance <= 0 THEN
    NEW.payment_status = 'paid';
  ELSIF NEW.paid_amount > 0 THEN
    NEW.payment_status = 'partial';
  ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE AND NEW.balance > 0 THEN
    NEW.payment_status = 'overdue';
  ELSE
    NEW.payment_status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_billing_balance ON billing_documents;
CREATE TRIGGER trigger_calculate_billing_balance
  BEFORE INSERT OR UPDATE ON billing_documents
  FOR EACH ROW
  EXECUTE FUNCTION calculate_billing_balance();

-- Función para actualizar documento cuando se registra un pago
CREATE OR REPLACE FUNCTION update_document_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  total_paid decimal(10, 2);
BEGIN
  -- Calcular total pagado
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM billing_payments
  WHERE billing_document_id = NEW.billing_document_id;
  
  -- Actualizar documento
  UPDATE billing_documents
  SET paid_amount = total_paid,
      updated_at = now()
  WHERE id = NEW.billing_document_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_document_on_payment ON billing_payments;
CREATE TRIGGER trigger_update_document_on_payment
  AFTER INSERT OR UPDATE OR DELETE ON billing_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_document_on_payment();

-- Función para generar cuotas de anualidad
CREATE OR REPLACE FUNCTION generate_annual_installments(
  p_customer_id uuid,
  p_annual_total decimal,
  p_start_date date,
  p_concept text
)
RETURNS void AS $$
DECLARE
  monthly_amount decimal(10, 2);
  i integer;
  installment_date date;
  folio_base text;
BEGIN
  monthly_amount := p_annual_total / 12;
  folio_base := 'ANUAL-' || TO_CHAR(p_start_date, 'YYYY') || '-' || substr(p_customer_id::text, 1, 8);
  
  FOR i IN 1..12 LOOP
    installment_date := p_start_date + ((i - 1) || ' months')::interval;
    
    INSERT INTO billing_documents (
      folio,
      customer_id,
      document_type,
      issue_date,
      due_date,
      total,
      balance,
      concept,
      is_annual,
      annual_total,
      monthly_installment,
      installment_number,
      total_installments,
      service_period
    ) VALUES (
      folio_base || '-' || LPAD(i::text, 2, '0'),
      p_customer_id,
      'anualidad',
      installment_date,
      installment_date + interval '15 days',
      monthly_amount,
      monthly_amount,
      p_concept,
      true,
      p_annual_total,
      monthly_amount,
      i,
      12,
      TO_CHAR(installment_date, 'Month YYYY')
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_billing_documents_customer ON billing_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_documents_folio ON billing_documents(folio);
CREATE INDEX IF NOT EXISTS idx_billing_documents_type ON billing_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_billing_documents_status ON billing_documents(payment_status);
CREATE INDEX IF NOT EXISTS idx_billing_documents_issue_date ON billing_documents(issue_date);
CREATE INDEX IF NOT EXISTS idx_billing_documents_due_date ON billing_documents(due_date);
CREATE INDEX IF NOT EXISTS idx_billing_documents_balance ON billing_documents(balance);
CREATE INDEX IF NOT EXISTS idx_billing_documents_is_annual ON billing_documents(is_annual);
CREATE INDEX IF NOT EXISTS idx_billing_payments_document ON billing_payments(billing_document_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_date ON billing_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_billing_payments_method ON billing_payments(payment_method);

-- RLS para billing_documents
ALTER TABLE billing_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver documentos"
  ON billing_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear documentos"
  ON billing_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar documentos"
  ON billing_documents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar documentos"
  ON billing_documents FOR DELETE
  TO authenticated
  USING (true);

-- RLS para billing_payments
ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver pagos"
  ON billing_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear pagos"
  ON billing_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar pagos"
  ON billing_payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar pagos"
  ON billing_payments FOR DELETE
  TO authenticated
  USING (true);

-- Comentarios
COMMENT ON TABLE billing_documents IS 'Sistema de tracking de facturas y tickets - NO emite documentos, solo gestiona';
COMMENT ON COLUMN billing_documents.document_type IS 'Tipo de documento de cobranza';
COMMENT ON COLUMN billing_documents.payment_status IS 'Estado de pago del documento';
COMMENT ON COLUMN billing_documents.is_annual IS 'Indica si es parte de una anualidad';
COMMENT ON COLUMN billing_documents.balance IS 'Saldo pendiente de pago';

COMMENT ON TABLE billing_payments IS 'Registro de pagos parciales y completos';
COMMENT ON FUNCTION generate_annual_installments IS 'Genera 12 cuotas mensuales para anualidades';

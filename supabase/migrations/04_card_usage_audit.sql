-- Tabla: card_access_logs
-- Registra todos los intentos de escaneo de tarjetas digitales, exitosos y fallidos, por seguridad.

CREATE TABLE IF NOT EXISTS card_access_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scanned_card_number text NOT NULL,
    target_customer_id uuid,
    service_order_id uuid,
    is_successful boolean DEFAULT false NOT NULL,
    failure_reason text,
    user_id uuid,
    context text,
    scanned_at timestamptz DEFAULT now() NOT NULL
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE card_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert card access logs"
  ON card_access_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view card access logs"
  ON card_access_logs
  FOR SELECT
  TO authenticated
  USING (true);

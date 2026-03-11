/*
  Phase 2: Material Requests + In-App Notifications
  ===================================================
  - inventory_material_requests: Technician requests materials, admin approves
  - inventory_notifications: In-app notifications for admin (material requests, low stock, inconsistencies)
*/

-- =====================================================
-- 1. MATERIAL REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_material_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected, completed
  from_location_id uuid REFERENCES inventory_locations(id) ON DELETE SET NULL,
  to_location_id uuid REFERENCES inventory_locations(id) ON DELETE SET NULL,
  service_order_id uuid,
  notes text,
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Request items (multiple products per request)
CREATE TABLE IF NOT EXISTS inventory_material_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES inventory_material_requests(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES price_list(id) ON DELETE CASCADE,
  quantity_requested integer NOT NULL DEFAULT 1,
  quantity_approved integer,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE inventory_material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_material_request_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver solicitudes" ON inventory_material_requests;
CREATE POLICY "Ver solicitudes" ON inventory_material_requests
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Gestionar solicitudes" ON inventory_material_requests;
CREATE POLICY "Gestionar solicitudes" ON inventory_material_requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Ver items solicitud" ON inventory_material_request_items;
CREATE POLICY "Ver items solicitud" ON inventory_material_request_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Gestionar items solicitud" ON inventory_material_request_items;
CREATE POLICY "Gestionar items solicitud" ON inventory_material_request_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_material_requests_status ON inventory_material_requests(status);
CREATE INDEX IF NOT EXISTS idx_material_requests_by ON inventory_material_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_material_request_items_req ON inventory_material_request_items(request_id);

-- =====================================================
-- 2. INVENTORY NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = all admins
  notification_type text NOT NULL, -- material_request, low_stock, inconsistency, request_approved, request_rejected
  title text NOT NULL,
  message text NOT NULL,
  priority text DEFAULT 'medium', -- low, medium, high, critical
  reference_type text, -- material_request, product, service_order
  reference_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE inventory_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver notificaciones inventario" ON inventory_notifications;
CREATE POLICY "Ver notificaciones inventario" ON inventory_notifications
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Gestionar notificaciones inventario" ON inventory_notifications;
CREATE POLICY "Gestionar notificaciones inventario" ON inventory_notifications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_inv_notifications_user ON inventory_notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_inv_notifications_read ON inventory_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_inv_notifications_type ON inventory_notifications(notification_type);

-- =====================================================
-- 3. FUNCTION: Auto-notify admins on new material request
-- =====================================================
CREATE OR REPLACE FUNCTION notify_on_material_request()
RETURNS TRIGGER AS $$
DECLARE
  v_requester_name text;
  v_admin_ids uuid[];
BEGIN
  -- Get requester name
  SELECT full_name INTO v_requester_name
  FROM user_profiles WHERE id = NEW.requested_by;

  -- Get all admin user IDs
  SELECT ARRAY_AGG(ur.user_id) INTO v_admin_ids
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE r.name = 'admin';

  -- Create notification for each admin
  IF v_admin_ids IS NOT NULL THEN
    INSERT INTO inventory_notifications (target_user_id, notification_type, title, message, priority, reference_type, reference_id)
    SELECT
      unnest(v_admin_ids),
      'material_request',
      'Nueva solicitud de material',
      COALESCE(v_requester_name, 'Un técnico') || ' ha solicitado material. Revisa y aprueba la solicitud.',
      'high',
      'material_request',
      NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_material_request ON inventory_material_requests;
CREATE TRIGGER trigger_notify_material_request
AFTER INSERT ON inventory_material_requests
FOR EACH ROW
EXECUTE FUNCTION notify_on_material_request();

-- =====================================================
-- 4. FUNCTION: Notify requester on approval/rejection
-- =====================================================
CREATE OR REPLACE FUNCTION notify_on_request_review()
RETURNS TRIGGER AS $$
DECLARE
  v_reviewer_name text;
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    SELECT full_name INTO v_reviewer_name
    FROM user_profiles WHERE id = NEW.reviewed_by;

    INSERT INTO inventory_notifications (
      target_user_id, notification_type, title, message, priority, reference_type, reference_id
    ) VALUES (
      NEW.requested_by,
      CASE WHEN NEW.status = 'approved' THEN 'request_approved' ELSE 'request_rejected' END,
      CASE WHEN NEW.status = 'approved' THEN 'Solicitud aprobada' ELSE 'Solicitud rechazada' END,
      CASE WHEN NEW.status = 'approved'
        THEN COALESCE(v_reviewer_name, 'El administrador') || ' aprobó tu solicitud de material.'
        ELSE COALESCE(v_reviewer_name, 'El administrador') || ' rechazó tu solicitud. ' || COALESCE(NEW.admin_notes, '')
      END,
      'medium',
      'material_request',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_request_review ON inventory_material_requests;
CREATE TRIGGER trigger_notify_request_review
AFTER UPDATE ON inventory_material_requests
FOR EACH ROW
EXECUTE FUNCTION notify_on_request_review();

-- =====================================================
-- 5. CONFIRMATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Phase 2 tables created: inventory_material_requests, inventory_material_request_items, inventory_notifications. Triggers active.';
END $$;

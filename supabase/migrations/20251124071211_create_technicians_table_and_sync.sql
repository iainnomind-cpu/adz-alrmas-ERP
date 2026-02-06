/*
  # Crear Tabla de Técnicos y Sincronización
  
  1. Nueva Tabla
    - `technicians` - Tabla de técnicos para órdenes de servicio
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text, not null)
      - `email` (text)
      - `phone` (text)
      - `specialty` (text)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
  2. Sincronización
    - Triggers para mantener sincronizados technicians con user_profiles
    - Vista combinada con toda la información
    
  3. Seguridad
    - RLS habilitado
    - Políticas para lectura por usuarios autenticados
    - Solo admins pueden modificar
*/

-- Crear tabla de técnicos
CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  specialty text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para technicians
CREATE POLICY "Usuarios autenticados pueden ver técnicos activos"
  ON technicians FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins pueden gestionar técnicos"
  ON technicians FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Función para sincronizar técnico desde user_profile
CREATE OR REPLACE FUNCTION sync_user_profile_to_technician()
RETURNS TRIGGER AS $$
DECLARE
  tech_role_id uuid;
  tech_details RECORD;
  user_email text;
BEGIN
  -- Obtener el ID del rol de técnico
  SELECT id INTO tech_role_id FROM roles WHERE name = 'technician';
  
  -- Solo procesar si el rol es técnico
  IF NEW.role_id = tech_role_id THEN
    -- Obtener detalles del técnico si existen
    SELECT * INTO tech_details 
    FROM technician_details 
    WHERE user_profile_id = NEW.id;
    
    -- Obtener email del usuario
    SELECT email INTO user_email 
    FROM auth.users 
    WHERE id = NEW.id;
    
    -- Insertar o actualizar en la tabla technicians
    INSERT INTO technicians (
      id,
      full_name,
      email,
      phone,
      specialty,
      is_active
    )
    VALUES (
      NEW.id,
      NEW.full_name,
      user_email,
      NEW.phone,
      tech_details.specialty,
      NEW.is_active
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        specialty = EXCLUDED.specialty,
        is_active = EXCLUDED.is_active,
        updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para sincronizar desde user_profiles a technicians
DROP TRIGGER IF EXISTS sync_user_to_technician_trigger ON user_profiles;
CREATE TRIGGER sync_user_to_technician_trigger
  AFTER INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_profile_to_technician();

-- Función para sincronizar desde technician_details
CREATE OR REPLACE FUNCTION sync_technician_details_to_technician()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE technicians
  SET specialty = NEW.specialty,
      updated_at = now()
  WHERE id = NEW.user_profile_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para sincronizar desde technician_details
DROP TRIGGER IF EXISTS sync_details_to_technician_trigger ON technician_details;
CREATE TRIGGER sync_details_to_technician_trigger
  AFTER INSERT OR UPDATE ON technician_details
  FOR EACH ROW
  EXECUTE FUNCTION sync_technician_details_to_technician();

-- Función para sincronizar técnicos existentes a user_profiles
CREATE OR REPLACE FUNCTION ensure_technician_has_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  tech_role_id uuid;
BEGIN
  -- Obtener el ID del rol de técnico
  SELECT id INTO tech_role_id FROM roles WHERE name = 'technician';
  
  IF tech_role_id IS NULL THEN
    RAISE EXCEPTION 'El rol de técnico no existe';
  END IF;
  
  -- Crear user_profile si no existe
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = NEW.id) THEN
    INSERT INTO user_profiles (id, full_name, phone, role_id, is_active)
    VALUES (NEW.id, NEW.full_name, NEW.phone, tech_role_id, NEW.is_active)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para asegurar user_profile desde technicians
DROP TRIGGER IF EXISTS ensure_technician_profile_trigger ON technicians;
CREATE TRIGGER ensure_technician_profile_trigger
  AFTER INSERT OR UPDATE ON technicians
  FOR EACH ROW
  EXECUTE FUNCTION ensure_technician_has_user_profile();

-- Trigger para actualizar updated_at en technicians
CREATE OR REPLACE FUNCTION update_technicians_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER technicians_updated_at
  BEFORE UPDATE ON technicians
  FOR EACH ROW
  EXECUTE FUNCTION update_technicians_updated_at();

-- Vista combinada de técnicos con toda la información
CREATE OR REPLACE VIEW technicians_full AS
SELECT 
  t.id,
  t.full_name,
  t.email,
  t.phone,
  t.specialty,
  t.is_active,
  t.created_at,
  t.updated_at,
  td.hourly_rate,
  td.work_schedule_start,
  td.work_schedule_end,
  td.available_monday,
  td.available_tuesday,
  td.available_wednesday,
  td.available_thursday,
  td.available_friday,
  td.available_saturday,
  td.available_sunday,
  up.role_id,
  r.name as role_name
FROM technicians t
LEFT JOIN user_profiles up ON t.id = up.id
LEFT JOIN roles r ON up.role_id = r.id
LEFT JOIN technician_details td ON t.id = td.user_profile_id
WHERE t.is_active = true;

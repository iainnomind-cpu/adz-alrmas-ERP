/*
  # Módulo de Configuración y Gestión de Usuarios
  
  1. Nuevas Tablas
    - `roles` - Roles del sistema (Admin, Técnico, Atención a Cliente, Cobrador)
      - `id` (uuid, primary key)
      - `name` (text, unique) - Nombre del rol
      - `description` (text) - Descripción del rol
      - `is_active` (boolean) - Si el rol está activo
      - `created_at` (timestamptz)
      
    - `permissions` - Permisos granulares del sistema
      - `id` (uuid, primary key)
      - `module` (text) - Módulo (customers, service_orders, invoices, etc.)
      - `action` (text) - Acción (view, create, edit, delete, export)
      - `description` (text) - Descripción del permiso
      - `created_at` (timestamptz)
      
    - `role_permissions` - Relación entre roles y permisos
      - `id` (uuid, primary key)
      - `role_id` (uuid, foreign key)
      - `permission_id` (uuid, foreign key)
      - `created_at` (timestamptz)
      
    - `user_profiles` - Perfiles de usuario extendidos
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text, not null)
      - `phone` (text)
      - `role_id` (uuid, foreign key)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `technician_details` - Detalles específicos para técnicos
      - `id` (uuid, primary key)
      - `user_profile_id` (uuid, foreign key)
      - `specialty` (text)
      - `hourly_rate` (decimal)
      - `work_schedule_start` (time)
      - `work_schedule_end` (time)
      - `available_monday` (boolean)
      - `available_tuesday` (boolean)
      - `available_wednesday` (boolean)
      - `available_thursday` (boolean)
      - `available_friday` (boolean)
      - `available_saturday` (boolean)
      - `available_sunday` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `system_settings` - Configuraciones del sistema
      - `id` (uuid, primary key)
      - `setting_key` (text, unique)
      - `setting_value` (jsonb)
      - `description` (text)
      - `category` (text)
      - `updated_at` (timestamptz)
      - `updated_by` (uuid, foreign key)
      
  2. Seguridad
    - Habilitar RLS en todas las tablas
    - Políticas restrictivas para gestión de usuarios
    - Solo administradores pueden modificar roles y permisos
    
  3. Datos Iniciales
    - Crear roles predeterminados
    - Crear permisos base del sistema
    - Asignar permisos por defecto a roles
*/

-- Crear tabla de roles
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Crear tabla de permisos
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  action text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(module, action)
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Crear tabla de relación roles-permisos
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Crear tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  role_id uuid REFERENCES roles(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Crear tabla de detalles de técnicos
CREATE TABLE IF NOT EXISTS technician_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id uuid UNIQUE NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  specialty text,
  hourly_rate decimal(10,2) DEFAULT 0,
  work_schedule_start time,
  work_schedule_end time,
  available_monday boolean DEFAULT true,
  available_tuesday boolean DEFAULT true,
  available_wednesday boolean DEFAULT true,
  available_thursday boolean DEFAULT true,
  available_friday boolean DEFAULT true,
  available_saturday boolean DEFAULT false,
  available_sunday boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE technician_details ENABLE ROW LEVEL SECURITY;

-- Crear tabla de configuraciones del sistema
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  category text DEFAULT 'general',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Insertar roles predeterminados
INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrador del sistema con acceso completo'),
  ('technician', 'Técnico de campo para órdenes de servicio'),
  ('customer_service', 'Atención a cliente'),
  ('collector', 'Cobrador encargado de gestión de cartera')
ON CONFLICT (name) DO NOTHING;

-- Insertar permisos base del sistema
INSERT INTO permissions (module, action, description) VALUES
  -- Dashboard
  ('dashboard', 'view', 'Ver dashboard'),
  
  -- Clientes
  ('customers', 'view', 'Ver clientes'),
  ('customers', 'create', 'Crear clientes'),
  ('customers', 'edit', 'Editar clientes'),
  ('customers', 'delete', 'Eliminar clientes'),
  ('customers', 'export', 'Exportar clientes'),
  
  -- Órdenes de Servicio
  ('service_orders', 'view', 'Ver órdenes de servicio'),
  ('service_orders', 'create', 'Crear órdenes de servicio'),
  ('service_orders', 'edit', 'Editar órdenes de servicio'),
  ('service_orders', 'delete', 'Eliminar órdenes de servicio'),
  ('service_orders', 'assign', 'Asignar órdenes de servicio'),
  ('service_orders', 'complete', 'Completar órdenes de servicio'),
  
  -- Facturación
  ('invoices', 'view', 'Ver facturas'),
  ('invoices', 'create', 'Crear facturas'),
  ('invoices', 'edit', 'Editar facturas'),
  ('invoices', 'delete', 'Eliminar facturas'),
  ('invoices', 'export', 'Exportar facturas'),
  
  -- Activos
  ('assets', 'view', 'Ver activos'),
  ('assets', 'create', 'Crear activos'),
  ('assets', 'edit', 'Editar activos'),
  ('assets', 'delete', 'Eliminar activos'),
  
  -- Inventario
  ('inventory', 'view', 'Ver inventario'),
  ('inventory', 'create', 'Crear productos'),
  ('inventory', 'edit', 'Editar inventario'),
  ('inventory', 'delete', 'Eliminar productos'),
  ('inventory', 'adjust', 'Ajustar inventario'),
  
  -- Configuración
  ('settings', 'view', 'Ver configuración'),
  ('settings', 'edit', 'Editar configuración'),
  ('settings', 'manage_users', 'Gestionar usuarios'),
  ('settings', 'manage_roles', 'Gestionar roles y permisos')
ON CONFLICT (module, action) DO NOTHING;

-- Asignar permisos al rol Admin (todos los permisos)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'admin'),
  id
FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Asignar permisos al rol Técnico
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'technician'),
  id
FROM permissions
WHERE 
  (module = 'dashboard' AND action = 'view') OR
  (module = 'service_orders' AND action IN ('view', 'edit', 'complete')) OR
  (module = 'customers' AND action = 'view') OR
  (module = 'assets' AND action = 'view') OR
  (module = 'inventory' AND action = 'view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Asignar permisos al rol Atención a Cliente
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'customer_service'),
  id
FROM permissions
WHERE 
  (module = 'dashboard' AND action = 'view') OR
  (module = 'customers' AND action IN ('view', 'create', 'edit')) OR
  (module = 'service_orders' AND action IN ('view', 'create', 'edit', 'assign')) OR
  (module = 'invoices' AND action = 'view') OR
  (module = 'assets' AND action IN ('view', 'create', 'edit'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Asignar permisos al rol Cobrador
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'collector'),
  id
FROM permissions
WHERE 
  (module = 'dashboard' AND action = 'view') OR
  (module = 'customers' AND action = 'view') OR
  (module = 'invoices' AND action IN ('view', 'edit', 'export'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Políticas RLS para roles
CREATE POLICY "Usuarios autenticados pueden ver roles activos"
  ON roles FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Solo admins pueden modificar roles"
  ON roles FOR ALL
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

-- Políticas RLS para permisos
CREATE POLICY "Usuarios autenticados pueden ver permisos"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo admins pueden modificar permisos"
  ON permissions FOR ALL
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

-- Políticas RLS para role_permissions
CREATE POLICY "Usuarios autenticados pueden ver role_permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo admins pueden modificar role_permissions"
  ON role_permissions FOR ALL
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

-- Políticas RLS para user_profiles
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins pueden ver todos los perfiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins pueden crear perfiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins pueden actualizar perfiles"
  ON user_profiles FOR UPDATE
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

-- Políticas RLS para technician_details
CREATE POLICY "Técnicos pueden ver sus propios detalles"
  ON technician_details FOR SELECT
  TO authenticated
  USING (user_profile_id = auth.uid());

CREATE POLICY "Admins pueden ver todos los detalles de técnicos"
  ON technician_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins pueden gestionar detalles de técnicos"
  ON technician_details FOR ALL
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

-- Políticas RLS para system_settings
CREATE POLICY "Usuarios pueden ver configuraciones"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo admins pueden modificar configuraciones"
  ON system_settings FOR ALL
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

-- Función para verificar permisos de usuario
CREATE OR REPLACE FUNCTION has_permission(user_id uuid, module_name text, action_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN role_permissions rp ON up.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE up.id = user_id
      AND p.module = module_name
      AND p.action = action_name
      AND up.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vista para obtener permisos de usuario
CREATE OR REPLACE VIEW user_permissions AS
SELECT 
  up.id as user_id,
  up.full_name,
  r.name as role_name,
  p.module,
  p.action,
  p.description as permission_description
FROM user_profiles up
JOIN roles r ON up.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE up.is_active = true AND r.is_active = true;

-- Trigger para actualizar updated_at en user_profiles
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Trigger para actualizar updated_at en technician_details
CREATE TRIGGER technician_details_updated_at
  BEFORE UPDATE ON technician_details
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

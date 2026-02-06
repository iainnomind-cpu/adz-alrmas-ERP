/*
  # Sistema Simplificado de Técnicos
  
  1. Nueva Tabla: technicians
    - `id` (uuid, primary key, references auth.users)
    - `full_name` (text, not null)
    - `email` (text)
    - `phone` (text)
    - `employee_number` (text, unique) - NUEVO
    - `specialty` (text)
    - `hourly_rate` (numeric, default 0)
    - `hire_date` (date) - NUEVO
    - `work_schedule_start` (time)
    - `work_schedule_end` (time)
    - `available_monday` (boolean, default true)
    - `available_tuesday` (boolean, default true)
    - `available_wednesday` (boolean, default true)
    - `available_thursday` (boolean, default true)
    - `available_friday` (boolean, default true)
    - `available_saturday` (boolean, default false)
    - `available_sunday` (boolean, default false)
    - `is_active` (boolean, default true)
    - `created_at` (timestamptz, default now())
    - `updated_at` (timestamptz, default now())
    
  2. Seguridad
    - RLS habilitado
    - Políticas para lectura por usuarios autenticados
    - Políticas para escritura por usuarios autenticados (simplificado)
    
  3. Notas
    - Sistema simplificado sin dependencia de user_profiles o roles
    - Referencias directas a auth.users para máxima compatibilidad
    - Incluye employee_number y hire_date como solicitado
*/

-- Crear tabla de técnicos simplificada
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

-- Habilitar RLS
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

-- Política para lectura: todos los usuarios autenticados pueden ver técnicos activos
CREATE POLICY "Usuarios autenticados pueden ver técnicos activos"
  ON technicians FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Política para inserción: usuarios autenticados pueden crear técnicos
CREATE POLICY "Usuarios autenticados pueden crear técnicos"
  ON technicians FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para actualización: usuarios autenticados pueden actualizar técnicos
CREATE POLICY "Usuarios autenticados pueden actualizar técnicos"
  ON technicians FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger para actualizar updated_at automáticamente
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

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_technicians_employee_number ON technicians(employee_number);
CREATE INDEX IF NOT EXISTS idx_technicians_is_active ON technicians(is_active);
CREATE INDEX IF NOT EXISTS idx_technicians_email ON technicians(email);

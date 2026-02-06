/*
  # Arreglar Sistema de Órdenes de Servicio y Agregar Datos de Ejemplo

  1. Cambios
    - Agregar columnas faltantes a service_orders para compatibilidad con el formulario
    - Insertar clientes de ejemplo
    - Insertar activos de ejemplo
    - Insertar productos de inventario de ejemplo
    - Insertar órdenes de servicio de ejemplo
    - Insertar facturas de ejemplo
  
  2. Seguridad
    - Mantener RLS existente en todas las tablas
*/

-- Agregar columnas faltantes a service_orders
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS service_type text DEFAULT 'reactive',
ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS labor_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS materials_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_paused boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pause_reason text;

-- Insertar clientes de ejemplo (usando solo columnas existentes)
INSERT INTO customers (name, owner_name, email, phone, address, customer_type, communication_tech, monitoring_plan, status)
VALUES 
  ('Comercial La Esperanza', 'Juan Pérez Gómez', 'juan.perez@laesperanza.com', '555-0101', 'Av. Principal 123, Centro', 'comercio', 'dual', 'Premium', 'active'),
  ('Residencia Martínez', 'María Martínez López', 'maria.martinez@email.com', '555-0102', 'Calle Robles 456, Col. Los Pinos', 'casa', 'celular', 'Basic', 'active'),
  ('Banco del Progreso', 'Carlos Rodríguez', 'seguridad@bancoprogreso.com', '555-0103', 'Plaza Financiera 789, Torre A', 'banco', 'dual', 'Enterprise', 'active'),
  ('Tienda Mi Pueblo', 'Ana García Ruiz', 'ana.garcia@mipueblo.com', '555-0104', 'Calle Comercio 321, Centro', 'comercio', 'telefono', 'Standard', 'active'),
  ('Casa Ramírez', 'Pedro Ramírez Silva', 'pedro.ramirez@email.com', '555-0105', 'Privada Los Sauces 567, Fracc. Alameda', 'casa', 'dual', 'Premium', 'active'),
  ('Farmacia San José', 'Laura Sánchez', 'contacto@farmaciasanjose.com', '555-0106', 'Av. Juárez 890, Col. Centro', 'comercio', 'celular', 'Standard', 'active'),
  ('Residencia González', 'Roberto González', 'roberto.gonzalez@email.com', '555-0107', 'Calle Pinos 234, Col. Las Flores', 'casa', 'telefono', 'Basic', 'suspended'),
  ('Supermercado El Ahorro', 'José Luis Torres', 'gerencia@elahorro.com', '555-0108', 'Blvd. Comercial 456, Plaza Norte', 'comercio', 'dual', 'Premium', 'active'),
  ('Casa López', 'Carmen López Díaz', 'carmen.lopez@email.com', '555-0109', 'Calle Naranjos 678, Col. Jardines', 'casa', 'celular', 'Standard', 'active'),
  ('Consultorio Dr. Hernández', 'Dr. Miguel Hernández', 'consultorio@drhernandez.com', '555-0110', 'Av. Salud 901, Col. Médica', 'comercio', 'dual', 'Standard', 'active')
ON CONFLICT DO NOTHING;

-- Insertar activos para los clientes
INSERT INTO assets (customer_id, alarm_model, keyboard_model, communicator_model, serial_number, installation_date, is_eol, status)
SELECT 
  c.id,
  CASE 
    WHEN c.customer_type = 'banco' THEN 'DSC PowerSeries Pro'
    WHEN c.customer_type = 'comercio' THEN 'Honeywell Vista-20P'
    ELSE 'DSC PC1616'
  END,
  CASE 
    WHEN c.customer_type = 'banco' THEN 'DSC PK5501'
    ELSE 'DSC PK5500'
  END,
  CASE 
    WHEN c.communication_tech = 'dual' THEN 'Honeywell AlarmNet'
    WHEN c.communication_tech = 'celular' THEN 'Telular GSM'
    ELSE 'Ademco 4285'
  END,
  'SN-' || LPAD((ROW_NUMBER() OVER ())::text, 6, '0'),
  CURRENT_DATE - (RANDOM() * 365 * 3)::integer,
  RANDOM() < 0.2,
  'active'
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE customer_id = c.id);

-- Insertar productos de inventario
INSERT INTO inventory_items (name, sku, category, unit_cost, quantity_available, min_stock_level)
VALUES 
  ('Sensor de Movimiento PIR', 'PIR-001', 'sensors', 15.50, 50, 10),
  ('Contacto Magnético Puerta', 'MAG-001', 'sensors', 8.75, 100, 20),
  ('Sirena Interior 120dB', 'SIR-001', 'alarms', 45.00, 25, 5),
  ('Batería Respaldo 12V 7Ah', 'BAT-001', 'power', 28.00, 40, 10),
  ('Panel DSC PC1616', 'PAN-001', 'panels', 180.00, 8, 3),
  ('Panel Honeywell Vista-20P', 'PAN-002', 'panels', 220.00, 5, 2),
  ('Teclado DSC PK5500', 'KEY-001', 'keyboards', 65.00, 15, 5),
  ('Teclado DSC PK5501', 'KEY-002', 'keyboards', 75.00, 12, 4),
  ('Comunicador GSM Telular', 'COM-001', 'communicators', 120.00, 10, 3),
  ('Comunicador AlarmNet', 'COM-002', 'communicators', 150.00, 8, 2),
  ('Cable Calibre 22 (rollo 100m)', 'CAB-001', 'wiring', 35.00, 20, 5),
  ('Fuente de Poder 12V 5A', 'POW-001', 'power', 42.00, 18, 5),
  ('Sensor de Humo Fotoeléctrico', 'SMO-001', 'sensors', 25.00, 30, 8),
  ('Detector de Rotura de Cristal', 'GLA-001', 'sensors', 55.00, 15, 5),
  ('Sensor de Monóxido de Carbono', 'CO-001', 'sensors', 45.00, 20, 5),
  ('Cámara IP 1080p', 'CAM-001', 'cameras', 180.00, 12, 3),
  ('Grabadora DVR 4 Canales', 'DVR-001', 'recorders', 280.00, 6, 2),
  ('Botón de Pánico Inalámbrico', 'PAN-BTN-001', 'accessories', 32.00, 25, 8),
  ('Control Remoto Llavero', 'REM-001', 'accessories', 18.00, 40, 10),
  ('Transformador 16.5V 40VA', 'TRA-001', 'power', 22.00, 30, 8)
ON CONFLICT (sku) DO NOTHING;

-- Insertar órdenes de servicio de ejemplo
DO $$
DECLARE
  v_customer_ids uuid[];
  v_asset_ids uuid[];
  v_technician_id uuid;
BEGIN
  -- Obtener IDs de clientes
  SELECT ARRAY_AGG(id) INTO v_customer_ids FROM customers LIMIT 10;
  
  -- Obtener IDs de activos
  SELECT ARRAY_AGG(id) INTO v_asset_ids FROM assets LIMIT 10;
  
  -- Obtener el primer usuario de auth.users como técnico
  SELECT id INTO v_technician_id FROM auth.users LIMIT 1;
  
  -- Si no hay técnico, salir
  IF v_technician_id IS NULL THEN
    RAISE NOTICE 'No hay usuarios en auth.users para asignar como técnico';
    RETURN;
  END IF;
  
  -- Insertar órdenes de servicio variadas
  INSERT INTO service_orders (
    customer_id, 
    asset_id, 
    technician_id, 
    order_number, 
    description, 
    priority, 
    service_type,
    status, 
    estimated_duration_minutes,
    labor_cost,
    materials_cost,
    total_cost,
    check_in_time,
    check_out_time,
    total_time_minutes,
    created_at,
    completed_at
  )
  VALUES 
    -- Orden completada 1 - Instalación
    (
      v_customer_ids[1], 
      v_asset_ids[1], 
      v_technician_id,
      'SO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-0001',
      'Instalación de sistema de alarma completo con 5 sensores PIR, 3 contactos magnéticos y sirena interior',
      'high',
      'installation',
      'completed',
      180,
      250.00,
      176.75,
      426.75,
      CURRENT_TIMESTAMP - interval '5 days' - interval '3 hours',
      CURRENT_TIMESTAMP - interval '5 days',
      180,
      CURRENT_TIMESTAMP - interval '5 days' - interval '3 hours',
      CURRENT_TIMESTAMP - interval '5 days'
    ),
    -- Orden en progreso
    (
      v_customer_ids[2], 
      v_asset_ids[2], 
      v_technician_id,
      'SO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-0002',
      'Mantenimiento preventivo anual: revisión de sensores, prueba de comunicación y cambio de batería de respaldo',
      'medium',
      'preventive',
      'in_progress',
      90,
      80.00,
      28.00,
      108.00,
      CURRENT_TIMESTAMP - interval '2 hours',
      NULL,
      NULL,
      CURRENT_TIMESTAMP - interval '3 hours',
      NULL
    ),
    -- Orden completada 2 - Correctivo
    (
      v_customer_ids[3], 
      v_asset_ids[3], 
      v_technician_id,
      'SO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-0003',
      'Servicio correctivo: reemplazo de sensor PIR defectuoso en área de recepción',
      'urgent',
      'corrective',
      'completed',
      45,
      60.00,
      15.50,
      75.50,
      CURRENT_TIMESTAMP - interval '3 days' - interval '1 hour',
      CURRENT_TIMESTAMP - interval '3 days',
      45,
      CURRENT_TIMESTAMP - interval '3 days' - interval '1 hour' - interval '30 minutes',
      CURRENT_TIMESTAMP - interval '3 days'
    ),
    -- Orden solicitada (sin iniciar)
    (
      v_customer_ids[4], 
      v_asset_ids[4], 
      v_technician_id,
      'SO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-0004',
      'Falsa alarma recurrente en zona 3, requiere diagnóstico y ajuste',
      'high',
      'reactive',
      'requested',
      60,
      0,
      0,
      0,
      NULL,
      NULL,
      NULL,
      CURRENT_TIMESTAMP - interval '1 day',
      NULL
    ),
    -- Orden completada 3 - Actualización
    (
      v_customer_ids[5], 
      v_asset_ids[5], 
      v_technician_id,
      'SO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-0005',
      'Actualización de sistema: instalación de comunicador GSM para respaldo de línea telefónica',
      'medium',
      'upgrade',
      'completed',
      120,
      150.00,
      120.00,
      270.00,
      CURRENT_TIMESTAMP - interval '7 days' - interval '2 hours',
      CURRENT_TIMESTAMP - interval '7 days',
      120,
      CURRENT_TIMESTAMP - interval '7 days' - interval '2 hours' - interval '30 minutes',
      CURRENT_TIMESTAMP - interval '7 days'
    ),
    -- Orden asignada (pendiente de iniciar)
    (
      v_customer_ids[6], 
      v_asset_ids[6], 
      v_technician_id,
      'SO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-0006',
      'Reactivación de servicio: verificar sistema completo después de suspensión',
      'high',
      'reactive',
      'assigned',
      90,
      0,
      0,
      0,
      NULL,
      NULL,
      NULL,
      CURRENT_TIMESTAMP - interval '6 hours',
      NULL
    ),
    -- Orden completada 4 - Preventivo
    (
      v_customer_ids[7], 
      v_asset_ids[7], 
      v_technician_id,
      'SO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-0007',
      'Mantenimiento preventivo trimestral: revisión completa, limpieza de sensores, pruebas',
      'medium',
      'preventive',
      'completed',
      75,
      90.00,
      0,
      90.00,
      CURRENT_TIMESTAMP - interval '2 days' - interval '90 minutes',
      CURRENT_TIMESTAMP - interval '2 days',
      75,
      CURRENT_TIMESTAMP - interval '2 days' - interval '2 hours',
      CURRENT_TIMESTAMP - interval '2 days'
    ),
    -- Orden en progreso 2
    (
      v_customer_ids[8], 
      v_asset_ids[8], 
      v_technician_id,
      'SO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-0008',
      'Expansión de sistema: agregar 3 sensores PIR adicionales en área de bodega',
      'medium',
      'upgrade',
      'in_progress',
      90,
      120.00,
      46.50,
      166.50,
      CURRENT_TIMESTAMP - interval '1 hour',
      NULL,
      NULL,
      CURRENT_TIMESTAMP - interval '2 hours',
      NULL
    ),
    -- Orden completada 5 - Correctivo urgente
    (
      v_customer_ids[9], 
      v_asset_ids[9], 
      v_technician_id,
      'SO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-0009',
      'Reparación urgente: sirena no funciona, reemplazo de sirena interior',
      'urgent',
      'corrective',
      'completed',
      60,
      75.00,
      45.00,
      120.00,
      CURRENT_TIMESTAMP - interval '1 day' - interval '1 hour',
      CURRENT_TIMESTAMP - interval '1 day',
      60,
      CURRENT_TIMESTAMP - interval '1 day' - interval '90 minutes',
      CURRENT_TIMESTAMP - interval '1 day'
    ),
    -- Orden solicitada 2
    (
      v_customer_ids[10], 
      v_asset_ids[10], 
      v_technician_id,
      'SO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-0010',
      'Solicitud de instalación de sensor de humo en cocina',
      'medium',
      'installation',
      'requested',
      60,
      0,
      0,
      0,
      NULL,
      NULL,
      NULL,
      CURRENT_TIMESTAMP - interval '12 hours',
      NULL
    );
    
END $$;

-- Crear materiales para órdenes completadas
DO $$
DECLARE
  v_order_1 uuid;
  v_order_3 uuid;
  v_order_5 uuid;
  v_order_9 uuid;
  v_item_pir uuid;
  v_item_mag uuid;
  v_item_siren uuid;
  v_item_battery uuid;
  v_item_gsm uuid;
BEGIN
  -- Obtener IDs de órdenes específicas
  SELECT id INTO v_order_1 FROM service_orders WHERE order_number LIKE '%-0001' LIMIT 1;
  SELECT id INTO v_order_3 FROM service_orders WHERE order_number LIKE '%-0003' LIMIT 1;
  SELECT id INTO v_order_5 FROM service_orders WHERE order_number LIKE '%-0005' LIMIT 1;
  SELECT id INTO v_order_9 FROM service_orders WHERE order_number LIKE '%-0009' LIMIT 1;
  
  -- Obtener IDs de productos
  SELECT id INTO v_item_pir FROM inventory_items WHERE sku = 'PIR-001';
  SELECT id INTO v_item_mag FROM inventory_items WHERE sku = 'MAG-001';
  SELECT id INTO v_item_siren FROM inventory_items WHERE sku = 'SIR-001';
  SELECT id INTO v_item_battery FROM inventory_items WHERE sku = 'BAT-001';
  SELECT id INTO v_item_gsm FROM inventory_items WHERE sku = 'COM-001';
  
  -- Materiales para orden 1 (instalación completa)
  IF v_order_1 IS NOT NULL AND v_item_pir IS NOT NULL THEN
    INSERT INTO service_order_materials (service_order_id, inventory_item_id, quantity_used, unit_cost, total_cost)
    VALUES 
      (v_order_1, v_item_pir, 5, 15.50, 77.50),
      (v_order_1, v_item_mag, 3, 8.75, 26.25),
      (v_order_1, v_item_siren, 1, 45.00, 45.00),
      (v_order_1, v_item_battery, 1, 28.00, 28.00);
      
    -- Actualizar inventario
    UPDATE inventory_items SET quantity_available = quantity_available - 5 WHERE id = v_item_pir;
    UPDATE inventory_items SET quantity_available = quantity_available - 3 WHERE id = v_item_mag;
    UPDATE inventory_items SET quantity_available = quantity_available - 1 WHERE id = v_item_siren;
    UPDATE inventory_items SET quantity_available = quantity_available - 1 WHERE id = v_item_battery;
  END IF;
  
  -- Materiales para orden 3 (reemplazo sensor)
  IF v_order_3 IS NOT NULL AND v_item_pir IS NOT NULL THEN
    INSERT INTO service_order_materials (service_order_id, inventory_item_id, quantity_used, unit_cost, total_cost)
    VALUES (v_order_3, v_item_pir, 1, 15.50, 15.50);
    
    UPDATE inventory_items SET quantity_available = quantity_available - 1 WHERE id = v_item_pir;
  END IF;
  
  -- Materiales para orden 5 (upgrade GSM)
  IF v_order_5 IS NOT NULL AND v_item_gsm IS NOT NULL THEN
    INSERT INTO service_order_materials (service_order_id, inventory_item_id, quantity_used, unit_cost, total_cost)
    VALUES (v_order_5, v_item_gsm, 1, 120.00, 120.00);
    
    UPDATE inventory_items SET quantity_available = quantity_available - 1 WHERE id = v_item_gsm;
  END IF;
  
  -- Materiales para orden 9 (reemplazo sirena)
  IF v_order_9 IS NOT NULL AND v_item_siren IS NOT NULL THEN
    INSERT INTO service_order_materials (service_order_id, inventory_item_id, quantity_used, unit_cost, total_cost)
    VALUES (v_order_9, v_item_siren, 1, 45.00, 45.00);
    
    UPDATE inventory_items SET quantity_available = quantity_available - 1 WHERE id = v_item_siren;
  END IF;
  
END $$;

-- Crear facturas para órdenes completadas
DO $$
DECLARE
  v_order record;
BEGIN
  FOR v_order IN 
    SELECT id, customer_id, order_number, total_cost, completed_at, service_type
    FROM service_orders 
    WHERE status = 'completed' AND total_cost > 0
  LOOP
    INSERT INTO invoices (
      customer_id,
      service_order_id,
      invoice_number,
      invoice_type,
      payment_type,
      amount,
      tax_amount,
      total_amount,
      due_date,
      paid_date,
      status,
      days_overdue
    )
    VALUES (
      v_order.customer_id,
      v_order.id,
      'INV-' || REPLACE(v_order.order_number, 'SO-', ''),
      v_order.service_type,
      CASE WHEN RANDOM() < 0.7 THEN 'contado' ELSE 'credito' END,
      v_order.total_cost,
      v_order.total_cost * 0.16,
      v_order.total_cost * 1.16,
      v_order.completed_at::date + interval '15 days',
      CASE WHEN RANDOM() < 0.8 THEN v_order.completed_at::date ELSE NULL END,
      CASE WHEN RANDOM() < 0.8 THEN 'paid' ELSE 'pending' END,
      0
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

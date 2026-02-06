/*
  # Mejora del Módulo de Activos para Venta Proactiva
  
  ## 1. Mejoras a la Tabla de Activos
    - Campos adicionales para seguimiento de obsolescencia
    - Metadatos de reemplazo y criticidad
    - Tracking de frecuencia de servicio
  
  ## 2. Nueva Tabla: Asset Service Analytics
    - Conteo de tickets de servicio por activo
    - Análisis de frecuencia y costos
    - Scoring automático para generar oportunidades
  
  ## 3. Nueva Tabla: Asset Replacement Recommendations
    - Recomendaciones automáticas de reemplazo
    - Modelos de reemplazo sugeridos
    - Estado de la recomendación
  
  ## 4. Nueva Tabla: EOL Models Database
    - Catálogo de modelos obsoletos
    - Modelos de reemplazo recomendados
    - Criticidad y razones
  
  ## 5. Funciones y Triggers
    - Función para actualizar contadores de servicio
    - Función para generar oportunidades automáticamente
    - Trigger para detectar activos EOL con alto servicio
  
  ## 6. Vistas
    - Vista de activos con análisis completo
    - Vista de oportunidades prioritarias
  
  ## 7. Seguridad
    - RLS habilitado en todas las nuevas tablas
    - Políticas de acceso para usuarios autenticados
*/

-- Agregar nuevas columnas a la tabla assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS manufacturer text;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS year_installed integer;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS replacement_priority text DEFAULT 'low';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS service_ticket_count integer DEFAULT 0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS last_service_date date;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS total_service_cost decimal(10,2) DEFAULT 0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS criticality_level text DEFAULT 'medium';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS eol_reason text;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS recommended_replacement_model text;

-- Crear tabla de análisis de servicio por activo
CREATE TABLE IF NOT EXISTS asset_service_analytics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  total_service_orders integer DEFAULT 0,
  total_service_cost decimal(10,2) DEFAULT 0,
  average_service_cost decimal(10,2) DEFAULT 0,
  last_service_date date,
  service_frequency_days integer,
  high_frequency_alert boolean DEFAULT false,
  opportunity_score integer DEFAULT 0,
  last_calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(asset_id)
);

-- Crear tabla de recomendaciones de reemplazo
CREATE TABLE IF NOT EXISTS asset_replacement_recommendations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  current_model text NOT NULL,
  recommended_model text NOT NULL,
  replacement_reason text NOT NULL,
  estimated_cost decimal(10,2),
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);

-- Crear tabla de modelos obsoletos (EOL Database)
CREATE TABLE IF NOT EXISTS eol_models (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name text UNIQUE NOT NULL,
  manufacturer text NOT NULL,
  category text NOT NULL,
  eol_date date NOT NULL,
  replacement_model text,
  reason text,
  is_critical boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_asset_service_analytics_asset ON asset_service_analytics(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_service_analytics_customer ON asset_service_analytics(customer_id);
CREATE INDEX IF NOT EXISTS idx_asset_service_analytics_score ON asset_service_analytics(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_asset_replacement_recommendations_status ON asset_replacement_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_asset_replacement_recommendations_priority ON asset_replacement_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_eol_models_name ON eol_models(model_name);
CREATE INDEX IF NOT EXISTS idx_assets_service_count ON assets(service_ticket_count DESC);
CREATE INDEX IF NOT EXISTS idx_assets_replacement_priority ON assets(replacement_priority);

-- Habilitar RLS
ALTER TABLE asset_service_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_replacement_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE eol_models ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para asset_service_analytics
CREATE POLICY "Authenticated users can view asset analytics" ON asset_service_analytics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert asset analytics" ON asset_service_analytics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update asset analytics" ON asset_service_analytics FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Políticas RLS para asset_replacement_recommendations
CREATE POLICY "Authenticated users can view replacement recommendations" ON asset_replacement_recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert replacement recommendations" ON asset_replacement_recommendations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update replacement recommendations" ON asset_replacement_recommendations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Políticas RLS para eol_models
CREATE POLICY "Authenticated users can view EOL models" ON eol_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert EOL models" ON eol_models FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update EOL models" ON eol_models FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Función para actualizar analytics de activos
CREATE OR REPLACE FUNCTION update_asset_service_analytics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.asset_id IS NOT NULL THEN
    INSERT INTO asset_service_analytics (
      asset_id,
      customer_id,
      total_service_orders,
      total_service_cost,
      average_service_cost,
      last_service_date,
      last_calculated_at
    )
    SELECT
      NEW.asset_id,
      NEW.customer_id,
      COUNT(*),
      SUM(total_cost),
      AVG(total_cost),
      MAX(completed_at::date),
      now()
    FROM service_orders
    WHERE asset_id = NEW.asset_id AND status = 'completed'
    GROUP BY asset_id, customer_id
    ON CONFLICT (asset_id) 
    DO UPDATE SET
      total_service_orders = EXCLUDED.total_service_orders,
      total_service_cost = EXCLUDED.total_service_cost,
      average_service_cost = EXCLUDED.average_service_cost,
      last_service_date = EXCLUDED.last_service_date,
      last_calculated_at = now();

    UPDATE assets
    SET 
      service_ticket_count = (
        SELECT COUNT(*) FROM service_orders 
        WHERE asset_id = NEW.asset_id AND status = 'completed'
      ),
      last_service_date = NEW.completed_at::date,
      total_service_cost = (
        SELECT COALESCE(SUM(total_cost), 0) FROM service_orders 
        WHERE asset_id = NEW.asset_id AND status = 'completed'
      )
    WHERE id = NEW.asset_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_asset_analytics ON service_orders;
CREATE TRIGGER trigger_update_asset_analytics
  AFTER INSERT OR UPDATE ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_service_analytics();

-- Función para calcular opportunity score
CREATE OR REPLACE FUNCTION calculate_opportunity_score(p_asset_id uuid)
RETURNS integer AS $$
DECLARE
  v_score integer := 0;
  v_service_count integer;
  v_is_eol boolean;
  v_total_cost decimal;
  v_days_since_install integer;
BEGIN
  SELECT 
    service_ticket_count,
    is_eol,
    total_service_cost,
    EXTRACT(DAY FROM (now() - installation_date))
  INTO v_service_count, v_is_eol, v_total_cost, v_days_since_install
  FROM assets
  WHERE id = p_asset_id;

  IF v_is_eol THEN v_score := v_score + 50; END IF;
  IF v_service_count >= 10 THEN v_score := v_score + 30;
  ELSIF v_service_count >= 5 THEN v_score := v_score + 20;
  ELSIF v_service_count >= 3 THEN v_score := v_score + 10;
  END IF;

  IF v_total_cost >= 5000 THEN v_score := v_score + 20;
  ELSIF v_total_cost >= 2000 THEN v_score := v_score + 10;
  END IF;

  IF v_days_since_install > 1825 THEN v_score := v_score + 15; END IF;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Función para generar oportunidades automáticamente
CREATE OR REPLACE FUNCTION generate_asset_opportunities()
RETURNS void AS $$
DECLARE
  v_asset record;
  v_score integer;
  v_opportunity_exists boolean;
BEGIN
  FOR v_asset IN
    SELECT 
      a.id as asset_id,
      a.customer_id,
      a.alarm_model,
      a.recommended_replacement_model,
      a.service_ticket_count,
      a.total_service_cost,
      a.is_eol
    FROM assets a
    WHERE 
      (a.is_eol = true OR a.service_ticket_count >= 3)
      AND a.status = 'active'
  LOOP
    v_score := calculate_opportunity_score(v_asset.asset_id);

    UPDATE asset_service_analytics
    SET opportunity_score = v_score
    WHERE asset_id = v_asset.asset_id;

    IF v_score >= 40 THEN
      SELECT EXISTS(
        SELECT 1 FROM opportunities
        WHERE asset_id = v_asset.asset_id AND status IN ('open', 'in_progress')
      ) INTO v_opportunity_exists;

      IF NOT v_opportunity_exists THEN
        INSERT INTO opportunities (
          customer_id, asset_id, opportunity_type, estimated_value,
          status, priority_score, notes
        ) VALUES (
          v_asset.customer_id, v_asset.asset_id,
          CASE WHEN v_asset.is_eol THEN 'upgrade' ELSE 'maintenance_contract' END,
          CASE WHEN v_asset.is_eol THEN 3500.00 ELSE v_asset.total_service_cost * 0.6 END,
          'open', v_score,
          format('Activo %s - %s tickets, Costo: $%s. %s',
            v_asset.alarm_model, v_asset.service_ticket_count, v_asset.total_service_cost,
            CASE WHEN v_asset.is_eol 
              THEN 'EQUIPO OBSOLETO - Recomendar: ' || COALESCE(v_asset.recommended_replacement_model, 'Neo/DSC PowerSeries Pro')
              ELSE 'Alto costo de mantenimiento - Considerar plan preventivo'
            END
          )
        );

        IF v_asset.is_eol THEN
          INSERT INTO asset_replacement_recommendations (
            asset_id, customer_id, current_model, recommended_model,
            replacement_reason, estimated_cost, priority, status
          ) VALUES (
            v_asset.asset_id, v_asset.customer_id, v_asset.alarm_model,
            COALESCE(v_asset.recommended_replacement_model, 'DSC Neo / PowerSeries Pro'),
            format('Equipo obsoleto con %s tickets y costo de $%s',
              v_asset.service_ticket_count, v_asset.total_service_cost),
            3500.00,
            CASE WHEN v_score >= 80 THEN 'critical'
                 WHEN v_score >= 60 THEN 'high' ELSE 'medium' END,
            'pending'
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Insertar modelos EOL comunes
INSERT INTO eol_models (model_name, manufacturer, category, eol_date, replacement_model, reason, is_critical)
VALUES
  ('DSC 1832', 'DSC', 'alarm_panel', '2020-01-01', 'DSC Neo HS2032', 'Modelo descontinuado, partes no disponibles', true),
  ('DSC 585', 'DSC', 'keyboard', '2019-01-01', 'DSC HS2LCDWF9', 'Tecnología obsoleta', true),
  ('DSC 1616', 'DSC', 'alarm_panel', '2018-01-01', 'DSC Neo HS2016', 'Modelo descontinuado', true),
  ('DSC PC1555', 'DSC', 'alarm_panel', '2017-01-01', 'DSC PowerSeries Pro HS2128', 'Sin soporte técnico', true),
  ('GSM 3055', 'DSC', 'communicator', '2021-01-01', 'TL2803G', 'Redes 2G/3G obsoletas', true)
ON CONFLICT (model_name) DO NOTHING;

-- Vista de activos con análisis completo
CREATE OR REPLACE VIEW vw_assets_with_analytics AS
SELECT 
  a.id, a.customer_id,
  c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
  a.alarm_model, a.keyboard_model, a.communicator_model, a.serial_number,
  a.manufacturer, a.installation_date, a.year_installed,
  a.is_eol, a.eol_date, a.eol_reason, a.status,
  a.service_ticket_count, a.last_service_date, a.total_service_cost,
  a.criticality_level, a.replacement_priority, a.recommended_replacement_model,
  asa.opportunity_score, asa.service_frequency_days, asa.high_frequency_alert,
  CASE 
    WHEN a.is_eol AND a.service_ticket_count >= 5 THEN 'critical'
    WHEN a.is_eol AND a.service_ticket_count >= 3 THEN 'high'
    WHEN a.is_eol THEN 'medium'
    WHEN a.service_ticket_count >= 5 THEN 'medium'
    ELSE 'low'
  END as recommended_action_priority,
  CASE 
    WHEN a.is_eol THEN 'Reemplazo Urgente'
    WHEN a.service_ticket_count >= 5 THEN 'Evaluación de Reemplazo'
    WHEN a.service_ticket_count >= 3 THEN 'Monitoreo Cercano'
    ELSE 'Normal'
  END as recommended_action,
  eol.replacement_model as eol_recommended_model,
  eol.is_critical as eol_is_critical,
  COUNT(o.id) as open_opportunities
FROM assets a
LEFT JOIN customers c ON a.customer_id = c.id
LEFT JOIN asset_service_analytics asa ON a.id = asa.asset_id
LEFT JOIN eol_models eol ON a.alarm_model = eol.model_name
LEFT JOIN opportunities o ON a.id = o.asset_id AND o.status = 'open'
GROUP BY 
  a.id, c.name, c.phone, c.address, asa.opportunity_score, 
  asa.service_frequency_days, asa.high_frequency_alert,
  eol.replacement_model, eol.is_critical;

-- Vista de oportunidades prioritarias
CREATE OR REPLACE VIEW vw_priority_opportunities AS
SELECT 
  o.id, o.customer_id,
  c.name as customer_name, c.phone as customer_phone,
  o.asset_id, a.alarm_model,
  a.service_ticket_count, a.total_service_cost, a.is_eol,
  o.opportunity_type, o.estimated_value, o.status,
  o.priority_score, o.notes, o.created_at,
  CASE 
    WHEN o.priority_score >= 80 THEN 'critical'
    WHEN o.priority_score >= 60 THEN 'high'
    WHEN o.priority_score >= 40 THEN 'medium'
    ELSE 'low'
  END as priority_level
FROM opportunities o
JOIN customers c ON o.customer_id = c.id
LEFT JOIN assets a ON o.asset_id = a.id
WHERE o.status = 'open'
ORDER BY o.priority_score DESC, o.created_at DESC;

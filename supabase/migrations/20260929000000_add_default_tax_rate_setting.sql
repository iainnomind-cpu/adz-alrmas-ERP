-- Insert default tax_rate in system_settings if not exists
INSERT INTO system_settings (setting_key, setting_value, description, category)
VALUES (
  'tax_rate',
  '16'::jsonb,
  'Tasa general del Impuesto al Valor Agregado (IVA) en porcentaje (%)',
  'Impuestos'
)
ON CONFLICT (setting_key) DO NOTHING;

/*
  # Alerta al vencer fecha de suspension

  Agrega el tipo de notificacion automatica que se envia el dia en que vence
  una suspension. La alerta no reactiva al cliente automaticamente; solo avisa
  que el servicio/estado requiere revision o reactivacion manual.
*/

ALTER TABLE notification_templates
  DROP CONSTRAINT IF EXISTS notification_templates_type_check;

ALTER TABLE notification_templates
  ADD CONSTRAINT notification_templates_type_check
  CHECK (
    type IN (
      'birthday',
      'payment_reminder',
      'service_completed',
      'annual_fee_due',
      'suspension_notice',
      'suspension_end_alert',
      'custom'
    )
  );

CREATE INDEX IF NOT EXISTS idx_customers_suspension_end_date
  ON customers(suspension_end_date)
  WHERE is_suspended = true AND suspension_end_date IS NOT NULL;

CREATE OR REPLACE FUNCTION update_customer_suspension_status()
RETURNS void AS $$
BEGIN
  RAISE NOTICE 'La reactivacion por vencimiento de suspension es manual. La alerta automatica se procesa con process-automatic-notifications.';
END;
$$ LANGUAGE plpgsql;

INSERT INTO notification_templates (name, type, subject, body, variables)
SELECT
  'Alerta de Fin de Suspension',
  'suspension_end_alert',
  'Fin de Suspension - Cuenta {{account_number}}',
  'Estimado/a {{customer_name}},

Le informamos que hoy vence la suspension registrada para su servicio.

Numero de Cuenta: {{account_number}}
Fecha de Termino: {{end_date}}
Motivo registrado: {{reason}}

Este aviso indica que el servicio debe reiniciar o que el estado de la cuenta requiere revision. Si la reactivacion es manual, nuestro equipo validara el cambio correspondiente.

Para mas informacion, por favor contactenos.

Atentamente,
Equipo de {{company_name}}',
  '["customer_name", "account_number", "end_date", "reason", "company_name"]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM notification_templates WHERE type = 'suspension_end_alert'
);

INSERT INTO notification_config (notification_type, is_enabled, trigger_condition, send_time)
SELECT
  'suspension_end_alert',
  true,
  '{"send_on_exact_date": true}'::jsonb,
  '09:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM notification_config WHERE notification_type = 'suspension_end_alert'
);

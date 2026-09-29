import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { PauseCircle, PlayCircle, Calendar, AlertTriangle } from 'lucide-react';

interface Customer {
  id: string;
  account_number: string;
  full_name: string;
  is_suspended: boolean;
  suspension_start_date: string | null;
  suspension_end_date: string | null;
  suspension_reason: string | null;
}

interface SuspensionManagerProps {
  customer: Customer;
  onUpdate: () => void;
}

export function SuspensionManager({ customer, onUpdate }: SuspensionManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [suspensionData, setSuspensionData] = useState({
    suspension_start_date: new Date().toISOString().split('T')[0],
    suspension_end_date: '',
    suspension_reason: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await supabase
      .from('customers')
      .update({
        is_suspended: true,
        status: 'Suspendida',
        suspension_start_date: suspensionData.suspension_start_date,
        suspension_end_date: suspensionData.suspension_end_date || null,
        suspension_reason: suspensionData.suspension_reason
      })
      .eq('id', customer.id);

    if (!updateError) {
      const formattedStartDate = suspensionData.suspension_start_date
        ? new Date(suspensionData.suspension_start_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Hoy';
      const formattedEndDate = suspensionData.suspension_end_date
        ? new Date(suspensionData.suspension_end_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Indefinida / Pendiente';

      await supabase
        .from('customer_account_history')
        .insert([{
          customer_id: customer.id,
          change_type: 'suspension',
          description: `Cuenta suspendida. Inicio: ${suspensionData.suspension_start_date}${suspensionData.suspension_end_date ? ` | Fin programado: ${suspensionData.suspension_end_date}` : ' (Indefinida)'}. Motivo: ${suspensionData.suspension_reason || 'Sin motivo'}`,
          changed_by: user.id
        }]);

      // 1. Enviar notificación de suspensión al cliente
      try {
        const { data: customerData } = await supabase
          .from('customers')
          .select('email, name, phone, system_type')
          .eq('id', customer.id)
          .single();

        if (customerData?.email) {
          const { data: template } = await supabase
            .from('notification_templates')
            .select('*')
            .eq('type', 'suspension_notice')
            .eq('is_active', true)
            .maybeSingle();

          if (template) {
            await supabase.functions.invoke('send-notification', {
              body: {
                templateId: template.id,
                customerId: customer.id,
                customerEmail: customerData.email,
                customerName: customerData.name || customer.full_name,
                notificationType: 'suspension_notice',
                variables: {
                  customer_name: customerData.name || customer.full_name,
                  account_number: customer.account_number,
                  suspension_date: formattedStartDate,
                  reason: suspensionData.suspension_reason || 'Suspensión temporal solicitada / administrativa',
                  end_date: formattedEndDate,
                  company_name: 'Alarmas ADZ'
                }
              }
            });
          } else {
            await supabase.functions.invoke('send-notification', {
              body: {
                customerId: customer.id,
                customerEmail: customerData.email,
                customerName: customerData.name || customer.full_name,
                notificationType: 'suspension_notice',
                subject: `Aviso de Suspensión de Servicio - Cuenta ${customer.account_number} - Alarmas ADZ`,
                body: `Estimado(a) ${customerData.name || customer.full_name},\n\nLe informamos que su servicio de monitoreo (Cuenta: ${customer.account_number}) ha sido suspendido a partir del ${formattedStartDate}.\n\nFecha estimada de reanudación: ${formattedEndDate}\nMotivo: ${suspensionData.suspension_reason || 'Suspensión temporal'}\n\nSi desea reactivar su servicio o tiene dudas, comuníquese con nosotros a contacto@alarmasadz.com.mx o al teléfono de atención a clientes.\n\nAtentamente,\nAlarmas ADZ`,
                variables: {
                  customer_name: customerData.name || customer.full_name,
                  account_number: customer.account_number,
                  suspension_date: formattedStartDate,
                  reason: suspensionData.suspension_reason || 'Suspensión temporal',
                  end_date: formattedEndDate,
                }
              }
            });
          }
        }

        // 2. Email de recordatorio de reanudación a la empresa (contacto@alarmasadz.com.mx y clientes@alarmasadz.com.mx)
        await supabase.functions.invoke('send-notification', {
          body: {
            customerEmail: 'contacto@alarmasadz.com.mx, clientes@alarmasadz.com.mx',
            customerName: 'Equipo Alarmas ADZ',
            notificationType: 'suspension_internal_notice',
            subject: `[SUSPENSIÓN / RECORDATORIO DE REANUDACIÓN] Cuenta ${customer.account_number} - ${customer.full_name}`,
            body: `Se ha registrado una suspensión de servicio:\n\n• Cliente: ${customer.full_name}\n• Cuenta: ${customer.account_number}\n• Sistema: ${customerData?.system_type || 'Alarma'}\n• Fecha de Inicio: ${formattedStartDate}\n• Fecha Fin de Suspensión (Reanudación programada): ${formattedEndDate}\n• Motivo: ${suspensionData.suspension_reason || 'No especificado'}\n• Teléfono: ${customerData?.phone || 'No registrado'}\n• Correo del cliente: ${customerData?.email || 'No registrado'}\n\nEste recordatorio queda registrado para el seguimiento de la fecha de reanudación y monitoreo en el Dashboard Ejecutivo.`,
            variables: {
              customer_name: customer.full_name,
              account_number: customer.account_number,
              suspension_date: formattedStartDate,
              end_date: formattedEndDate,
              reason: suspensionData.suspension_reason || 'No especificado'
            }
          }
        });
      } catch (error) {
        console.error('Error al enviar notificaciones de suspensión:', error);
      }

      setShowForm(false);
      setSuspensionData({
        suspension_start_date: new Date().toISOString().split('T')[0],
        suspension_end_date: '',
        suspension_reason: ''
      });
      onUpdate();
    }

    setLoading(false);
  };

  const handleReactivate = async () => {
    if (!confirm('¿Está seguro que desea reactivar esta cuenta?')) return;

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const todayIso = new Date().toISOString().split('T')[0];

    const { error: updateError } = await supabase
      .from('customers')
      .update({
        is_suspended: false,
        status: 'Activa',
        reactivation_date: todayIso
      })
      .eq('id', customer.id);

    if (!updateError) {
      await supabase
        .from('customer_account_history')
        .insert([{
          customer_id: customer.id,
          change_type: 'reactivation',
          description: `Cuenta reactivada a estatus Activa el ${todayIso}`,
          changed_by: user.id
        }]);

      onUpdate();
    }

    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <PauseCircle className="w-5 h-5" />
          Gestión de Suspensión
        </h3>

        {!customer.is_suspended ? (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
            disabled={loading}
          >
            <PauseCircle className="w-4 h-4" />
            Suspender Cuenta
          </button>
        ) : (
          <button
            onClick={handleReactivate}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            disabled={loading}
          >
            <PlayCircle className="w-4 h-4" />
            Reactivar Cuenta
          </button>
        )}
      </div>

      {customer.is_suspended && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-orange-900 mb-2">Cuenta Suspendida</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-orange-800">Fecha de inicio:</span>
                  <p className="text-orange-700">
                    {customer.suspension_start_date
                      ? new Date(customer.suspension_start_date).toLocaleDateString('es-MX')
                      : 'No especificada'}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-orange-800">Fecha de término:</span>
                  <p className="text-orange-700">
                    {customer.suspension_end_date
                      ? new Date(customer.suspension_end_date).toLocaleDateString('es-MX')
                      : 'Indefinida'}
                  </p>
                </div>
              </div>
              {customer.suspension_reason && (
                <div className="mt-3">
                  <span className="font-medium text-orange-800">Motivo:</span>
                  <p className="text-orange-700">{customer.suspension_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && !customer.is_suspended && (
        <form onSubmit={handleSuspend} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Importante:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>No se generarán cobros durante la suspensión</li>
                <li>El estado será visible para los técnicos</li>
                <li>Se registrará en el historial del cliente</li>
              </ul>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha de Inicio
              </label>
              <input
                type="date"
                value={suspensionData.suspension_start_date}
                onChange={(e) => setSuspensionData({ ...suspensionData, suspension_start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha de Término (Opcional)
              </label>
              <input
                type="date"
                value={suspensionData.suspension_end_date}
                onChange={(e) => setSuspensionData({ ...suspensionData, suspension_end_date: e.target.value })}
                min={suspensionData.suspension_start_date}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Dejar vacío para suspensión indefinida
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo de Suspensión
            </label>
            <textarea
              value={suspensionData.suspension_reason}
              onChange={(e) => setSuspensionData({ ...suspensionData, suspension_reason: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Falta de pago, solicitud del cliente, etc."
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Confirmar Suspensión'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {!customer.is_suspended && !showForm && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <PlayCircle className="w-5 h-5" />
            <p className="text-sm font-medium">
              La cuenta está activa y generando cobros normalmente
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, Loader2, Hash, Sparkles, AlertTriangle, Calendar, PauseCircle, CheckCircle2, Phone, Mail } from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { LocationMap } from './LocationMap';
import { SYSTEM_TYPES, isAlarmSystem } from '../../constants/systemTypes';
import { getNextProgressiveAccountNumber, formatCustomerAccountNumber } from '../../utils/customerAccountNumber';

type CustomerInsert = Database['public']['Tables']['customers']['Insert'] & {
  branch_name?: string;
  is_single_branch?: boolean;
  master_account_id?: string | null;
  pricing_tier?: number;
};

// Extended interface for form state including UI-only fields
interface CustomerFormState extends CustomerInsert {
  street?: string;
  exterior_number?: string;
  interior_number?: string;
  postal_code?: string;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  annuity_month?: number | null;
  cfdi?: string | null;
  suspension_start_date?: string | null;
  suspension_end_date?: string | null;
  suspension_reason?: string | null;
  is_suspended?: boolean;
  alta_date?: string | null;
  reactivation_date?: string | null;
  cancellation_date?: string | null;
}

interface NewCustomerFormProps {
  onClose: () => void;
  onSuccess: () => void;
  customer?: Partial<CustomerInsert> & { id?: string; suspension_start_date?: string | null; suspension_end_date?: string | null; suspension_reason?: string | null; alta_date?: string | null; reactivation_date?: string | null; cancellation_date?: string | null };
  defaultSystemType?: string;
}

interface MasterAccount {
  id: string;
  name: string;
  account_number: number;
}

export function NewCustomerForm({ onClose, onSuccess, customer, defaultSystemType }: NewCustomerFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [masterAccounts, setMasterAccounts] = useState<MasterAccount[]>([]);
  const [accountPreview, setAccountPreview] = useState<{ nextSequence: number; formattedAccount: string }>({
    nextSequence: 1,
    formattedAccount: ''
  });

  const isInitiallySuspended = customer?.is_suspended || customer?.status === 'Suspendida' || customer?.status === 'Suspendido' || false;

  const [formData, setFormData] = useState<CustomerFormState>({
    name: customer?.name || '',
    owner_name: customer?.owner_name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    // Detailed address fields
    street: (customer as any)?.street || '',
    exterior_number: (customer as any)?.exterior_number || '',
    interior_number: (customer as any)?.interior_number || '',
    postal_code: (customer as any)?.postal_code || (customer as any)?.zip_code || '',
    // Valid DB fields
    neighborhood: customer?.neighborhood ?? '',
    city: customer?.city ?? '',
    state: customer?.state ?? '',
    system_type: customer?.system_type || defaultSystemType || 'alarma',
    customer_type: customer?.customer_type || 'Casa',
    communication_tech: customer?.communication_tech || 'Tel',
    monitoring_plan: customer?.monitoring_plan || '',
    status: customer?.status || 'Activa',
    business_name: customer?.business_name || '',
    gps_latitude: customer?.gps_latitude || null,
    gps_longitude: customer?.gps_longitude || null,
    property_type: customer?.property_type || 'Casa',
    credit_classification: customer?.credit_classification || 'Puntual',
    account_type: customer?.account_type || 'Normal',
    billing_preference: customer?.billing_preference || 'Factura Contado',
    billing_cycle: customer?.billing_cycle || 'Mes',
    annuity_month: (customer as any)?.annuity_month || null,
    cfdi: (customer as any)?.cfdi || '',
    master_account_id: customer?.master_account_id || (customer as any)?.consolidation_parent_id || null,
    branch_name: customer?.branch_name || '',
    is_single_branch: customer?.is_single_branch || false,
    pricing_tier: customer?.pricing_tier || 1,
    birth_date: customer?.birth_date || null,
    // Suspension and Lifecycle Dates
    is_suspended: isInitiallySuspended,
    suspension_start_date: customer?.suspension_start_date || (isInitiallySuspended ? new Date().toISOString().split('T')[0] : null),
    suspension_end_date: customer?.suspension_end_date || null,
    suspension_reason: customer?.suspension_reason || '',
    alta_date: customer?.alta_date || (customer?.id ? null : new Date().toISOString().split('T')[0]),
    reactivation_date: customer?.reactivation_date || null,
    cancellation_date: customer?.cancellation_date || null,
  });

  useEffect(() => {
    loadMasterAccounts();
  }, []);

  useEffect(() => {
    if (!customer?.id) {
      getNextProgressiveAccountNumber(formData.system_type || 'alarma').then(setAccountPreview);
    }
  }, [formData.system_type, customer?.id]);

  const loadMasterAccounts = async () => {
    const { data } = await supabase
      .from('customers')
      .select('id, name, account_number')
      .eq('account_type', 'master')
      .eq('status', 'active')
      .order('name');

    if (data) setMasterAccounts(data as MasterAccount[]);
  };

  const sendSuspensionEmails = async (
    customerRecord: { id?: string; name: string; email: string; phone?: string | null; account_number?: number | null; system_type?: string | null },
    suspensionStart: string,
    suspensionEnd: string | null,
    reason: string
  ) => {
    const formattedAccount = customerRecord.account_number
      ? formatCustomerAccountNumber(customerRecord.account_number, customerRecord.system_type || 'alarma')
      : accountPreview.formattedAccount || 'Pendiente';

    const formattedStartDate = suspensionStart ? new Date(suspensionStart).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Hoy';
    const formattedEndDate = suspensionEnd ? new Date(suspensionEnd).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Indefinida / Pendiente';

    // 1. Email al Cliente
    try {
      // Buscar plantilla de suspensión activa
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
            customerId: customerRecord.id,
            customerEmail: customerRecord.email,
            customerName: customerRecord.name,
            notificationType: 'suspension_notice',
            variables: {
              customer_name: customerRecord.name,
              account_number: formattedAccount,
              suspension_date: formattedStartDate,
              reason: reason || 'Suspensión temporal de servicio solicitada / administrativa',
              end_date: formattedEndDate,
              company_name: 'Alarmas ADZ',
            }
          }
        });
      } else {
        // Enviar con cuerpo directo si no hay plantilla en DB
        await supabase.functions.invoke('send-notification', {
          body: {
            customerId: customerRecord.id,
            customerEmail: customerRecord.email,
            customerName: customerRecord.name,
            notificationType: 'suspension_notice',
            subject: `Aviso de Suspensión de Servicio - Cuenta ${formattedAccount} - Alarmas ADZ`,
            body: `Estimado(a) ${customerRecord.name},\n\nLe informamos que su servicio de monitoreo (Cuenta: ${formattedAccount}) ha sido suspendido a partir del ${formattedStartDate}.\n\nFecha estimada de reanudación: ${formattedEndDate}\nMotivo: ${reason || 'Suspensión temporal'}\n\nSi desea reactivar su servicio o tiene dudas, comuníquese con nosotros a contacto@alarmasadz.com.mx o al teléfono de atención a clientes.\n\nAtentamente,\nAlarmas ADZ`,
            variables: {
              customer_name: customerRecord.name,
              account_number: formattedAccount,
              suspension_date: formattedStartDate,
              reason: reason || 'Suspensión temporal',
              end_date: formattedEndDate,
            }
          }
        });
      }
    } catch (clientEmailErr) {
      console.warn('Advertencia al enviar email de suspensión al cliente:', clientEmailErr);
    }

    // 2. Email de recordatorio de reanudación y control a la empresa (contacto@alarmasadz.com.mx y clientes@alarmasadz.com.mx)
    try {
      await supabase.functions.invoke('send-notification', {
        body: {
          customerEmail: 'contacto@alarmasadz.com.mx, clientes@alarmasadz.com.mx',
          customerName: 'Equipo Alarmas ADZ',
          notificationType: 'suspension_internal_notice',
          subject: `[SUSPENSIÓN / RECORDATORIO DE REANUDACIÓN] Cuenta ${formattedAccount} - ${customerRecord.name}`,
          body: `Se ha registrado una suspensión de servicio:\n\n• Cliente: ${customerRecord.name}\n• Cuenta: ${formattedAccount}\n• Sistema: ${customerRecord.system_type || 'Alarma'}\n• Fecha de Inicio: ${formattedStartDate}\n• Fecha Fin de Suspensión (Reanudación programada): ${formattedEndDate}\n• Motivo: ${reason || 'No especificado'}\n• Teléfono de contacto: ${customerRecord.phone || 'No registrado'}\n• Correo del cliente: ${customerRecord.email}\n\nEste recordatorio queda registrado para el seguimiento de la fecha de reanudación y monitoreo en el Dashboard Ejecutivo.`,
          variables: {
            customer_name: customerRecord.name,
            account_number: formattedAccount,
            suspension_date: formattedStartDate,
            end_date: formattedEndDate,
            reason: reason || 'No especificado'
          }
        }
      });
    } catch (internalEmailErr) {
      console.warn('Advertencia al enviar email interno de recordatorio de reanudación:', internalEmailErr);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.name?.trim()) {
      setError('El nombre del encargado es obligatorio');
      setLoading(false);
      return;
    }

    if (!formData.phone?.trim()) {
      setError('El teléfono es obligatorio');
      setLoading(false);
      return;
    }

    if (!formData.email?.trim()) {
      setError('El correo electrónico es obligatorio');
      setLoading(false);
      return;
    }

    if ((formData.account_type === 'Consolidada' || formData.account_type === 'consolidated') && !formData.master_account_id) {
      setError('Debe seleccionar una cuenta maestra para cuentas consolidadas');
      setLoading(false);
      return;
    }

    try {
      const todayIso = new Date().toISOString().split('T')[0];
      const isSuspendedStatus = formData.status === 'Suspendida' || formData.status === 'Suspendido' || formData.is_suspended === true;
      const wasSuspended = customer?.status === 'Suspendida' || customer?.status === 'Suspendido' || customer?.is_suspended === true;
      const isCancellationStatus = ['Baja Cliente', 'Baja Moroso', 'Inactiva', 'Cancelada'].includes(formData.status || '');
      const isReactivation = !isSuspendedStatus && !isCancellationStatus && wasSuspended;

      // Normalizar estatus a 'Suspendida' si está marcado como suspendido
      const finalStatus = isSuspendedStatus ? 'Suspendida' : formData.status;

      // Build complete database payload including address fields, lifecycle dates, and configuration
      const { postal_code, ...restData } = formData;
      const payload: any = {
        ...restData,
        status: finalStatus,
        street: formData.street || null,
        exterior_number: formData.exterior_number || null,
        interior_number: formData.interior_number || null,
        zip_code: formData.postal_code || null,
        neighborhood: formData.neighborhood || null,
        city: formData.city || null,
        state: formData.state || null,
        branch_name: formData.branch_name || null,
        is_single_branch: formData.is_single_branch || false,
        master_account_id: formData.account_type === 'consolidated' || formData.account_type === 'Consolidada' ? formData.master_account_id : null,
        pricing_tier: formData.pricing_tier || 1,
        birth_date: formData.birth_date || null,
        annuity_month: formData.billing_cycle === 'annual' || formData.billing_cycle === 'Anual' ? formData.annuity_month : null,
        // Lifecycle dates
        alta_date: formData.alta_date || customer?.alta_date || (customer?.id ? null : todayIso),
        is_suspended: isSuspendedStatus,
        suspension_start_date: isSuspendedStatus ? (formData.suspension_start_date || todayIso) : (customer?.suspension_start_date || null),
        suspension_end_date: isSuspendedStatus ? (formData.suspension_end_date || null) : null,
        suspension_reason: isSuspendedStatus ? (formData.suspension_reason || null) : null,
        reactivation_date: isReactivation ? todayIso : (formData.reactivation_date || customer?.reactivation_date || null),
        cancellation_date: isCancellationStatus ? (formData.cancellation_date || todayIso) : (customer?.cancellation_date || null),
      };

      let savedCustomerId = customer?.id;
      let finalAccountNumber = payload.account_number;

      if (customer?.id) {
        // Update existing customer
        const { error: updateError } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', customer.id);

        if (updateError) throw updateError;
      } else {
        // Asignar número de cuenta progresivo para nuevos clientes si no se tiene uno asignado
        if (!payload.account_number) {
          const progressive = await getNextProgressiveAccountNumber(formData.system_type || 'alarma');
          payload.account_number = progressive.nextSequence;
          finalAccountNumber = progressive.nextSequence;
        }

        // Create new customer
        const { data: insertedData, error: insertError } = await supabase
          .from('customers')
          .insert([payload])
          .select('id')
          .single();

        if (insertError) throw insertError;
        if (insertedData) savedCustomerId = insertedData.id;
      }

      // Registrar historial de auditoría
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id || null;

        if (savedCustomerId) {
          if (isSuspendedStatus && !wasSuspended) {
            await supabase.from('customer_account_history').insert([{
              customer_id: savedCustomerId,
              change_type: 'suspension',
              description: `Cuenta suspendida. Inicio: ${payload.suspension_start_date || todayIso}${payload.suspension_end_date ? ` | Fin programado: ${payload.suspension_end_date}` : ' (Indefinida)'}. Motivo: ${payload.suspension_reason || 'Sin motivo especificado'}`,
              changed_by: userId
            }]);
          } else if (isReactivation) {
            await supabase.from('customer_account_history').insert([{
              customer_id: savedCustomerId,
              change_type: 'reactivation',
              description: `Cuenta reanudada / reactivada a estatus ${payload.status}`,
              changed_by: userId
            }]);
          } else if (isCancellationStatus && customer?.status !== formData.status) {
            await supabase.from('customer_account_history').insert([{
              customer_id: savedCustomerId,
              change_type: 'cancellation',
              description: `Cuenta dada de baja / cancelada (${payload.status})`,
              changed_by: userId
            }]);
          }
        }
      } catch (historyErr) {
        console.warn('Error al registrar historial de cuenta:', historyErr);
      }

      // Si el estatus es Suspendida/Suspendido y es nuevo registro o cambio de estatus a Suspendido, disparar emails
      if (isSuspendedStatus && (!wasSuspended || !customer?.id)) {
        await sendSuspensionEmails(
          {
            id: savedCustomerId,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            account_number: finalAccountNumber,
            system_type: formData.system_type,
          },
          payload.suspension_start_date,
          payload.suspension_end_date,
          payload.suspension_reason || ''
        );
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el cliente');
      console.error('Error saving customer:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CustomerFormState, value: string | number | null | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      const todayIso = new Date().toISOString().split('T')[0];

      // Lógica de fechas al cambiar estatus
      if (field === 'status') {
        const isSusp = value === 'Suspendida' || value === 'Suspendido';
        const wasSusp = prev.status === 'Suspendida' || prev.status === 'Suspendido' || prev.is_suspended;

        if (isSusp) {
          newData.is_suspended = true;
          if (!newData.suspension_start_date) {
            newData.suspension_start_date = todayIso;
          }
        } else if (value === 'Activa' && wasSusp) {
          newData.is_suspended = false;
          newData.reactivation_date = todayIso;
        } else if (['Baja Cliente', 'Baja Moroso', 'Inactiva', 'Cancelada'].includes(String(value))) {
          newData.is_suspended = false;
          newData.cancellation_date = todayIso;
        }
      }

      // Auto-construct address if any address field changes
      if (['street', 'exterior_number', 'interior_number', 'neighborhood', 'city', 'state', 'postal_code'].includes(field)) {
        const parts = [];
        const street = newData.street;
        const ext = newData.exterior_number;
        const int = newData.interior_number;
        const col = newData.neighborhood;
        const zip = newData.postal_code;
        const city = newData.city;
        const state = newData.state;

        if (street) parts.push(street);
        if (ext) parts.push(`#${ext}`);
        if (int) parts.push(`Int. ${int}`);
        if (col) parts.push(`Col. ${col}`);
        if (zip) parts.push(`CP ${zip}`);
        if (city) parts.push(city);
        if (state) parts.push(state);

        newData.address = parts.join(', ');
      }

      return newData;
    });
  };

  const handleLocationChange = useCallback((lat: number, lng: number) => {
    handleChange('gps_latitude', lat);
    handleChange('gps_longitude', lng);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-white">
                {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <span className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-bold border border-white/30 backdrop-blur-sm flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                Cuenta: {customer?.account_number ? formatCustomerAccountNumber(customer.account_number, customer.system_type) : (accountPreview.formattedAccount || 'Generando...')}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Propietario
                </label>
                <input
                  type="text"
                  value={formData.owner_name || ''}
                  onChange={(e) => handleChange('owner_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Encargado <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Negocio
                </label>
                <input
                  type="text"
                  value={formData.business_name || ''}
                  onChange={(e) => handleChange('business_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de Sucursal
                </label>
                <input
                  type="text"
                  value={formData.branch_name || ''}
                  onChange={(e) => handleChange('branch_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Sucursal Zapotiltic"
                  disabled={formData.is_single_branch}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Para un solo servicio, usar "Sucursal Única"
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Cumpleaños
                </label>
                <input
                  type="date"
                  value={formData.birth_date || ''}
                  onChange={(e) => handleChange('birth_date', e.target.value || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Para enviar felicitaciones automáticas
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Tipo de Sistema
                  </label>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    {customer?.account_number ? formatCustomerAccountNumber(customer.account_number, formData.system_type) : (accountPreview.formattedAccount || 'Progresivo')}
                  </span>
                </div>
                <select
                  value={formData.system_type || 'alarma'}
                  onChange={(e) => handleChange('system_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {SYSTEM_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Numeración alfanumérica progresiva automática con prefijo (ej: CCTV-1, ACC-1, etc.)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Cliente
                </label>
                <select
                  value={formData.customer_type || 'casa'}
                  onChange={(e) => handleChange('customer_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="casa">Casa</option>
                  <option value="comercio">Comercio</option>
                  <option value="banco">Banco</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Propiedad
                </label>
                <select
                  value={formData.property_type || 'Casa'}
                  onChange={(e) => handleChange('property_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Casa">Casa</option>
                  <option value="Comercio">Comercio</option>
                  <option value="Banco">Banco</option>
                  <option value="Cabaña">Cabaña</option>
                  <option value="Gobierno">Gobierno</option>
                  <option value="Pozo">Pozo</option>
                  <option value="Rancho">Rancho</option>
                </select>
              </div>

              {isAlarmSystem(formData.system_type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tecnología de Comunicación
                  </label>
                  <select
                    value={formData.communication_tech || 'Tel'}
                    onChange={(e) => handleChange('communication_tech', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Comcel">Comcel</option>
                    <option value="Dual">Dual</option>
                    <option value="Dual CN">Dual CN</option>
                    <option value="Hub">Hub</option>
                    <option value="IP">IP</option>
                    <option value="Tel">Tel</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buró
                </label>
                <select
                  value={formData.credit_classification || 'Puntual'}
                  onChange={(e) => handleChange('credit_classification', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Puntual">Puntual</option>
                  <option value="Retrasado">Retrasado</option>
                  <option value="Moroso">Moroso</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Cuenta
                </label>
                <select
                  value={formData.account_type || 'Normal'}
                  onChange={(e) => handleChange('account_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Normal">Normal</option>
                  <option value="Maestra">Maestra</option>
                  <option value="Consolidada">Consolidada</option>
                  <option value="Demo">Demo</option>
                  <option value="Gratis">Gratis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel de Precio (Descuento Automático)
                </label>
                <select
                  value={formData.pricing_tier || 1}
                  onChange={(e) => handleChange('pricing_tier', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50 border-blue-200 text-blue-900 font-medium"
                >
                  <option value={1}>Nivel 1 - Precio Estándar (0-10% Descuento)</option>
                  <option value={2}>Nivel 2 - Cliente Frecuente (15% Descuento)</option>
                  <option value={3}>Nivel 3 - Instalador (20% Descuento)</option>
                  <option value={4}>Nivel 4 - Distribuidor (25% Descuento)</option>
                  <option value={5}>Nivel 5 - Mayorista (30% Descuento)</option>
                </select>
                <p className="text-xs text-blue-600 mt-1">
                  Este nivel determinará automáticamente el precio de los productos en las órdenes de este cliente.
                </p>
              </div>

              {(formData.account_type === 'Consolidada' || formData.account_type === 'consolidated') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cuenta Maestra <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.master_account_id || ''}
                    onChange={(e) => handleChange('master_account_id', e.target.value || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seleccionar cuenta maestra...</option>
                    {masterAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} - Cuenta #{account.account_number}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Esta cuenta se facturará a través de la cuenta maestra seleccionada
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formato Solé
                </label>
                <select
                  value={formData.billing_preference || 'Factura Contado'}
                  onChange={(e) => handleChange('billing_preference', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Factura Contado">Factura Contado</option>
                  <option value="Factura Crédito">Factura Crédito</option>
                  <option value="Ticket Remisión Factura Serie (TF)">Ticket Remisión Factura Serie (TF)</option>
                  <option value="Ticket Remisión Presupuesto Serie (V)">Ticket Remisión Presupuesto Serie (V)</option>
                  <option value="Demo">Demo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ciclo de Facturación
                </label>
                <select
                  value={formData.billing_cycle || ''}
                  onChange={(e) => handleChange('billing_cycle', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar ciclo...</option>
                  <option value="Mes">Mes</option>
                  <option value="Anual">Anual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cobro Anual
                </label>
                <select
                  value={formData.annuity_month ? String(formData.annuity_month) : ''}
                  onChange={(e) => handleChange('annuity_month', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Aplica / Seleccionar mes...</option>
                  <option value="1">Enero</option>
                  <option value="2">Febrero</option>
                  <option value="3">Marzo</option>
                  <option value="4">Abril</option>
                  <option value="5">Mayo</option>
                  <option value="6">Junio</option>
                  <option value="7">Julio</option>
                  <option value="8">Agosto</option>
                  <option value="9">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CFDI
                </label>
                <select
                  value={formData.cfdi || ''}
                  onChange={(e) => handleChange('cfdi' as any, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar CFDI...</option>
                  <option value="SAT">SAT</option>
                  <option value="Ticket">Ticket</option>
                  <option value="Fact. Público en General">Fact. Público en General</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-4">
                <h3 className="font-medium text-gray-900 border-b pb-2">
                  {isAlarmSystem(formData.system_type) ? 'Domicilio Monitoreado' : 'Domicilio de Instalación / Ubicación'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Calle
                    </label>
                    <input
                      type="text"
                      value={formData.street || ''}
                      onChange={(e) => handleChange('street', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nombre de la calle"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código Postal
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code || ''}
                      onChange={(e) => handleChange('postal_code', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      No. Exterior
                    </label>
                    <input
                      type="text"
                      value={formData.exterior_number || ''}
                      onChange={(e) => handleChange('exterior_number', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      No. Interior
                    </label>
                    <input
                      type="text"
                      value={formData.interior_number || ''}
                      onChange={(e) => handleChange('interior_number', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Colonia
                    </label>
                    <input
                      type="text"
                      value={formData.neighborhood || ''}
                      onChange={(e) => handleChange('neighborhood', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => handleChange('city', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <input
                      type="text"
                      value={formData.state || ''}
                      onChange={(e) => handleChange('state', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección Completa (Auto)
                    </label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {isAlarmSystem(formData.system_type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan de Monitoreo
                  </label>
                  <select
                    value={formData.monitoring_plan || ''}
                    onChange={(e) => handleChange('monitoring_plan', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sin plan</option>
                    <option value="Individual / Básico">Individual / Básico</option>
                    <option value="Medical Premium">Medical Premium</option>
                    <option value="Plus Clásico">Plus Clásico</option>
                    <option value="Plus Premium 2">Plus Premium 2</option>
                    <option value="Plus Premium 3">Plus Premium 3</option>
                    <option value="Plus Comercial 15">Plus Comercial 15</option>
                    <option value="Plus Comercial 20">Plus Comercial 20</option>
                    <option value="Premium Comercial 15">Premium Comercial 15</option>
                    <option value="Premium Comercial 20">Premium Comercial 20</option>
                    <option value="Taxi / Botón de Pánico">Taxi / Botón de Pánico</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estatus
                </label>
                <select
                  value={formData.status === 'Suspendido' ? 'Suspendida' : (formData.status || 'Activa')}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Activa">Activa</option>
                  <option value="Baja Cliente">Baja Cliente</option>
                  <option value="Baja Moroso">Baja Moroso</option>
                  <option value="Emigra a CN">Emigra a CN</option>
                  <option value="Emigra a IP">Emigra a IP</option>
                  <option value="Inactiva">Inactiva</option>
                  <option value="Libre IP">Libre IP</option>
                  <option value="Libre Tel">Libre Tel</option>
                  <option value="Reasignada">Reasignada</option>
                  <option value="Reservada">Reservada</option>
                  <option value="Suspendida">Suspendida</option>
                </select>
              </div>

              {/* Panel destacado de Suspensión de Servicio */}
              {(formData.status === 'Suspendida' || formData.status === 'Suspendido' || formData.is_suspended) && (
                <div className="md:col-span-2 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 text-amber-900 border-b border-amber-200/80 pb-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-700">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-amber-900">Configuración de Suspensión de Servicio</h4>
                      <p className="text-xs text-amber-700">
                        Al guardar, se enviará un email automático al cliente y un recordatorio de reanudación a <strong>contacto@alarmasadz.com.mx</strong> y <strong>clientes@alarmasadz.com.mx</strong>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        Fecha de Inicio de Suspensión <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.suspension_start_date || new Date().toISOString().split('T')[0]}
                        onChange={(e) => handleChange('suspension_start_date', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm text-gray-800"
                        required
                      />
                      <p className="text-[11px] text-amber-700 mt-1">Registrada automáticamente al cambiar el estatus a 'Suspendida'</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        Fecha Fin de Suspensión (Opcional - Reanudación Programada)
                      </label>
                      <input
                        type="date"
                        value={formData.suspension_end_date || ''}
                        min={formData.suspension_start_date || undefined}
                        onChange={(e) => handleChange('suspension_end_date', e.target.value || null)}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm text-gray-800"
                      />
                      <p className="text-[11px] text-amber-700 mt-1">
                        Visible en el Dashboard Ejecutivo. Dejar vacío si la suspensión es indefinida.
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-amber-900 mb-1">
                        Motivo de Suspensión
                      </label>
                      <textarea
                        value={formData.suspension_reason || ''}
                        onChange={(e) => handleChange('suspension_reason', e.target.value)}
                        rows={2}
                        placeholder="Ej: Suspensión temporal solicitada por el cliente, mantenimiento prolongado en el inmueble, adeudo..."
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm text-gray-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Registro y Control de Fechas del Ciclo de Vida */}
              <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Registro de Fechas de Control (Alta, Suspensión, Reanudación y Cancelación)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">Trazabilidad operativa</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fecha de Alta</label>
                    <input
                      type="date"
                      value={formData.alta_date || ''}
                      onChange={(e) => handleChange('alta_date', e.target.value || null)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-gray-700"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Ingreso del cliente</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fecha de Suspensión</label>
                    <input
                      type="date"
                      value={formData.suspension_start_date || ''}
                      onChange={(e) => handleChange('suspension_start_date', e.target.value || null)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-gray-700"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Inicio de suspensión</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fecha de Reanudación</label>
                    <input
                      type="date"
                      value={formData.reactivation_date || ''}
                      onChange={(e) => handleChange('reactivation_date', e.target.value || null)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-gray-700"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Última reactivación</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fecha de Cancelación</label>
                    <input
                      type="date"
                      value={formData.cancellation_date || ''}
                      onChange={(e) => handleChange('cancellation_date', e.target.value || null)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 text-gray-700"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Baja / Inactividad</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ubicación GPS
                </label>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <LocationMap
                    apiKey="AIzaSyCnpONcNQf8EaAGx0B2wy3Gziyw38WtdHw"
                    address={formData.address || ''}
                    latitude={formData.gps_latitude ?? null}
                    longitude={formData.gps_longitude ?? null}
                    onLocationChange={handleLocationChange}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Arrastre el marcador rojo para precisar la ubicación exacta si es necesario.
                  </p>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Latitud
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.gps_latitude || ''}
                        readOnly
                        className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Longitud
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.gps_longitude || ''}
                        readOnly
                        className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_single_branch || false}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      handleChange('is_single_branch', isChecked);
                      if (isChecked) {
                        handleChange('branch_name', 'Sucursal Única');
                      } else if (formData.branch_name === 'Sucursal Única') {
                        handleChange('branch_name', '');
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Marcar como Sucursal Única (automáticamente asigna el nombre)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-4 justify-end pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Guardar Cliente
                  </>
                )}
              </button>
            </div>
          </form >
        </div >
      </div >
    </div >
  );
}

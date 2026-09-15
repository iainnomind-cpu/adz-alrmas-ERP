import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, Loader2, Hash, Sparkles } from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { LocationMap } from './LocationMap';
import { SYSTEM_TYPES } from '../../constants/systemTypes';
import { getNextProgressiveAccountNumber, formatCustomerAccountNumber } from '../../utils/customerAccountNumber';
import { AccessControlSection } from './AccessControlSection';
import { AttendanceControlSection } from './AttendanceControlSection';
import { GpsPersonalSection } from './GpsPersonalSection';
import { GpsVehicularSection } from './GpsVehicularSection';
import { RedSection } from './RedSection';
import { VideoPorteroSection } from './VideoPorteroSection';

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
  resumption_date?: string | null;
  dvr_channels?: number | null;
  cameras_details?: any[];
  access_control_details?: any | null;
  attendance_control_details?: any | null;
  gps_personal_details?: any | null;
  gps_vehicular_details?: any | null;
  red_details?: any | null;
  video_portero_details?: any | null;
}

interface NewCustomerFormProps {
  onClose: () => void;
  onSuccess: () => void;
  customer?: Partial<CustomerInsert> & { id?: string };
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

  const [formData, setFormData] = useState<CustomerFormState>({
    name: customer?.name || '',
    owner_name: customer?.owner_name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    // UI-only fields
    street: '', // Initialize empty, will be part of address
    exterior_number: '',
    interior_number: '',
    postal_code: '',
    // Valid DB fields
    neighborhood: customer?.neighborhood ?? '',
    city: customer?.city ?? '',
    state: customer?.state ?? '',
    system_type: customer?.system_type || defaultSystemType || 'alarma',
    customer_type: customer?.customer_type || 'casa',
    communication_tech: customer?.communication_tech || 'IP',
    monitoring_plan: customer?.monitoring_plan || 'Clásico',
    status: customer?.status || 'Activa',
    business_name: customer?.business_name || '',
    gps_latitude: customer?.gps_latitude || null,
    gps_longitude: customer?.gps_longitude || null,
    property_type: customer?.property_type || 'Casa',
    credit_classification: customer?.credit_classification || 'Puntual',
    account_type: customer?.account_type || 'Normal',
    billing_preference: customer?.billing_preference || 'Factura Crédito',
    billing_cycle: customer?.billing_cycle || 'Mes',
    master_account_id: customer?.master_account_id || null,
    branch_name: customer?.branch_name || '',
    is_single_branch: customer?.is_single_branch || false,
    pricing_tier: customer?.pricing_tier || 1,
    birth_date: customer?.birth_date || null,
    annuity_month: (customer as any)?.annuity_month || null,
    cfdi: (customer as any)?.cfdi || 'Fact. Público en General',
    resumption_date: (customer as any)?.resumption_date || null,
    dvr_channels: (customer as any)?.dvr_channels || null,
    cameras_details: (customer as any)?.cameras_details || [],
    access_control_details: (customer as any)?.access_control_details || null,
    attendance_control_details: (customer as any)?.attendance_control_details || null,
    gps_personal_details: (customer as any)?.gps_personal_details || null,
    gps_vehicular_details: (customer as any)?.gps_vehicular_details || null,
    red_details: (customer as any)?.red_details || null,
    video_portero_details: (customer as any)?.video_portero_details || null,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.name || !formData.phone) {
      setError('Nombre y teléfono son obligatorios');
      setLoading(false);
      return;
    }

    if (formData.account_type === 'Consolidada' && !formData.master_account_id) {
      setError('Debe seleccionar una cuenta maestra para cuentas consolidadas');
      setLoading(false);
      return;
    }

    try {
      // Create payload excluding UI-only fields
      const { street, exterior_number, interior_number, postal_code, ...payload } = formData;

      // Add logic for suspension dates and emails
      const isSuspending = payload.status === 'Suspendida' && customer?.status !== 'Suspendida';
      const isResuming = customer?.status === 'Suspendida' && payload.status === 'Activa'; 
      
      if (isSuspending) {
        payload.suspension_start_date = new Date().toISOString();
        payload.is_suspended = true;
      }
      
      if (isResuming) {
        payload.resumption_date = new Date().toISOString();
        payload.is_suspended = false;
      }
      
      if (!customer?.id) {
        payload.first_service_date = new Date().toISOString();
      }
      
      if (['Baja Cliente', 'Baja Moroso', 'Inactiva', 'Cancelado'].includes(payload.status) && customer?.status !== payload.status) {
        payload.cancellation_date = new Date().toISOString();
      }


      if (customer?.id) {
        // Update existing customer
        const { error: updateError } = await supabase
          .from('customers')
          .update(payload as any)
          .eq('id', customer.id);

        if (updateError) throw updateError;
      } else {
        // Asignar número de cuenta progresivo para nuevos clientes si no se tiene uno asignado
        if (!payload.account_number) {
          const progressive = await getNextProgressiveAccountNumber(formData.system_type || 'alarma');
          payload.account_number = progressive.nextSequence;
        }

        // Create new customer
        const { error: insertError } = await supabase
          .from('customers')
          .insert([payload as any]);

        if (insertError) throw insertError;
      }

      
      // Email logic after successful save
      if (isSuspending && payload.email) {
         try {
           await supabase.functions.invoke('send-notification', {
             body: {
               customerEmail: payload.email,
               customerName: payload.name || payload.owner_name || 'Cliente',
               subject: 'Aviso de Suspensión de Servicio - Alarmas ADZ',
               body: 'Estimado cliente,\n\nLe informamos que su servicio ha sido suspendido.\nSi tiene alguna duda, por favor contáctenos.\n\nAtentamente,\nAlarmas ADZ',
               notificationType: 'suspension',
               variables: {}
             }
           });
         } catch (e) {
           console.error('Error sending suspension email:', e);
         }
      }
      
      if (isResuming) {
         try {
           // Notify admin/staff
           await supabase.functions.invoke('send-notification', {
             body: {
               customerEmail: 'contacto@alarmasadz.com.mx',
               customerName: 'Jorge Ramos / Atención a Clientes',
               subject: `Reanudación de Servicio: ${payload.name}`,
               body: `Se ha reanudado el servicio para el cliente: ${payload.name}.\nFecha de reanudación: ${new Date().toLocaleDateString()}\nSistema: ${payload.system_type}`,
               notificationType: 'resumption_admin',
               variables: {}
             }
           });
           await supabase.functions.invoke('send-notification', {
             body: {
               customerEmail: 'clientes@alarmasadz.com.mx',
               customerName: 'Atención a Clientes',
               subject: `Reanudación de Servicio: ${payload.name}`,
               body: `Se ha reanudado el servicio para el cliente: ${payload.name}.\nFecha de reanudación: ${new Date().toLocaleDateString()}\nSistema: ${payload.system_type}`,
               notificationType: 'resumption_admin',
               variables: {}
             }
           });
         } catch (e) {
           console.error('Error sending resumption email:', e);
         }
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

      // Auto-construct address if any address field changes
      if (['street', 'exterior_number', 'interior_number', 'neighborhood', 'city', 'state', 'postal_code'].includes(field)) {
        const parts = [];
        // Access fields from newData using the extended interface keys
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

  
  const addCamera = () => {
    setFormData(prev => ({
      ...prev,
      cameras_details: [...(prev.cameras_details || []), { type: 'IP', location: '' }]
    }));
  };

  const removeCamera = (index: number) => {
    setFormData(prev => {
      const newCameras = [...(prev.cameras_details || [])];
      newCameras.splice(index, 1);
      return { ...prev, cameras_details: newCameras };
    });
  };

  const updateCamera = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newCameras = [...(prev.cameras_details || [])];
      newCameras[index] = { ...newCameras[index], [field]: value };
      return { ...prev, cameras_details: newCameras };
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  Tipo de Propiedad <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.property_type || 'Casa'}
                  onChange={(e) => handleChange('property_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="Banco">Banco</option>
                  <option value="Bodega">Bodega</option>
                  <option value="Cabaña">Cabaña</option>
                  <option value="Casa">Casa</option>
                  <option value="Colegio">Colegio</option>
                  <option value="Comercio">Comercio</option>
                  <option value="Gobierno">Gobierno</option>
                  <option value="Oficina">Oficina</option>
                  <option value="Pozo">Pozo</option>
                  <option value="Rancho">Rancho</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tecnología de Comunicación <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.communication_tech || 'IP'}
                  onChange={(e) => handleChange('communication_tech', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="Comcel">Comcel</option>
                  <option value="Dual CN">Dual CN</option>
                  <option value="Dual DSC">Dual DSC</option>
                  <option value="Dual">Dual</option>
                  <option value="IP">IP</option>
                  <option value="LT">LT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buró <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.credit_classification || 'Puntual'}
                  onChange={(e) => handleChange('credit_classification', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="Puntual">Puntual</option>
                  <option value="Retraso">Retraso</option>
                  <option value="Moroso">Moroso</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Cuenta <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.account_type || 'Normal'}
                  onChange={(e) => handleChange('account_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="Consolidada">Consolidada</option>
                  <option value="Maestra">Maestra</option>
                  <option value="Normal">Normal</option>
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

              {formData.account_type === 'Consolidada' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cuenta Maestra <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.master_account_id || ''}
                    onChange={(e) => handleChange('master_account_id', e.target.value || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={formData.account_type === 'Consolidada'}
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
                  Formato Solé <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.billing_preference || 'Factura Crédito'}
                  onChange={(e) => handleChange('billing_preference', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="Factura Crédito">Factura Crédito</option>
                  <option value="Factura Contado">Factura Contado</option>
                  <option value="Ticket Remisión Presupuesto Serie (V)">Ticket Remisión Presupuesto Serie (V)</option>
                  <option value="Ticket Remisión Factura Serie (TF)">Ticket Remisión Factura Serie (TF)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ciclo de Facturación
                </label>
                <select
                  value={formData.billing_cycle || 'Mes'}
                  onChange={(e) => handleChange('billing_cycle', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Mes">Mes</option>
                  <option value="Año">Año</option>
                </select>
              </div>

              {formData.billing_cycle === 'Año' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cobro Anual
                  </label>
                  <select
                    value={formData.annuity_month || ''}
                    onChange={(e) => handleChange('annuity_month', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar mes...</option>
                    <option value="1">Ene</option>
                    <option value="2">Feb</option>
                    <option value="3">Mar</option>
                    <option value="4">Abr</option>
                    <option value="5">May</option>
                    <option value="6">Jun</option>
                    <option value="7">Jul</option>
                    <option value="8">Ago</option>
                    <option value="9">Sept</option>
                    <option value="10">Oct</option>
                    <option value="11">Nov</option>
                    <option value="12">Dic</option>
                  </select>
                </div>
              )}

              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CFDI <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.cfdi || 'Fact. Público en General'}
                  onChange={(e) => handleChange('cfdi', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="Fact. Público en General">Fact. Público en General</option>
                  <option value="SAT">SAT</option>
                  <option value="Ticket">Ticket</option>
                </select>
              </div>


              
              {formData.system_type === 'cctv' && (
                <div className="md:col-span-3 space-y-4 mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-medium text-gray-900 border-b pb-2">Configuración CCTV</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Canales del DVR/NVR <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={formData.dvr_channels || ''}
                        onChange={(e) => {
                          const channels = e.target.value ? parseInt(e.target.value) : null;
                          handleChange('dvr_channels', channels);
                          // We don't auto-fill cameras here, let the user add them manually one by one
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required={formData.system_type === 'cctv'}
                      >
                        <option value="">Seleccione cantidad...</option>
                        <option value="4">4 Canales</option>
                        <option value="8">8 Canales</option>
                        <option value="16">16 Canales</option>
                        <option value="32">32 Canales</option>
                      </select>
                    </div>
                  </div>
                  
                  {formData.dvr_channels && (
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-medium text-gray-800">Cámaras Instaladas ({(formData.cameras_details || []).length} de {formData.dvr_channels})</h4>
                        {(formData.cameras_details || []).length < formData.dvr_channels && (
                          <button 
                            type="button" 
                            onClick={addCamera}
                            className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-medium rounded hover:bg-blue-200 transition-colors"
                          >
                            + Agregar Cámara
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        {(formData.cameras_details || []).map((cam, idx) => (
                          <div key={idx} className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm relative">
                            <button 
                              type="button" 
                              onClick={() => removeCamera(idx)}
                              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                              title="Eliminar cámara"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <h5 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Cámara {idx + 1}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Tipo de Cámara <span className="text-red-600">*</span>
                                </label>
                                <select
                                  value={cam.type || 'IP'}
                                  onChange={(e) => updateCamera(idx, 'type', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  required
                                >
                                  <option value="IP">IP</option>
                                  <option value="IP WiFi">IP WiFi</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Ubicación / Notas
                                </label>
                                <input
                                  type="text"
                                  value={cam.location || ''}
                                  onChange={(e) => updateCamera(idx, 'location', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Ej: Entrada principal"
                                />
                              </div>
                            </div>
                            {idx === (formData.cameras_details || []).length - 1 && (formData.cameras_details || []).length < formData.dvr_channels && (
                               <div id="camera-prompt-container" className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between bg-blue-50/50 p-2 rounded">
                                 <span className="text-sm text-gray-700">¿Deseas continuar con la siguiente cámara?</span>
                                 <div className="flex gap-2">
                                   <button type="button" onClick={addCamera} className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 font-medium text-blue-600">Sí</button>
                                   <button type="button" onClick={() => {}} className="px-3 py-1 bg-gray-50 border border-gray-300 rounded text-sm text-gray-500 hover:bg-gray-100">No</button>
                                 </div>
                               </div>
                            )}
                          </div>
                        ))}
                        {(formData.cameras_details || []).length === 0 && (
                          <div className="text-center py-6 bg-white border border-gray-200 border-dashed rounded-lg">
                            <p className="text-sm text-gray-500">No hay cámaras registradas.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* GPS Personal Section */}
            {formData.system_type === 'gps_personal' && (
              <GpsPersonalSection
                data={formData.gps_personal_details}
                onChange={(val) => setFormData(prev => ({ ...prev, gps_personal_details: val }))}
              />
            )}

            {/* GPS Vehicular Section */}
            {formData.system_type === 'gps_vehicular' && (
              <GpsVehicularSection
                data={formData.gps_vehicular_details}
                onChange={(val) => setFormData(prev => ({ ...prev, gps_vehicular_details: val }))}
              />
            )}

            {/* Red Section */}
            {['red', 'redes'].includes(formData.system_type?.toLowerCase() || '') && (
              <RedSection
                data={formData.red_details}
                onChange={(val) => setFormData(prev => ({ ...prev, red_details: val }))}
              />
            )}

            {/* Video Portero Section */}
            {['video_portero', 'videoportero', 'video portero', 'vp'].includes(formData.system_type?.toLowerCase() || '') && (
              <VideoPorteroSection
                data={formData.video_portero_details}
                onChange={(val) => setFormData(prev => ({ ...prev, video_portero_details: val }))}
              />
            )}

              <div className="md:col-span-3 space-y-4">
                <h3 className="font-medium text-gray-900 border-b pb-2">Domicilio Monitoreado</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan de Monitoreo <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.monitoring_plan || 'Clásico'}
                  onChange={(e) => handleChange('monitoring_plan', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="Clásico">Clásico</option>
                  <option value="Plus">Plus</option>
                  <option value="Pluscom15">Pluscom15</option>
                  <option value="Pluscom20">Pluscom20</option>
                  <option value="Premium">Premium</option>
                  <option value="Premiumcom15">Premiumcom15</option>
                  <option value="Premiumcom20">Premiumcom20</option>
                  <option value="Medical">Medical</option>
                  <option value="Personal">Personal</option>
                  <option value="Taxi">Taxi</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estatus <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.status || 'Activa'}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="Activa">Activa</option>
                  <option value="Baja Cliente">Baja Cliente</option>
                  <option value="Baja Moroso">Baja Moroso</option>
                  <option value="Emigra a CN">Emigra a CN</option>
                  <option value="Emigra a IP">Emigra a IP</option>
                  <option value="Emigra a Dual">Emigra a Dual</option>
                  <option value="Inactiva">Inactiva</option>
                  <option value="Libre IP">Libre IP</option>
                  <option value="Libre Tel">Libre Tel</option>
                  <option value="Reasignada">Reasignada</option>
                  <option value="Reservada">Reservada</option>
                  <option value="Suspendida">Suspendida</option>
                  <option value="Prueba">Prueba</option>
                </select>
              </div>

              
              {formData.status === 'Suspendida' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Fin de Suspensión
                  </label>
                  <input
                    type="date"
                    value={(formData as any).suspension_end_date ? new Date((formData as any).suspension_end_date).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleChange('suspension_end_date' as any, e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Visible en Dashboard Ejecutivo</p>
                </div>
              )}

              <div className="md:col-span-3">
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

              <div className="md:col-span-3">
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

            {/* CCTV Section */}
            {formData.system_type === 'cctv' && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 border-b pb-2 text-base">Configuración CCTV</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Canales del DVR/NVR <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={formData.dvr_channels || ''}
                      onChange={(e) => handleChange('dvr_channels', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required={formData.system_type === 'cctv'}
                    >
                      <option value="">Seleccione cantidad...</option>
                      <option value="4">4 Canales</option>
                      <option value="8">8 Canales</option>
                      <option value="16">16 Canales</option>
                      <option value="32">32 Canales</option>
                    </select>
                  </div>
                </div>
                {formData.dvr_channels && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-gray-800">
                        Cámaras Instaladas ({(formData.cameras_details || []).length} de {formData.dvr_channels})
                      </h4>
                      {(formData.cameras_details || []).length < formData.dvr_channels && (
                        <button type="button" onClick={addCamera}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-medium rounded hover:bg-blue-200 transition-colors">
                          + Agregar Cámara
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {(formData.cameras_details || []).map((cam, idx) => (
                        <div key={idx} className="bg-white p-4 border border-gray-200 rounded-lg relative">
                          <button type="button" onClick={() => removeCamera(idx)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500" title="Eliminar">
                            <X className="w-4 h-4" />
                          </button>
                          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Cámara {idx + 1}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Tipo de Cámara <span className="text-red-600">*</span>
                              </label>
                              <select value={cam.type || 'IP'}
                                onChange={(e) => updateCamera(idx, 'type', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                required>
                                <option value="IP">IP</option>
                                <option value="IP WiFi">IP WiFi</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Ubicación / Notas</label>
                              <input type="text" value={cam.location || ''}
                                onChange={(e) => updateCamera(idx, 'location', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                placeholder="Ej: Entrada principal" />
                            </div>
                          </div>
                          {idx === (formData.cameras_details || []).length - 1 && (formData.cameras_details || []).length < formData.dvr_channels && (
                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between bg-blue-50/50 p-2 rounded">
                              <span className="text-sm text-gray-700">¿Deseas continuar con la siguiente cámara?</span>
                              <div className="flex gap-2">
                                <button type="button" onClick={addCamera}
                                  className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 text-blue-600 font-medium">Sí</button>
                                <button type="button"
                                  className="px-3 py-1 bg-gray-50 border border-gray-300 rounded text-sm text-gray-500">No</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {(formData.cameras_details || []).length === 0 && (
                        <div className="text-center py-6 bg-white border border-dashed border-gray-200 rounded-lg">
                          <p className="text-sm text-gray-500">No hay cámaras. Haz clic en "+ Agregar Cámara" para empezar.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Control de Acceso Section */}
            {formData.system_type === 'control_acceso' && (
              <AccessControlSection
                data={formData.access_control_details}
                onChange={(val) => setFormData(prev => ({ ...prev, access_control_details: val }))}
              />
            )}

            {/* Control de Asistencia Section */}
            {formData.system_type === 'control_asistencia' && (
              <AttendanceControlSection
                data={formData.attendance_control_details}
                onChange={(val) => setFormData(prev => ({ ...prev, attendance_control_details: val }))}
              />
            )}



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

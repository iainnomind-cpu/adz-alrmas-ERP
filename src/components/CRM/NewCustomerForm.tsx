import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, Loader2 } from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { LocationMap } from './LocationMap';

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
}

interface NewCustomerFormProps {
  onClose: () => void;
  onSuccess: () => void;
  customer?: Partial<CustomerInsert> & { id?: string };
}

interface MasterAccount {
  id: string;
  name: string;
  account_number: number;
}

export function NewCustomerForm({ onClose, onSuccess, customer }: NewCustomerFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [masterAccounts, setMasterAccounts] = useState<MasterAccount[]>([]);
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
    customer_type: customer?.customer_type || 'casa',
    communication_tech: customer?.communication_tech || 'telefono',
    monitoring_plan: customer?.monitoring_plan || '',
    status: customer?.status || 'active',
    business_name: customer?.business_name || '',
    gps_latitude: customer?.gps_latitude || null,
    gps_longitude: customer?.gps_longitude || null,
    property_type: customer?.property_type || 'casa',
    credit_classification: customer?.credit_classification || 'puntual',
    account_type: customer?.account_type || 'normal',
    billing_preference: customer?.billing_preference || 'electronic',
    billing_cycle: customer?.billing_cycle || 'monthly',
    master_account_id: customer?.master_account_id || null,
    branch_name: customer?.branch_name || '',
    is_single_branch: customer?.is_single_branch || false,
    pricing_tier: customer?.pricing_tier || 1,
    birth_date: customer?.birth_date || null,
  });

  useEffect(() => {
    loadMasterAccounts();
  }, []);

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

    if (formData.account_type === 'consolidated' && !formData.master_account_id) {
      setError('Debe seleccionar una cuenta maestra para cuentas consolidadas');
      setLoading(false);
      return;
    }

    try {
      // Create payload excluding UI-only fields
      const { street, exterior_number, interior_number, postal_code, ...payload } = formData;

      if (customer?.id) {
        // Update existing customer
        const { error: updateError } = await supabase
          .from('customers')
          .update(payload as any)
          .eq('id', customer.id);

        if (updateError) throw updateError;
      } else {
        // Create new customer
        const { error: insertError } = await supabase
          .from('customers')
          .insert([payload as any]);

        if (insertError) throw insertError;
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

  const handleLocationChange = useCallback((lat: number, lng: number) => {
    handleChange('gps_latitude', lat);
    handleChange('gps_longitude', lng);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6 rounded-t-2xl flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
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
                  Nombre <span className="text-red-600">*</span>
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
                  value={formData.property_type || 'casa'}
                  onChange={(e) => handleChange('property_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="casa">Casa</option>
                  <option value="comercio">Comercio</option>
                  <option value="banco">Banco</option>
                  <option value="rancho">Rancho</option>
                  <option value="gobierno">Gobierno</option>
                  <option value="pozo">Pozo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tecnología de Comunicación
                </label>
                <select
                  value={formData.communication_tech || 'telefono'}
                  onChange={(e) => handleChange('communication_tech', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="telefono">Teléfono</option>
                  <option value="celular">Celular</option>
                  <option value="dual">Dual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clasificación de Crédito
                </label>
                <select
                  value={formData.credit_classification || 'puntual'}
                  onChange={(e) => handleChange('credit_classification', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="puntual">Puntual</option>
                  <option value="15_dias">15 Días</option>
                  <option value="moroso">Moroso</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Cuenta Especial
                </label>
                <select
                  value={formData.account_type || 'normal'}
                  onChange={(e) => handleChange('account_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="normal">Normal (1 servicio)</option>
                  <option value="master">Maestra (Múltiples servicios)</option>
                  <option value="consolidated">Consolidada (Vinculada a maestra)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Normal: 1 servicio | Maestra: 2+ servicios | Consolidada: No se factura directamente
                </p>
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

              {formData.account_type === 'consolidated' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cuenta Maestra <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.master_account_id || ''}
                    onChange={(e) => handleChange('master_account_id', e.target.value || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={formData.account_type === 'consolidated'}
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
                  Preferencia de Facturación
                </label>
                <select
                  value={formData.billing_preference || 'electronic'}
                  onChange={(e) => handleChange('billing_preference', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="electronic">Electrónica</option>
                  <option value="paper">Papel</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ciclo de Facturación
                </label>
                <select
                  value={formData.billing_cycle || 'monthly'}
                  onChange={(e) => handleChange('billing_cycle', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="annual">Anual</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-4">
                <h3 className="font-medium text-gray-900 border-b pb-2">Dirección</h3>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan de Monitoreo
                </label>
                <input
                  type="text"
                  value={formData.monitoring_plan || ''}
                  onChange={(e) => handleChange('monitoring_plan', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Basic, Premium, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Activo</option>
                  <option value="suspended">Suspendido</option>
                  <option value="inactive">Inactivo</option>
                </select>
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

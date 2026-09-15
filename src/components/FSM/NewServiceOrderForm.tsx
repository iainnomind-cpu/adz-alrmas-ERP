import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Save, Loader2, Search, FileText, Shield, Hash, AlertCircle, MapPin, Users, Clock, ChevronDown } from 'lucide-react';
import { SERVICE_TRAVEL_ZONES, SERVICE_DURATION_OPTIONS } from '../../constants/serviceOrderBilling';

interface NewServiceOrderFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit_cost: number;
  quantity_available: number;
}

const SYSTEM_TYPES = [
  'Alarma',
  'Control de Acceso',
  'Control de Asistencia',
  'CCTV',
  'Domótica',
  'GPS Personal',
  'GPS Vehicular',
  'Red',
  'Video Portero',
];

const WARRANTY_TYPES = [
  { value: '1_year', label: 'Garantía 1 Año' },
  { value: 'adz_additional', label: 'Garantía ADZ 1 Año Adicional' },
  { value: 'extended', label: 'Garantía Extendida' },
];

export function NewServiceOrderForm({ onClose, onSuccess }: NewServiceOrderFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [equipmentItems, setEquipmentItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [locationStocks, setLocationStocks] = useState<Record<string, Record<string, number>>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    series_id: '',
    customer_id: '',
    asset_id: '',
    technician_id: '',
    description: '',
    priority: 'normal',
    service_type: 'reactive',
    duration_option: '60',
    estimated_duration_minutes: 60,
    travel_zone: 'zm_cd_guzman_50km',
    technician_count: 1,
    notes: '',
    monitoring_center_folio: '',
    scheduled_date: '',
    equipment_to_install: '',
    equipment_location_id: '',
    equipment_serial_number: '',
    system_type: '',
    // Garantía
    is_warranty: false,
    warranty_type: '',
    warranty_device_count: 1,
    warranty_brand: '',
    warranty_model: '',
    warranty_device_description: '',
    warranty_fault_reported: '',
  });

  useEffect(() => {
    loadSeries();
    loadCustomers();
    loadTechnicians();
    loadEquipmentItems();
    loadLocations();
    loadLocationStocks();
  }, []);

  const loadLocationStocks = async () => {
    try {
      const { data } = await supabase.from('inventory_location_stock').select('product_id, location_id, quantity');
      const stocks: Record<string, Record<string, number>> = {};
      if (data) {
        data.forEach((ls: any) => {
          if (!stocks[ls.product_id]) stocks[ls.product_id] = {};
          stocks[ls.product_id][ls.location_id] = ls.quantity;
        });
      }
      setLocationStocks(stocks);
    } catch (e) {
      console.error('Error loading location stocks:', e);
    }
  };

  useEffect(() => {
    if (formData.customer_id) {
      loadAssets(formData.customer_id);
    }
  }, [formData.customer_id]);

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, business_name, account_number, address, phone, system_type')
      .order('name');
    if (error) console.error('Error loading customers:', error);
    if (data) setCustomers(data);
  };

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_locations')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (!error && data) setLocations(data);
    } catch (e) {
      console.error('Error loading locations:', e);
    }
  };

  const loadAssets = async (customerId: string) => {
    const { data } = await supabase
      .from('assets')
      .select('id, alarm_model, model, serial_number, billing_date, has_extended_warranty')
      .eq('customer_id', customerId)
      .eq('status', 'active');
    if (data) setAssets(data);
  };

  const loadTechnicians = async () => {
    const { data } = await supabase
      .from('technicians')
      .select('id, full_name, specialty')
      .eq('is_active', true)
      .order('full_name');
    if (data) setTechnicians(data);
  };

  const loadSeries = async () => {
    const { data } = await supabase
      .from('folio_series')
      .select('id, series_name, series_code, next_number')
      .eq('is_active', true)
      .eq('document_type', 'service_order')
      .order('series_name');
    if (data) setSeries(data);
  };

  const loadEquipmentItems = async () => {
    const { data, error } = await supabase
      .from('price_list')
      .select('id, name, code, category, price, base_price_mxn, cost_price_mxn, stock_quantity')
      .eq('is_active', true)
      .order('name');
    if (error) { console.error('Error loading equipment:', error); return; }
    if (data) {
      const mappedItems: InventoryItem[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.code || '',
        category: item.category || 'equipment',
        unit_cost: item.price || item.base_price_mxn || item.cost_price_mxn || 0,
        quantity_available: item.stock_quantity || 0
      }));
      setEquipmentItems(mappedItems);
    }
  };

  const getNextFolioPreview = () => {
    if (!formData.series_id) return '';
    const selectedSeries = series.find(s => s.id === formData.series_id);
    if (!selectedSeries) return '';
    const paddedNumber = String(selectedSeries.next_number).padStart(6, '0');
    return `${selectedSeries.series_code}-${paddedNumber}`;
  };

  const getEquipmentCategoryLabel = (category: string): string => {
    const labels: { [key: string]: string } = {
      alarm: 'Panel de Alarma', panel: 'Panel', sensor: 'Sensor',
      keyboard: 'Teclado', communicator: 'Comunicador', camera: 'Cámara'
    };
    return labels[category.toLowerCase()] || 'Equipo';
  };

  const handleDurationChange = (value: string) => {
    const option = SERVICE_DURATION_OPTIONS.find(o => o.value === value);
    setFormData({
      ...formData,
      duration_option: value,
      estimated_duration_minutes: option ? option.minutes : 60
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.series_id || !formData.customer_id || !formData.description) {
      setError('Serie de folio, cliente y descripción son obligatorios');
      setLoading(false);
      return;
    }

    if (formData.is_warranty && !formData.warranty_type) {
      setError('Debe seleccionar el tipo de garantía');
      setLoading(false);
      return;
    }

    if (formData.service_type === 'installation' && !formData.equipment_to_install) {
      setError('Debe seleccionar un equipo para instalación');
      setLoading(false);
      return;
    }

    if (formData.service_type === 'installation' && formData.equipment_to_install && !formData.equipment_location_id) {
      setError('Debe seleccionar el almacén origen del equipo a instalar');
      setLoading(false);
      return;
    }

    if (formData.service_type === 'installation' && formData.equipment_to_install) {
      const selectedEquipment = equipmentItems.find(item => item.id === formData.equipment_to_install);
      if (!selectedEquipment) { setError('Equipo seleccionado no encontrado'); setLoading(false); return; }
      if (selectedEquipment.quantity_available === 0) {
        setError('El equipo seleccionado no tiene stock disponible.');
        setLoading(false);
        return;
      }
      if (formData.equipment_location_id) {
        const availableInLocation = locationStocks[selectedEquipment.id]?.[formData.equipment_location_id] || 0;
        if (availableInLocation <= 0) {
          setError('El equipo seleccionado no tiene stock en el almacén elegido.');
          setLoading(false);
          return;
        }
      }
    }

    const technicianId = formData.technician_id || user?.id;
    if (!technicianId) { setError('Debe seleccionar un técnico o estar autenticado'); setLoading(false); return; }

    try {
      const orderNumber = getNextFolioPreview();
      const now = new Date();
      const createdAtDisplay = now.toLocaleString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });

      const orderData: any = {
        order_number: orderNumber,
        full_folio: orderNumber,
        folio_series_id: formData.series_id,
        customer_id: formData.customer_id,
        asset_id: formData.asset_id || null,
        technician_id: technicianId,
        description: formData.description,
        priority: formData.priority,
        service_type: formData.service_type,
        estimated_duration_minutes: formData.estimated_duration_minutes,
        travel_zone: formData.travel_zone,
        technician_count: formData.technician_count,
        notes: formData.notes || null,
        monitoring_center_folio: formData.monitoring_center_folio || null,
        scheduled_date: formData.scheduled_date || null,
        system_type: formData.system_type || null,
        status: 'levantada',
        created_by_name: (user as any)?.user_metadata?.full_name || user?.email || 'Sistema',
        created_at_display: createdAtDisplay,
        // Garantía
        is_warranty: formData.is_warranty,
        warranty_type: formData.is_warranty ? formData.warranty_type : null,
        warranty_device_count: formData.is_warranty ? formData.warranty_device_count : null,
        warranty_brand: formData.is_warranty ? formData.warranty_brand || null : null,
        warranty_model: formData.is_warranty ? formData.warranty_model || null : null,
        warranty_device_description: formData.is_warranty ? formData.warranty_device_description || null : null,
        warranty_fault_reported: formData.is_warranty ? formData.warranty_fault_reported || null : null,
      };

      if (formData.service_type === 'installation' && formData.equipment_to_install && formData.equipment_serial_number) {
        orderData.notes = (orderData.notes || '') +
          `\nEquipo: ${equipmentItems.find(e => e.id === formData.equipment_to_install)?.name || 'N/A'}` +
          `\nNúmero de Serie: ${formData.equipment_serial_number}`;
      }

      const { data: newOrder, error: insertError } = await supabase
        .from('service_orders')
        .insert([orderData] as any)
        .select()
        .single();

      if (insertError) throw insertError;

      if (formData.service_type === 'installation' && formData.equipment_to_install && newOrder) {
        const selectedEquipment = equipmentItems.find(item => item.id === formData.equipment_to_install);
        if (!selectedEquipment) throw new Error('El equipo seleccionado no existe en el inventario');

        const { data: insertedMaterials, error: materialError } = await supabase
          .from('service_order_materials')
          .insert([{
            service_order_id: newOrder.id,
            inventory_item_id: formData.equipment_to_install,
            location_id: formData.equipment_location_id,
            quantity_used: 1,
            unit_cost: selectedEquipment.unit_cost,
            total_cost: selectedEquipment.unit_cost,
            serial_number: formData.equipment_serial_number || null,
            installation_notes: `Equipo para instalación: ${selectedEquipment.name}`
          }] as any)
          .select('id');

        if (materialError) throw new Error(`Error al registrar material: ${materialError.message}`);

        if ((insertedMaterials as any[])?.length > 0) {
          const { error: inventoryError } = await supabase
            .from('inventory_transactions')
            .insert({
              product_id: formData.equipment_to_install,
              transaction_type: 'usage',
              quantity: 1,
              unit_cost: 0,
              total_cost: 0,
              reference_type: 'servicio',
              reference_id: newOrder.id,
              service_order_id: newOrder.id,
              from_location_id: formData.equipment_location_id,
              created_by: user?.id,
              notes: 'Instalación de equipo inicial'
            } as any);

          if (inventoryError) throw new Error(`Error al actualizar stock: ${inventoryError.message}`);
        }

        await supabase
          .from('service_orders')
          .update({ materials_cost: selectedEquipment.unit_cost, total_cost: selectedEquipment.unit_cost } as any)
          .eq('id', newOrder.id);
      }

      const selectedSeries = series.find(s => s.id === formData.series_id);
      if (selectedSeries) {
        await supabase
          .from('folio_series')
          .update({ next_number: selectedSeries.next_number + 1 } as any)
          .eq('id', formData.series_id);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la orden de servicio');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    return (
      c.name?.toLowerCase().includes(q) ||
      c.business_name?.toLowerCase().includes(q) ||
      String(c.account_number || '').toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
    );
  });

  const selectedEquipment = equipmentItems.find(item => item.id === formData.equipment_to_install);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen p-4 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-auto">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 sm:px-8 py-4 sm:py-6 rounded-t-2xl flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Nueva Orden de Servicio</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* ── 1. Serie de Folio ── */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 sm:p-6">
              <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Serie de Folio <span className="text-red-600">*</span>
              </label>
              <select
                value={formData.series_id}
                onChange={(e) => setFormData({ ...formData, series_id: e.target.value })}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-gray-900"
                required
              >
                <option value="">Seleccionar serie de folio</option>
                {series.map((s) => {
                  const paddedNumber = String(s.next_number).padStart(6, '0');
                  return (
                    <option key={s.id} value={s.id}>
                      {s.series_name} ({s.series_code}-{paddedNumber})
                    </option>
                  );
                })}
              </select>
              {formData.series_id && (
                <div className="mt-3 bg-blue-100 border border-blue-400 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-800 mb-1">Folio que se generará:</p>
                  <p className="text-lg font-bold text-blue-900 tracking-wide">{getNextFolioPreview()}</p>
                </div>
              )}
            </div>

            {/* ── 2. Folio Central + Fecha Programada (junto al folio) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folio de Central de Monitoreo
                </label>
                <input
                  type="text"
                  value={formData.monitoring_center_folio}
                  onChange={(e) => setFormData({ ...formData, monitoring_center_folio: e.target.value })}
                  placeholder="Ej: MC-12345"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Programada (Opcional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* ── 3. Cliente ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente <span className="text-red-600">*</span>
              </label>
              <div className="relative mb-2">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, negocio, sucursal o número de cuenta..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value, asset_id: '' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                size={filteredCustomers.length > 0 && searchTerm ? Math.min(filteredCustomers.length + 1, 6) : 1}
              >
                <option value="">Seleccionar cliente</option>
                {filteredCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.business_name ? ` / ${customer.business_name}` : ''}
                    {customer.account_number ? ` (Cta: ${customer.account_number})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* ── 4. Tipo de Sistema ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Sistema
              </label>
              <select
                value={formData.system_type}
                onChange={(e) => setFormData({ ...formData, system_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar tipo de sistema...</option>
                {SYSTEM_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* ── 5. Técnico ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Técnico Asignado
              </label>
              <select
                value={formData.technician_id}
                onChange={(e) => setFormData({ ...formData, technician_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Asignar automáticamente (usuario actual)</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.full_name} {tech.specialty ? `- ${tech.specialty}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* ── 6. Zona + N° Técnicos ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  Zona / Traslado
                </label>
                <select
                  value={formData.travel_zone}
                  onChange={(e) => setFormData({ ...formData, travel_zone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {SERVICE_TRAVEL_ZONES.map((zone) => (
                    <option key={zone.value} value={zone.value}>{zone.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Se registra para informar cargos de traslado.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-gray-500" />
                  Número de Técnicos
                </label>
                <input
                  type="number"
                  value={formData.technician_count}
                  onChange={(e) => setFormData({ ...formData, technician_count: Math.max(1, parseInt(e.target.value) || 1) })}
                  min="1" step="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Solo para registro; no modifica el costo.</p>
              </div>
            </div>

            {/* ── 7. Activo ── */}
            {formData.customer_id && assets.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activo (Opcional)
                </label>
                <select
                  value={formData.asset_id}
                  onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sin activo específico</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.model || asset.alarm_model || 'Equipo'} {asset.serial_number ? `(S/N: ${asset.serial_number})` : ''}
                    </option>
                  ))}
                </select>
                {formData.asset_id && (() => {
                  const selectedAsset = assets.find(a => a.id === formData.asset_id);
                  if (!selectedAsset?.billing_date) return null;
                  const billingDate = new Date(selectedAsset.billing_date);
                  const warrantyYears = selectedAsset.has_extended_warranty ? 2 : 1;
                  const expirationDate = new Date(billingDate);
                  expirationDate.setFullYear(expirationDate.getFullYear() + warrantyYears);
                  const isValid = new Date() <= expirationDate;
                  return (
                    <div className={`mt-2 p-3 rounded-lg flex items-center gap-2 ${isValid ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                      <Shield className={`w-5 h-5 ${isValid ? 'text-green-600' : 'text-red-600'}`} />
                      <div>
                        <p className="font-semibold text-sm">
                          {isValid ? 'Equipo En Garantía' : 'Equipo Fuera de Garantía'}
                        </p>
                        <p className="text-xs opacity-80">Vence: {expirationDate.toLocaleDateString()}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── 8. Prioridad + Tipo de Servicio ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prioridad</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Servicio</label>
                <select
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="reactive">Reactivo</option>
                  <option value="preventive">Preventivo</option>
                  <option value="corrective">Correctivo</option>
                  <option value="installation">Instalación</option>
                  <option value="upgrade">Mejora</option>
                </select>
              </div>
            </div>

            {/* ── 9. Equipo a Instalar (condicional) ── */}
            {formData.service_type === 'installation' && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-amber-600 rounded-lg">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Equipo a Instalar</h3>
                  <span className="ml-auto px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded-full">EQUIPO</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleccionar Equipo <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={formData.equipment_to_install}
                      onChange={(e) => setFormData({ ...formData, equipment_to_install: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white font-medium"
                      required={formData.service_type === 'installation'}
                    >
                      <option value="">Seleccionar equipo del inventario</option>
                      {equipmentItems.map((item) => (
                        <option key={item.id} value={item.id} disabled={item.quantity_available === 0}>
                          {item.name} - {item.sku} | Stock: {item.quantity_available} | ${item.unit_cost.toFixed(2)}
                          {item.quantity_available === 0 ? ' - SIN STOCK' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedEquipment && (
                    <div className="mt-4 pt-4 border-t border-amber-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Almacén Origen <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={formData.equipment_location_id}
                        onChange={(e) => setFormData({ ...formData, equipment_location_id: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white font-medium"
                        required={formData.service_type === 'installation' && !!formData.equipment_to_install}
                      >
                        <option value="" disabled hidden>Seleccione un almacén...</option>
                        {locations.map((loc) => {
                          const qty = selectedEquipment ? (locationStocks[selectedEquipment.id]?.[loc.id] || 0) : 0;
                          return (
                            <option key={loc.id} value={loc.id} disabled={selectedEquipment && qty <= 0}>
                              {loc.name} {selectedEquipment ? `(Disp: ${qty})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                  {selectedEquipment && selectedEquipment.quantity_available === 0 && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-semibold">Este producto NO tiene stock disponible</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                      <Hash className="w-4 h-4 text-gray-500" />
                      Número de Serie (opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.equipment_serial_number}
                      onChange={(e) => setFormData({ ...formData, equipment_serial_number: e.target.value })}
                      placeholder="Ej: SN123456789"
                      className="w-full px-4 py-3 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── 10. Duración Estimada (select) ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-500" />
                Duración Estimada
              </label>
              <select
                value={formData.duration_option}
                onChange={(e) => handleDurationChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SERVICE_DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {formData.duration_option === 'local' && (
                <p className="text-xs text-blue-700 mt-1 font-medium">
                  ✓ Visita Técnica Express 3.0 — Costo neto: $120 MXN
                </p>
              )}
            </div>

            {/* ── 11. Descripción ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción del Servicio <span className="text-red-600">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe el servicio a realizar..."
                required
              />
            </div>

            {/* ── 12. Módulo de Garantía ── */}
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_warranty: !formData.is_warranty })}
                className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${formData.is_warranty ? 'bg-purple-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5" />
                  <span className="font-semibold">Orden de Garantía</span>
                  {formData.is_warranty && (
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">ACTIVA</span>
                  )}
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform ${formData.is_warranty ? 'rotate-180' : ''}`} />
              </button>

              {formData.is_warranty && (
                <div className="p-5 space-y-4 bg-purple-50">
                  {/* Tipo de garantía */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Garantía <span className="text-red-600">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {WARRANTY_TYPES.map((wt) => (
                        <button
                          key={wt.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, warranty_type: wt.value })}
                          className={`px-4 py-3 rounded-lg border-2 text-sm font-medium text-center transition-all ${formData.warranty_type === wt.value
                            ? 'border-purple-600 bg-purple-600 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-purple-400'}`}
                        >
                          {wt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.warranty_type && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cantidad de Dispositivos
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.warranty_device_count}
                            onChange={(e) => setFormData({ ...formData, warranty_device_count: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                          <input
                            type="text"
                            value={formData.warranty_brand}
                            onChange={(e) => setFormData({ ...formData, warranty_brand: e.target.value })}
                            placeholder="Ej: Honeywell"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                          <input
                            type="text"
                            value={formData.warranty_model}
                            onChange={(e) => setFormData({ ...formData, warranty_model: e.target.value })}
                            placeholder="Ej: VISTA-48"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Descripción del Equipo
                        </label>
                        <textarea
                          value={formData.warranty_device_description}
                          onChange={(e) => setFormData({ ...formData, warranty_device_description: e.target.value })}
                          rows={2}
                          placeholder="Descripción libre del equipo o dispositivos en garantía..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Falla Reportada o Detectada
                        </label>
                        <textarea
                          value={formData.warranty_fault_reported}
                          onChange={(e) => setFormData({ ...formData, warranty_fault_reported: e.target.value })}
                          rows={2}
                          placeholder="Describe la falla reportada por el cliente o detectada por el técnico..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── 13. Notas ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notas Adicionales</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Notas internas, instrucciones especiales, etc."
              />
            </div>

            {/* ── Botones ── */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto sm:ml-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Crear Orden
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

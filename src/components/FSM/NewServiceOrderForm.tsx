import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Save, Loader2, Search, FileText, Shield, Hash, AlertCircle } from 'lucide-react';

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

export function NewServiceOrderForm({ onClose, onSuccess }: NewServiceOrderFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [equipmentItems, setEquipmentItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    series_id: '',
    customer_id: '',
    asset_id: '',
    technician_id: '',
    description: '',
    priority: 'normal',
    service_type: 'reactive',
    estimated_duration_minutes: 60,
    notes: '',
    monitoring_center_folio: '',
    scheduled_date: '',
    equipment_to_install: '',
    equipment_serial_number: ''
  });

  useEffect(() => {
    loadSeries();
    loadCustomers();
    loadTechnicians();
    loadEquipmentItems();
  }, []);

  useEffect(() => {
    if (formData.customer_id) {
      loadAssets(formData.customer_id);
    }
  }, [formData.customer_id]);

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, address, phone')
      .order('name');

    if (error) {
      console.error('Error loading customers:', error);
    }

    if (data) setCustomers(data);
  };

  const loadAssets = async (customerId: string) => {
    const { data } = await supabase
      .from('assets')
      .select('id, alarm_model, serial_number')
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
    console.log('🔍 Cargando equipos desde price_list...');

    const { data, error } = await supabase
      .from('price_list')
      .select('id, name, code, category, price, base_price_mxn, cost_price_mxn, stock_quantity')
      .eq('is_active', true)
      .order('name');

    console.log('📦 Equipos cargados:', data);
    console.log('❌ Error:', error);

    if (error) {
      console.error('Error loading equipment:', error);
      setError('Error al cargar productos de la lista de precios');
      return;
    }

    if (data) {
      // Mapear price_list a la estructura de InventoryItem
      // Usar price > base_price_mxn > cost_price_mxn (el primero que tenga valor)
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
      alarm: 'Panel de Alarma',
      panel: 'Panel',
      sensor: 'Sensor',
      keyboard: 'Teclado',
      communicator: 'Comunicador',
      camera: 'Cámara'
    };
    return labels[category.toLowerCase()] || 'Equipo';
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

    if (formData.service_type === 'installation' && !formData.equipment_to_install) {
      setError('Debe seleccionar un equipo para instalación');
      setLoading(false);
      return;
    }

    if (formData.service_type === 'installation' && formData.equipment_to_install) {
      const selectedEquipment = equipmentItems.find(item => item.id === formData.equipment_to_install);

      if (!selectedEquipment) {
        setError('Equipo seleccionado no encontrado');
        setLoading(false);
        return;
      }

      if (selectedEquipment.quantity_available === 0) {
        setError('El equipo seleccionado no tiene stock disponible. Por favor agregue stock en el módulo de Inventario.');
        setLoading(false);
        return;
      }
    }

    const technicianId = formData.technician_id || user?.id;
    if (!technicianId) {
      setError('Debe seleccionar un técnico o estar autenticado');
      setLoading(false);
      return;
    }

    try {
      const orderNumber = getNextFolioPreview();

      const orderData: any = {
        order_number: orderNumber,
        full_folio: orderNumber,  // Agregar full_folio
        folio_series_id: formData.series_id,  // Agregar folio_series_id
        customer_id: formData.customer_id,
        asset_id: formData.asset_id || null,
        technician_id: technicianId,
        description: formData.description,
        priority: formData.priority,
        service_type: formData.service_type,
        estimated_duration_minutes: formData.estimated_duration_minutes,
        notes: formData.notes || null,
        monitoring_center_folio: formData.monitoring_center_folio || null,
        scheduled_date: formData.scheduled_date || null,
        status: 'levantada'
      };

      if (formData.service_type === 'installation' && formData.equipment_to_install) {
        // Nota: equipment_installed_id referencia inventory_items, no price_list
        // Los materiales se registran en service_order_materials que sí usa price_list
        // Por ahora, guardamos el serial number en notes
        if (formData.equipment_serial_number) {
          orderData.notes = (orderData.notes || '') +
            `\nEquipo: ${equipmentItems.find(e => e.id === formData.equipment_to_install)?.name || 'N/A'}` +
            `\nNúmero de Serie: ${formData.equipment_serial_number}`;
        }
      }

      const { data: newOrder, error: insertError } = await supabase
        .from('service_orders')
        .insert([orderData] as any)
        .select()
        .single();

      if (insertError) throw insertError;

      if (formData.service_type === 'installation' && formData.equipment_to_install && newOrder) {
        const selectedEquipment = equipmentItems.find(item => item.id === formData.equipment_to_install);

        if (!selectedEquipment) {
          console.error('Equipment not found:', formData.equipment_to_install);
          throw new Error('El equipo seleccionado no existe en el inventario');
        }

        console.log('Inserting material:', {
          service_order_id: newOrder.id,
          inventory_item_id: formData.equipment_to_install,
          quantity_used: 1,
          unit_cost: selectedEquipment.unit_cost,
        });

        const { error: materialError } = await supabase
          .from('service_order_materials')
          .insert([{
            service_order_id: newOrder.id,
            inventory_item_id: formData.equipment_to_install,
            quantity_used: 1,
            unit_cost: selectedEquipment.unit_cost,
            total_cost: selectedEquipment.unit_cost,
            serial_number: formData.equipment_serial_number || null,
            installation_notes: `Equipo para instalación: ${selectedEquipment.name}`
          }] as any);

        if (materialError) {
          console.error('Material insert error:', materialError);
          throw new Error(`Error al registrar material: ${materialError.message}`);
        }

        // Actualizar stock en price_list
        const { error: inventoryError } = await supabase
          .from('price_list')
          .update({
            stock_quantity: selectedEquipment.quantity_available - 1
          } as any)
          .eq('id', formData.equipment_to_install);

        if (inventoryError) {
          console.error('Inventory update error:', inventoryError);
          throw new Error(`Error al actualizar stock: ${inventoryError.message}`);
        }

        const { error: updateOrderError } = await supabase
          .from('service_orders')
          .update({
            materials_cost: selectedEquipment.unit_cost,
            total_cost: selectedEquipment.unit_cost
          } as any)
          .eq('id', newOrder.id);

        if (updateOrderError) {
          console.error('Order update error:', updateOrderError);
          throw new Error(`Error al actualizar costos: ${updateOrderError.message}`);
        }
      }

      const selectedSeries = series.find(s => s.id === formData.series_id);
      if (selectedSeries) {
        const { error: updateError } = await supabase
          .from('folio_series')
          .update({ next_number: selectedSeries.next_number + 1 } as any)
          .eq('id', formData.series_id);

        if (updateError) throw updateError;
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la orden de servicio');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedEquipment = equipmentItems.find(item => item.id === formData.equipment_to_install);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6 rounded-t-2xl flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Nueva Orden de Servicio</h2>
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

            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6">
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
                  placeholder="Buscar cliente..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value, asset_id: '' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Seleccionar cliente</option>
                {filteredCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.address ? `- ${customer.address}` : ''}
                  </option>
                ))}
              </select>
            </div>

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
                      {asset.alarm_model} {asset.serial_number ? `(S/N: ${asset.serial_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridad
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Servicio
                </label>
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

            {formData.service_type === 'installation' && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-amber-600 rounded-lg">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Equipo a Instalar
                  </h3>
                  <span className="ml-auto px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded-full">
                    EQUIPO
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleccionar Equipo <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={formData.equipment_to_install}
                      onChange={(e) => setFormData({ ...formData, equipment_to_install: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white font-medium"
                      required={formData.service_type === 'installation'}
                    >
                      <option value="">Seleccionar equipo del inventario</option>
                      {equipmentItems.map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                          disabled={item.quantity_available === 0}
                        >
                          {item.name} - {item.sku} | Stock: {item.quantity_available} | ${item.unit_cost.toFixed(2)}
                          {item.quantity_available === 0 ? ' - SIN STOCK' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedEquipment && (
                    <>
                      <div className="bg-white border-2 border-amber-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="w-4 h-4 text-amber-700" />
                          <span className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
                            {getEquipmentCategoryLabel(selectedEquipment.category)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">SKU:</span>
                            <span className="ml-2 font-medium text-gray-900">{selectedEquipment.sku}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Stock Disponible:</span>
                            <span className={`ml-2 font-bold ${selectedEquipment.quantity_available === 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {selectedEquipment.quantity_available}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Costo:</span>
                            <span className="ml-2 font-bold text-amber-700">${selectedEquipment.unit_cost.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {selectedEquipment.quantity_available === 0 && (
                        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-red-700">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-semibold">Este producto NO tiene stock disponible</span>
                          </div>
                          <p className="text-sm text-red-600 mt-2">
                            Debes agregar stock en el módulo de Inventario antes de poder instalarlo.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                      <Hash className="w-4 h-4 text-gray-500" />
                      Número de Serie (opcional pero recomendado)
                    </label>
                    <input
                      type="text"
                      value={formData.equipment_serial_number}
                      onChange={(e) => setFormData({ ...formData, equipment_serial_number: e.target.value })}
                      placeholder="Ej: SN123456789"
                      className="w-full px-4 py-3 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                    />
                    <p className="text-xs text-amber-700 mt-2">
                      Se recomienda registrar el número de serie para seguimiento del equipo
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duración Estimada (minutos)
              </label>
              <input
                type="number"
                value={formData.estimated_duration_minutes}
                onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) })}
                min="15"
                step="15"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas Adicionales
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Notas internas, instrucciones especiales, etc."
              />
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

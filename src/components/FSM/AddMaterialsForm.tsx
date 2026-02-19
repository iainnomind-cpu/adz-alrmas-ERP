import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, Package, Loader2, Shield, Hash, FileText } from 'lucide-react';

interface AddMaterialsFormProps {
  serviceOrderId: string;
  onSuccess: () => void;
}

interface InventoryItem {
  id: string;
  name: string;
  code: string;
  category: string;
  price: number;
  base_price_mxn: number;
  stock_quantity: number;
  brand?: string;
  model?: string;
  discount_tier_1?: number;
  discount_tier_2?: number;
  discount_tier_3?: number;
  discount_tier_4?: number;
  discount_tier_5?: number;
}

interface MaterialToAdd {
  inventory_item_id: string;
  quantity: number;
  unit_cost: number;
  serial_number?: string;
  installation_notes?: string;
}

const EQUIPMENT_CATEGORIES = ['alarm', 'panel', 'sensor', 'keyboard', 'communicator', 'camera', 'dispositivo', 'device'];

const isEquipment = (category: string): boolean => {
  return EQUIPMENT_CATEGORIES.includes(category.toLowerCase());
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

export function AddMaterialsForm({ serviceOrderId, onSuccess }: AddMaterialsFormProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [materialsToAdd, setMaterialsToAdd] = useState<MaterialToAdd[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [customerTier, setCustomerTier] = useState<number>(1);
  /* eslint-disable @typescript-eslint/no-explicit-any */

  useEffect(() => {
    loadInventoryItems();
    loadCustomerTier();
  }, []);

  const loadCustomerTier = async () => {
    try {
      const { data: order } = await supabase
        .from('service_orders')
        .select('customer_id')
        .eq('id', serviceOrderId)
        .single();

      if (order?.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('pricing_tier')
          .eq('id', order.customer_id)
          .single();

        if (customer) {
          const rawTier = (customer as any).pricing_tier;
          setCustomerTier(rawTier ? parseInt(rawTier.toString()) : 1);
        }
      }
    } catch (e) {
      console.error('Error loading customer tier:', e);
    }
  };

  const loadInventoryItems = async () => {
    const { data, error } = await supabase
      .from('price_list')
      .select('id, name, code, category, price, base_price_mxn, stock_quantity, brand, model, discount_tier_1, discount_tier_2, discount_tier_3, discount_tier_4, discount_tier_5')
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('name');

    if (error) {
      console.error('Error loading inventory:', error);
    } else {
      setInventoryItems((data || []) as InventoryItem[]);
    }
  };

  const addMaterialRow = () => {
    setMaterialsToAdd([
      ...materialsToAdd,
      { inventory_item_id: '', quantity: 1, unit_cost: 0, serial_number: '', installation_notes: '' }
    ]);
  };

  const removeMaterialRow = (index: number) => {
    setMaterialsToAdd(materialsToAdd.filter((_, i) => i !== index));
  };

  const updateMaterial = (index: number, field: keyof MaterialToAdd, value: string | number) => {
    const updated = [...materialsToAdd];

    if (field === 'inventory_item_id' && typeof value === 'string') {
      const item = inventoryItems.find(i => i.id === value);
      if (item) {
        // Usar price > base_price_mxn (el primero que tenga valor)
        const basePrice = item.price || item.base_price_mxn || 0;

        // Calcular descuento según el tier del cliente
        let discountPercent = 0;
        switch (customerTier) {
          case 1: discountPercent = item.discount_tier_1 || 10; break;
          case 2: discountPercent = item.discount_tier_2 || 15; break;
          case 3: discountPercent = item.discount_tier_3 || 20; break;
          case 4: discountPercent = item.discount_tier_4 || 25; break;
          case 5: discountPercent = item.discount_tier_5 || 30; break;
          default: discountPercent = 0;
        }

        const discountedPrice = basePrice * (1 - (discountPercent / 100));

        updated[index] = {
          ...updated[index],
          inventory_item_id: value,
          unit_cost: parseFloat(discountedPrice.toFixed(2))
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }

    setMaterialsToAdd(updated);
  };

  const handleSubmit = async () => {
    if (materialsToAdd.length === 0) {
      setError('Debe agregar al menos un material');
      return;
    }

    const invalidMaterials = materialsToAdd.filter(
      m => !m.inventory_item_id || m.quantity <= 0
    );

    if (invalidMaterials.length > 0) {
      setError('Todos los materiales deben tener producto y cantidad válida');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const materialsData = materialsToAdd.map(m => {
        const item = inventoryItems.find(i => i.id === m.inventory_item_id);
        const isEquip = item ? isEquipment(item.category) : false;

        return {
          service_order_id: serviceOrderId,
          inventory_item_id: m.inventory_item_id,
          quantity_used: m.quantity,
          unit_cost: m.unit_cost,
          total_cost: m.quantity * m.unit_cost,
          serial_number: isEquip && m.serial_number ? m.serial_number : null,
          installation_notes: isEquip && m.installation_notes ? m.installation_notes : null
        };
      });

      const { error: insertError } = await supabase
        .from('service_order_materials')
        .insert(materialsData as any);

      if (insertError) throw insertError;

      for (const material of materialsToAdd) {
        const item = inventoryItems.find(i => i.id === material.inventory_item_id);
        if (item) {
          await supabase
            .from('price_list')
            .update({
              stock_quantity: item.stock_quantity - material.quantity
            })
            .eq('id', material.inventory_item_id);
        }
      }

      const totalMaterialsCost = materialsToAdd.reduce((sum, m) => sum + (m.quantity * m.unit_cost), 0);

      const { data: currentOrder } = await supabase
        .from('service_orders')
        .select('labor_cost, materials_cost')
        .eq('id', serviceOrderId)
        .maybeSingle();

      const laborCost = (currentOrder as any)?.labor_cost || 0;
      const existingMaterialsCost = (currentOrder as any)?.materials_cost || 0;
      const newMaterialsCost = existingMaterialsCost + totalMaterialsCost;

      await supabase
        .from('service_orders')
        .update({
          materials_cost: newMaterialsCost,
          total_cost: laborCost + newMaterialsCost
        } as any)
        .eq('id', serviceOrderId);

      // Log activity to history
      await supabase.from('service_order_status_history').insert([{
        service_order_id: serviceOrderId,
        previous_status: 'activity',
        new_status: 'material_added',
        reason: `Se agregaron ${materialsToAdd.length} material(es)`
      }]);

      setMaterialsToAdd([]);
      setShowForm(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar materiales');
    } finally {
      setLoading(false);
    }
  };

  const getTotalCost = () => {
    return materialsToAdd.reduce((sum, m) => sum + (m.quantity * m.unit_cost), 0);
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
      >
        <Plus className="w-5 h-5" />
        Agregar Materiales
      </button>
    );
  }

  return (
    <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          Agregar Materiales de Inventario
        </h3>
        <button
          onClick={() => {
            setShowForm(false);
            setMaterialsToAdd([]);
            setError('');
          }}
          className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3 mb-4">
        {materialsToAdd.map((material, index) => {
          const selectedItem = inventoryItems.find(i => i.id === material.inventory_item_id);
          const itemIsEquipment = selectedItem ? isEquipment(selectedItem.category) : false;

          return (
            <div
              key={index}
              className={`rounded-lg p-4 border-2 ${itemIsEquipment
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'
                : 'bg-white border-gray-200'
                }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Producto
                  </label>
                  <select
                    value={material.inventory_item_id}
                    onChange={(e) => updateMaterial(index, 'inventory_item_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Seleccionar producto</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - {item.code} (Stock: {item.stock_quantity})
                        {isEquipment(item.category) ? ' [EQUIPO]' : ''}
                      </option>
                    ))}
                  </select>
                  {itemIsEquipment && selectedItem && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        <Shield className="w-3.5 h-3.5" />
                        {getEquipmentCategoryLabel(selectedItem.category)}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedItem?.stock_quantity || 999}
                    value={material.quantity}
                    onChange={(e) => updateMaterial(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Costo Unit.
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={material.unit_cost}
                      onChange={(e) => updateMaterial(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <button
                    onClick={() => removeMaterialRow(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {itemIsEquipment && (
                <div className="mt-4 pt-4 border-t border-amber-200 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
                      Datos de Instalación de Equipo
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-gray-500" />
                        Número de Serie (opcional)
                      </label>
                      <input
                        type="text"
                        value={material.serial_number || ''}
                        onChange={(e) => updateMaterial(index, 'serial_number', e.target.value)}
                        placeholder="Ej: SN123456789"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-gray-500" />
                        Notas de Instalación (opcional)
                      </label>
                      <input
                        type="text"
                        value={material.installation_notes || ''}
                        onChange={(e) => updateMaterial(index, 'installation_notes', e.target.value)}
                        placeholder="Ubicación, configuración, etc."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedItem && (
                <div className="mt-3 text-sm text-gray-700 font-medium">
                  <span>Total: </span>
                  <span className={itemIsEquipment ? 'text-amber-700' : 'text-gray-900'}>
                    ${(material.quantity * material.unit_cost).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={addMaterialRow}
        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 mb-4"
      >
        <Plus className="w-5 h-5" />
        Agregar otro material
      </button>

      {materialsToAdd.length > 0 && (
        <div className="bg-white rounded-lg p-4 border-2 border-blue-300 mb-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-900">Costo Total de Materiales:</span>
            <span className="text-2xl font-bold text-blue-600">${getTotalCost().toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => {
            setShowForm(false);
            setMaterialsToAdd([]);
            setError('');
          }}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || materialsToAdd.length === 0}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Package className="w-5 h-5" />
              Guardar Materiales
            </>
          )}
        </button>
      </div>
    </div>
  );
}

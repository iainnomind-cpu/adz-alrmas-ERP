import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, Loader2, Package, DollarSign, Percent, Tag, ShoppingCart } from 'lucide-react';

interface NewProductFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

type CurrencyType = 'USD' | 'MXN';

// Niveles de descuento consistentes con NewCustomerForm.tsx
const DISCOUNT_TIERS = [
  { level: 1, label: 'Nivel 1 – Estándar', percentage: 10 },
  { level: 2, label: 'Nivel 2 – Cliente Frecuente', percentage: 15 },
  { level: 3, label: 'Nivel 3 – Instalador', percentage: 20 },
  { level: 4, label: 'Nivel 4 – Distribuidor', percentage: 25 },
  { level: 5, label: 'Nivel 5 – Mayorista', percentage: 30 },
];

export function NewProductForm({ onClose, onSuccess }: NewProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Campos de pricing helpers (solo UI)
  const [currency, setCurrency] = useState<CurrencyType>('USD');
  const [supplierListPrice, setSupplierListPrice] = useState('');
  const [supplierDiscountPct, setSupplierDiscountPct] = useState('0');
  const [exchangeRate, setExchangeRate] = useState('21.00');
  const [costPriceMxnDirect, setCostPriceMxnDirect] = useState('');

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    brand: '',
    model: '',
    unit_of_measure: 'piece',
    unit_cost: 0,
    selling_price: 0,
    min_stock_level: 10,
    max_stock_level: 100,
    reorder_point: 20,
    reorder_quantity: 50,
    primary_supplier_id: '',
    is_serialized: false,
    is_active: true,
    initial_quantity: 0
  });

  useEffect(() => {
    loadCategoriesAndSuppliers();
  }, []);

  const loadCategoriesAndSuppliers = async () => {
    const [categoriesData, suppliersData] = await Promise.all([
      supabase.from('inventory_categories').select('id, name').eq('is_active', true).order('name'),
      supabase.from('inventory_suppliers').select('id, name').eq('is_active', true).order('name')
    ]);

    if (categoriesData.data) setCategories(categoriesData.data);
    if (suppliersData.data) setSuppliers(suppliersData.data);
  };

  const generateSKU = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `SKU-${timestamp}-${random}`;
  };

  // --- Cálculos de precio ---
  const calculatedCostUSD = useMemo(() => {
    if (currency !== 'USD') return 0;
    const listPrice = parseFloat(supplierListPrice) || 0;
    const discount = parseFloat(supplierDiscountPct) || 0;
    return listPrice * (1 - discount / 100);
  }, [currency, supplierListPrice, supplierDiscountPct]);

  const calculatedCostMXN = useMemo(() => {
    if (currency === 'USD') {
      const rate = parseFloat(exchangeRate) || 21;
      return calculatedCostUSD * rate;
    } else {
      return parseFloat(costPriceMxnDirect) || 0;
    }
  }, [currency, calculatedCostUSD, exchangeRate, costPriceMxnDirect]);

  // Sincronizar unit_cost con el cálculo
  useEffect(() => {
    setFormData(prev => ({ ...prev, unit_cost: Math.round(calculatedCostMXN * 100) / 100 }));
  }, [calculatedCostMXN]);

  const formatMXN = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.sku || !formData.name) {
      setError('SKU y nombre son obligatorios');
      setLoading(false);
      return;
    }

    if (formData.selling_price <= 0) {
      setError('El precio de venta al público es obligatorio');
      setLoading(false);
      return;
    }

    try {
      const { data: product, error: productError } = await supabase
        .from('inventory_products')
        .insert([{
          sku: formData.sku,
          name: formData.name,
          description: formData.description || null,
          category_id: formData.category_id || null,
          brand: formData.brand || null,
          model: formData.model || null,
          unit_of_measure: formData.unit_of_measure,
          unit_cost: formData.unit_cost,
          selling_price: formData.selling_price,
          min_stock_level: formData.min_stock_level,
          max_stock_level: formData.max_stock_level,
          reorder_point: formData.reorder_point,
          reorder_quantity: formData.reorder_quantity,
          primary_supplier_id: formData.primary_supplier_id || null,
          is_serialized: formData.is_serialized,
          is_active: formData.is_active
        }])
        .select()
        .single();

      if (productError) throw productError;

      if (formData.initial_quantity > 0 && product) {
        const { error: transactionError } = await supabase
          .from('inventory_transactions')
          .insert([{
            product_id: product.id,
            transaction_type: 'adjustment_in',
            quantity: formData.initial_quantity,
            unit_cost: formData.unit_cost,
            total_cost: formData.initial_quantity * formData.unit_cost,
            notes: 'Stock inicial del producto'
          }]);

        if (transactionError) throw transactionError;
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Margen de ganancia
  const profitMargin = useMemo(() => {
    if (calculatedCostMXN <= 0 || formData.selling_price <= 0) return 0;
    return ((formData.selling_price - calculatedCostMXN) / calculatedCostMXN) * 100;
  }, [calculatedCostMXN, formData.selling_price]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-start justify-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Nuevo Producto</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* SECCIÓN 1: Información Básica */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 border-b pb-2">
                <Tag className="w-5 h-5 text-blue-600" />
                Información Básica
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => handleChange('sku', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="SKU-123456-001"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleChange('sku', generateSKU())}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      Generar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Producto <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Sensor de movimiento PIR"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descripción detallada del producto..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => handleChange('category_id', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor Principal</label>
                  <select
                    value={formData.primary_supplier_id}
                    onChange={(e) => handleChange('primary_supplier_id', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Marca</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Honeywell"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: PIR-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unidad de Medida</label>
                  <select
                    value={formData.unit_of_measure}
                    onChange={(e) => handleChange('unit_of_measure', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="piece">Pieza</option>
                    <option value="box">Caja</option>
                    <option value="meter">Metro</option>
                    <option value="roll">Rollo</option>
                    <option value="kit">Kit</option>
                    <option value="pack">Paquete</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stock Inicial</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.initial_quantity}
                    onChange={(e) => handleChange('initial_quantity', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: Precios */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 border-b pb-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Precios
              </div>

              {/* Selector de moneda */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="currency"
                    value="USD"
                    checked={currency === 'USD'}
                    onChange={() => setCurrency('USD')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="flex items-center gap-1">
                    <span className="text-lg">💵</span>
                    <span className="font-medium">USD (Dólares)</span>
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="currency"
                    value="MXN"
                    checked={currency === 'MXN'}
                    onChange={() => setCurrency('MXN')}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="flex items-center gap-1">
                    <span className="text-lg">🇲🇽</span>
                    <span className="font-medium">MXN (Pesos)</span>
                  </span>
                </label>
              </div>

              {/* Campos USD */}
              {currency === 'USD' && (
                <div className="bg-blue-50 rounded-lg p-4 space-y-4 border border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Precio Lista Proveedor (USD) <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={supplierListPrice}
                          onChange={(e) => setSupplierListPrice(e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descuento Proveedor (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={supplierDiscountPct}
                          onChange={(e) => setSupplierDiscountPct(e.target.value)}
                          className="w-full pr-8 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Precio Costo USD (calculado)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="text"
                          value={calculatedCostUSD.toFixed(2)}
                          readOnly
                          className="w-full pl-8 pr-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Cambio</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          value={exchangeRate}
                          onChange={(e) => setExchangeRate(e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Default: $21.00 MXN por USD</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Precio Costo MXN (calculado)</label>
                      <div className="bg-green-100 border-2 border-green-400 rounded-lg p-3 text-center">
                        <span className="text-2xl font-bold text-green-700">
                          {formatMXN(calculatedCostMXN)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Campos MXN */}
              {currency === 'MXN' && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Precio Costo MXN <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={costPriceMxnDirect}
                          onChange={(e) => setCostPriceMxnDirect(e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Precio Costo MXN</label>
                      <div className="bg-green-100 border-2 border-green-400 rounded-lg p-3 text-center">
                        <span className="text-2xl font-bold text-green-700">
                          {formatMXN(calculatedCostMXN)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Precio de Venta al Público */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border-2 border-emerald-300">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-semibold text-gray-900">Precio de Venta al Público (MXN)</h4>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Este es el precio que se asignará a los equipos al momento de instalarlos.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio de Venta <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.selling_price || ''}
                        onChange={(e) => handleChange('selling_price', parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-4 py-3 border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg font-semibold"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    {calculatedCostMXN > 0 && formData.selling_price > 0 && (
                      <div className={`rounded-lg p-3 text-center ${profitMargin > 0
                        ? 'bg-emerald-100 border border-emerald-300'
                        : 'bg-red-100 border border-red-300'
                        }`}>
                        <p className="text-xs text-gray-600 mb-1">Margen de Ganancia</p>
                        <p className={`text-xl font-bold ${profitMargin > 0 ? 'text-emerald-700' : 'text-red-700'
                          }`}>
                          {profitMargin.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">
                          Ganancia: {formatMXN(formData.selling_price - calculatedCostMXN)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: Niveles de Descuento para Clientes */}
            {formData.selling_price > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 border-b pb-2">
                  <Percent className="w-5 h-5 text-blue-600" />
                  Niveles de Descuento para Clientes
                </div>
                <p className="text-sm text-gray-500">
                  Precios automáticos según el nivel de descuento asignado a cada cliente.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {DISCOUNT_TIERS.map((tier) => {
                    const discountedPrice = formData.selling_price * (1 - tier.percentage / 100);
                    const savings = formData.selling_price - discountedPrice;
                    return (
                      <div
                        key={tier.level}
                        className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                      >
                        <div className="text-xs font-medium text-gray-500 mb-1">{tier.label}</div>
                        <div className="text-lg font-bold text-blue-600 mb-1">{tier.percentage}% desc.</div>
                        <div className="text-base font-semibold text-gray-900">
                          {formatMXN(discountedPrice)}
                        </div>
                        <div className="text-xs text-orange-600 mt-1">
                          Ahorro: {formatMXN(savings)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECCIÓN 4: Configuración de Inventario */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-4">Configuración de Inventario</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stock Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_stock_level}
                    onChange={(e) => handleChange('min_stock_level', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stock Máximo</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_stock_level}
                    onChange={(e) => handleChange('max_stock_level', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Punto de Reorden</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorder_point}
                    onChange={(e) => handleChange('reorder_point', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad de Reorden</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorder_quantity}
                    onChange={(e) => handleChange('reorder_quantity', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Opciones */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_serialized}
                  onChange={(e) => handleChange('is_serialized', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Producto serializado</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Producto activo</span>
              </label>
            </div>

            {/* Botones */}
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
                    Guardar Producto
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

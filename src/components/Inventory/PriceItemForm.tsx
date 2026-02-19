import { useState, useEffect, useMemo } from 'react';
import { supabase, type PriceListItem } from '../../lib/supabase';
import {
    X, Save, Loader2, AlertCircle, Package, DollarSign,
    Percent, Tag, Battery, Wifi, ClipboardList, Info, ShoppingCart
} from 'lucide-react';

interface PriceItemFormProps {
    item?: PriceListItem | null;
    onClose: () => void;
    onSuccess: () => void;
}

type CategoryType = 'dispositivo' | 'sensor' | 'accesorio' | 'material' | 'servicio' | 'mano_obra';
type TechnologyType = 'cableado' | 'inalambrico' | 'dual' | 'n/a';
type BatteryType = 'recargable' | 'litio' | 'alkalina' | 'n/a';
type CurrencyType = 'USD' | 'MXN';

interface FormData {
    code: string;
    name: string;
    description: string;
    brand: string;
    model: string;
    category: CategoryType;
    technology: TechnologyType;
    battery_type: BatteryType;
    currency: CurrencyType;
    supplier_list_price: string;
    supplier_discount_percentage: string;
    cost_price_usd: string;
    cost_price_mxn: string;
    exchange_rate: string;
    selling_price: string;
    discount_tier_1: number;
    discount_tier_2: number;
    discount_tier_3: number;
    discount_tier_4: number;
    discount_tier_5: number;
    stock_quantity: string;
    min_stock_level: string;
    supplier_notes: string;
    internal_notes: string;
    is_active: boolean;
}

const CATEGORY_LABELS: Record<CategoryType, string> = {
    dispositivo: 'Dispositivo',
    sensor: 'Sensor',
    accesorio: 'Accesorio',
    material: 'Material',
    servicio: 'Servicio',
    mano_obra: 'Mano de Obra'
};

const TECHNOLOGY_LABELS: Record<TechnologyType, string> = {
    cableado: 'Cableado',
    inalambrico: 'Inalámbrico',
    dual: 'Dual',
    'n/a': 'No Aplica'
};

const BATTERY_LABELS: Record<BatteryType, string> = {
    recargable: 'Recargable',
    litio: 'Litio',
    alkalina: 'Alkalina',
    'n/a': 'No Aplica'
};

export function PriceItemForm({ item, onClose, onSuccess }: PriceItemFormProps) {
    const isEditing = !!item;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState<FormData>({
        code: item?.code || '',
        name: item?.name || '',
        description: item?.description || '',
        brand: item?.brand || '',
        model: item?.model || '',
        category: item?.category || 'dispositivo',
        technology: item?.technology || 'n/a',
        battery_type: item?.battery_type || 'n/a',
        currency: item?.currency || 'USD',
        supplier_list_price: item?.supplier_list_price?.toString() || '',
        supplier_discount_percentage: item?.supplier_discount_percentage?.toString() || '0',
        cost_price_usd: item?.cost_price_usd?.toString() || '',
        cost_price_mxn: item?.cost_price_mxn?.toString() || '',
        exchange_rate: item?.exchange_rate?.toString() || '21.00',
        selling_price: item?.base_price_mxn?.toString() || '',
        discount_tier_1: item?.discount_tier_1 || 10,
        discount_tier_2: item?.discount_tier_2 || 15,
        discount_tier_3: item?.discount_tier_3 || 20,
        discount_tier_4: item?.discount_tier_4 || 25,
        discount_tier_5: item?.discount_tier_5 || 30,
        stock_quantity: item?.stock_quantity?.toString() || '0',
        min_stock_level: item?.min_stock_level?.toString() || '5',
        supplier_notes: item?.supplier_notes || '',
        internal_notes: item?.internal_notes || '',
        is_active: item?.is_active ?? true
    });

    // Mostrar campos técnicos solo para dispositivos y sensores
    const showTechnicalFields = ['dispositivo', 'sensor'].includes(formData.category);

    // Mostrar campos de stock solo para items físicos
    const showStockFields = ['dispositivo', 'sensor', 'accesorio', 'material'].includes(formData.category);

    // Calcular precio costo USD automáticamente
    const calculatedCostUSD = useMemo(() => {
        if (formData.currency !== 'USD') return null;
        const listPrice = parseFloat(formData.supplier_list_price) || 0;
        const discount = parseFloat(formData.supplier_discount_percentage) || 0;
        return listPrice * (1 - discount / 100);
    }, [formData.currency, formData.supplier_list_price, formData.supplier_discount_percentage]);

    // Calcular precio base MXN
    const calculatedBaseMXN = useMemo(() => {
        if (formData.currency === 'USD') {
            const costUSD = calculatedCostUSD || 0;
            const exchangeRate = parseFloat(formData.exchange_rate) || 21;
            return costUSD * exchangeRate;
        } else {
            return parseFloat(formData.cost_price_mxn) || 0;
        }
    }, [formData.currency, calculatedCostUSD, formData.exchange_rate, formData.cost_price_mxn]);

    // Precio de venta al público
    const sellingPrice = useMemo(() => {
        return parseFloat(formData.selling_price) || 0;
    }, [formData.selling_price]);

    // Margen de ganancia
    const profitMargin = useMemo(() => {
        if (calculatedBaseMXN <= 0 || sellingPrice <= 0) return 0;
        return ((sellingPrice - calculatedBaseMXN) / calculatedBaseMXN) * 100;
    }, [calculatedBaseMXN, sellingPrice]);

    // Actualizar cost_price_usd cuando cambia el cálculo
    useEffect(() => {
        if (formData.currency === 'USD' && calculatedCostUSD !== null) {
            setFormData(prev => ({
                ...prev,
                cost_price_usd: calculatedCostUSD.toFixed(2)
            }));
        }
    }, [calculatedCostUSD, formData.currency]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const validateForm = (): string | null => {
        if (!formData.code.trim()) return 'El código es obligatorio';
        if (!formData.name.trim()) return 'El nombre es obligatorio';

        if (formData.currency === 'USD') {
            if (!formData.supplier_list_price || parseFloat(formData.supplier_list_price) <= 0) {
                return 'El precio de lista del proveedor es obligatorio para productos en USD';
            }
        } else {
            if (!formData.cost_price_mxn || parseFloat(formData.cost_price_mxn) <= 0) {
                return 'El precio costo MXN es obligatorio';
            }
        }

        const discounts = [
            formData.discount_tier_1,
            formData.discount_tier_2,
            formData.discount_tier_3,
            formData.discount_tier_4,
            formData.discount_tier_5
        ];

        for (const d of discounts) {
            if (d < 0 || d > 30) {
                return 'Los descuentos deben estar entre 0% y 30%';
            }
        }

        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            setLoading(false);
            return;
        }

        try {
            // Verificar código único si es nuevo o cambió
            if (!isEditing || (isEditing && formData.code !== item?.code)) {
                const { data: existing } = await supabase
                    .from('price_list')
                    .select('code')
                    .eq('code', formData.code.toUpperCase())
                    .maybeSingle();

                if (existing) {
                    setError('Ya existe un producto con este código');
                    setLoading(false);
                    return;
                }
            }

            const dataToSave = {
                code: formData.code.toUpperCase(),
                name: formData.name,
                description: formData.description || null,
                brand: formData.brand || null,
                model: formData.model || null,
                category: formData.category,
                currency: formData.currency,
                supplier_list_price: formData.supplier_list_price ? parseFloat(formData.supplier_list_price) : null,
                supplier_discount_percentage: parseFloat(formData.supplier_discount_percentage) || 0,
                exchange_rate: parseFloat(formData.exchange_rate) || 21,
                base_price_mxn: sellingPrice > 0 ? sellingPrice : calculatedBaseMXN,
                stock_quantity: showStockFields ? parseInt(formData.stock_quantity) || 0 : 0,
                min_stock_level: showStockFields ? parseInt(formData.min_stock_level) || 5 : 0,
                is_active: formData.is_active
            };

            if (isEditing && item) {
                const { error: updateError } = await supabase
                    .from('price_list')
                    .update(dataToSave as any)
                    .eq('id', item.id);

                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('price_list')
                    .insert([dataToSave] as any);

                if (insertError) throw insertError;
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error saving price item:', err);
            setError(err instanceof Error ? err.message : 'Error al guardar el producto');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
            <div className="min-h-screen px-4 py-8 flex items-start justify-center">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6 rounded-t-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">
                                {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
                            </h2>
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
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {/* SECCIÓN 1: Información Básica */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 border-b pb-2">
                                <Tag className="w-5 h-5 text-blue-600" />
                                Información Básica
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Código <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                                        placeholder="SENS-001"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nombre <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Sensor de movimiento"
                                        required
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Descripción
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        rows={2}
                                        placeholder="Descripción detallada del producto..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Marca
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.brand}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Ej: Honeywell"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Modelo
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.model}
                                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Ej: 5800PIR"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Categoría <span className="text-red-600">*</span>
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value as CategoryType })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 2: Clasificación Técnica (solo dispositivos/sensores) */}
                        {showTechnicalFields && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 border-b pb-2">
                                    <Wifi className="w-5 h-5 text-blue-600" />
                                    Clasificación Técnica
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tecnología
                                        </label>
                                        <select
                                            value={formData.technology}
                                            onChange={(e) => setFormData({ ...formData, technology: e.target.value as TechnologyType })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            {Object.entries(TECHNOLOGY_LABELS).map(([value, label]) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                            <Battery className="w-4 h-4" />
                                            Tipo de Batería
                                        </label>
                                        <select
                                            value={formData.battery_type}
                                            onChange={(e) => setFormData({ ...formData, battery_type: e.target.value as BatteryType })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            {Object.entries(BATTERY_LABELS).map(([value, label]) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN 3: Precios */}
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
                                        checked={formData.currency === 'USD'}
                                        onChange={() => setFormData({ ...formData, currency: 'USD' })}
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
                                        checked={formData.currency === 'MXN'}
                                        onChange={() => setFormData({ ...formData, currency: 'MXN' })}
                                        className="w-4 h-4 text-green-600"
                                    />
                                    <span className="flex items-center gap-1">
                                        <span className="text-lg">🇲🇽</span>
                                        <span className="font-medium">MXN (Pesos)</span>
                                    </span>
                                </label>
                            </div>

                            {/* Campos de precio USD */}
                            {formData.currency === 'USD' && (
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
                                                    value={formData.supplier_list_price}
                                                    onChange={(e) => setFormData({ ...formData, supplier_list_price: e.target.value })}
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
                                                    value={formData.supplier_discount_percentage}
                                                    onChange={(e) => setFormData({ ...formData, supplier_discount_percentage: e.target.value })}
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
                                                    value={calculatedCostUSD?.toFixed(2) || '0.00'}
                                                    readOnly
                                                    className="w-full pl-8 pr-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Tipo de Cambio
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="1"
                                                    value={formData.exchange_rate}
                                                    onChange={(e) => setFormData({ ...formData, exchange_rate: e.target.value })}
                                                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Default: $21.00 MXN por USD</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Precio Base MXN (calculado)
                                            </label>
                                            <div className="bg-green-100 border-2 border-green-400 rounded-lg p-3 text-center">
                                                <span className="text-2xl font-bold text-green-700">
                                                    {formatCurrency(calculatedBaseMXN)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Campos de precio MXN */}
                            {formData.currency === 'MXN' && (
                                <div className="bg-green-50 rounded-lg p-4 space-y-4 border border-green-200">
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
                                                    value={formData.cost_price_mxn}
                                                    onChange={(e) => setFormData({ ...formData, cost_price_mxn: e.target.value })}
                                                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Precio Base MXN
                                            </label>
                                            <div className="bg-green-100 border-2 border-green-400 rounded-lg p-3 text-center">
                                                <span className="text-2xl font-bold text-green-700">
                                                    {formatCurrency(calculatedBaseMXN)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SECCIÓN: Precio de Venta al Público */}
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
                                            value={formData.selling_price}
                                            onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                                            className="w-full pl-8 pr-4 py-3 border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg font-semibold"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    {calculatedBaseMXN > 0 && sellingPrice > 0 && (
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
                                                Ganancia: {formatCurrency(sellingPrice - calculatedBaseMXN)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 4: Niveles de Descuento */}
                        {sellingPrice > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 border-b pb-2">
                                    <Percent className="w-5 h-5 text-blue-600" />
                                    Niveles de Descuento para Clientes
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    {[1, 2, 3, 4, 5].map((tier) => {
                                        const key = `discount_tier_${tier}` as keyof FormData;
                                        const value = formData[key] as number;
                                        const price = sellingPrice * (1 - value / 100);

                                        return (
                                            <div key={tier} className="bg-gray-50 rounded-lg p-4 text-center">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Nivel {tier}
                                                </label>
                                                <div className="relative mb-2">
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="30"
                                                        value={value}
                                                        onChange={(e) => setFormData({ ...formData, [key]: parseInt(e.target.value) })}
                                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                    />
                                                </div>
                                                <div className="text-lg font-bold text-blue-600">{value}%</div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    {formatCurrency(price)}
                                                </div>
                                                {calculatedBaseMXN > 0 && (
                                                    <>
                                                        <div className={`text-xs mt-1 ${price > calculatedBaseMXN ? 'text-emerald-600' : 'text-red-500'
                                                            }`}>
                                                            Margen: {((price - calculatedBaseMXN) / calculatedBaseMXN * 100).toFixed(1)}%
                                                        </div>
                                                        <div className={`text-xs ${price > calculatedBaseMXN ? 'text-emerald-500' : 'text-red-400'
                                                            }`}>
                                                            Ganancia: {formatCurrency(price - calculatedBaseMXN)}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN 5: Inventario */}
                        {showStockFields && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 border-b pb-2">
                                    <Package className="w-5 h-5 text-blue-600" />
                                    Inventario
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Stock Actual
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.stock_quantity}
                                            onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Stock Mínimo
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.min_stock_level}
                                            onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                            Es Kit
                                            <span className="group relative">
                                                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                                <span className="hidden group-hover:block absolute left-0 top-full mt-1 bg-gray-800 text-white text-xs rounded px-2 py-1 w-48 z-10">
                                                    Los kits no están permitidos en este sistema. Solo se pueden registrar componentes individuales.
                                                </span>
                                            </span>
                                        </label>
                                        <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500">
                                            <input
                                                type="checkbox"
                                                checked={false}
                                                disabled
                                                className="mr-2"
                                            />
                                            No (kits no permitidos)
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN 6: Notas */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 border-b pb-2">
                                <ClipboardList className="w-5 h-5 text-blue-600" />
                                Notas
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Notas del Proveedor
                                    </label>
                                    <textarea
                                        value={formData.supplier_notes}
                                        onChange={(e) => setFormData({ ...formData, supplier_notes: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        rows={3}
                                        placeholder="Información del proveedor, tiempos de entrega, etc."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Notas Internas
                                    </label>
                                    <textarea
                                        value={formData.internal_notes}
                                        onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        rows={3}
                                        placeholder="Notas para uso interno..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Estado activo */}
                        <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <label className="text-sm font-medium text-gray-700">
                                Producto activo (visible en lista de precios)
                            </label>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-4 justify-end pt-6 border-t border-gray-200 sticky bottom-0 bg-white pb-4">
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
                                        {isEditing ? 'Guardar Cambios' : 'Crear Producto'}
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

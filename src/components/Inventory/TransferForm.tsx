import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine, Settings2, Loader2, Search } from 'lucide-react';

interface Location {
    id: string;
    name: string;
    type: string;
}

interface TransferFormProps {
    locations: Location[];
    onClose: () => void;
    onSuccess: () => void;
}

type MovementType = 'transfer' | 'field_usage' | 'return' | 'adjustment_in' | 'adjustment_out';

interface ProductOption {
    id: string;
    code: string;
    name: string;
    brand: string | null;
}

export function TransferForm({ locations, onClose, onSuccess }: TransferFormProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [availableStock, setAvailableStock] = useState<number | null>(null);

    const [form, setForm] = useState({
        movement_type: 'transfer' as MovementType,
        product_id: '',
        product_label: '',
        quantity: 1,
        from_location_id: '',
        to_location_id: '',
        notes: '',
        service_order_id: '',
    });

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        if (form.product_id && form.from_location_id) {
            loadAvailableStock();
        } else {
            setAvailableStock(null);
        }
    }, [form.product_id, form.from_location_id]);

    const loadProducts = async () => {
        const { data } = await (supabase.from('price_list') as any)
            .select('id, code, name, brand')
            .eq('is_active', true)
            .order('name');
        setProducts(data || []);
    };

    const loadAvailableStock = async () => {
        const { data } = await (supabase.from('inventory_location_stock') as any)
            .select('quantity')
            .eq('product_id', form.product_id)
            .eq('location_id', form.from_location_id)
            .single();
        setAvailableStock(data?.quantity ?? 0);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(productSearch.toLowerCase()))
    );

    const movementTypes = [
        { value: 'transfer', label: 'Transferencia', icon: ArrowRightLeft, desc: 'Mover de una ubicación a otra', color: 'blue' },
        { value: 'field_usage', label: 'Uso en Campo', icon: ArrowDownToLine, desc: 'Material usado en un cliente', color: 'red' },
        { value: 'return', label: 'Devolución', icon: ArrowUpFromLine, desc: 'Regresar material sobrante', color: 'green' },
        { value: 'adjustment_in', label: 'Ajuste Entrada', icon: Settings2, desc: 'Corrección: agregar stock', color: 'purple' },
        { value: 'adjustment_out', label: 'Ajuste Salida', icon: Settings2, desc: 'Corrección: quitar stock', color: 'orange' },
    ];

    const needsFrom = ['transfer', 'field_usage', 'return', 'adjustment_out'].includes(form.movement_type);
    const needsTo = ['transfer', 'return', 'adjustment_in'].includes(form.movement_type);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.product_id) {
            setError('Selecciona un producto');
            return;
        }
        if (form.quantity <= 0) {
            setError('La cantidad debe ser mayor a 0');
            return;
        }
        if (needsFrom && !form.from_location_id) {
            setError('Selecciona la ubicación de origen');
            return;
        }
        if (needsTo && !form.to_location_id) {
            setError('Selecciona la ubicación de destino');
            return;
        }
        if (needsFrom && needsTo && form.from_location_id === form.to_location_id) {
            setError('El origen y destino no pueden ser iguales');
            return;
        }
        if (availableStock !== null && needsFrom && form.quantity > availableStock) {
            setError(`Stock insuficiente. Disponible en origen: ${availableStock}`);
            return;
        }

        setLoading(true);
        try {
            // Map movement type to transaction_type
            let transactionType: string = form.movement_type;
            if (form.movement_type === 'field_usage') transactionType = 'usage';

            const { error: insertError } = await (supabase.from('inventory_transactions') as any)
                .insert({
                    product_id: form.product_id,
                    transaction_type: transactionType,
                    quantity: form.quantity,
                    unit_cost: 0,
                    total_cost: 0,
                    from_location_id: needsFrom ? form.from_location_id : null,
                    to_location_id: needsTo ? form.to_location_id : null,
                    performed_by: user?.id || null,
                    service_order_id: form.service_order_id || null,
                    notes: form.notes || null,
                    created_by: user?.id || null,
                });

            if (insertError) {
                console.error('Error registering movement:', insertError);
                throw new Error(insertError.message);
            }

            setSuccess('Movimiento registrado correctamente');
            setTimeout(() => onSuccess(), 600);
        } catch (err: any) {
            setError(err.message || 'Error al registrar el movimiento');
        } finally {
            setLoading(false);
        }
    };

    const getLocationIcon = (type: string) => {
        switch (type) {
            case 'warehouse': return '🏭';
            case 'vehicle': return '🚐';
            case 'partner': return '🤝';
            case 'personal': return '👤';
            default: return '📍';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
            <div className="min-h-screen px-4 py-8 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6 rounded-t-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <ArrowRightLeft className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Registrar Movimiento</h2>
                                <p className="text-white/80 text-sm">Transferencia, uso o devolución de material</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <X className="w-6 h-6 text-white" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
                        )}
                        {success && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>
                        )}

                        {/* Movement type selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Movimiento</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {movementTypes.map(mt => {
                                    const Icon = mt.icon;
                                    const selected = form.movement_type === mt.value;
                                    return (
                                        <button
                                            key={mt.value}
                                            type="button"
                                            onClick={() => setForm({ ...form, movement_type: mt.value as MovementType, from_location_id: '', to_location_id: '' })}
                                            className={`p-3 rounded-xl border-2 text-left transition-all ${selected
                                                ? `border-${mt.color}-500 bg-${mt.color}-50`
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <Icon className={`w-5 h-5 mb-1 ${selected ? `text-${mt.color}-600` : 'text-gray-400'}`} />
                                            <p className={`text-xs font-medium ${selected ? 'text-gray-900' : 'text-gray-600'}`}>{mt.label}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Product selector */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Producto <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={form.product_label || productSearch}
                                    onChange={(e) => {
                                        setProductSearch(e.target.value);
                                        setForm({ ...form, product_id: '', product_label: '' });
                                        setShowProductDropdown(true);
                                    }}
                                    onFocus={() => setShowProductDropdown(true)}
                                    placeholder="Buscar producto..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            {showProductDropdown && filteredProducts.length > 0 && !form.product_id && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {filteredProducts.slice(0, 20).map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                                setForm({ ...form, product_id: p.id, product_label: `${p.code} — ${p.name}` });
                                                setProductSearch('');
                                                setShowProductDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm transition-colors"
                                        >
                                            <span className="font-medium text-gray-900">{p.name}</span>
                                            <span className="text-gray-500 ml-2">{p.code}{p.brand ? ` • ${p.brand}` : ''}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cantidad <span className="text-red-500">*</span>
                                {availableStock !== null && needsFrom && (
                                    <span className="text-gray-400 ml-2 font-normal">(Disponible en origen: {availableStock})</span>
                                )}
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={availableStock !== null && needsFrom ? availableStock : undefined}
                                value={form.quantity}
                                onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* From / To locations */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {needsFrom && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Origen <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.from_location_id}
                                        onChange={(e) => setForm({ ...form, from_location_id: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="">Seleccionar...</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>
                                                {getLocationIcon(loc.type)} {loc.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {needsTo && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Destino <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.to_location_id}
                                        onChange={(e) => setForm({ ...form, to_location_id: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="">Seleccionar...</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>
                                                {getLocationIcon(loc.type)} {loc.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
                            <textarea
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                placeholder="Ej: Material para orden #1234, sobrante del servicio..."
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</>
                                ) : (
                                    <><ArrowRightLeft className="w-4 h-4" /> Registrar Movimiento</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Plus, Trash2, Loader2, ClipboardList, Search } from 'lucide-react';

interface Location {
    id: string;
    name: string;
    type: string;
}

interface ProductOption {
    id: string;
    code: string;
    name: string;
    brand: string | null;
}

interface RequestItem {
    product_id: string;
    product_label: string;
    quantity: number;
}

interface MaterialRequestFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function MaterialRequestForm({ onClose, onSuccess }: MaterialRequestFormProps) {
    const { user } = useAuth();
    const [locations, setLocations] = useState<Location[]>([]);
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [fromLocationId, setFromLocationId] = useState('');
    const [toLocationId, setToLocationId] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<RequestItem[]>([{ product_id: '', product_label: '', quantity: 1 }]);

    // Product search per item
    const [activeSearch, setActiveSearch] = useState<number | null>(null);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [locsRes, prodsRes] = await Promise.all([
            (supabase.from('inventory_locations') as any).select('id, name, type').eq('is_active', true).order('name'),
            (supabase.from('price_list') as any).select('id, code, name, brand').eq('is_active', true).order('name'),
        ]);
        setLocations(locsRes.data || []);
        setProducts(prodsRes.data || []);
    };

    const addItem = () => {
        setItems([...items, { product_id: '', product_label: '', quantity: 1 }]);
    };

    const removeItem = (idx: number) => {
        if (items.length <= 1) return;
        setItems(items.filter((_, i) => i !== idx));
    };

    const updateItem = (idx: number, field: keyof RequestItem, value: any) => {
        setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(searchText.toLowerCase()))
    );

    const getLocationIcon = (type: string) => {
        switch (type) {
            case 'warehouse': return '🏭';
            case 'vehicle': return '🚐';
            case 'partner': return '🤝';
            case 'personal': return '👤';
            default: return '📍';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const validItems = items.filter(i => i.product_id && i.quantity > 0);
        if (validItems.length === 0) {
            setError('Agrega al menos un producto a la solicitud');
            return;
        }
        if (!fromLocationId) {
            setError('Selecciona de dónde se tomará el material');
            return;
        }
        if (!toLocationId) {
            setError('Selecciona a dónde irá el material');
            return;
        }

        setLoading(true);
        try {
            // Create request
            const { data: reqData, error: reqError } = await (supabase.from('inventory_material_requests') as any)
                .insert({
                    requested_by: user?.id,
                    from_location_id: fromLocationId,
                    to_location_id: toLocationId,
                    notes: notes || null,
                })
                .select()
                .single();

            if (reqError) throw new Error(reqError.message);

            // Create request items
            const itemsToInsert = validItems.map(item => ({
                request_id: reqData.id,
                product_id: item.product_id,
                quantity_requested: item.quantity,
            }));

            const { error: itemsError } = await (supabase.from('inventory_material_request_items') as any)
                .insert(itemsToInsert);

            if (itemsError) throw new Error(itemsError.message);

            setSuccess('¡Solicitud enviada! El administrador será notificado.');
            setTimeout(() => onSuccess(), 800);
        } catch (err: any) {
            setError(err.message || 'Error al enviar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
            <div className="min-h-screen px-4 py-8 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-6 rounded-t-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <ClipboardList className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Solicitar Material</h2>
                                <p className="text-white/80 text-sm">El administrador aprobará antes de la salida</p>
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

                        {/* Locations */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tomar de <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={fromLocationId}
                                    onChange={(e) => setFromLocationId(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                >
                                    <option value="">Seleccionar origen...</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{getLocationIcon(loc.type)} {loc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Llevar a <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={toLocationId}
                                    onChange={(e) => setToLocationId(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                >
                                    <option value="">Seleccionar destino...</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{getLocationIcon(loc.type)} {loc.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Items */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-gray-700">
                                    Productos <span className="text-red-500">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" /> Agregar producto
                                </button>
                            </div>

                            <div className="space-y-3">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                        <div className="flex-1 relative">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={item.product_label || (activeSearch === idx ? searchText : '')}
                                                    onChange={(e) => {
                                                        setSearchText(e.target.value);
                                                        setActiveSearch(idx);
                                                        updateItem(idx, 'product_id', '');
                                                        updateItem(idx, 'product_label', '');
                                                    }}
                                                    onFocus={() => setActiveSearch(idx)}
                                                    placeholder="Buscar producto..."
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                                                />
                                            </div>
                                            {activeSearch === idx && searchText && !item.product_id && (
                                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                                    {filteredProducts.slice(0, 15).map(p => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => {
                                                                updateItem(idx, 'product_id', p.id);
                                                                updateItem(idx, 'product_label', `${p.code} — ${p.name}`);
                                                                setSearchText('');
                                                                setActiveSearch(null);
                                                            }}
                                                            className="w-full text-left px-3 py-2 hover:bg-amber-50 text-sm"
                                                        >
                                                            <span className="font-medium">{p.name}</span>
                                                            <span className="text-gray-500 ml-2">{p.code}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="number"
                                            min={1}
                                            value={item.quantity}
                                            onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm text-center"
                                            placeholder="Cant."
                                        />
                                        {items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(idx)}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Notas (opcional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-sm"
                                placeholder="Ej: Para la orden de servicio #1234, urgente..."
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                            <button type="button" onClick={onClose} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><ClipboardList className="w-4 h-4" /> Enviar Solicitud</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

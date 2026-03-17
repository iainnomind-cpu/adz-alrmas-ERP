import { useState, useEffect, useMemo } from 'react';
import { supabase, type PriceListItem } from '../../lib/supabase';
import { PriceItemForm } from './PriceItemForm';
import { PriceCalculator } from './PriceCalculator';
import {
    Search, Plus, Edit2, ToggleLeft, ToggleRight, Filter,
    Package, AlertTriangle, Download, Calculator, RefreshCw,
    ChevronDown, ChevronUp, DollarSign, X
} from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
    dispositivo: 'Dispositivo',
    sensor: 'Sensor',
    accesorio: 'Accesorio',
    material: 'Material',
    servicio: 'Servicio',
    mano_obra: 'Mano de Obra'
};

const CATEGORY_COLORS: Record<string, string> = {
    dispositivo: 'bg-purple-100 text-purple-800',
    sensor: 'bg-blue-100 text-blue-800',
    accesorio: 'bg-orange-100 text-orange-800',
    material: 'bg-gray-100 text-gray-800',
    servicio: 'bg-green-100 text-green-800',
    mano_obra: 'bg-yellow-100 text-yellow-800'
};

export function PriceListManager() {
    const [items, setItems] = useState<PriceListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<PriceListItem | null>(null);
    const [showCalculator, setShowCalculator] = useState<PriceListItem | null>(null);

    // Filtros
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [currencyFilter, setCurrencyFilter] = useState<string>('all');
    const [technologyFilter, setTechnologyFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('active');
    const [showFilters, setShowFilters] = useState(false);

    // Ordenamiento
    const [sortField, setSortField] = useState<string>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('price_list')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItems((data as PriceListItem[]) || []);
        } catch (error) {
            console.error('Error loading price list:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleItemStatus = async (item: PriceListItem) => {
        try {
            const { error } = await (supabase.from('price_list') as any)
                .update({ is_active: !item.is_active })
                .eq('id', item.id);

            if (error) throw error;
            await loadItems();
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    // Filtrar y ordenar items
    const filteredItems = useMemo(() => {
        let result = items;

        // Búsqueda
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item =>
                item.code.toLowerCase().includes(query) ||
                item.name.toLowerCase().includes(query) ||
                (item.brand && item.brand.toLowerCase().includes(query)) ||
                (item.model && item.model.toLowerCase().includes(query)) ||
                item.description?.toLowerCase().includes(query)
            );
        }

        // Filtro de categoría
        if (categoryFilter !== 'all') {
            result = result.filter(item => item.category === categoryFilter);
        }

        // Filtro de moneda
        if (currencyFilter !== 'all') {
            result = result.filter(item => item.currency === currencyFilter);
        }

        // Filtro de tecnología
        if (technologyFilter !== 'all') {
            result = result.filter(item => item.technology === technologyFilter);
        }

        // Filtro de estado
        if (statusFilter !== 'all') {
            result = result.filter(item =>
                statusFilter === 'active' ? item.is_active : !item.is_active
            );
        }

        // Ordenamiento
        result.sort((a, b) => {
            let aVal: any = a[sortField as keyof PriceListItem];
            let bVal: any = b[sortField as keyof PriceListItem];

            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [items, searchQuery, categoryFilter, currencyFilter, technologyFilter, statusFilter, sortField, sortDirection]);

    // Items con stock bajo
    const lowStockItems = useMemo(() => {
        return items.filter(item =>
            item.is_active &&
            ['dispositivo', 'sensor', 'accesorio', 'material'].includes(item.category) &&
            item.stock_quantity < item.min_stock_level
        );
    }, [items]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const exportToCSV = () => {
        const headers = ['Código', 'Marca', 'Modelo', 'Nombre', 'Categoría', 'Moneda', 'Precio Base MXN', 'IVA', 'Precio c/IVA MXN', 'Stock', 'Estado'];
        const rows = filteredItems.map(item => [
            item.code,
            item.brand || '',
            item.model || '',
            item.name,
            CATEGORY_LABELS[item.category],
            item.currency,
            item.base_price_mxn.toFixed(2),
            item.has_tax ? `${item.tax_rate}%` : 'Exento',
            item.price_with_tax_mxn?.toFixed(2) || item.base_price_mxn.toFixed(2),
            item.stock_quantity.toString(),
            item.is_active ? 'Activo' : 'Inactivo'
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `lista_precios_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const SortIndicator = ({ field }: { field: string }) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ?
            <ChevronUp className="w-4 h-4" /> :
            <ChevronDown className="w-4 h-4" />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <DollarSign className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold">Lista de Precios</h3>
                            <p className="text-indigo-100">
                                {items.length} productos · {lowStockItems.length} con stock bajo
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={exportToCSV}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Exportar
                        </button>
                        <button
                            onClick={() => {
                                setEditingItem(null);
                                setShowForm(true);
                            }}
                            className="px-4 py-2 bg-white text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2 font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Producto
                        </button>
                    </div>
                </div>
            </div>

            {/* Alerta de stock bajo */}
            {lowStockItems.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium text-yellow-800">
                            {lowStockItems.length} producto(s) con stock bajo
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                            {lowStockItems.slice(0, 3).map(i => i.name).join(', ')}
                            {lowStockItems.length > 3 && ` y ${lowStockItems.length - 3} más...`}
                        </p>
                    </div>
                </div>
            )}

            {/* Barra de búsqueda y filtros */}
            <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4">
                <div className="flex flex-wrap gap-4">
                    {/* Búsqueda */}
                    <div className="flex-1 min-w-64 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por código, nombre o descripción..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* Botón filtros */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${showFilters ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filtros
                    </button>

                    {/* Recargar */}
                    <button
                        onClick={loadItems}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                {/* Panel de filtros expandible */}
                {showFilters && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="all">Todas</option>
                                {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                            <select
                                value={currencyFilter}
                                onChange={(e) => setCurrencyFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="all">Todas</option>
                                <option value="USD">💵 USD</option>
                                <option value="MXN">🇲🇽 MXN</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tecnología</label>
                            <select
                                value={technologyFilter}
                                onChange={(e) => setTechnologyFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="all">Todas</option>
                                <option value="cableado">Cableado</option>
                                <option value="inalambrico">Inalámbrico</option>
                                <option value="dual">Dual</option>
                                <option value="n/a">No Aplica</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="all">Todos</option>
                                <option value="active">Activos</option>
                                <option value="inactive">Inactivos</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabla de productos */}
            <div className="bg-white rounded-xl shadow-sm border mt-6 flex flex-col min-w-0 overflow-hidden">
                <div className="table-scroll w-full">
                    <table className="w-full" style={{ minWidth: '900px' }}>
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th
                                    className="px-2 py-2 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap w-[70px]"
                                    onClick={() => handleSort('code')}
                                >
                                    <div className="flex items-center gap-1">
                                        Código <SortIndicator field="code" />
                                    </div>
                                </th>
                                <th
                                    className="px-2 py-2 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center gap-1">
                                        Nombre <SortIndicator field="name" />
                                    </div>
                                </th>
                                <th
                                    className="px-2 py-2 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap w-[70px]"
                                    onClick={() => handleSort('brand')}
                                >
                                    <div className="flex items-center gap-1">
                                        Marca <SortIndicator field="brand" />
                                    </div>
                                </th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap w-[80px]">
                                    Modelo
                                </th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap w-[80px]">
                                    Categoría
                                </th>
                                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap w-[65px]">
                                    Moneda
                                </th>
                                <th
                                    className="px-2 py-2 text-right text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap w-[85px]"
                                    onClick={() => handleSort('base_price_mxn')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        P. Base <SortIndicator field="base_price_mxn" />
                                    </div>
                                </th>
                                <th className="px-2 py-2 text-right text-xs font-semibold text-gray-700 whitespace-nowrap w-[85px]">
                                    P. c/IVA
                                </th>
                                <th
                                    className="px-2 py-2 text-center text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap w-[50px]"
                                    onClick={() => handleSort('stock_quantity')}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        Stock <SortIndicator field="stock_quantity" />
                                    </div>
                                </th>
                                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap w-[60px]">
                                    Estado
                                </th>
                                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap w-[80px]">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredItems.map((item) => {
                                const isLowStock = item.stock_quantity < item.min_stock_level &&
                                    ['dispositivo', 'sensor', 'accesorio', 'material'].includes(item.category);

                                return (
                                    <tr
                                        key={item.id}
                                        className={`hover:bg-gray-50 transition-colors ${!item.is_active ? 'opacity-60' : ''}`}
                                    >
                                        <td className="px-2 py-2 whitespace-nowrap">
                                            <span className="font-mono text-xs font-medium text-gray-600">
                                                {item.code}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2 max-w-[200px]">
                                            <p className="font-medium text-sm text-gray-900 truncate" title={item.name}>{item.name}</p>
                                            {item.description && (
                                                <p className="text-xs text-gray-400 truncate" title={item.description}>
                                                    {item.description}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap">
                                            <span className="text-xs text-gray-700 truncate block max-w-[70px]" title={item.brand || ''}>{item.brand || '—'}</span>
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap">
                                            <span className="text-xs text-gray-700 truncate block max-w-[80px]" title={item.model || ''}>{item.model || '—'}</span>
                                        </td>
                                        <td className="px-2 py-2 whitespace-nowrap">
                                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_COLORS[item.category]}`}>
                                                {CATEGORY_LABELS[item.category]}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2 text-center whitespace-nowrap">
                                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${item.currency === 'USD'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-green-100 text-green-800'
                                                }`}>
                                                {item.currency}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2 text-right whitespace-nowrap">
                                            <span className="font-medium text-sm text-gray-900">
                                                {formatCurrency(item.base_price_mxn)}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2 text-right whitespace-nowrap">
                                            <div className="flex flex-col items-end">
                                               <span className="font-bold text-sm text-gray-900">
                                                  {formatCurrency(item.price_with_tax_mxn || item.base_price_mxn)}
                                               </span>
                                               <span className={`text-[9px] font-medium px-1 py-0 rounded ${item.has_tax ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                                  {item.has_tax ? `IVA ${item.tax_rate}%` : 'Sin IVA'}
                                               </span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 text-center whitespace-nowrap">
                                            {['dispositivo', 'sensor', 'accesorio', 'material'].includes(item.category) ? (
                                                <div className="flex items-center justify-center gap-0.5">
                                                    <span className={`text-sm font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                                                        {item.stock_quantity}
                                                    </span>
                                                    {isLowStock && (
                                                        <AlertTriangle className="w-3 h-3 text-red-500" />
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 text-center whitespace-nowrap">
                                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${item.is_active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {item.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-1 py-2 whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-0">
                                                <button
                                                    onClick={() => setShowCalculator(item)}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Calculadora"
                                                >
                                                    <Calculator className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingItem(item);
                                                        setShowForm(true);
                                                    }}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => toggleItemStatus(item)}
                                                    className={`p-1.5 rounded-lg transition-colors ${item.is_active
                                                        ? 'text-gray-600 hover:bg-gray-100'
                                                        : 'text-green-600 hover:bg-green-50'
                                                        }`}
                                                    title={item.is_active ? 'Desactivar' : 'Activar'}
                                                >
                                                    {item.is_active ? (
                                                        <ToggleLeft className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <ToggleRight className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredItems.length === 0 && (
                    <div className="text-center py-12">
                        <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">No se encontraron productos</p>
                        <p className="text-sm text-gray-500 mt-1">
                            {searchQuery || categoryFilter !== 'all' || currencyFilter !== 'all'
                                ? 'Intenta ajustar los filtros'
                                : 'Crea tu primer producto'}
                        </p>
                    </div>
                )}
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 border">
                    <p className="text-sm text-gray-600">Total Productos</p>
                    <p className="text-2xl font-bold text-gray-900">{items.length}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border">
                    <p className="text-sm text-gray-600">Productos Activos</p>
                    <p className="text-2xl font-bold text-green-600">
                        {items.filter(i => i.is_active).length}
                    </p>
                </div>
                <div className="bg-white rounded-lg p-4 border">
                    <p className="text-sm text-gray-600">En USD</p>
                    <p className="text-2xl font-bold text-blue-600">
                        {items.filter(i => i.currency === 'USD').length}
                    </p>
                </div>
                <div className="bg-white rounded-lg p-4 border">
                    <p className="text-sm text-gray-600">Stock Bajo</p>
                    <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
                </div>
            </div>

            {/* Modal de formulario */}
            {showForm && (
                <PriceItemForm
                    item={editingItem}
                    onClose={() => {
                        setShowForm(false);
                        setEditingItem(null);
                    }}
                    onSuccess={() => {
                        loadItems();
                        setShowForm(false);
                        setEditingItem(null);
                    }}
                />
            )}

            {/* Modal de calculadora */}
            {showCalculator && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-semibold text-gray-900">Calculadora de Precios</h3>
                            <button
                                onClick={() => setShowCalculator(null)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4">
                            <PriceCalculator item={showCalculator} showDetails />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

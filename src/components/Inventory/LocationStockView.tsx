import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { MapPin, Package, Search, ArrowRightLeft } from 'lucide-react';
import { TransferForm } from './TransferForm';

interface Location {
    id: string;
    name: string;
    type: string;
}

interface LocationStockRow {
    product_id: string;
    product_name: string;
    product_code: string;
    brand: string | null;
    cost: number;
    price: number;
    stocks: Record<string, number>; // location_id -> quantity
    total: number;
}

export function LocationStockView() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [rows, setRows] = useState<LocationStockRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showTransferForm, setShowTransferForm] = useState(false);
    const [filterLocation, setFilterLocation] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'units' | 'cost' | 'sale'>('units');

    const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load locations
            const { data: locsData } = await (supabase.from('inventory_locations') as any)
                .select('id, name, type')
                .eq('is_active', true)
                .order('name');

            const locs: Location[] = locsData || [];
            setLocations(locs);

            // Load all products with stock
            const { data: products } = await (supabase.from('price_list') as any)
                .select('id, code, name, brand, stock_quantity, cost, base_price_mxn')
                .eq('is_active', true)
                .order('name');

            // Load location stock
            const { data: locStock } = await (supabase.from('inventory_location_stock') as any)
                .select('product_id, location_id, quantity');

            // Build rows
            const stockMap: Record<string, Record<string, number>> = {};
            (locStock || []).forEach((ls: any) => {
                if (!stockMap[ls.product_id]) stockMap[ls.product_id] = {};
                stockMap[ls.product_id][ls.location_id] = ls.quantity;
            });

            const builtRows: LocationStockRow[] = (products || []).map((p: any) => {
                const stocks = stockMap[p.id] || {};
                const total = Object.values(stocks).reduce((sum: number, q: any) => sum + (q || 0), 0);
                return {
                    product_id: p.id,
                    product_name: p.name,
                    product_code: p.code || '',
                    brand: p.brand,
                    cost: parseFloat(p.cost) || 0,
                    price: parseFloat(p.base_price_mxn) || 0,
                    stocks,
                    total,
                };
            });

            setRows(builtRows);
        } catch (err) {
            console.error('Error loading location stock:', err);
        }
        setLoading(false);
    };

    const filteredRows = rows.filter(row => {
        const matchesSearch = !search ||
            row.product_name.toLowerCase().includes(search.toLowerCase()) ||
            row.product_code.toLowerCase().includes(search.toLowerCase());

        if (filterLocation === 'all') return matchesSearch;
        // Show only products that have stock in the selected location
        return matchesSearch && (row.stocks[filterLocation] || 0) > 0;
    });

    const totalInventoryUnits = filteredRows.reduce((sum, row) => sum + row.total, 0);
    const totalInventoryCost = filteredRows.reduce((sum, row) => sum + (row.total * row.cost), 0);
    const totalInventorySale = filteredRows.reduce((sum, row) => sum + (row.total * row.price), 0);

    const getGlobalTotalLabel = () => {
        if (viewMode === 'cost') return formatCurrency(totalInventoryCost) + ' (Costo)';
        if (viewMode === 'sale') return formatCurrency(totalInventorySale) + ' (Venta)';
        return totalInventoryUnits + ' unidades';
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

    const getQtyColor = (qty: number) => {
        if (viewMode !== 'units') {
             if (qty === 0) return 'text-gray-300';
             return 'text-emerald-700 font-semibold';
        }
        if (qty === 0) return 'text-gray-300';
        if (qty <= 2) return 'text-red-600 font-bold';
        if (qty <= 5) return 'text-amber-600 font-semibold';
        return 'text-green-600 font-semibold';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Valorización de Stock por Ubicación</h3>
                        <p className="text-sm text-gray-500 font-medium">
                            {filteredRows.length} productos | <span className="text-emerald-600 font-bold">Total: {getGlobalTotalLabel()}</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="bg-gray-100 p-1 flex rounded-lg">
                        <button
                            onClick={() => setViewMode('units')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'units' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Físico (Und)
                        </button>
                        <button
                            onClick={() => setViewMode('cost')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'cost' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            $$ Costo
                        </button>
                        <button
                            onClick={() => setViewMode('sale')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'sale' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            $$ Venta
                        </button>
                    </div>
                    <button
                        onClick={() => setShowTransferForm(true)}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
                    >
                        <ArrowRightLeft className="w-4 h-4" />
                        Registrar Movimiento
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="all">Todas las ubicaciones</option>
                    {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>
                            {getLocationIcon(loc.type)} {loc.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Location summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {locations.map(loc => {
                    const totalUnitsInLoc = rows.reduce((sum, r) => sum + (r.stocks[loc.id] || 0), 0);
                    const totalCostInLoc = rows.reduce((sum, r) => sum + ((r.stocks[loc.id] || 0) * r.cost), 0);
                    const totalSaleInLoc = rows.reduce((sum, r) => sum + ((r.stocks[loc.id] || 0) * r.price), 0);
                    const productsInLoc = rows.filter(r => (r.stocks[loc.id] || 0) > 0).length;
                    
                    let displayStat = totalUnitsInLoc.toString();
                    if (viewMode === 'cost') displayStat = formatCurrency(totalCostInLoc);
                    if (viewMode === 'sale') displayStat = formatCurrency(totalSaleInLoc);

                    return (
                        <button
                            key={loc.id}
                            onClick={() => setFilterLocation(filterLocation === loc.id ? 'all' : loc.id)}
                            className={`p-3 rounded-xl border-2 transition-all text-left ${filterLocation === loc.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                        >
                            <div className="text-lg mb-1">{getLocationIcon(loc.type)}</div>
                            <p className="text-xs font-medium text-gray-600 truncate">{loc.name}</p>
                            <p className={`text-lg font-bold ${viewMode === 'units' ? 'text-gray-900' : 'text-emerald-700'}`}>
                                {displayStat}
                            </p>
                            <p className="text-xs text-gray-500">{productsInLoc} productos</p>
                        </button>
                    );
                })}
            </div>

            {/* Stock matrix table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="table-scroll w-full">
                    <table className="w-full min-w-[800px]">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                                    Producto
                                </th>
                                {locations.map(loc => (
                                    <th key={loc.id} className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase min-w-[90px]">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span>{getLocationIcon(loc.type)}</span>
                                            <span className="truncate max-w-[80px]">{loc.name.replace('Camioneta ', '')}</span>
                                        </div>
                                    </th>
                                ))}
                                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 uppercase bg-gray-100 min-w-[70px]">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRows.map((row) => (
                                <tr key={row.product_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 sticky left-0 bg-white z-10">
                                        <div>
                                            <p className="font-medium text-gray-900 text-sm">{row.product_name}</p>
                                            <p className="text-xs text-gray-500">
                                                {row.product_code}{row.brand ? ` • ${row.brand}` : ''}
                                            </p>
                                        </div>
                                    </td>
                                    {locations.map(loc => {
                                        const qty = row.stocks[loc.id] || 0;
                                        let displayVal = qty.toString();
                                        if (qty > 0 && viewMode === 'cost') displayVal = formatCurrency(qty * row.cost);
                                        if (qty > 0 && viewMode === 'sale') displayVal = formatCurrency(qty * row.price);
                                        
                                        return (
                                            <td key={loc.id} className="px-3 py-3 text-center">
                                                <span className={`text-sm ${getQtyColor(qty)}`}>
                                                    {qty === 0 ? (viewMode === 'units' ? '0' : '-') : displayVal}
                                                </span>
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-3 text-center bg-gray-50">
                                        <span className={`text-sm font-bold ${row.total === 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                            {viewMode === 'units' ? row.total : (viewMode === 'cost' ? formatCurrency(row.total * row.cost) : formatCurrency(row.total * row.price))}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredRows.length === 0 && (
                    <div className="text-center py-12">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No se encontraron productos</p>
                    </div>
                )}
            </div>

            {showTransferForm && (
                <TransferForm
                    locations={locations}
                    onClose={() => setShowTransferForm(false)}
                    onSuccess={() => {
                        loadData();
                        setShowTransferForm(false);
                    }}
                />
            )}
        </div>
    );
}

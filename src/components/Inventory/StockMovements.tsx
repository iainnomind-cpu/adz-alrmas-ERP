import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Package,
  Wrench,
  Calendar,
  User,
  MapPin
} from 'lucide-react';

interface Transaction {
  id: string;
  transaction_type: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  notes: string | null;
  created_at: string;
  service_order_id: string | null;
  from_location_id: string | null;
  to_location_id: string | null;
  performed_by: string | null;
  price_list: {
    code: string;
    name: string;
    brand: string | null;
    model: string | null;
  } | null;
  inventory_suppliers: {
    name: string;
  } | null;
}

interface LocationMap {
  [key: string]: string;
}

interface UserMap {
  [key: string]: string;
}

export function StockMovements() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'purchase' | 'usage' | 'transfer'>('all');
  const [locationNames, setLocationNames] = useState<LocationMap>({});
  const [userNames, setUserNames] = useState<UserMap>({});

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);

    // Load locations for name mapping
    const { data: locsData } = await (supabase.from('inventory_locations') as any)
      .select('id, name');
    const locMap: LocationMap = {};
    (locsData || []).forEach((l: any) => { locMap[l.id] = l.name; });
    setLocationNames(locMap);

    // Load user profiles for name mapping
    const { data: usersData } = await (supabase.from('user_profiles') as any)
      .select('id, full_name');
    const uMap: UserMap = {};
    (usersData || []).forEach((u: any) => { uMap[u.id] = u.full_name; });
    setUserNames(uMap);

    // Load transactions
    let query = (supabase.from('inventory_transactions') as any)
      .select(`
        *,
        price_list (code, name, brand, model),
        inventory_suppliers (name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter === 'purchase') {
      query = query.in('transaction_type', ['purchase', 'adjustment_in', 'return']);
    } else if (filter === 'usage') {
      query = query.in('transaction_type', ['usage', 'adjustment_out', 'damage', 'loss']);
    } else if (filter === 'transfer') {
      query = query.eq('transaction_type', 'transfer');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading transactions:', error);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const getTransactionIcon = (type: string) => {
    if (type === 'transfer') return <ArrowRightLeft className="w-5 h-5 text-blue-600" />;
    if (['purchase', 'adjustment_in', 'return'].includes(type)) {
      return <TrendingUp className="w-5 h-5 text-green-600" />;
    }
    return <TrendingDown className="w-5 h-5 text-red-600" />;
  };

  const getTransactionColor = (type: string) => {
    if (type === 'transfer') return 'bg-blue-50 border-blue-200';
    if (['purchase', 'adjustment_in', 'return'].includes(type)) {
      return 'bg-green-50 border-green-200';
    }
    return 'bg-red-50 border-red-200';
  };

  const getTransactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      purchase: 'Compra',
      usage: 'Uso en Campo',
      transfer: 'Transferencia',
      adjustment_in: 'Ajuste Entrada',
      adjustment_out: 'Ajuste Salida',
      return: 'Devolución',
      damage: 'Daño',
      loss: 'Pérdida'
    };
    return labels[type] || type;
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
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'purchase', 'usage', 'transfer'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${filter === type
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {type === 'all' ? 'Todos' : type === 'purchase' ? 'Entradas' : type === 'usage' ? 'Salidas' : 'Transferencias'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {transactions.map((transaction) => {
          const productName = transaction.price_list?.name || 'Producto Desconocido';
          const productCode = transaction.price_list?.code || '---';
          const productBrand = transaction.price_list?.brand;
          const productModel = transaction.price_list?.model;
          const fromName = transaction.from_location_id ? locationNames[transaction.from_location_id] : null;
          const toName = transaction.to_location_id ? locationNames[transaction.to_location_id] : null;
          const performerName = transaction.performed_by ? userNames[transaction.performed_by] : null;

          return (
            <div
              key={transaction.id}
              className={`rounded-xl p-4 border ${getTransactionColor(transaction.transaction_type)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    {getTransactionIcon(transaction.transaction_type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {productName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {productCode} {productBrand ? `• ${productBrand}` : ''} {productModel ? `• ${productModel}` : ''}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 shadow-sm">
                  {getTransactionLabel(transaction.transaction_type)}
                </span>
              </div>

              {/* Location flow */}
              {(fromName || toName) && (
                <div className="flex items-center gap-2 mb-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  {fromName && (
                    <span className="px-2 py-0.5 bg-white rounded text-gray-700 font-medium">{fromName}</span>
                  )}
                  {fromName && toName && (
                    <span className="text-gray-400">→</span>
                  )}
                  {toName && (
                    <span className="px-2 py-0.5 bg-white rounded text-gray-700 font-medium">{toName}</span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Cantidad</p>
                  <p className="font-semibold text-gray-900">{transaction.quantity} unidades</p>
                </div>
                <div>
                  <p className="text-gray-600">Costo Unitario</p>
                  <p className="font-semibold text-gray-900">${transaction.unit_cost?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Fecha</p>
                  <div className="flex items-center gap-1 font-medium text-gray-900">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(transaction.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {performerName && (
                  <div>
                    <p className="text-gray-600">Realizado por</p>
                    <div className="flex items-center gap-1 font-medium text-gray-900">
                      <User className="w-3 h-3" />
                      <span>{performerName}</span>
                    </div>
                  </div>
                )}
              </div>

              {(transaction.service_order_id || transaction.inventory_suppliers || transaction.notes) && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                  {transaction.service_order_id && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Wrench className="w-4 h-4" />
                      <span>Vinculado a orden de servicio</span>
                    </div>
                  )}
                  {transaction.inventory_suppliers && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span>Proveedor: {transaction.inventory_suppliers.name}</span>
                    </div>
                  )}
                  {transaction.notes && (
                    <p className="text-sm text-gray-600 italic">{transaction.notes}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {transactions.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No hay movimientos de inventario</p>
        </div>
      )}
    </div>
  );
}

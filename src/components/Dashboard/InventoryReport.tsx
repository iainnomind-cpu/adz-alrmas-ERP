import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';

export function InventoryReport() {
  const [inventory, setInventory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const { data } = await supabase.from('inventory_items').select('*');
      const items = data || [];
      const totalValue = items.reduce((sum, i) => sum + (i.quantity_available * i.unit_cost), 0);
      const lowStock = items.filter(i => i.quantity_available <= i.min_stock_level && i.quantity_available > 0).length;
      const outOfStock = items.filter(i => i.quantity_available === 0).length;
      setInventory({ items, totalValue, lowStock, outOfStock });
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  if (!inventory) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
          <Package className="w-8 h-8 mb-4" />
          <p className="text-sm opacity-90">Total Productos</p>
          <p className="text-4xl font-bold">{inventory.items.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-6 text-white">
          <DollarSign className="w-8 h-8 mb-4" />
          <p className="text-sm opacity-90">Valor Total</p>
          <p className="text-4xl font-bold">${inventory.totalValue.toFixed(0)}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white">
          <TrendingDown className="w-8 h-8 mb-4" />
          <p className="text-sm opacity-90">Stock Bajo</p>
          <p className="text-4xl font-bold">{inventory.lowStock}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-xl p-6 text-white">
          <AlertTriangle className="w-8 h-8 mb-4" />
          <p className="text-sm opacity-90">Sin Stock</p>
          <p className="text-4xl font-bold">{inventory.outOfStock}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Mínimo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Unit.</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Total</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {inventory.items.map((item: any) => {
                const value = item.quantity_available * item.unit_cost;
                const status = item.quantity_available === 0 ? 'out' : item.quantity_available <= item.min_stock_level ? 'low' : 'ok';
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">{item.sku}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold">{item.quantity_available}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{item.min_stock_level}</td>
                    <td className="px-6 py-4 text-right">${item.unit_cost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-semibold">${value.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        status === 'out' ? 'bg-red-100 text-red-800' :
                        status === 'low' ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {status === 'out' ? 'Sin Stock' : status === 'low' ? 'Stock Bajo' : 'OK'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
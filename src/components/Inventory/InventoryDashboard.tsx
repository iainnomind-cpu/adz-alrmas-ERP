import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Archive
} from 'lucide-react';

interface InventoryMetrics {
  totalProducts: number;
  totalStockValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  activeAlerts: number;
  pendingPurchaseOrders: number;
}

export function InventoryDashboard() {
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      // Fetches from price_list to calculate metrics
      const [
        priceListData,
        purchaseOrdersData
      ] = await Promise.all([
        supabase.from('price_list')
          .select('id, stock_quantity, cost_price_mxn, base_price_mxn, min_stock_level')
          .eq('is_active', true),
        // Keeping legacy PO check for now, though it might need migration later
        supabase.from('inventory_purchase_orders')
          .select('id')
          .eq('status', 'pending')
      ]);

      const items = priceListData.data || [];
      const purchaseOrders = purchaseOrdersData.data || [];

      // Calculate logic
      let lowStock = 0;
      let outOfStock = 0;
      let totalValue = 0;

      items.forEach(item => {
        const stock = item.stock_quantity || 0;
        const cost = item.cost_price_mxn || item.base_price_mxn || 0;
        const min = item.min_stock_level || 5;

        // Value
        totalValue += (stock * cost);

        // Status
        if (stock === 0) {
          outOfStock++;
        } else if (stock <= min) {
          lowStock++;
        }
      });

      setMetrics({
        totalProducts: items.length,
        totalStockValue: totalValue,
        lowStockItems: lowStock,
        outOfStockItems: outOfStock,
        activeAlerts: lowStock + outOfStock,
        pendingPurchaseOrders: purchaseOrders.length
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <Package className="w-6 h-6" />
          </div>
          <Archive className="w-5 h-5 text-blue-200" />
        </div>
        <p className="text-blue-100 text-sm mb-1">Total Productos</p>
        <p className="text-3xl font-bold">{metrics.totalProducts}</p>
        <p className="text-blue-200 text-sm mt-2">En catálogo activo</p>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <TrendingDown className="w-5 h-5 text-green-200" />
        </div>
        <p className="text-green-100 text-sm mb-1">Valor en Inventario</p>
        <p className="text-3xl font-bold">${metrics.totalStockValue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</p>
        <p className="text-green-200 text-sm mt-2">Costo total de stock</p>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <AlertTriangle className="w-5 h-5 text-orange-200" />
        </div>
        <p className="text-orange-100 text-sm mb-1">Stock Bajo</p>
        <p className="text-3xl font-bold">{metrics.lowStockItems}</p>
        <p className="text-orange-200 text-sm mt-2">Productos por reordenar</p>
      </div>

      <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
        <p className="text-red-100 text-sm mb-1">Alertas Activas</p>
        <p className="text-3xl font-bold">{metrics.activeAlerts}</p>
        <p className="text-red-200 text-sm mt-2">Stock agotado o bajo</p>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>
        <p className="text-purple-100 text-sm mb-1">Órdenes de Compra</p>
        <p className="text-3xl font-bold">{metrics.pendingPurchaseOrders}</p>
        <p className="text-purple-200 text-sm mt-2">Pendientes de recibir</p>
      </div>

      <div className="bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <Package className="w-6 h-6" />
          </div>
        </div>
        <p className="text-gray-200 text-sm mb-1">Sin Stock</p>
        <p className="text-3xl font-bold">{metrics.outOfStockItems}</p>
        <p className="text-gray-300 text-sm mt-2">Productos agotados</p>
      </div>
    </div>
  );
}

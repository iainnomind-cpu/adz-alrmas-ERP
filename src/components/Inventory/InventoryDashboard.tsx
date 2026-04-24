import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, DollarSign, TrendingUp, Users, Activity, BarChart3 } from 'lucide-react';

interface DashboardStats {
  totalUnits: number;
  totalCostValue: number;
  totalSaleValue: number;
  topProducts: { name: string; quantity: number }[];
  technicianUsage: { name: string; quantity: number }[];
}

export function InventoryDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Cargar catálogo de precios para cruzar
      const { data: products } = await (supabase.from('price_list') as any)
        .select('id, name, cost, base_price_mxn');
      
      const productMap: Record<string, any> = {};
      (products || []).forEach((p: any) => {
        productMap[p.id] = p;
      });

      // 2. Cargar stock general
      const { data: stockData } = await (supabase.from('inventory_location_stock') as any)
        .select('product_id, quantity');
      
      let totalUnits = 0;
      let totalCostValue = 0;
      let totalSaleValue = 0;

      (stockData || []).forEach((s: any) => {
        const qty = s.quantity || 0;
        const p = productMap[s.product_id];
        if (p && qty > 0) {
          totalUnits += qty;
          totalCostValue += qty * (parseFloat(p.cost) || 0);
          totalSaleValue += qty * (parseFloat(p.base_price_mxn) || 0);
        }
      });

      // 3. Cargar transacciones de uso de los últimos 30 días para "Más Usados" y "Consumo"
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: usageData } = await (supabase.from('inventory_transactions') as any)
        .select('product_id, from_location_id, quantity')
        .eq('transaction_type', 'usage')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // 4. Cargar ubicaciones para nombres de técnicos
      const { data: locations } = await (supabase.from('inventory_locations') as any)
        .select('id, name, type');
      
      const locMap: Record<string, any> = {};
      (locations || []).forEach((l: any) => {
        locMap[l.id] = l;
      });

      // Agrupar 'Top Products'
      const productUsage: Record<string, number> = {};
      const techUsage: Record<string, number> = {};

      (usageData || []).forEach((u: any) => {
        const qty = u.quantity || 0;
        
        // Uso de productos
        if (u.product_id) {
          productUsage[u.product_id] = (productUsage[u.product_id] || 0) + qty;
        }

        // Uso de técnicos (si la ubicación origen era personal o vehículo asignado)
        if (u.from_location_id) {
           const loc = locMap[u.from_location_id];
           if (loc && (loc.type === 'personal' || loc.type === 'vehicle')) {
              techUsage[u.from_location_id] = (techUsage[u.from_location_id] || 0) + qty;
           }
        }
      });

      // Formatear Top 5 Productos
      const topProducts = Object.entries(productUsage)
        .map(([id, qty]) => ({
          name: productMap[id]?.name || 'Producto Desconocido',
          quantity: qty as number
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // Formatear Consumo por Técnico
      const technicianUsage = Object.entries(techUsage)
        .map(([id, qty]) => ({
          name: locMap[id]?.name || 'Desconocido',
          quantity: qty as number
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      setStats({
        totalUnits,
        totalCostValue,
        totalSaleValue,
        topProducts,
        technicianUsage
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-indigo-100">Inventario Físico</h3>
            <div className="p-2 bg-white/20 rounded-lg">
              <Package className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold">{stats.totalUnits.toLocaleString()}</p>
          <p className="text-sm text-indigo-200 mt-2">Unidades totales almacenadas</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-emerald-100">Valor de Costeo</h3>
            <div className="p-2 bg-white/20 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(stats.totalCostValue)}</p>
          <p className="text-sm text-emerald-200 mt-2">Dinero invertido retenido en stock</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-blue-100">Valor Estimado de Venta</h3>
            <div className="p-2 bg-white/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(stats.totalSaleValue)}</p>
          <p className="text-sm text-blue-200 mt-2">Proyección comercial bruta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Productos Más Usados (Últimos 30 días)</h3>
          </div>
          <div className="p-6">
            {stats.topProducts.length > 0 ? (
              <div className="space-y-4">
                {stats.topProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 truncate mr-4">{p.name}</span>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                       {p.quantity} unds
                    </span>
                  </div>
                ))}
              </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p>No hay uso registrado recientemente</p>
                </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Consumo por Técnico (Últimos 30 días)</h3>
          </div>
          <div className="p-6">
            {stats.technicianUsage.length > 0 ? (
               <div className="space-y-4">
                {stats.technicianUsage.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 truncate mr-4">{t.name}</span>
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                       {t.quantity} unds
                    </span>
                  </div>
                ))}
              </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p>No hay consumo registrado por ubicaciones de tipo personal</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

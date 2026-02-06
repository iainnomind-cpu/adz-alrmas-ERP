import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Wrench, Clock, DollarSign, TrendingUp } from 'lucide-react';

export function ServiceAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data } = await supabase.from('service_orders').select('*');
      const orders = data || [];

      const byType = orders.reduce((acc: any, o) => {
        if (!acc[o.service_type]) acc[o.service_type] = { count: 0, totalCost: 0, totalTime: 0 };
        acc[o.service_type].count++;
        acc[o.service_type].totalCost += o.total_cost || 0;
        acc[o.service_type].totalTime += o.total_time_minutes || 0;
        return acc;
      }, {});

      const completed = orders.filter(o => o.status === 'completed');
      const avgTime = completed.length > 0 ? completed.reduce((sum, o) => sum + (o.total_time_minutes || 0), 0) / completed.length : 0;
      const avgCost = completed.length > 0 ? completed.reduce((sum, o) => sum + (o.total_cost || 0), 0) / completed.length : 0;

      setAnalytics({ byType, avgTime, avgCost, totalOrders: orders.length, completedOrders: completed.length });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
          <Wrench className="w-8 h-8 mb-4" />
          <p className="text-sm opacity-90">Total Órdenes</p>
          <p className="text-4xl font-bold">{analytics.totalOrders}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-6 text-white">
          <Clock className="w-8 h-8 mb-4" />
          <p className="text-sm opacity-90">Tiempo Promedio</p>
          <p className="text-4xl font-bold">{Math.round(analytics.avgTime)}</p>
          <p className="text-sm opacity-75">minutos</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white">
          <DollarSign className="w-8 h-8 mb-4" />
          <p className="text-sm opacity-90">Costo Promedio</p>
          <p className="text-4xl font-bold">${analytics.avgCost.toFixed(0)}</p>
        </div>
        <div className="bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl p-6 text-white">
          <TrendingUp className="w-8 h-8 mb-4" />
          <p className="text-sm opacity-90">Completadas</p>
          <p className="text-4xl font-bold">{analytics.completedOrders}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Análisis por Tipo de Servicio</h3>
        <div className="space-y-4">
          {Object.entries(analytics.byType).map(([type, data]: [string, any]) => {
            const avgTime = data.count > 0 ? data.totalTime / data.count : 0;
            const avgCost = data.count > 0 ? data.totalCost / data.count : 0;
            return (
              <div key={type} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 capitalize">{type}</h4>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {data.count} órdenes
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Tiempo Promedio</p>
                    <p className="font-semibold text-gray-900">{Math.round(avgTime)} min</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Costo Promedio</p>
                    <p className="font-semibold text-gray-900">${avgCost.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Ingresos Totales</p>
                    <p className="font-semibold text-green-600">${data.totalCost.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

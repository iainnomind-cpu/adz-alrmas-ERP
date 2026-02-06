import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, TrendingUp, BarChart3, Users } from 'lucide-react';

interface MonthlyData {
  month: string;
  services: number;
  revenue: number;
  newCustomers: number;
  avgServiceCost: number;
}

export function TemporalTrends() {
  const [trends, setTrends] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrends();
  }, []);

  const loadTrends = async () => {
    try {
      const [servicesData, invoicesData, customersData] = await Promise.all([
        supabase.from('service_orders').select('created_at, total_cost, status'),
        supabase.from('invoices').select('created_at, total_amount, status'),
        supabase.from('customers').select('created_at')
      ]);

      const monthlyMap = new Map<string, MonthlyData>();

      (servicesData.data || []).forEach(s => {
        const month = new Date(s.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { month, services: 0, revenue: 0, newCustomers: 0, avgServiceCost: 0 });
        }
        const data = monthlyMap.get(month)!;
        data.services++;
        if (s.status === 'completed') data.avgServiceCost += s.total_cost || 0;
      });

      (invoicesData.data || []).forEach(inv => {
        const month = new Date(inv.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
        if (monthlyMap.has(month) && inv.status === 'paid') {
          monthlyMap.get(month)!.revenue += inv.total_amount;
        }
      });

      (customersData.data || []).forEach(c => {
        const month = new Date(c.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
        if (monthlyMap.has(month)) {
          monthlyMap.get(month)!.newCustomers++;
        }
      });

      monthlyMap.forEach(data => {
        if (data.services > 0) {
          data.avgServiceCost = data.avgServiceCost / data.services;
        }
      });

      const result = Array.from(monthlyMap.values()).slice(-12);
      setTrends(result);
    } catch (error) {
      console.error('Error loading trends:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  const maxRevenue = Math.max(...trends.map(t => t.revenue));
  const maxServices = Math.max(...trends.map(t => t.services));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-8 h-8" />
          <h3 className="text-xl font-semibold">Análisis de Tendencias Temporales</h3>
        </div>
        <p className="text-blue-100">Mostrando datos de los últimos {trends.length} meses</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Ingresos Mensuales
          </h3>
          <div className="space-y-3">
            {trends.map(trend => (
              <div key={trend.month}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-700 capitalize">{trend.month}</span>
                  <span className="font-semibold text-gray-900">${trend.revenue.toFixed(0)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${(trend.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Servicios Mensuales
          </h3>
          <div className="space-y-3">
            {trends.map(trend => (
              <div key={trend.month}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-700 capitalize">{trend.month}</span>
                  <span className="font-semibold text-gray-900">{trend.services} servicios</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${(trend.services / maxServices) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mes</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Servicios</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ingresos</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Nuevos Clientes</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Prom.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {trends.map(trend => (
                <tr key={trend.month} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900 capitalize">{trend.month}</td>
                  <td className="px-6 py-4 text-center font-semibold text-blue-600">{trend.services}</td>
                  <td className="px-6 py-4 text-right font-semibold text-green-600">${trend.revenue.toFixed(2)}</td>
                  <td className="px-6 py-4 text-center font-semibold text-orange-600">{trend.newCustomers}</td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">${trend.avgServiceCost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
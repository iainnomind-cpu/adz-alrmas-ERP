import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, TrendingUp, TrendingDown, PieChart } from 'lucide-react';

export function FinancialAnalytics() {
  const [financial, setFinancial] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinancial();
  }, []);

  const loadFinancial = async () => {
    try {
      const [invoicesData, servicesData] = await Promise.all([
        supabase.from('invoices').select('*'),
        supabase.from('service_orders').select('total_cost, labor_cost, materials_cost, status')
      ]);

      const invoices = invoicesData.data || [];
      const services = servicesData.data || [];

      const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_amount, 0);
      const pendingRevenue = invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.total_amount, 0);
      const overdueRevenue = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.total_amount, 0);

      const completed = services.filter(s => s.status === 'completed');
      const totalCosts = completed.reduce((sum, s) => sum + (s.labor_cost || 0) + (s.materials_cost || 0), 0);
      const totalServiceRevenue = completed.reduce((sum, s) => sum + (s.total_cost || 0), 0);
      const grossProfit = totalServiceRevenue - totalCosts;
      const profitMargin = totalServiceRevenue > 0 ? (grossProfit / totalServiceRevenue) * 100 : 0;

      const byMonth = invoices.reduce((acc: any, inv) => {
        const month = new Date(inv.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
        if (!acc[month]) acc[month] = { revenue: 0, count: 0 };
        if (inv.status === 'paid') {
          acc[month].revenue += inv.total_amount;
          acc[month].count++;
        }
        return acc;
      }, {});

      setFinancial({
        totalRevenue,
        pendingRevenue,
        overdueRevenue,
        totalCosts,
        grossProfit,
        profitMargin,
        byMonth
      });
    } catch (error) {
      console.error('Error loading financial:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  if (!financial) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-6 text-white">
          <DollarSign className="w-8 h-8 mb-4" />
          <p className="text-sm opacity-90">Ingresos</p>
          <p className="text-4xl font-bold">${financial.totalRevenue.toFixed(0)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
          <TrendingUp className="w-8 h-8 mb-4" />
          <p className="text-sm opacity-90">Utilidad Bruta</p>
          <p className="text-4xl font-bold">${financial.grossProfit.toFixed(0)}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white">
          <PieChart className="w-8 h-8 mb-4" />
          <p className="text-sm opacity-90">Margen</p>
          <p className="text-4xl font-bold">{financial.profitMargin.toFixed(1)}%</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-xl p-6 text-white">
          <TrendingDown className="w-8 h-8 mb-4" />
          <p className="text-sm opacity-90">Costos</p>
          <p className="text-4xl font-bold">${financial.totalCosts.toFixed(0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Flujo de Caja</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <span className="text-gray-700 font-medium">Cobrado</span>
              <span className="text-2xl font-bold text-green-600">${financial.totalRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
              <span className="text-gray-700 font-medium">Por Cobrar</span>
              <span className="text-2xl font-bold text-yellow-600">${financial.pendingRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
              <span className="text-gray-700 font-medium">Vencido</span>
              <span className="text-2xl font-bold text-red-600">${financial.overdueRevenue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Análisis de Rentabilidad</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Ingresos por Servicios</span>
                <span className="font-semibold">${(financial.totalRevenue + financial.totalCosts).toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Costos Operativos</span>
                <span className="font-semibold">${financial.totalCosts.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-red-500 h-3 rounded-full" style={{
                  width: `${(financial.totalCosts / (financial.totalRevenue + financial.totalCosts)) * 100}%`
                }} />
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Utilidad Neta</span>
                <span className="text-3xl font-bold text-green-600">${financial.grossProfit.toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">Margen de utilidad: {financial.profitMargin.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Ingresos Mensuales</h3>
        <div className="space-y-3">
          {Object.entries(financial.byMonth).slice(-12).map(([month, data]: [string, any]) => (
            <div key={month}>
              <div className="flex justify-between mb-2">
                <span className="text-gray-700 font-medium capitalize">{month}</span>
                <span className="font-semibold text-gray-900">${data.revenue.toFixed(2)} ({data.count} facturas)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(data.revenue / financial.totalRevenue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

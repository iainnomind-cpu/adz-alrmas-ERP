import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Briefcase, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PortfolioData {
  activeCustomers: number;
  inactiveCustomers: number;
  suspendedCustomers: number;
  individualAccounts: number;
  consolidatedAccounts: number;
  totalRevenue: number;
  avgRevenuePerCustomer: number;
}

export function PortfolioAnalysis() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      const [customersData, invoicesData] = await Promise.all([
        supabase.from('customers').select('status, account_type, id'),
        supabase.from('invoices').select('customer_id, total_amount, status')
      ]);

      const customers = customersData.data || [];
      const invoices = invoicesData.data || [];

      const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_amount, 0);

      setPortfolio({
        activeCustomers: customers.filter(c => c.status === 'active').length,
        inactiveCustomers: customers.filter(c => c.status === 'inactive').length,
        suspendedCustomers: customers.filter(c => c.status === 'suspended').length,
        individualAccounts: customers.filter(c => c.account_type === 'individual').length,
        consolidatedAccounts: customers.filter(c => c.account_type === 'consolidado').length,
        totalRevenue,
        avgRevenuePerCustomer: customers.length > 0 ? totalRevenue / customers.length : 0
      });
    } catch (error) {
      console.error('Error loading portfolio:', error);
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

  if (!portfolio) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle2 className="w-8 h-8" />
            <TrendingUp className="w-5 h-5 opacity-50" />
          </div>
          <p className="text-sm opacity-90 mb-1">Clientes Activos</p>
          <p className="text-4xl font-bold">{portfolio.activeCustomers}</p>
        </div>

        <div className="bg-gradient-to-br from-gray-500 to-slate-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <AlertCircle className="w-8 h-8" />
            <TrendingUp className="w-5 h-5 opacity-50" />
          </div>
          <p className="text-sm opacity-90 mb-1">Clientes Inactivos</p>
          <p className="text-4xl font-bold">{portfolio.inactiveCustomers}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <AlertCircle className="w-8 h-8" />
            <TrendingUp className="w-5 h-5 opacity-50" />
          </div>
          <p className="text-sm opacity-90 mb-1">Clientes Suspendidos</p>
          <p className="text-4xl font-bold">{portfolio.suspendedCustomers}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Briefcase className="w-8 h-8" />
            <TrendingUp className="w-5 h-5 opacity-50" />
          </div>
          <p className="text-sm opacity-90 mb-1">Ingreso Promedio</p>
          <p className="text-4xl font-bold">${portfolio.avgRevenuePerCustomer.toFixed(0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribución por Estado</h3>
          <div className="space-y-4">
            {[
              { label: 'Activos', value: portfolio.activeCustomers, color: 'bg-green-500' },
              { label: 'Suspendidos', value: portfolio.suspendedCustomers, color: 'bg-red-500' },
              { label: 'Inactivos', value: portfolio.inactiveCustomers, color: 'bg-gray-500' }
            ].map(item => {
              const total = portfolio.activeCustomers + portfolio.suspendedCustomers + portfolio.inactiveCustomers;
              const percentage = (item.value / total) * 100;
              return (
                <div key={item.label}>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-700 font-medium">{item.label}</span>
                    <span className="font-semibold">{item.value} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`${item.color} h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Tipo de Cuenta</h3>
          <div className="space-y-4">
            {[
              { label: 'Individuales', value: portfolio.individualAccounts, color: 'bg-blue-500' },
              { label: 'Consolidadas', value: portfolio.consolidatedAccounts, color: 'bg-cyan-500' }
            ].map(item => {
              const total = portfolio.individualAccounts + portfolio.consolidatedAccounts;
              const percentage = (item.value / total) * 100;
              return (
                <div key={item.label}>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-700 font-medium">{item.label}</span>
                    <span className="font-semibold">{item.value} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`${item.color} h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ingresos Totales de Cartera</h3>
            <p className="text-4xl font-bold text-blue-600">${portfolio.totalRevenue.toFixed(2)}</p>
            <p className="text-sm text-gray-600 mt-2">
              Promedio por cliente: ${portfolio.avgRevenuePerCustomer.toFixed(2)}
            </p>
          </div>
          <Briefcase className="w-20 h-20 text-blue-200" />
        </div>
      </div>
    </div>
  );
}

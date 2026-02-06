import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, PieChart, BarChart3, MapPin } from 'lucide-react';

interface CustomerDistribution {
  byType: Record<string, number>;
  byTech: Record<string, number>;
  byPlan: Record<string, number>;
  byProperty: Record<string, number>;
  byCredit: Record<string, number>;
  byAccount: Record<string, number>;
  byCycle: Record<string, number>;
  byStatus: Record<string, number>;
}

export function CustomerAnalytics() {
  const [distribution, setDistribution] = useState<CustomerDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalCustomers, setTotalCustomers] = useState(0);

  useEffect(() => {
    loadDistribution();
  }, []);

  const loadDistribution = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('customer_type, communication_tech, monitoring_plan, property_type, credit_classification, account_type, billing_cycle, status');

      if (error) throw error;

      const customers = data || [];
      setTotalCustomers(customers.length);

      const dist: CustomerDistribution = {
        byType: {},
        byTech: {},
        byPlan: {},
        byProperty: {},
        byCredit: {},
        byAccount: {},
        byCycle: {},
        byStatus: {}
      };

      customers.forEach(c => {
        dist.byType[c.customer_type] = (dist.byType[c.customer_type] || 0) + 1;
        dist.byTech[c.communication_tech] = (dist.byTech[c.communication_tech] || 0) + 1;
        if (c.monitoring_plan) dist.byPlan[c.monitoring_plan] = (dist.byPlan[c.monitoring_plan] || 0) + 1;
        dist.byProperty[c.property_type] = (dist.byProperty[c.property_type] || 0) + 1;
        dist.byCredit[c.credit_classification] = (dist.byCredit[c.credit_classification] || 0) + 1;
        dist.byAccount[c.account_type] = (dist.byAccount[c.account_type] || 0) + 1;
        dist.byCycle[c.billing_cycle] = (dist.byCycle[c.billing_cycle] || 0) + 1;
        dist.byStatus[c.status] = (dist.byStatus[c.status] || 0) + 1;
      });

      setDistribution(dist);
    } catch (error) {
      console.error('Error loading distribution:', error);
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

  if (!distribution) return null;

  const renderDistributionCard = (title: string, data: Record<string, number>, icon: React.ReactNode, colorClass: string) => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 ${colorClass} rounded-lg`}>
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="space-y-3">
          {entries.map(([key, count]) => {
            const percentage = (count / totalCustomers) * 100;
            const label = key === 'telefono' ? 'Teléfono' :
                         key === 'dual' ? 'Dual' :
                         key === 'celular' ? 'Celular' :
                         key === 'puntual' ? 'Puntual' :
                         key === '15_dias' ? '15 Días' :
                         key === 'moroso' ? 'Moroso' :
                         key === 'monthly' ? 'Mensual' :
                         key === 'quarterly' ? 'Trimestral' :
                         key === 'annual' ? 'Anual' :
                         key === 'individual' ? 'Individual' :
                         key === 'consolidado' ? 'Consolidado' :
                         key === 'active' ? 'Activo' :
                         key === 'suspended' ? 'Suspendido' :
                         key === 'inactive' ? 'Inactivo' :
                         key.charAt(0).toUpperCase() + key.slice(1);

            return (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{label}</span>
                  <span className="font-semibold text-gray-900">
                    {count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Total de Clientes</h3>
            <p className="text-4xl font-bold">{totalCustomers}</p>
          </div>
          <Users className="w-16 h-16 opacity-30" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderDistributionCard(
          'Distribución por Tipo',
          distribution.byType,
          <PieChart className="w-5 h-5 text-blue-600" />,
          'bg-blue-100'
        )}

        {renderDistributionCard(
          'Tecnología de Comunicación',
          distribution.byTech,
          <BarChart3 className="w-5 h-5 text-green-600" />,
          'bg-green-100'
        )}

        {renderDistributionCard(
          'Tipo de Propiedad',
          distribution.byProperty,
          <MapPin className="w-5 h-5 text-orange-600" />,
          'bg-orange-100'
        )}

        {renderDistributionCard(
          'Clasificación de Crédito',
          distribution.byCredit,
          <BarChart3 className="w-5 h-5 text-red-600" />,
          'bg-red-100'
        )}

        {renderDistributionCard(
          'Tipo de Cuenta',
          distribution.byAccount,
          <Users className="w-5 h-5 text-slate-600" />,
          'bg-slate-100'
        )}

        {renderDistributionCard(
          'Ciclo de Facturación',
          distribution.byCycle,
          <BarChart3 className="w-5 h-5 text-teal-600" />,
          'bg-teal-100'
        )}

        {renderDistributionCard(
          'Estado de Cliente',
          distribution.byStatus,
          <Users className="w-5 h-5 text-amber-600" />,
          'bg-amber-100'
        )}

        {Object.keys(distribution.byPlan).length > 0 && renderDistributionCard(
          'Plan de Monitoreo',
          distribution.byPlan,
          <PieChart className="w-5 h-5 text-emerald-600" />,
          'bg-emerald-100'
        )}
      </div>
    </div>
  );
}

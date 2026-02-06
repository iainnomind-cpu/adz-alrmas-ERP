import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  DollarSign,
  Users,
  Wrench,
  TrendingUp,
  AlertTriangle,
  FileText,
  Shield,
  Clock,
  CheckCircle2,
  Package
} from 'lucide-react';

interface KPIs {
  activeCustomers: number;
  totalCustomers: number;
  totalRevenue: number;
  pendingRevenue: number;
  overdueRevenue: number;
  overdueCount: number;
  activeServiceOrders: number;
  completedServiceOrders: number;
  eolAssets: number;
  totalAssets: number;
  avgDaysOverdue: number;
  avgServiceTime: number;
}

export function ExecutiveDashboard() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    try {
      const [
        customersData,
        invoicesData,
        serviceOrdersData,
        assetsData
      ] = await Promise.all([
        supabase.from('customers').select('status'),
        supabase.from('invoices').select('status, total_amount, days_overdue'),
        supabase.from('service_orders').select('status, total_time_minutes'),
        supabase.from('assets').select('is_eol, status')
      ]);

      const customers = customersData.data || [];
      const invoices = invoicesData.data || [];
      const serviceOrders = serviceOrdersData.data || [];
      const assets = assetsData.data || [];

      const completedOrders = serviceOrders.filter(s => s.status === 'completed');
      const avgTime = completedOrders.length > 0
        ? completedOrders.reduce((sum, s) => sum + (s.total_time_minutes || 0), 0) / completedOrders.length
        : 0;

      const overdueInvoices = invoices.filter(i => i.status === 'overdue');
      const avgOverdue = overdueInvoices.length > 0
        ? overdueInvoices.reduce((sum, i) => sum + (i.days_overdue || 0), 0) / overdueInvoices.length
        : 0;

      setKpis({
        activeCustomers: customers.filter(c => c.status === 'active').length,
        totalCustomers: customers.length,
        totalRevenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_amount, 0),
        pendingRevenue: invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.total_amount, 0),
        overdueRevenue: overdueInvoices.reduce((sum, i) => sum + i.total_amount, 0),
        overdueCount: overdueInvoices.length,
        activeServiceOrders: serviceOrders.filter(s => s.status === 'in_progress').length,
        completedServiceOrders: completedOrders.length,
        eolAssets: assets.filter(a => a.is_eol).length,
        totalAssets: assets.length,
        avgDaysOverdue: Math.round(avgOverdue),
        avgServiceTime: Math.round(avgTime)
      });
    } catch (error) {
      console.error('Error loading KPIs:', error);
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

  if (!kpis) return null;

  const kpiCards = [
    {
      title: 'Clientes Activos',
      value: kpis.activeCustomers,
      subtitle: `de ${kpis.totalCustomers} totales`,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      iconBg: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'Ingresos Cobrados',
      value: `$${kpis.totalRevenue.toFixed(0)}`,
      subtitle: 'Período actual',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
      iconBg: 'bg-green-100 text-green-600'
    },
    {
      title: 'Por Cobrar',
      value: `$${kpis.pendingRevenue.toFixed(0)}`,
      subtitle: 'Pendiente de pago',
      icon: Clock,
      color: 'from-yellow-500 to-amber-500',
      iconBg: 'bg-yellow-100 text-yellow-600'
    },
    {
      title: 'Cartera Vencida',
      value: `$${kpis.overdueRevenue.toFixed(0)}`,
      subtitle: `${kpis.overdueCount} facturas`,
      icon: AlertTriangle,
      color: 'from-red-500 to-pink-500',
      iconBg: 'bg-red-100 text-red-600'
    },
    {
      title: 'Órdenes Activas',
      value: kpis.activeServiceOrders,
      subtitle: `${kpis.completedServiceOrders} completadas`,
      icon: Wrench,
      color: 'from-orange-500 to-red-500',
      iconBg: 'bg-orange-100 text-orange-600'
    },
    {
      title: 'Activos EOL',
      value: kpis.eolAssets,
      subtitle: `de ${kpis.totalAssets} totales`,
      icon: Shield,
      color: 'from-slate-500 to-slate-600',
      iconBg: 'bg-slate-100 text-slate-600'
    },
    {
      title: 'DSO Promedio',
      value: `${kpis.avgDaysOverdue} días`,
      subtitle: 'Días de mora',
      icon: FileText,
      color: 'from-teal-500 to-cyan-500',
      iconBg: 'bg-teal-100 text-teal-600'
    },
    {
      title: 'Tiempo Promedio',
      value: `${kpis.avgServiceTime} min`,
      subtitle: 'Por servicio',
      icon: CheckCircle2,
      color: 'from-emerald-500 to-green-500',
      iconBg: 'bg-emerald-100 text-emerald-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className={`bg-gradient-to-br ${card.color} rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${card.iconBg} rounded-xl bg-white/20`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 opacity-50" />
              </div>
              <p className="text-sm opacity-90 mb-1">{card.title}</p>
              <p className="text-3xl font-bold mb-2">{card.value}</p>
              <p className="text-sm opacity-75">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Resumen Financiero
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-gray-700 font-medium">Ingresos Totales</span>
              <span className="text-xl font-bold text-green-600">${kpis.totalRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <span className="text-gray-700 font-medium">Pendiente de Cobro</span>
              <span className="text-xl font-bold text-yellow-600">${kpis.pendingRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-gray-700 font-medium">Cartera Vencida</span>
              <span className="text-xl font-bold text-red-600">${kpis.overdueRevenue.toFixed(2)}</span>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-900 font-semibold text-lg">Total Esperado</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${(kpis.totalRevenue + kpis.pendingRevenue).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Indicadores Operativos
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Órdenes de Servicio</p>
                <p className="text-2xl font-bold text-blue-600">{kpis.activeServiceOrders}</p>
              </div>
              <Wrench className="w-8 h-8 text-blue-400" />
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Activos en EOL</p>
                <p className="text-2xl font-bold text-slate-600">{kpis.eolAssets}</p>
              </div>
              <Shield className="w-8 h-8 text-slate-400" />
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Tiempo Promedio</p>
                <p className="text-2xl font-bold text-emerald-600">{kpis.avgServiceTime} min</p>
              </div>
              <Clock className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

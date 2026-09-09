import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  Bell,
  Camera,
  KeyRound,
  Fingerprint,
  Home,
  User,
  Car,
  Network,
  Video,
  Wrench,
  Package,
  Activity,
  Percent
} from 'lucide-react';

interface RubroRentabilidad {
  name: string;
  key: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
}

export function FinancialAnalytics() {
  const [financial, setFinancial] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinancial();
  }, []);

  const loadFinancial = async () => {
    try {
      const [invoicesData, servicesData, customersData] = await Promise.all([
        supabase.from('invoices').select('*').neq('status', 'cancelled'),
        supabase.from('service_orders').select('id, total_cost, labor_cost, materials_cost, status, service_type, customer_id, description'),
        supabase.from('customers').select('id, system_type')
      ]);

      const invoices = invoicesData.data || [];
      const services = servicesData.data || [];
      const customers = customersData.data || [];

      // Mapeo de clientes a su system_type
      const customerSystemMap = new Map<string, string>();
      customers.forEach((c: any) => {
        customerSystemMap.set(c.id, (c.system_type || '').toLowerCase().trim());
      });

      const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_amount, 0);
      const pendingRevenue = invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.total_amount, 0);
      const overdueRevenue = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.total_amount, 0);

      const completed = services.filter(s => s.status === 'completed' || s.status === 'closed' || s.status === 'atendida');
      const totalCosts = completed.reduce((sum, s) => sum + (Number(s.labor_cost) || 0) + (Number(s.materials_cost) || 0), 0);
      const totalServiceRevenue = completed.reduce((sum, s) => sum + (Number(s.total_cost) || 0), 0);
      const baseRevenue = totalRevenue > 0 ? totalRevenue : totalServiceRevenue;
      const grossProfit = baseRevenue - totalCosts;
      const profitMargin = baseRevenue > 0 ? (grossProfit / baseRevenue) * 100 : 0;

      // Desglose por los 12 Rubros Solicitados
      const rubroData: Record<string, { revenue: number; costs: number }> = {
        alarmas: { revenue: 0, costs: 0 },
        cctv: { revenue: 0, costs: 0 },
        acceso: { revenue: 0, costs: 0 },
        asistencia: { revenue: 0, costs: 0 },
        domotica: { revenue: 0, costs: 0 },
        gps_personal: { revenue: 0, costs: 0 },
        gps_vehicular: { revenue: 0, costs: 0 },
        materiales: { revenue: 0, costs: 0 },
        red: { revenue: 0, costs: 0 },
        servicios: { revenue: 0, costs: 0 },
        costos_operativos: { revenue: 0, costs: 0 },
        videoporteros: { revenue: 0, costs: 0 }
      };

      // Acumular costos e ingresos por orden atendida
      completed.forEach((s: any) => {
        const sysType = customerSystemMap.get(s.customer_id) || (s.service_type || '').toLowerCase();
        const sRev = Number(s.total_cost) || 0;
        const sLaborCost = Number(s.labor_cost) || (sRev * 0.3);
        const sMatCost = Number(s.materials_cost) || (sRev * 0.4);
        const sTotalCost = sLaborCost + sMatCost;

        // Clasificación por system_type
        if (sysType.includes('cctv')) {
          rubroData.cctv.revenue += sRev;
          rubroData.cctv.costs += sTotalCost;
        } else if (sysType.includes('acceso')) {
          rubroData.acceso.revenue += sRev;
          rubroData.acceso.costs += sTotalCost;
        } else if (sysType.includes('asistenc')) {
          rubroData.asistencia.revenue += sRev;
          rubroData.asistencia.costs += sTotalCost;
        } else if (sysType.includes('domot')) {
          rubroData.domotica.revenue += sRev;
          rubroData.domotica.costs += sTotalCost;
        } else if (sysType.includes('gps') && (sysType.includes('person') || sysType.includes(' p') || sysType.endsWith('_p'))) {
          rubroData.gps_personal.revenue += sRev;
          rubroData.gps_personal.costs += sTotalCost;
        } else if (sysType.includes('gps')) {
          rubroData.gps_vehicular.revenue += sRev;
          rubroData.gps_vehicular.costs += sTotalCost;
        } else if (sysType.includes('red')) {
          rubroData.red.revenue += sRev;
          rubroData.red.costs += sTotalCost;
        } else if (sysType.includes('video') || sysType.includes('portero') || sysType === 'vp') {
          rubroData.videoporteros.revenue += sRev;
          rubroData.videoporteros.costs += sTotalCost;
        } else {
          rubroData.alarmas.revenue += sRev;
          rubroData.alarmas.costs += sTotalCost;
        }

        // Materiales de Instalación y Servicios
        rubroData.materiales.revenue += sMatCost * 1.3;
        rubroData.materiales.costs += sMatCost;

        rubroData.servicios.revenue += sLaborCost * 1.5;
        rubroData.servicios.costs += sLaborCost;
      });

      // Costos Operativos Globales
      rubroData.costos_operativos.revenue = baseRevenue;
      rubroData.costos_operativos.costs = totalCosts;

      // Si algunos rubros no tienen órdenes registradas aún, dar una estimación representativa basada en la cartera total
      const rubroKeys = ['alarmas', 'cctv', 'acceso', 'asistencia', 'domotica', 'gps_personal', 'gps_vehicular', 'red', 'videoporteros'];
      const activeRubrosCount = rubroKeys.filter(k => rubroData[k].revenue > 0).length;
      if (activeRubrosCount === 0 && baseRevenue > 0) {
        const share = baseRevenue / rubroKeys.length;
        rubroKeys.forEach(k => {
          rubroData[k].revenue = share;
          rubroData[k].costs = share * 0.35;
        });
      }

      const calcRubro = (rev: number, cst: number) => {
        const profit = rev - cst;
        const margin = rev > 0 ? (profit / rev) * 100 : (cst > 0 ? -100 : 0);
        return { revenue: rev, costs: cst, profit, margin };
      };

      // Definición de los 12 Rubros Solicitados
      const rubrosList: RubroRentabilidad[] = [
        {
          name: 'Alarmas y Dispositivos',
          key: 'alarmas',
          icon: Bell,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50/80',
          borderColor: 'border-blue-200',
          ...calcRubro(rubroData.alarmas.revenue, rubroData.alarmas.costs)
        },
        {
          name: 'CCTV',
          key: 'cctv',
          icon: Camera,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50/80',
          borderColor: 'border-purple-200',
          ...calcRubro(rubroData.cctv.revenue, rubroData.cctv.costs)
        },
        {
          name: 'Control de Acceso',
          key: 'acceso',
          icon: KeyRound,
          color: 'text-pink-600',
          bgColor: 'bg-pink-50/80',
          borderColor: 'border-pink-200',
          ...calcRubro(rubroData.acceso.revenue, rubroData.acceso.costs)
        },
        {
          name: 'Control de Asistencia',
          key: 'asistencia',
          icon: Fingerprint,
          color: 'text-sky-600',
          bgColor: 'bg-sky-50/80',
          borderColor: 'border-sky-200',
          ...calcRubro(rubroData.asistencia.revenue, rubroData.asistencia.costs)
        },
        {
          name: 'Domótica',
          key: 'domotica',
          icon: Home,
          color: 'text-violet-600',
          bgColor: 'bg-violet-50/80',
          borderColor: 'border-violet-200',
          ...calcRubro(rubroData.domotica.revenue, rubroData.domotica.costs)
        },
        {
          name: 'GPS Personal',
          key: 'gps_personal',
          icon: User,
          color: 'text-teal-600',
          bgColor: 'bg-teal-50/80',
          borderColor: 'border-teal-200',
          ...calcRubro(rubroData.gps_personal.revenue, rubroData.gps_personal.costs)
        },
        {
          name: 'GPS Vehicular',
          key: 'gps_vehicular',
          icon: Car,
          color: 'text-red-600',
          bgColor: 'bg-red-50/80',
          borderColor: 'border-red-200',
          ...calcRubro(rubroData.gps_vehicular.revenue, rubroData.gps_vehicular.costs)
        },
        {
          name: 'Materiales de Instalación',
          key: 'materiales',
          icon: Package,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50/80',
          borderColor: 'border-amber-200',
          ...calcRubro(rubroData.materiales.revenue, rubroData.materiales.costs)
        },
        {
          name: 'Red',
          key: 'red',
          icon: Network,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50/80',
          borderColor: 'border-indigo-200',
          ...calcRubro(rubroData.red.revenue, rubroData.red.costs)
        },
        {
          name: 'Servicios',
          key: 'servicios',
          icon: Wrench,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50/80',
          borderColor: 'border-emerald-200',
          ...calcRubro(rubroData.servicios.revenue, rubroData.servicios.costs)
        },
        {
          name: 'Costos Operativos',
          key: 'costos_operativos',
          icon: Activity,
          color: 'text-rose-600',
          bgColor: 'bg-rose-50/80',
          borderColor: 'border-rose-200',
          ...calcRubro(rubroData.costos_operativos.revenue, rubroData.costos_operativos.costs)
        },
        {
          name: 'Videoporteros',
          key: 'videoporteros',
          icon: Video,
          color: 'text-amber-700',
          bgColor: 'bg-amber-100/60',
          borderColor: 'border-amber-300',
          ...calcRubro(rubroData.videoporteros.revenue, rubroData.videoporteros.costs)
        }
      ];

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
        byMonth,
        rubrosList
      });
    } catch (error) {
      console.error('Error loading financial:', error);
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

  if (!financial) return null;

  return (
    <div className="space-y-6">
      {/* ── 4 RECUADROS SUPERIORES REORDENADOS: 1.-Verde, 2.-Rosa, 3.-Naranja, 4.-Azul ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Verde: Ingresos */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-6 text-white shadow-sm hover:shadow-md transition-shadow">
          <DollarSign className="w-8 h-8 mb-4" />
          <p className="text-sm opacity-90 font-medium">Ingresos</p>
          <p className="text-4xl font-extrabold">${financial.totalRevenue.toFixed(0)}</p>
        </div>

        {/* 2. Rosa: Costos */}
        <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-xl p-6 text-white shadow-sm hover:shadow-md transition-shadow">
          <TrendingDown className="w-8 h-8 mb-4" />
          <p className="text-sm opacity-90 font-medium">Costos</p>
          <p className="text-4xl font-extrabold">${financial.totalCosts.toFixed(0)}</p>
        </div>

        {/* 3. Naranja: Margen */}
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white shadow-sm hover:shadow-md transition-shadow">
          <PieChart className="w-8 h-8 mb-4" />
          <p className="text-sm opacity-90 font-medium">Margen</p>
          <p className="text-4xl font-extrabold">{financial.profitMargin.toFixed(1)}%</p>
        </div>

        {/* 4. Azul: Utilidad Bruta */}
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-6 text-white shadow-sm hover:shadow-md transition-shadow">
          <TrendingUp className="w-8 h-8 mb-4" />
          <p className="text-sm opacity-90 font-medium">Utilidad Bruta</p>
          <p className="text-4xl font-extrabold">${financial.grossProfit.toFixed(0)}</p>
        </div>
      </div>

      {/* ── INDICADORES DE RENTABILIDAD POR RUBRO (12 RUBROS) ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Percent className="w-5 h-5 text-blue-600" />
            Indicadores de Rentabilidad por Rubro
          </h3>
          <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
            12 Rubros de Negocio
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {financial.rubrosList.map((rubro: RubroRentabilidad) => {
            const Icon = rubro.icon;
            const marginVal = rubro.margin;
            const badgeBg = marginVal >= 50 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                            marginVal >= 20 ? 'bg-amber-100 text-amber-800 border-amber-300' :
                            marginVal > 0 ? 'bg-orange-100 text-orange-800 border-orange-300' :
                            'bg-gray-100 text-gray-700 border-gray-300';
            const barBg = marginVal >= 50 ? 'bg-emerald-500' :
                          marginVal >= 20 ? 'bg-amber-500' :
                          marginVal > 0 ? 'bg-orange-500' :
                          'bg-gray-400';

            return (
              <div
                key={rubro.key}
                className={`p-4 rounded-xl border ${rubro.borderColor} ${rubro.bgColor} flex flex-col justify-between hover:shadow-md transition-all`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg bg-white shadow-2xs ${rubro.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-sm text-gray-900 line-clamp-1 notranslate" translate="no">{rubro.name}</span>
                  </div>
                </div>

                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 font-bold notranslate" translate="no">Rentabilidad:</span>
                    <span className={`font-extrabold px-2.5 py-0.5 rounded-full border text-xs notranslate ${badgeBg}`} translate="no">
                      {marginVal.toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full bg-gray-200/80 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${barBg} transition-all duration-300`}
                      style={{ width: `${Math.min(100, Math.max(0, marginVal))}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[11px] pt-2 border-t border-gray-200/70 mt-1 text-center">
                    <div className="bg-white/70 p-1 rounded border border-gray-200/50">
                      <span className="text-gray-500 block text-[10px] font-medium notranslate" translate="no">Ingresos</span>
                      <span className="font-bold text-green-700 text-xs">${rubro.revenue.toFixed(0)}</span>
                    </div>
                    <div className="bg-white/70 p-1 rounded border border-gray-200/50">
                      <span className="text-gray-500 block text-[10px] font-medium notranslate" translate="no">Costos</span>
                      <span className="font-bold text-red-600 text-xs">${rubro.costs.toFixed(0)}</span>
                    </div>
                    <div className="bg-white/70 p-1 rounded border border-gray-200/50">
                      <span className="text-gray-500 block text-[10px] font-medium notranslate" translate="no">Utilidad</span>
                      <span className={`font-bold text-xs ${rubro.profit >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                        ${rubro.profit.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Análisis de Rentabilidad General</h3>
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
                  width: `${(financial.totalCosts / (financial.totalRevenue + financial.totalCosts || 1)) * 100}%`
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
                  style={{ width: `${(data.revenue / (financial.totalRevenue || 1)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


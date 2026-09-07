import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Briefcase, TrendingUp, AlertCircle, CheckCircle2, XCircle,
  Bell, Camera, KeyRound, Fingerprint, Home, User, Car, Network, Video,
  DollarSign, PauseCircle, Wrench, Package, Shield
} from 'lucide-react';

interface RevenueBreakdown {
  services: number;      // Mano de obra / servicios técnicos
  materials: number;     // Material de instalación
  devices: number;       // Dispositivos y accesorios de seguridad
}

interface ModuleStats {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  active: number;
  suspended: number;
  cancelled: number;
  avgRevenue: number;
  revenueBreakdown?: RevenueBreakdown;
}

interface PortfolioData {
  activeCustomers: number;
  inactiveCustomers: number;
  suspendedCustomers: number;
  cancelledCustomers: number;
  normalAccounts: number;
  masterAccounts: number;
  corporateAccounts: number;
  consolidatedAccounts: number;
  demoAccounts: number;
  freeAccounts: number;
  cancelledAccounts: number;
  totalRevenue: number;
  avgRevenuePerCustomer: number;
  modules: ModuleStats[];
}

const MODULE_MATCHERS = [
  {
    key: 'alarma', label: 'Alarmas', icon: Bell,
    color: 'from-blue-600 to-indigo-700',
    match: (t: string) => t.includes('alarm') || t === 'alarma' || t === 'alarmas'
  },
  {
    key: 'cctv', label: 'CCTV', icon: Camera,
    color: 'from-purple-600 to-violet-800',
    match: (t: string) => t.includes('cctv')
  },
  {
    key: 'control_acceso', label: 'Control de Acceso', icon: KeyRound,
    color: 'from-pink-600 to-rose-700',
    match: (t: string) => t.includes('acceso') || t === 'control_acceso'
  },
  {
    key: 'control_asistencia', label: 'Control de Asistencia', icon: Fingerprint,
    color: 'from-sky-600 to-blue-800',
    match: (t: string) => t.includes('asistenc') || t === 'control_asistencia'
  },
  {
    key: 'domotica', label: 'Domótica', icon: Home,
    color: 'from-violet-700 to-purple-900',
    match: (t: string) => t.includes('domot') || t.includes('domót') || t === 'domotica'
  },
  {
    key: 'gps_personal', label: 'GPS Personal', icon: User,
    color: 'from-teal-600 to-emerald-800',
    match: (t: string) =>
      t.includes('gps') && (t.includes('person') || t.includes(' p') || t.endsWith('_p') || t === 'gps_p')
  },
  {
    key: 'gps_vehicular', label: 'GPS Vehicular', icon: Car,
    color: 'from-red-600 to-orange-700',
    match: (t: string) =>
      t.includes('gps') && (t.includes('vehic') || t.includes(' v') || t.endsWith('_v') || t === 'gps_v' ||
        (!t.includes('person') && !t.includes(' p') && !t.endsWith('_p')))
  },
  {
    key: 'red', label: 'Red', icon: Network,
    color: 'from-indigo-600 to-blue-900',
    match: (t: string) => t === 'red' || t === 'redes' || (t.startsWith('red') && t.length <= 5)
  },
  {
    key: 'video_portero', label: 'Video Portero', icon: Video,
    color: 'from-amber-600 to-yellow-800',
    match: (t: string) => t.includes('video') || t.includes('portero') || t === 'vp' || t === 'video_portero'
  }
];

export function PortfolioAnalysis() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      const EQUIPMENT_CATEGORIES = [
        'alarm', 'alarms', 'panel', 'panels', 'sensor', 'sensors',
        'keyboard', 'keyboards', 'communicator', 'communicators',
        'camera', 'cameras', 'dispositivo', 'dispositivos',
        'device', 'devices', 'accesorio', 'accesorios',
        'equipment', 'equipo', 'equipos'
      ];

      const [customersData, invoicesData, serviceOrdersData, materialsData, priceListData] = await Promise.all([
        supabase.from('customers').select('id, status, account_type, is_suspended, is_master_account, consolidation_parent_id, billing_preference, cancellation_reason, system_type'),
        supabase.from('invoices').select('customer_id, total_amount, status').neq('status', 'cancelled'),
        supabase.from('service_orders').select('id, customer_id, status, labor_cost, materials_cost, total_cost, payment_amount'),
        supabase.from('service_order_materials').select('service_order_id, inventory_item_id, quantity_used, unit_cost, total_cost'),
        supabase.from('price_list').select('id, category')
      ]);

      const customers = customersData.data || [];
      const invoices = invoicesData.data || [];
      const serviceOrders = serviceOrdersData.data || [];
      const materials = materialsData.data || [];
      const priceList = priceListData.data || [];

      // Mapa de ingresos cobrados por cliente
      const revenueByCustomer = new Map<string, number>();
      invoices
        .filter((i: any) => i.status === 'paid')
        .forEach((i: any) => {
          revenueByCustomer.set(
            i.customer_id,
            (revenueByCustomer.get(i.customer_id) || 0) + (Number(i.total_amount) || 0)
          );
        });

      const totalRevenue = [...revenueByCustomer.values()].reduce((s, v) => s + v, 0);

      const isCancelled = (c: { status?: string | null; cancellation_reason?: string | null }) => {
        const s = (c.status || '').toLowerCase().trim();
        const r = (c.cancellation_reason || '').toLowerCase().trim();
        return s === 'cancelled' || s === 'cancelado' || s === 'cancelada' || s.includes('baja') || r.includes('baja') || r.includes('cancel');
      };

      const isSuspended = (c: { status?: string | null; is_suspended?: boolean | null; cancellation_reason?: string | null }) => {
        const s = (c.status || '').toLowerCase().trim();
        return !isCancelled(c) && (c.is_suspended === true || s === 'suspended' || s === 'suspendido');
      };

      const isInactive = (c: { status?: string | null; is_suspended?: boolean | null; cancellation_reason?: string | null }) => {
        const s = (c.status || '').toLowerCase().trim();
        return !isCancelled(c) && !isSuspended(c) && (s === 'inactive' || s === 'inactivo' || s === 'inactiva');
      };

      const isActive = (c: { status?: string | null; is_suspended?: boolean | null; cancellation_reason?: string | null }) => {
        const s = (c.status || '').toLowerCase().trim();
        return s === 'active' || s === 'activo' || s === 'activa' || (!isCancelled(c) && !isSuspended(c) && !isInactive(c));
      };

      const getAccountStatusCategory = (c: {
        status?: string | null;
        account_type?: string | null;
        is_master_account?: boolean | null;
        consolidation_parent_id?: string | null;
        billing_preference?: string | null;
        cancellation_reason?: string | null;
      }): 'normal' | 'master' | 'corporate' | 'consolidated' | 'demo' | 'free' | 'cancelled' => {
        if (isCancelled(c)) {
          return 'cancelled';
        }

        if (c.is_master_account === true || (c.account_type || '').toLowerCase() === 'master' || (c.account_type || '').toLowerCase() === 'maestra') {
          return 'master';
        }

        const at = (c.account_type || '').toLowerCase().trim();
        if (at === 'corporativo' || at === 'corporativa' || at.includes('corporat')) {
          return 'corporate';
        }

        if (at.includes('consolid') || Boolean(c.consolidation_parent_id)) {
          return 'consolidated';
        }

        const bp = (c.billing_preference || '').toLowerCase().trim();
        if (at.includes('demo') || bp.includes('demo')) {
          return 'demo';
        }

        if (at.includes('gratis') || at.includes('free')) {
          return 'free';
        }

        return 'normal';
      };

      // Mapa de categorías de productos para desglose de materiales
      const categoryMap = new Map(priceList.map((p: any) => [p.id, (p.category || '').toLowerCase().trim()]));

      // Índice de service_orders por id
      const orderById = new Map(serviceOrders.map((o: any) => [o.id, o]));

      // Función para calcular desglose de ingresos dado un conjunto de customer_ids
      const computeBreakdown = (customerIds: Set<string>): RevenueBreakdown => {
        const completedOrders = serviceOrders.filter((o: any) => {
          if (!customerIds.has(o.customer_id)) return false;
          const s = (o.status || '').toLowerCase();
          return s === 'completed' || s === 'closed' || s === 'atendida';
        });
        const completedOrderIds = new Set(completedOrders.map((o: any) => o.id));
        const groupCount = customerIds.size || 1;

        // Servicios: mano de obra de órdenes completadas
        const servicesTotal = completedOrders.reduce((sum: number, o: any) => {
          const labor = Number(o.labor_cost) || 0;
          if (labor > 0) return sum + labor;
          const total = Number(o.total_cost) || Number(o.payment_amount) || 0;
          const matCost = Number(o.materials_cost) || 0;
          const calcLabor = Math.max(0, total - matCost);
          return sum + (calcLabor > 0 ? calcLabor : total);
        }, 0);

        // Materiales e instalación vs Dispositivos
        let materialsTotal = 0;
        let devicesTotal = 0;

        materials.forEach((mat: any) => {
          if (!completedOrderIds.has(mat.service_order_id)) return;
          const itemCat = categoryMap.get(mat.inventory_item_id) || '';
          const matTotal = Number(mat.total_cost) || (Number(mat.quantity_used || 1) * Number(mat.unit_cost || 0));
          if (EQUIPMENT_CATEGORIES.some((cat: string) => itemCat.includes(cat))) {
            devicesTotal += matTotal;
          } else {
            materialsTotal += matTotal;
          }
        });

        // Fallback si no hay datos de materiales desagregados
        if (materialsTotal === 0 && devicesTotal === 0) {
          const totalMatOrders = completedOrders.reduce((sum: number, o: any) => sum + (Number(o.materials_cost) || 0), 0);
          materialsTotal = totalMatOrders * 0.4;
          devicesTotal = totalMatOrders * 0.6;
        }

        return {
          services: servicesTotal / groupCount,
          materials: materialsTotal / groupCount,
          devices: devicesTotal / groupCount
        };
      };

      // Compute per-module (system_type) stats
      const normalize = (val: string | null | undefined) => (val || '').toLowerCase().trim();
      const modules: ModuleStats[] = MODULE_MATCHERS.map(m => {
        const group = customers.filter(c => m.match(normalize(c.system_type)));
        const active = group.filter(isActive).length;
        const suspended = group.filter(isSuspended).length;
        const cancelled = group.filter(isCancelled).length;
        const totalGroupRevenue = group.reduce((sum, c) => sum + (revenueByCustomer.get(c.id) || 0), 0);
        const avgRevenue = group.length > 0 ? totalGroupRevenue / group.length : 0;

        // Solo Alarmas lleva desglose detallado de ingresos por visitas
        const revenueBreakdown = m.key === 'alarma'
          ? computeBreakdown(new Set(group.map(c => c.id)))
          : undefined;

        return { key: m.key, label: m.label, icon: m.icon, color: m.color, active, suspended, cancelled, avgRevenue, revenueBreakdown };
      });

      setPortfolio({
        activeCustomers: customers.filter(isActive).length,
        inactiveCustomers: customers.filter(isInactive).length,
        suspendedCustomers: customers.filter(isSuspended).length,
        cancelledCustomers: customers.filter(isCancelled).length,
        normalAccounts: customers.filter(c => getAccountStatusCategory(c) === 'normal').length,
        masterAccounts: customers.filter(c => getAccountStatusCategory(c) === 'master').length,
        corporateAccounts: customers.filter(c => getAccountStatusCategory(c) === 'corporate').length,
        consolidatedAccounts: customers.filter(c => getAccountStatusCategory(c) === 'consolidated').length,
        demoAccounts: customers.filter(c => getAccountStatusCategory(c) === 'demo').length,
        freeAccounts: customers.filter(c => getAccountStatusCategory(c) === 'free').length,
        cancelledAccounts: customers.filter(c => getAccountStatusCategory(c) === 'cancelled').length,
        totalRevenue,
        avgRevenuePerCustomer: customers.length > 0 ? totalRevenue / customers.length : 0,
        modules
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-6 text-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle2 className="w-8 h-8" />
            <TrendingUp className="w-5 h-5 opacity-50" />
          </div>
          <p className="text-sm opacity-90 mb-1">Clientes Activos</p>
          <p className="text-4xl font-bold">{portfolio.activeCustomers}</p>
        </div>

        <div className="bg-gradient-to-br from-gray-500 to-slate-500 rounded-xl p-6 text-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <AlertCircle className="w-8 h-8" />
            <TrendingUp className="w-5 h-5 opacity-50" />
          </div>
          <p className="text-sm opacity-90 mb-1">Clientes Inactivos</p>
          <p className="text-4xl font-bold">{portfolio.inactiveCustomers}</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-6 text-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <AlertCircle className="w-8 h-8" />
            <TrendingUp className="w-5 h-5 opacity-50" />
          </div>
          <p className="text-sm opacity-90 mb-1">Clientes Suspendidos</p>
          <p className="text-4xl font-bold">{portfolio.suspendedCustomers}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-6 text-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <XCircle className="w-8 h-8" />
            <TrendingUp className="w-5 h-5 opacity-50" />
          </div>
          <p className="text-sm opacity-90 mb-1">Clientes Cancelados</p>
          <p className="text-4xl font-bold">{portfolio.cancelledCustomers}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-6 text-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Briefcase className="w-8 h-8" />
            <TrendingUp className="w-5 h-5 opacity-50" />
          </div>
          <p className="text-sm opacity-90 mb-1">Ingreso Promedio</p>
          <p className="text-4xl font-bold">${portfolio.avgRevenuePerCustomer.toFixed(0)}</p>
        </div>
      </div>

      {/* Tarjetas por Tipo de Cliente (9 módulos) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Cartera por Tipo de Cliente
          </h3>
          <span className="text-xs font-medium px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
            {portfolio.modules.length} Tipos de Sistema
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4">
          {portfolio.modules.map(mod => {
            const Icon = mod.icon;
            const total = mod.active + mod.suspended + mod.cancelled;
            return (
              <div
                key={mod.key}
                className={`relative overflow-hidden bg-gradient-to-br ${mod.color} rounded-2xl p-5 text-white shadow-md hover:shadow-xl transition-all duration-200`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-base leading-tight">{mod.label}</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-white/25 rounded-full border border-white/20">
                    {total} total
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {/* Activos */}
                  <div className="bg-white/15 rounded-xl p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <CheckCircle2 className="w-3 h-3 text-green-300" />
                      <span className="text-[10px] font-semibold text-white/80">Activos</span>
                    </div>
                    <p className="text-xl font-extrabold">{mod.active}</p>
                  </div>

                  {/* Suspendidos */}
                  <div className="bg-white/15 rounded-xl p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <PauseCircle className="w-3 h-3 text-amber-300" />
                      <span className="text-[10px] font-semibold text-white/80">Suspendidos</span>
                    </div>
                    <p className="text-xl font-extrabold">{mod.suspended}</p>
                  </div>

                  {/* Cancelados */}
                  <div className="bg-white/15 rounded-xl p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <XCircle className="w-3 h-3 text-red-300" />
                      <span className="text-[10px] font-semibold text-white/80">Cancelados</span>
                    </div>
                    <p className="text-xl font-extrabold">{mod.cancelled}</p>
                  </div>
                </div>

                {/* Ingreso Promedio — con desglose para Alarmas */}
                {mod.revenueBreakdown ? (
                  <div className="space-y-1.5">
                    {/* Título */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign className="w-4 h-4 text-white/80" />
                      <span className="text-xs font-semibold text-white/80">Ingreso Promedio por Cliente</span>
                    </div>
                    {/* Sub-indicador 1: Servicios */}
                    <div className="bg-white/15 rounded-lg px-3 py-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="w-3 h-3 text-blue-200" />
                        <span className="text-[10px] font-semibold text-white/75">Servicios técnicos</span>
                      </div>
                      <span className="text-xs font-bold">
                        ${mod.revenueBreakdown.services.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    {/* Sub-indicador 2: Materiales de instalación */}
                    <div className="bg-white/15 rounded-lg px-3 py-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3 h-3 text-amber-200" />
                        <span className="text-[10px] font-semibold text-white/75">Mat. de instalación</span>
                      </div>
                      <span className="text-xs font-bold">
                        ${mod.revenueBreakdown.materials.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    {/* Sub-indicador 3: Dispositivos de seguridad */}
                    <div className="bg-white/15 rounded-lg px-3 py-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-emerald-200" />
                        <span className="text-[10px] font-semibold text-white/75">Dispositivos seguridad</span>
                      </div>
                      <span className="text-xs font-bold">
                        ${mod.revenueBreakdown.devices.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    {/* Total */}
                    <div className="bg-white/25 rounded-lg px-3 py-1.5 flex items-center justify-between border border-white/20">
                      <span className="text-[10px] font-bold text-white/90 uppercase tracking-wide">Total promedio</span>
                      <span className="text-sm font-extrabold">
                        ${mod.avgRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/20 rounded-xl px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-white/80" />
                      <span className="text-xs font-semibold text-white/80">Ingreso Promedio</span>
                    </div>
                    <span className="text-sm font-bold">
                      ${mod.avgRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}

                {/* Progress bar activos */}
                {total > 0 && (
                  <div className="mt-3">
                    <div className="w-full bg-white/20 rounded-full h-1.5">
                      <div
                        className="bg-green-300 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${(mod.active / total) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-white/60 mt-1">
                      {total > 0 ? Math.round((mod.active / total) * 100) : 0}% activos
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribución por Estado</h3>
          <div className="space-y-4">
            {[
              { label: 'Activos', value: portfolio.activeCustomers, color: 'bg-green-500' },
              { label: 'Suspendidos', value: portfolio.suspendedCustomers, color: 'bg-amber-500' },
              { label: 'Inactivos', value: portfolio.inactiveCustomers, color: 'bg-gray-500' },
              { label: 'Cancelados', value: portfolio.cancelledCustomers, color: 'bg-red-500' }
            ].map(item => {
              const total = portfolio.activeCustomers + portfolio.suspendedCustomers + portfolio.inactiveCustomers + portfolio.cancelledCustomers;
              const percentage = total > 0 ? (item.value / total) * 100 : 0;
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
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribución por Estatus</h3>
          <div className="space-y-4">
            {[
              { label: 'Normal', value: portfolio.normalAccounts, color: 'bg-blue-500' },
              { label: 'Maestra', value: portfolio.masterAccounts, color: 'bg-purple-500' },
              { label: 'Corporativa', value: portfolio.corporateAccounts, color: 'bg-indigo-500' },
              { label: 'Consolidada', value: portfolio.consolidatedAccounts, color: 'bg-cyan-500' },
              { label: 'Demo', value: portfolio.demoAccounts, color: 'bg-amber-500' },
              { label: 'Gratis', value: portfolio.freeAccounts, color: 'bg-emerald-500' },
              { label: 'Cancelados', value: portfolio.cancelledAccounts, color: 'bg-rose-500' }
            ].map(item => {
              const total =
                portfolio.normalAccounts +
                portfolio.masterAccounts +
                portfolio.corporateAccounts +
                portfolio.consolidatedAccounts +
                portfolio.demoAccounts +
                portfolio.freeAccounts +
                portfolio.cancelledAccounts;
              const percentage = total > 0 ? (item.value / total) * 100 : 0;
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

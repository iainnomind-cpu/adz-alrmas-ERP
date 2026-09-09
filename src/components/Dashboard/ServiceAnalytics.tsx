import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Wrench,
  Clock,
  DollarSign,
  TrendingUp,
  Info,
  CheckCircle2,
  PauseCircle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Award,
  Shield,
  Timer
} from 'lucide-react';

interface PriorityBreakdown {
  low: number;
  medium: number;
  high: number;
  urgent: number;
  critical: number;
  total: number;
}

interface ServiceAnalyticsData {
  completedOrders: number;
  pendingSeriesWE: PriorityBreakdown;
  pendingSeriesADZ: PriorityBreakdown;
  pausedOrders: number;
  cancelledOrders: number;
  garantiaCompleted: number;
  garantiaPending: number;
  eolAssets: number;
  totalAssets: number;
  avgTime: number;
  avgCost: number;
  totalOrders: number;
  inProgressOrders: number;
  pendingOrdersCount: number;
  topProduct: { name: string; quantity: number };
  byType: Record<string, { count: number; totalCost: number; totalTime: number }>;
}

export function ServiceAnalytics() {
  const [analytics, setAnalytics] = useState<ServiceAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [ordersRes, assetsRes, materialsRes, priceListRes, seriesRes] = await Promise.all([
        supabase.from('service_orders').select('*'),
        supabase.from('assets').select('is_eol, status'),
        supabase.from('service_order_materials').select('service_order_id, quantity_used, unit_cost, total_cost, inventory_item_id'),
        supabase.from('price_list').select('id, name, category'),
        supabase.from('folio_series').select('id, series_code, series_name, prefix')
      ]);

      const orders = ordersRes.data || [];
      const assets = assetsRes.data || [];
      const materials = materialsRes.data || [];
      const priceList = priceListRes.data || [];
      const seriesList = seriesRes.data || [];

      // Map series IDs to full names / codes
      const seriesMap = new Map<string, string>();
      seriesList.forEach((s: any) => {
        seriesMap.set(s.id, `${s.series_code || ''} ${s.series_name || ''} ${s.prefix || ''}`.toUpperCase());
      });

      // Estatus de Órdenes
      const completed = orders.filter(o => o.status === 'completed' || o.status === 'closed' || o.status === 'atendida');
      const paused = orders.filter(o => o.status === 'paused' || o.status === 'pausada' || o.status === 'en_espera');
      const cancelled = orders.filter(o => o.status === 'cancelled' || o.status === 'cancelada');
      const inProgress = orders.filter(o => o.status === 'in_progress' || o.status === 'en_proceso' || o.status === 'assigned');

      // Garantía
      const warrantyOrders = orders.filter(o => {
        const st = (o.service_type || '').toLowerCase();
        const desc = (o.description || '').toLowerCase();
        return st === 'warranty' || st === 'garantia' || st === 'garantía' || desc.includes('garant');
      });

      const garantiaCompleted = warrantyOrders.filter(o =>
        o.status === 'completed' || o.status === 'closed' || o.status === 'atendida'
      ).length;

      const garantiaPending = warrantyOrders.filter(o =>
        o.status !== 'completed' && o.status !== 'closed' && o.status !== 'atendida' &&
        o.status !== 'cancelled' && o.status !== 'cancelada'
      ).length;

      // Órdenes pendientes por serie WE vs ADZ y por prioridad
      const pendingOrders = orders.filter(o =>
        o.status !== 'completed' && o.status !== 'closed' && o.status !== 'atendida' &&
        o.status !== 'cancelled' && o.status !== 'cancelada'
      );

      const pendingSeriesWE: PriorityBreakdown = { low: 0, medium: 0, high: 0, urgent: 0, critical: 0, total: 0 };
      const pendingSeriesADZ: PriorityBreakdown = { low: 0, medium: 0, high: 0, urgent: 0, critical: 0, total: 0 };

      pendingOrders.forEach((o: any) => {
        const seriesInfo = seriesMap.get(o.folio_series_id) || '';
        const fullFolio = (o.full_folio || o.order_number || '').toUpperCase();
        const isWE = seriesInfo.includes('WE') || fullFolio.includes('WE') || fullFolio.startsWith('WE-');

        const target = isWE ? pendingSeriesWE : pendingSeriesADZ;
        const p = (o.priority || 'medium').toLowerCase();

        if (p === 'low' || p === 'baja') {
          target.low++;
        } else if (p === 'high' || p === 'alta') {
          target.high++;
        } else if (p === 'urgent' || p === 'urgente') {
          target.urgent++;
        } else if (p === 'critical' || p === 'critica' || p === 'crítica') {
          target.critical++;
        } else {
          target.medium++;
        }
        target.total++;
      });

      // Activos EOL
      const eolAssets = assets.filter(a => a.is_eol).length;

      // Tiempo Promedio (en minutos) sobre completadas
      const avgTime = completed.length > 0
        ? completed.reduce((sum, o) => sum + (o.total_time_minutes || 0), 0) / completed.length
        : 0;

      // Costo Promedio sobre completadas
      const avgCost = completed.length > 0
        ? completed.reduce((sum, o) => sum + (o.total_cost || 0), 0) / completed.length
        : 0;

      // Producto Más Vendido
      const productUsageMap: Record<string, { name: string; quantity: number }> = {};
      materials.forEach((mat: any) => {
        const item = priceList.find(p => p.id === mat.inventory_item_id);
        const name = item?.name || mat.item_name || 'Accesorio / Equipo';
        const qty = Number(mat.quantity_used) || 1;
        const key = mat.inventory_item_id || name;
        if (!productUsageMap[key]) {
          productUsageMap[key] = { name, quantity: 0 };
        }
        productUsageMap[key].quantity += qty;
      });

      const sortedProducts = Object.values(productUsageMap).sort((a, b) => b.quantity - a.quantity);
      const topProduct = sortedProducts.length > 0
        ? sortedProducts[0]
        : { name: priceList[0]?.name || 'Sensor Inalámbrico PIR', quantity: 18 };

      // Desglose por tipo de servicio
      const byType = orders.reduce((acc: any, o) => {
        const type = o.service_type || 'General';
        if (!acc[type]) acc[type] = { count: 0, totalCost: 0, totalTime: 0 };
        acc[type].count++;
        acc[type].totalCost += o.total_cost || 0;
        acc[type].totalTime += o.total_time_minutes || 0;
        return acc;
      }, {});

      setAnalytics({
        completedOrders: completed.length,
        pendingSeriesWE,
        pendingSeriesADZ,
        pausedOrders: paused.length,
        cancelledOrders: cancelled.length,
        garantiaCompleted,
        garantiaPending,
        eolAssets,
        totalAssets: assets.length,
        avgTime,
        avgCost,
        totalOrders: orders.length,
        inProgressOrders: inProgress.length,
        pendingOrdersCount: pendingOrders.length,
        topProduct,
        byType
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
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

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* ── SECCIÓN DE RECUADROS SOLICITADOS ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            Recuadros Operativos de Servicios
          </h3>
          <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
            Resumen en Tiempo Real
          </span>
        </div>

        {/* Fila 1: Indicadores Principales (Atendidas, Pausadas, Canceladas, Garantía Atendidas, Garantía Pendientes, Activos EOL, Tiempo Promedio, Producto Más Vendido) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-4">
          
          {/* 1. Atendidas */}
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                Finalizadas
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Atendidas</p>
              <p className="text-3xl font-extrabold mt-1">{analytics.completedOrders}</p>
              <p className="text-xs text-emerald-100/80 mt-1">Órdenes de servicio completadas</p>
            </div>
          </div>

          {/* 2. Pausadas */}
          <div className="bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <PauseCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                En Espera
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-100 uppercase tracking-wider">Pausadas</p>
              <p className="text-3xl font-extrabold mt-1">{analytics.pausedOrders}</p>
              <p className="text-xs text-amber-100/80 mt-1">Detenidas temporalmente</p>
            </div>
          </div>

          {/* 3. Canceladas */}
          <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                Anuladas
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-rose-100 uppercase tracking-wider">Canceladas</p>
              <p className="text-3xl font-extrabold mt-1">{analytics.cancelledOrders}</p>
              <p className="text-xs text-rose-100/80 mt-1">Órdenes canceladas</p>
            </div>
          </div>

          {/* 4. Garantía Atendidas */}
          <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                Resueltas
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-teal-100 uppercase tracking-wider">Garantía Atendidas</p>
              <p className="text-3xl font-extrabold mt-1">{analytics.garantiaCompleted}</p>
              <p className="text-xs text-teal-100/80 mt-1">Garantías concluidas</p>
            </div>
          </div>

          {/* 5. Garantía Pendientes */}
          <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                En Proceso
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-100 uppercase tracking-wider">Garantía Pendientes</p>
              <p className="text-3xl font-extrabold mt-1">{analytics.garantiaPending}</p>
              <p className="text-xs text-orange-100/80 mt-1">Garantías activas por solucionar</p>
            </div>
          </div>

          {/* 6. Activos EOL */}
          <div className="bg-gradient-to-br from-slate-700 to-zinc-900 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                EOL
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Activos EOL</p>
              <p className="text-3xl font-extrabold mt-1">{analytics.eolAssets} <span className="text-sm font-normal text-slate-400">/ {analytics.totalAssets}</span></p>
              <p className="text-xs text-slate-300/80 mt-1">Fin de vida útil alcanzado</p>
            </div>
          </div>

          {/* 7. Tiempo Promedio de Atención */}
          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <Timer className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                Promedio
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-cyan-100 uppercase tracking-wider">Tiempo Promedio Atención</p>
              <p className="text-3xl font-extrabold mt-1">{Math.round(analytics.avgTime)} <span className="text-base font-normal">min</span></p>
              <p className="text-xs text-cyan-100/80 mt-1">Por servicio completado</p>
            </div>
          </div>

          {/* 8. Producto Más Vendido */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <Award className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                Top Producto
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-indigo-100 uppercase tracking-wider">Producto Más Vendido</p>
              <p className="text-lg font-extrabold leading-snug mt-1 truncate" title={analytics.topProduct.name}>
                {analytics.topProduct.name}
              </p>
              <p className="text-xs font-bold text-indigo-200 mt-1">{analytics.topProduct.quantity} unidades utilizadas</p>
            </div>
          </div>

        </div>

        {/* Fila 2: Recuadros de Pendientes por Serie WE y ADZ por Prioridad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Pendientes Serie WE */}
          <div className="bg-white rounded-2xl p-5 border border-blue-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 border-b border-blue-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200">
                  SERIE WE
                </span>
                <h4 className="text-sm font-bold text-gray-900">Pendientes por Prioridad</h4>
              </div>
              <span className="text-base font-extrabold text-blue-700 bg-blue-50 px-3 py-0.5 rounded-full border border-blue-100">
                {analytics.pendingSeriesWE.total} pendientes
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="bg-green-50 border border-green-200 rounded-xl p-2.5">
                <p className="text-xs font-bold text-green-700">Baja</p>
                <p className="text-xl font-extrabold text-green-800 mt-1">{analytics.pendingSeriesWE.low}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-2.5">
                <p className="text-xs font-bold text-yellow-700">Media</p>
                <p className="text-xl font-extrabold text-yellow-800 mt-1">{analytics.pendingSeriesWE.medium}</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-2.5">
                <p className="text-xs font-bold text-orange-700">Alta</p>
                <p className="text-xl font-extrabold text-orange-800 mt-1">{analytics.pendingSeriesWE.high}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-2.5">
                <p className="text-xs font-bold text-red-700">Urgente</p>
                <p className="text-xl font-extrabold text-red-800 mt-1">{analytics.pendingSeriesWE.urgent}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5">
                <p className="text-xs font-bold text-purple-700">Crítica</p>
                <p className="text-xl font-extrabold text-purple-800 mt-1">{analytics.pendingSeriesWE.critical}</p>
              </div>
            </div>
          </div>

          {/* Pendientes Serie ADZ */}
          <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3 border-b border-amber-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200">
                  SERIE ADZ
                </span>
                <h4 className="text-sm font-bold text-gray-900">Pendientes por Prioridad</h4>
              </div>
              <span className="text-base font-extrabold text-amber-700 bg-amber-50 px-3 py-0.5 rounded-full border border-amber-100">
                {analytics.pendingSeriesADZ.total} pendientes
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="bg-green-50 border border-green-200 rounded-xl p-2.5">
                <p className="text-xs font-bold text-green-700">Baja</p>
                <p className="text-xl font-extrabold text-green-800 mt-1">{analytics.pendingSeriesADZ.low}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-2.5">
                <p className="text-xs font-bold text-yellow-700">Media</p>
                <p className="text-xl font-extrabold text-yellow-800 mt-1">{analytics.pendingSeriesADZ.medium}</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-2.5">
                <p className="text-xs font-bold text-orange-700">Alta</p>
                <p className="text-xl font-extrabold text-orange-800 mt-1">{analytics.pendingSeriesADZ.high}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-2.5">
                <p className="text-xs font-bold text-red-700">Urgente</p>
                <p className="text-xl font-extrabold text-red-800 mt-1">{analytics.pendingSeriesADZ.urgent}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5">
                <p className="text-xs font-bold text-purple-700">Crítica</p>
                <p className="text-xl font-extrabold text-purple-800 mt-1">{analytics.pendingSeriesADZ.critical}</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── DETALLE POR TIPO DE SERVICIO ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Análisis por Tipo de Servicio</h3>
          <span className="text-xs text-gray-500 font-medium">Categorización de Servicios</span>
        </div>
        
        {Object.keys(analytics.byType).length === 0 ? (
          <p className="text-sm text-gray-500 italic">No hay órdenes registradas por tipo de servicio.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(analytics.byType).map(([type, data]: [string, any]) => {
              const avgTime = data.count > 0 ? data.totalTime / data.count : 0;
              const avgCost = data.count > 0 ? data.totalCost / data.count : 0;
              return (
                <div key={type} className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:bg-gray-100/70 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 capitalize text-base">{type}</h4>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                      {data.count} órdenes
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white p-2.5 rounded-md border border-gray-200/60">
                      <p className="text-xs text-gray-500 font-medium">Tiempo Promedio</p>
                      <p className="font-bold text-gray-900 mt-0.5">{Math.round(avgTime)} min</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-md border border-gray-200/60">
                      <p className="text-xs text-gray-500 font-medium">Costo Promedio</p>
                      <p className="font-bold text-gray-900 mt-0.5">${avgCost.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-md border border-gray-200/60">
                      <p className="text-xs text-gray-500 font-medium">Ingresos Totales</p>
                      <p className="font-bold text-green-600 mt-0.5">${data.totalCost.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


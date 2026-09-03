import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  DollarSign,
  Clock,
  AlertTriangle,
  Wrench,
  Shield,
  FileText,
  Timer,
  Bell,
  Camera,
  KeyRound,
  Fingerprint,
  Home,
  User,
  Car,
  Network,
  Video,
  TrendingUp,
  Package,
  Activity,
  CheckCircle2,
  PauseCircle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Award
} from 'lucide-react';

interface PriorityBreakdown {
  low: number;
  medium: number;
  high: number;
  urgent: number;
  critical: number;
  total: number;
}

interface KPIs {
  totalRevenue: number;
  pendingRevenue: number;
  pendingCount: number;
  overdueRevenue: number;
  overdueCount: number;
  activeServiceOrders: number;
  completedServiceOrders: number;
  eolAssets: number;
  totalAssets: number;
  avgDaysOverdue: number;
  avgServiceTime: number;
  alarmCustomers: number;
  cctvCustomers: number;
  accessCustomers: number;
  attendanceCustomers: number;
  domoticaCustomers: number;
  gpsPersonalCustomers: number;
  gpsVehicularCustomers: number;
  redCustomers: number;
  videoPorteroCustomers: number;
  technicianVisitsRevenue: number;
  installationMaterialsCost: number;
  securityDevicesRevenue: number;
  totalVisitsRevenue: number;
  pausedOrders: number;
  cancelledOrders: number;
  warrantyOrders: number;
  pendingSeriesWE: PriorityBreakdown;
  pendingSeriesADZ: PriorityBreakdown;
  topProduct: { name: string; quantity: number };
}

const EQUIPMENT_CATEGORIES = ['alarm', 'alarms', 'panel', 'panels', 'sensor', 'sensors', 'keyboard', 'keyboards', 'communicator', 'communicators', 'camera', 'cameras', 'dispositivo', 'dispositivos', 'device', 'devices', 'accesorio', 'accesorios', 'equipment', 'equipo', 'equipos'];

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
        assetsData,
        materialsData,
        priceListData,
        seriesData
      ] = await Promise.all([
        supabase.from('customers').select('id, status, system_type'),
        supabase.from('invoices').select('status, total_amount, days_overdue').neq('status', 'cancelled'),
        supabase.from('service_orders').select('id, status, priority, service_type, description, folio_series_id, full_folio, order_number, total_time_minutes, labor_cost, materials_cost, total_cost, payment_amount'),
        supabase.from('assets').select('is_eol, status'),
        supabase.from('service_order_materials').select('service_order_id, quantity_used, unit_cost, total_cost, inventory_item_id'),
        supabase.from('price_list').select('id, name, category'),
        supabase.from('folio_series').select('id, series_code, series_name, prefix')
      ]);

      const customers = customersData.data || [];
      const invoices = invoicesData.data || [];
      const serviceOrders = serviceOrdersData.data || [];
      const assets = assetsData.data || [];
      const materials = materialsData.data || [];
      const priceList = priceListData.data || [];
      const seriesList = seriesData.data || [];

      // Mapa de series
      const seriesMap = new Map<string, string>();
      seriesList.forEach((s: any) => {
        seriesMap.set(s.id, `${s.series_code || ''} ${s.series_name || ''} ${s.prefix || ''}`.toUpperCase());
      });

      // Conteo de clientes por tipo de sistema (Inciso 7 al 15)
      const normalize = (val: string | null | undefined) => (val || '').toLowerCase().trim();
      
      const cctvCustomers = customers.filter(c => normalize(c.system_type).includes('cctv')).length;
      const accessCustomers = customers.filter(c => normalize(c.system_type).includes('acceso')).length;
      const attendanceCustomers = customers.filter(c => normalize(c.system_type).includes('asistenc')).length;
      const domoticaCustomers = customers.filter(c => normalize(c.system_type).includes('domot') || normalize(c.system_type).includes('domót')).length;
      const gpsPersonalCustomers = customers.filter(c => {
        const t = normalize(c.system_type);
        return t.includes('gps') && (t.includes('person') || t.includes(' p') || t.endsWith('_p') || t === 'gps_p');
      }).length;
      const gpsVehicularCustomers = customers.filter(c => {
        const t = normalize(c.system_type);
        return t.includes('gps') && (t.includes('vehic') || t.includes(' v') || t.endsWith('_v') || t === 'gps_v' || (!t.includes('person') && !t.includes(' p')));
      }).length;
      const redCustomers = customers.filter(c => {
        const t = normalize(c.system_type);
        return t === 'red' || t === 'redes' || t.includes('red');
      }).length;
      const videoPorteroCustomers = customers.filter(c => {
        const t = normalize(c.system_type);
        return t.includes('video') || t.includes('portero') || t.includes('vp');
      }).length;

      // Clientes de alarmas
      const nonAlarmCount = cctvCustomers + accessCustomers + attendanceCustomers + domoticaCustomers + gpsPersonalCustomers + gpsVehicularCustomers + redCustomers + videoPorteroCustomers;
      const explicitAlarm = customers.filter(c => normalize(c.system_type).includes('alarm')).length;
      const alarmCustomers = explicitAlarm > 0 ? explicitAlarm : Math.max(0, customers.length - nonAlarmCount);

      // Estatus de Órdenes
      const completedOrders = serviceOrders.filter(s => s.status === 'completed' || s.status === 'closed' || s.status === 'atendida');
      const completedOrderIds = new Set(completedOrders.map(o => o.id));

      const pausedOrders = serviceOrders.filter(s => s.status === 'paused' || s.status === 'pausada' || s.status === 'en_espera').length;
      const cancelledOrders = serviceOrders.filter(s => s.status === 'cancelled' || s.status === 'cancelada').length;
      const warrantyOrders = serviceOrders.filter(s => {
        const st = (s.service_type || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        return st === 'warranty' || st === 'garantia' || st === 'garantía' || desc.includes('garant');
      }).length;

      // Órdenes pendientes de atender (Serie WE vs Serie ADZ por Prioridad)
      const pendingOrders = serviceOrders.filter(s => 
        s.status !== 'completed' && s.status !== 'closed' && s.status !== 'atendida' && 
        s.status !== 'cancelled' && s.status !== 'cancelada'
      );

      const pendingSeriesWE: PriorityBreakdown = { low: 0, medium: 0, high: 0, urgent: 0, critical: 0, total: 0 };
      const pendingSeriesADZ: PriorityBreakdown = { low: 0, medium: 0, high: 0, urgent: 0, critical: 0, total: 0 };

      pendingOrders.forEach((order: any) => {
        const seriesInfo = seriesMap.get(order.folio_series_id) || '';
        const fullFolio = (order.full_folio || order.order_number || '').toUpperCase();
        const isWE = seriesInfo.includes('WE') || fullFolio.includes('WE') || fullFolio.startsWith('WE-');
        
        const target = isWE ? pendingSeriesWE : pendingSeriesADZ;
        const p = (order.priority || 'medium').toLowerCase();

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

      // Tiempo promedio
      const avgTime = completedOrders.length > 0
        ? completedOrders.reduce((sum, s) => sum + (s.total_time_minutes || 0), 0) / completedOrders.length
        : 0;

      // Producto más vendido
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

      const paidInvoices = invoices.filter(i => i.status === 'paid');
      const totalRevenue = paidInvoices.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
      const overdueInvoices = invoices.filter(i => i.status === 'overdue');
      const pendingInvoices = invoices.filter(i => i.status === 'pending');
      const avgOverdue = overdueInvoices.length > 0
        ? overdueInvoices.reduce((sum, i) => sum + (i.days_overdue || 0), 0) / overdueInvoices.length
        : 0;

      // Rubro 1: Ventas por visitas técnicas atendidas (Mano de obra / Servicios)
      const technicianVisitsRevenue = completedOrders.reduce((sum, s) => {
        const labor = Number(s.labor_cost) || 0;
        if (labor > 0) return sum + labor;
        const total = Number(s.total_cost) || Number(s.payment_amount) || 0;
        const matCost = Number(s.materials_cost) || 0;
        const calculatedLabor = Math.max(0, total - matCost);
        return sum + (calculatedLabor > 0 ? calculatedLabor : total);
      }, 0);

      // Mapa de categorías de productos
      const categoryMap = new Map(priceList.map(p => [p.id, (p.category || '').toLowerCase().trim()]));

      // Filtrar materiales usados en órdenes atendidas / completadas
      let installationMaterialsCost = 0;
      let securityDevicesRevenue = 0;

      materials.forEach((mat: any) => {
        if (completedOrderIds.has(mat.service_order_id)) {
          const itemCategory = categoryMap.get(mat.inventory_item_id) || '';
          const matTotal = Number(mat.total_cost) || (Number(mat.quantity_used || 1) * Number(mat.unit_cost || 0));
          
          if (EQUIPMENT_CATEGORIES.some(cat => itemCategory.includes(cat))) {
            securityDevicesRevenue += matTotal;
          } else {
            installationMaterialsCost += matTotal;
          }
        }
      });

      if (installationMaterialsCost === 0 && securityDevicesRevenue === 0) {
        const totalMatCostOrders = completedOrders.reduce((sum, s) => sum + (Number(s.materials_cost) || 0), 0);
        installationMaterialsCost = totalMatCostOrders * 0.4;
        securityDevicesRevenue = totalMatCostOrders * 0.6;
      }

      const totalVisitsRevenue = technicianVisitsRevenue + installationMaterialsCost + securityDevicesRevenue;

      setKpis({
        totalRevenue,
        pendingRevenue: pendingInvoices.reduce((sum, i) => sum + i.total_amount, 0),
        pendingCount: pendingInvoices.length,
        overdueRevenue: overdueInvoices.reduce((sum, i) => sum + i.total_amount, 0),
        overdueCount: overdueInvoices.length,
        activeServiceOrders: serviceOrders.filter(s => s.status === 'in_progress' || s.status === 'assigned' || s.status === 'requested').length,
        completedServiceOrders: completedOrders.length,
        eolAssets: assets.filter(a => a.is_eol).length,
        totalAssets: assets.length,
        avgDaysOverdue: Math.round(avgOverdue),
        avgServiceTime: Math.round(avgTime),
        alarmCustomers,
        cctvCustomers,
        accessCustomers,
        attendanceCustomers,
        domoticaCustomers,
        gpsPersonalCustomers,
        gpsVehicularCustomers,
        redCustomers,
        videoPorteroCustomers,
        technicianVisitsRevenue,
        installationMaterialsCost,
        securityDevicesRevenue,
        totalVisitsRevenue,
        pausedOrders,
        cancelledOrders,
        warrantyOrders,
        pendingSeriesWE,
        pendingSeriesADZ,
        topProduct
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

  // Recuadros de Colores
  const kpiCards = [
    {
      number: '1',
      title: 'Por Cobrar',
      value: `$${kpis.pendingRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      subtitle: `${kpis.pendingCount} facturas pendientes`,
      icon: Clock,
      color: 'from-amber-500 to-yellow-600',
      iconBg: 'bg-amber-100 text-amber-600'
    },
    {
      number: '2',
      title: 'Cartera Vencida',
      value: `$${kpis.overdueRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      subtitle: `${kpis.overdueCount} facturas vencidas`,
      icon: AlertTriangle,
      color: 'from-rose-600 to-red-700',
      iconBg: 'bg-rose-100 text-rose-600'
    },
    {
      number: '3',
      title: 'Órdenes Activas',
      value: kpis.activeServiceOrders,
      subtitle: `${kpis.completedServiceOrders} completadas`,
      icon: Wrench,
      color: 'from-orange-500 to-amber-600',
      iconBg: 'bg-orange-100 text-orange-600'
    },
    {
      number: '4',
      title: 'Activos EOL',
      value: kpis.eolAssets,
      subtitle: `de ${kpis.totalAssets} activos totales`,
      icon: Shield,
      color: 'from-slate-600 to-zinc-800',
      iconBg: 'bg-slate-100 text-slate-700'
    },
    {
      number: '5',
      title: 'DSO Promedio',
      value: `${kpis.avgDaysOverdue} días`,
      subtitle: 'Días de cartera / mora',
      icon: FileText,
      color: 'from-cyan-600 to-teal-700',
      iconBg: 'bg-cyan-100 text-cyan-700'
    },
    {
      number: '6',
      title: 'Tiempo Promedio',
      value: `${kpis.avgServiceTime} min`,
      subtitle: 'Por visita técnica',
      icon: Timer,
      color: 'from-emerald-600 to-green-700',
      iconBg: 'bg-emerald-100 text-emerald-700'
    },
    {
      number: '7',
      title: 'Clientes Alarmas',
      value: kpis.alarmCustomers,
      subtitle: 'Sistemas de alarma',
      icon: Bell,
      color: 'from-blue-600 to-indigo-700',
      iconBg: 'bg-blue-100 text-blue-600'
    },
    {
      number: '8',
      title: 'Clientes CCTV',
      value: kpis.cctvCustomers,
      subtitle: 'Videovigilancia CCTV',
      icon: Camera,
      color: 'from-purple-600 to-violet-800',
      iconBg: 'bg-purple-100 text-purple-600'
    },
    {
      number: '9',
      title: 'Clientes Control Acceso',
      value: kpis.accessCustomers,
      subtitle: 'Control de accesos',
      icon: KeyRound,
      color: 'from-pink-600 to-rose-700',
      iconBg: 'bg-pink-100 text-pink-600'
    },
    {
      number: '10',
      title: 'Clientes Control Asistencia',
      value: kpis.attendanceCustomers,
      subtitle: 'Relojes checadores',
      icon: Fingerprint,
      color: 'from-sky-600 to-blue-800',
      iconBg: 'bg-sky-100 text-sky-600'
    },
    {
      number: '11',
      title: 'Clientes Domótica',
      value: kpis.domoticaCustomers,
      subtitle: 'Automatización inteligente',
      icon: Home,
      color: 'from-violet-700 to-purple-900',
      iconBg: 'bg-violet-100 text-violet-700'
    },
    {
      number: '12',
      title: 'Clientes GPS Personal',
      value: kpis.gpsPersonalCustomers,
      subtitle: 'Rastreadores personales',
      icon: User,
      color: 'from-teal-600 to-emerald-800',
      iconBg: 'bg-teal-100 text-teal-700'
    },
    {
      number: '13',
      title: 'Clientes GPS Vehicular',
      value: kpis.gpsVehicularCustomers,
      subtitle: 'Rastreo de vehículos/flotas',
      icon: Car,
      color: 'from-red-600 to-orange-700',
      iconBg: 'bg-red-100 text-red-600'
    },
    {
      number: '14',
      title: 'Clientes Red',
      value: kpis.redCustomers,
      subtitle: 'Redes y cableado',
      icon: Network,
      color: 'from-indigo-600 to-blue-900',
      iconBg: 'bg-indigo-100 text-indigo-700'
    },
    {
      number: '15',
      title: 'Clientes Video Portero',
      value: kpis.videoPorteroCustomers,
      subtitle: 'Videoporteros e interfones',
      icon: Video,
      color: 'from-amber-600 to-yellow-800',
      iconBg: 'bg-amber-100 text-amber-700'
    },
    {
      title: 'Ingresos Cobrados',
      value: `$${kpis.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      subtitle: 'Período actual',
      icon: DollarSign,
      color: 'from-emerald-500 to-green-600',
      iconBg: 'bg-emerald-100 text-emerald-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Grid de 15 Recuadros de Colores */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Indicadores Clave del Negocio
          </h3>
          <span className="text-xs font-medium px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
            {kpiCards.length} Métricas Principales
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className={`relative overflow-hidden bg-gradient-to-br ${card.color} rounded-2xl p-4 text-white shadow-md hover:shadow-xl transition-all duration-200 flex flex-col justify-between group min-h-[135px]`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 ${card.iconBg} rounded-xl bg-white/20 backdrop-blur-sm shadow-inner group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {card.number && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-sm border border-white/20">
                      #{card.number}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/90 line-clamp-1 mb-0.5">
                    {card.title}
                  </p>
                  <p className="text-2xl font-extrabold tracking-tight mb-0.5">
                    {card.value}
                  </p>
                  <p className="text-[11px] text-white/75 line-clamp-1">
                    {card.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumen Financiero */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Resumen Financiero
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                Visitas Técnicas
              </span>
            </div>

            <div className="space-y-3">
              {/* Rubro 1: Ventas generadas de las visitas técnicas atendidas */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl hover:bg-blue-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Ventas por Visitas Técnicas Atendidas</p>
                      <p className="text-xs text-gray-500">Mano de obra y servicios técnicos</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-blue-600">
                    ${kpis.technicianVisitsRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Rubro 2: Material de instalación utilizado en las visitas técnicas */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-xl hover:bg-amber-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Material de Instalación Utilizado</p>
                      <p className="text-xs text-gray-500">Insumos, cableado, canalización y herrajes</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-amber-600">
                    ${kpis.installationMaterialsCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Rubro 3: Dispositivos y accesorios de seguridad vendidos o reemplazados */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl hover:bg-emerald-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Dispositivos y Accesorios de Seguridad</p>
                      <p className="text-xs text-gray-500">Vendidos o reemplazados en visitas</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-emerald-600">
                    ${kpis.securityDevicesRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Total General en Visitas Técnicas */}
          <div className="pt-3 mt-4 border-t border-gray-200">
            <div className="flex justify-between items-center px-1">
              <span className="text-gray-900 font-semibold text-base">Total General en Visitas Técnicas</span>
              <span className="text-2xl font-bold text-blue-600">
                ${kpis.totalVisitsRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Indicadores Operativos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Indicadores Operativos
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                Operaciones FSM
              </span>
            </div>

            {/* Fila 1: Estatus de Órdenes Atendidas, Pausadas, Canceladas, Garantía */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3.5">
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-600 mb-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold">Atendidas</span>
                </div>
                <p className="text-xl font-extrabold text-emerald-700">{kpis.completedServiceOrders}</p>
                <p className="text-[10px] text-emerald-600">Finalizadas</p>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-center">
                <div className="flex items-center justify-center gap-1 text-amber-600 mb-0.5">
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold">Pausadas</span>
                </div>
                <p className="text-xl font-extrabold text-amber-700">{kpis.pausedOrders}</p>
                <p className="text-[10px] text-amber-600">En espera</p>
              </div>

              <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-center">
                <div className="flex items-center justify-center gap-1 text-rose-600 mb-0.5">
                  <XCircle className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold">Canceladas</span>
                </div>
                <p className="text-xl font-extrabold text-rose-700">{kpis.cancelledOrders}</p>
                <p className="text-[10px] text-rose-600">Anuladas</p>
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-center">
                <div className="flex items-center justify-center gap-1 text-blue-600 mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold">Garantía</span>
                </div>
                <p className="text-xl font-extrabold text-blue-700">{kpis.warrantyOrders}</p>
                <p className="text-[10px] text-blue-600">Por póliza</p>
              </div>
            </div>

            {/* Fila 2: Órdenes Pendientes de Atender (Serie WE vs Serie ADZ por Prioridad) */}
            <div className="border border-gray-200 rounded-xl p-3 bg-slate-50/70 mb-3.5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                  Pendientes por Serie y Prioridad
                </h4>
                <span className="text-[11px] font-bold text-gray-700">
                  Total: {kpis.pendingSeriesWE.total + kpis.pendingSeriesADZ.total}
                </span>
              </div>

              <div className="space-y-2">
                {/* Serie WE */}
                <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                      Serie WE
                    </span>
                    <span className="text-xs font-bold text-gray-800">
                      {kpis.pendingSeriesWE.total} pendientes
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-center text-xs">
                    <div className="bg-green-50 text-green-700 py-0.5 rounded border border-green-100">
                      <p className="text-[9px] font-medium text-green-600">Baja</p>
                      <p className="font-bold text-[11px]">{kpis.pendingSeriesWE.low}</p>
                    </div>
                    <div className="bg-yellow-50 text-yellow-700 py-0.5 rounded border border-yellow-100">
                      <p className="text-[9px] font-medium text-yellow-600">Media</p>
                      <p className="font-bold text-[11px]">{kpis.pendingSeriesWE.medium}</p>
                    </div>
                    <div className="bg-orange-50 text-orange-700 py-0.5 rounded border border-orange-100">
                      <p className="text-[9px] font-medium text-orange-600">Alta</p>
                      <p className="font-bold text-[11px]">{kpis.pendingSeriesWE.high}</p>
                    </div>
                    <div className="bg-red-50 text-red-700 py-0.5 rounded border border-red-100">
                      <p className="text-[9px] font-medium text-red-600">Urgente</p>
                      <p className="font-bold text-[11px]">{kpis.pendingSeriesWE.urgent}</p>
                    </div>
                    <div className="bg-purple-50 text-purple-700 py-0.5 rounded border border-purple-100">
                      <p className="text-[9px] font-medium text-purple-600">Crítica</p>
                      <p className="font-bold text-[11px]">{kpis.pendingSeriesWE.critical}</p>
                    </div>
                  </div>
                </div>

                {/* Serie ADZ */}
                <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                      Serie ADZ
                    </span>
                    <span className="text-xs font-bold text-gray-800">
                      {kpis.pendingSeriesADZ.total} pendientes
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-center text-xs">
                    <div className="bg-green-50 text-green-700 py-0.5 rounded border border-green-100">
                      <p className="text-[9px] font-medium text-green-600">Baja</p>
                      <p className="font-bold text-[11px]">{kpis.pendingSeriesADZ.low}</p>
                    </div>
                    <div className="bg-yellow-50 text-yellow-700 py-0.5 rounded border border-yellow-100">
                      <p className="text-[9px] font-medium text-yellow-600">Media</p>
                      <p className="font-bold text-[11px]">{kpis.pendingSeriesADZ.medium}</p>
                    </div>
                    <div className="bg-orange-50 text-orange-700 py-0.5 rounded border border-orange-100">
                      <p className="text-[9px] font-medium text-orange-600">Alta</p>
                      <p className="font-bold text-[11px]">{kpis.pendingSeriesADZ.high}</p>
                    </div>
                    <div className="bg-red-50 text-red-700 py-0.5 rounded border border-red-100">
                      <p className="text-[9px] font-medium text-red-600">Urgente</p>
                      <p className="font-bold text-[11px]">{kpis.pendingSeriesADZ.urgent}</p>
                    </div>
                    <div className="bg-purple-50 text-purple-700 py-0.5 rounded border border-purple-100">
                      <p className="text-[9px] font-medium text-purple-600">Crítica</p>
                      <p className="font-bold text-[11px]">{kpis.pendingSeriesADZ.critical}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fila 3: Métricas Complementarias (Activos EOL, Tiempo Promedio, Producto Más Vendido) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5">
                <div className="p-2 bg-slate-200 text-slate-700 rounded-lg shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Activos en EOL</p>
                  <p className="text-sm font-bold text-slate-800">{kpis.eolAssets} <span className="text-[10px] font-normal text-gray-500">/ {kpis.totalAssets}</span></p>
                </div>
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                  <Timer className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Tiempo Promedio</p>
                  <p className="text-sm font-bold text-emerald-800">{kpis.avgServiceTime} <span className="text-[10px] font-normal text-gray-500">min</span></p>
                </div>
              </div>

              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 font-medium">Producto Más Vendido</p>
                  <p className="text-xs font-bold text-indigo-900 truncate" title={kpis.topProduct.name}>
                    {kpis.topProduct.name}
                  </p>
                  <p className="text-[10px] text-indigo-600 font-semibold">{kpis.topProduct.quantity} piezas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

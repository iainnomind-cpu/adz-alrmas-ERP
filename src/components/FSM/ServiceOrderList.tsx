import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Plus,
  Filter,
  Search,
  Eye,
  Play,
  Pause,
  ChevronDown,
  History,
  Calendar
} from 'lucide-react';
import { ServiceOrderDetail } from './ServiceOrderDetail';
import { NewServiceOrderForm } from './NewServiceOrderForm';
import { HighlightText } from './HighlightText';
import type { Database } from '../../lib/database.types';

type ServiceOrder = Database['public']['Tables']['service_orders']['Row'] & {
  customers: { name: string; address: string | null; phone: string | null } | null;
  assets: { alarm_model: string } | null;
  folio_series: { series_code: string; series_name: string } | null;
};

export function ServiceOrderList() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'requested' | 'assigned' | 'in_progress' | 'paused' | 'completed'>('in_progress');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critical' | 'urgent' | 'high' | 'medium' | 'low'>('all');
  const [seriesFilter, setSeriesFilter] = useState<string>('all');
  const [availableSeries, setAvailableSeries] = useState<Array<{ id: string; series_code: string; series_name: string }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showQuickFilters, setShowQuickFilters] = useState(false);
  const [quickFilterSeries, setQuickFilterSeries] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadOrders();
    loadAvailableSeries();
  }, [filter, priorityFilter, seriesFilter, user]);

  const loadAvailableSeries = async () => {
    const { data, error } = await supabase
      .from('folio_series')
      .select('id, series_code, series_name')
      .eq('is_active', true)
      .eq('document_type', 'service_order')
      .order('series_name');

    if (error) {
      console.error('Error loading series:', error);
    } else {
      setAvailableSeries(data || []);
    }
  };

  const loadOrders = async () => {
    if (!user) return;

    let query = supabase
      .from('service_orders')
      .select(`
        *,
        customers (name, address, phone),
        assets:assets!service_orders_asset_id_fkey (alarm_model),
        folio_series (series_code, series_name)
      `)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    if (priorityFilter !== 'all') {
      query = query.eq('priority', priorityFilter);
    }

    if (seriesFilter !== 'all') {
      query = query.eq('folio_series_id', seriesFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading orders:', error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600 text-white';
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'requested': return <AlertCircle className="w-5 h-5" />;
      case 'assigned': return <Clock className="w-5 h-5" />;
      case 'in_progress': return <Play className="w-5 h-5" />;
      case 'paused': return <Pause className="w-5 h-5" />;
      case 'completed': return <CheckCircle2 className="w-5 h-5" />;
      default: return <Wrench className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return 'bg-gray-100 text-gray-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      case 'invoiced': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'requested': return 'Solicitado';
      case 'assigned': return 'Asignado';
      case 'in_progress': return 'En Progreso';
      case 'paused': return 'Pausado';
      case 'completed': return 'Finalizado';
      case 'paid': return 'Pagado';
      case 'invoiced': return 'Facturado';
      default: return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical': return 'Crítico';
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };

  const getDateRange = (type: 'today' | 'week') => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (type === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (type === 'week') {
      const dayOfWeek = now.getDay();
      start.setDate(now.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  };

  const applyQuickFilter = (filterType: 'today' | 'week', seriesId?: string) => {
    const { start, end } = getDateRange(filterType);

    let filtered = orders.filter(order => {
      const createdAt = new Date(order.created_at);
      const inDateRange = createdAt >= start && createdAt <= end;
      const inSeries = !seriesId || order.folio_series_id === seriesId;
      return inDateRange && inSeries;
    });

    if (filterType === 'today') {
      filtered.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return filtered;
  };

  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.full_folio?.toLowerCase().includes(search) ||
      order.folio_number?.toString().includes(search) ||
      order.folio_series?.series_code.toLowerCase().includes(search) ||
      order.order_number.toLowerCase().includes(search) ||
      order.customers?.name.toLowerCase().includes(search) ||
      order.description.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statusCounts = {
    all: orders.length,
    requested: orders.filter(o => o.status === 'requested').length,
    assigned: orders.filter(o => o.status === 'assigned').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    paused: orders.filter(o => o.status === 'paused').length,
    completed: orders.filter(o => o.status === 'completed').length
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Órdenes de Servicio</h2>
            <p className="text-gray-600">Gestión completa del ciclo de vida de servicios técnicos</p>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center md:justify-start gap-2 font-medium shadow-sm hover:shadow-md"
          >
            <Plus className="w-5 h-5" />
            Nueva Orden
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por folio, cliente..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowQuickFilters(!showQuickFilters)}
                className="w-full md:w-auto p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <History className="w-5 h-5 text-gray-600" />
                <span className="md:hidden">Filtros Rápidos</span>
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </button>

              {showQuickFilters && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="p-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-3">Búsqueda rápida</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setFilter('all');
                          setPriorityFilter('all');
                          setSeriesFilter('all');
                          setSearchTerm('');
                          const today = applyQuickFilter('today');
                          setOrders(today);
                          setShowQuickFilters(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded flex items-center gap-2 transition-colors"
                      >
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Folios de hoy
                      </button>
                      <button
                        onClick={() => {
                          setFilter('all');
                          setPriorityFilter('all');
                          setSeriesFilter('all');
                          setSearchTerm('');
                          const week = applyQuickFilter('week');
                          setOrders(week);
                          setShowQuickFilters(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded flex items-center gap-2 transition-colors"
                      >
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Folios de esta semana
                      </button>
                    </div>
                  </div>

                  {availableSeries.length > 0 && (
                    <div className="p-3">
                      <p className="text-xs font-medium text-gray-600 mb-2 uppercase">Recientes por serie</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {availableSeries.map(series => {
                          const recentCount = orders.filter(o => o.folio_series_id === series.id).length;
                          return (
                            <button
                              key={series.id}
                              onClick={() => {
                                setQuickFilterSeries(series.id);
                                setSeriesFilter(series.id);
                                setShowQuickFilters(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${quickFilterSeries === series.id
                                ? 'bg-blue-100 text-blue-900'
                                : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{series.series_code}</span>
                                <span className="text-xs text-gray-500">{recentCount}</span>
                              </div>
                              <p className="text-xs text-gray-500 truncate">{series.series_name}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Estado</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {(['all', 'requested', 'assigned', 'in_progress', 'paused', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${filter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {status === 'all' ? 'Todas' : getStatusLabel(status)} ({statusCounts[status]})
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Prioridad</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {(['all', 'critical', 'urgent', 'high', 'medium', 'low'] as const).map((priority) => (
                  <button
                    key={priority}
                    onClick={() => setPriorityFilter(priority)}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${priorityFilter === priority
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {priority === 'all' ? 'Todas' : getPriorityLabel(priority)}
                  </button>
                ))}
              </div>
            </div>

            {availableSeries.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Serie de Folio</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <button
                    key="all"
                    onClick={() => setSeriesFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${seriesFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    Todas
                  </button>
                  {availableSeries.map((series) => (
                    <button
                      key={series.id}
                      onClick={() => setSeriesFilter(series.id)}
                      className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${seriesFilter === series.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {series.series_name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No hay órdenes de servicio que coincidan con los filtros</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all group cursor-pointer"
                onClick={() => setSelectedOrderId(order.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${getStatusColor(order.status).replace('text-', 'text-').replace('bg-', 'bg-')}`}>
                      {getStatusIcon(order.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-2xl font-bold text-gray-900">
                          <HighlightText text={order.full_folio || order.order_number} searchTerm={searchTerm} />
                        </h3>
                        {order.folio_series?.series_code && (
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${searchTerm && order.folio_series.series_code.toLowerCase().includes(searchTerm.toLowerCase())
                            ? 'bg-yellow-300 text-yellow-900'
                            : 'bg-blue-100 text-blue-800'
                            }`}>
                            <HighlightText text={order.folio_series.series_code} searchTerm={searchTerm} />
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-700">
                        <HighlightText text={order.customers?.name || 'Cliente desconocido'} searchTerm={searchTerm} />
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        <HighlightText text={order.description} searchTerm={searchTerm} />
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(order.priority)}`}>
                      {getPriorityLabel(order.priority)}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <Eye className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {order.customers?.address && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate max-w-xs">{order.customers.address}</span>
                    </div>
                  )}
                  {order.customers?.phone && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{order.customers.phone}</span>
                    </div>
                  )}
                  {order.assets?.alarm_model && (
                    <div className="flex items-center gap-1">
                      <Wrench className="w-4 h-4" />
                      <span>{order.assets.alarm_model}</span>
                    </div>
                  )}
                  {order.created_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {(order.check_in_time || order.total_cost) && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                    {order.total_time_minutes && (
                      <span className="text-sm text-gray-600">
                        Duración: <span className="font-medium text-gray-900">{order.total_time_minutes} min</span>
                      </span>
                    )}
                    {order.total_cost && order.total_cost > 0 && (
                      <span className="text-sm font-semibold text-gray-900">
                        ${order.total_cost.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedOrderId && (
        <ServiceOrderDetail
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onUpdate={loadOrders}
        />
      )}

      {showNewForm && (
        <NewServiceOrderForm
          onClose={() => setShowNewForm(false)}
          onSuccess={() => {
            loadOrders();
            setShowNewForm(false);
          }}
        />
      )}
    </>
  );
}

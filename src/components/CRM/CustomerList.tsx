import { useEffect, useState, useRef, useCallback, memo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users, Building2, Home, Landmark, Phone, MapPin, Eye, Plus, Search,
  Filter, X, Calendar, CreditCard, Wifi, AlertCircle, TrendingUp, Star, Link
} from 'lucide-react';
import { CustomerProfile360 } from './CustomerProfile360';
import { NewCustomerForm } from './NewCustomerForm';
import type { Database } from '../../lib/database.types';

type Customer = Database['public']['Tables']['customers']['Row'] & {
  cards_count?: number;
  active_cards?: number;
};

interface SearchBarProps {
  inputRef?: React.RefObject<HTMLInputElement>;
  searchInput: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
}

const SearchBar = memo(({ inputRef, searchInput, onSearchChange, onClearSearch }: SearchBarProps) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none z-10" />
    <input
      ref={inputRef}
      type="text"
      placeholder="Buscar por nombre, negocio, teléfono, dirección..."
      value={searchInput}
      onChange={(e) => onSearchChange(e.target.value)}
      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white relative z-[1]"
      autoComplete="off"
      spellCheck="false"
    />
    {searchInput && (
      <button
        type="button"
        onClick={onClearSearch}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100 z-10"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
));

interface CustomerFilters {
  searchTerm: string;
  status: 'all' | 'active' | 'cancelled' | 'migrated';
  customerType: 'all' | 'comercio' | 'casa' | 'banco';
  billingType: 'all' | 'ticket' | 'factura' | 'ambos';
  servicePlan: 'all' | 'basico' | 'premium' | 'empresarial' | 'personalizado';
  connectionTech: 'all' | 'telefono' | 'ip' | 'dual' | 'celular' | 'radio';
  paymentStatus: 'all' | 'puntual' | 'tardado' | 'moroso' | 'suspendido';
  neighborhood: string;
  city: string;
  state: string;
  dateFrom: string;
  dateTo: string;
  isMasterAccount: 'all' | 'yes' | 'no';
  accountType: 'all' | 'normal' | 'master' | 'consolidated';
}

export function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const topSearchRef = useRef<HTMLInputElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const PAGE_SIZE = 50;

  const [filters, setFilters] = useState<CustomerFilters>({
    searchTerm: '',
    status: 'all',
    customerType: 'all',
    billingType: 'all',
    servicePlan: 'all',
    connectionTech: 'all',
    paymentStatus: 'all',
    neighborhood: '',
    city: '',
    state: '',
    dateFrom: '',
    dateTo: '',
    isMasterAccount: 'all',
    accountType: 'all'
  });

  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);

  useEffect(() => {
    loadLocationData();
  }, []);

  useEffect(() => {
    setCustomers([]);
    setPage(0);
    setHasMore(true);
    loadCustomers(0, true);
  }, [filters]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadCustomers(page + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, page]);

  const loadLocationData = async () => {
    try {
      const { data: neighborhoodsData } = await supabase
        .from('customers')
        .select('neighborhood')
        .not('neighborhood', 'is', null)
        .neq('neighborhood', '');

      const { data: citiesData } = await supabase
        .from('customers')
        .select('city')
        .not('city', 'is', null)
        .neq('city', '');

      const { data: statesData } = await supabase
        .from('customers')
        .select('state')
        .not('state', 'is', null)
        .neq('state', '');

      const uniqueNeighborhoods = [...new Set(neighborhoodsData?.map(n => n.neighborhood).filter(Boolean) || [])];
      const uniqueCities = [...new Set(citiesData?.map(c => c.city).filter(Boolean) || [])];
      const uniqueStates = [...new Set(statesData?.map(s => s.state).filter(Boolean) || [])];

      setNeighborhoods(uniqueNeighborhoods.sort());
      setCities(uniqueCities.sort());
      setStates(uniqueStates.sort());
    } catch (error) {
      console.error('Error loading location data:', error);
    }
  };

  const loadCustomers = async (pageNum: number, reset: boolean = false) => {
    setLoading(true);
    try {
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .order('account_number', { ascending: true });

      if (filters.searchTerm) {
        query = query.or(`name.ilike.%${filters.searchTerm}%,business_name.ilike.%${filters.searchTerm}%,phone.ilike.%${filters.searchTerm}%,address.ilike.%${filters.searchTerm}%,street.ilike.%${filters.searchTerm}%,neighborhood.ilike.%${filters.searchTerm}%`);
      }

      if (filters.status !== 'all') {
        if (filters.status === 'migrated') {
          query = query.not('migrated_to_company', 'is', null);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters.customerType !== 'all') {
        query = query.eq('customer_type', filters.customerType);
      }

      if (filters.billingType !== 'all') {
        query = query.eq('billing_type', filters.billingType);
      }

      if (filters.servicePlan !== 'all') {
        query = query.eq('service_plan', filters.servicePlan);
      }

      if (filters.connectionTech !== 'all') {
        query = query.eq('connection_technology', filters.connectionTech);
      }

      if (filters.paymentStatus !== 'all') {
        query = query.eq('payment_status', filters.paymentStatus);
      }

      if (filters.neighborhood) {
        query = query.eq('neighborhood', filters.neighborhood);
      }

      if (filters.city) {
        query = query.eq('city', filters.city);
      }

      if (filters.state) {
        query = query.eq('state', filters.state);
      }

      if (filters.isMasterAccount !== 'all') {
        query = query.eq('is_master_account', filters.isMasterAccount === 'yes');
      }

      if (filters.accountType !== 'all') {
        query = query.eq('account_type', filters.accountType);
      }

      if (filters.dateFrom) {
        query = query.gte('alta_date', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('alta_date', filters.dateTo);
      }

      const { data, error, count } = await query
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        const customerIds = data.map(c => c.id);

        const { data: cardsData } = await supabase
          .from('customer_digital_cards')
          .select('customer_id, is_active')
          .in('customer_id', customerIds);

        const cardsMap = new Map<string, { cards_count: number; active_cards: number }>();

        (cardsData || []).forEach(card => {
          const existing = cardsMap.get(card.customer_id) || { cards_count: 0, active_cards: 0 };
          existing.cards_count += 1;
          if (card.is_active) {
            existing.active_cards += 1;
          }
          cardsMap.set(card.customer_id, existing);
        });

        const customersWithCards = data.map(customer => ({
          ...customer,
          cards_count: cardsMap.get(customer.id)?.cards_count || 0,
          active_cards: cardsMap.get(customer.id)?.active_cards || 0,
        }));

        if (reset) {
          setCustomers(customersWithCards);
        } else {
          setCustomers(prev => [...prev, ...customersWithCards]);
        }
      } else if (reset) {
        setCustomers([]);
      }

      setPage(pageNum);
      setHasMore((data?.length || 0) === PAGE_SIZE && (count || 0) > (pageNum + 1) * PAGE_SIZE);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, searchTerm: value }));
    }, 400);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setFilters(prev => ({ ...prev, searchTerm: '' }));
    setTimeout(() => {
      topSearchRef.current?.focus();
    }, 100);
  }, []);

  const getCustomerColor = (customer: Customer): string => {
    if (customer.migrated_to_company) return 'bg-green-50 border-green-300';
    if (customer.status === 'cancelled') return 'bg-gray-50 border-gray-300';
    if (customer.is_consolidated_account) return 'bg-gray-900 text-white border-gray-900';
    if (customer.is_master_account || (customer.service_count && customer.service_count > 2)) return 'bg-yellow-50 border-yellow-400';

    if (customer.service_plan === 'premium') return 'bg-purple-50 border-purple-300';

    if (customer.service_plan?.includes('plus') ||
      customer.service_plan?.includes('comunicador') ||
      customer.connection_technology === 'dual' ||
      customer.connection_technology === 'ip') {
      return 'bg-blue-50 border-blue-300';
    }

    if (customer.service_plan === 'basico' ||
      customer.service_plan === 'clasico' ||
      customer.connection_technology === 'telefono') {
      return 'bg-orange-50 border-orange-300';
    }

    return 'bg-white border-gray-200';
  };

  const getPaymentStatusColor = (customer: Customer): string => {
    if (customer.is_suspended) return 'bg-lime-100 text-lime-800 border-lime-400';
    if (customer.status === 'cancelled') return 'bg-gray-100 text-gray-800';

    switch (customer.payment_status) {
      case 'puntual': return 'bg-green-100 text-green-800';
      case 'moroso': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getTechColor = (tech: string | null): string => {
    switch (tech) {
      case 'ip': return 'bg-blue-100 text-blue-800';
      case 'telefono': return 'bg-gray-100 text-gray-800';
      case 'dual': return 'bg-purple-100 text-purple-800';
      case 'celular': return 'bg-pink-100 text-pink-800';
      case 'radio': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'banco': return <Landmark className="w-5 h-5" />;
      case 'casa': return <Home className="w-5 h-5" />;
      case 'comercio': return <Building2 className="w-5 h-5" />;
      default: return <Users className="w-5 h-5" />;
    }
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      status: 'all',
      customerType: 'all',
      billingType: 'all',
      servicePlan: 'all',
      connectionTech: 'all',
      paymentStatus: 'all',
      neighborhood: '',
      city: '',
      state: '',
      dateFrom: '',
      dateTo: '',
      isMasterAccount: 'all',
      accountType: 'all'
    });
  };

  const hasActiveFilters = () => {
    return filters.status !== 'all' ||
      filters.customerType !== 'all' ||
      filters.billingType !== 'all' ||
      filters.servicePlan !== 'all' ||
      filters.connectionTech !== 'all' ||
      filters.paymentStatus !== 'all' ||
      filters.neighborhood !== '' ||
      filters.city !== '' ||
      filters.state !== '' ||
      filters.dateFrom !== '' ||
      filters.dateTo !== '' ||
      filters.isMasterAccount !== 'all' ||
      filters.accountType !== 'all';
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Clientes ({customers.length})
          </h2>
          <button
            onClick={() => setShowNewCustomerForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Nuevo Cliente
          </button>
        </div>

        <SearchBar
          inputRef={topSearchRef}
          searchInput={searchInput}
          onSearchChange={handleSearchChange}
          onClearSearch={handleClearSearch}
        />

        <div className="flex gap-2 items-center flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${showFilters || hasActiveFilters()
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <Filter className="w-4 h-4" />
            Filtros Avanzados
            {hasActiveFilters() && (
              <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                {Object.values(filters).filter(v => v !== 'all' && v !== '').length}
              </span>
            )}
          </button>

          {hasActiveFilters() && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1 text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Limpiar Filtros
            </button>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">Filtro rápido por tipo de cuenta:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilters({ ...filters, accountType: 'all' })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filters.accountType === 'all'
                ? 'bg-gray-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilters({ ...filters, accountType: 'master' })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${filters.accountType === 'master'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }`}
            >
              <Star className="w-3 h-3" />
              Maestras
            </button>
            <button
              onClick={() => setFilters({ ...filters, accountType: 'consolidated' })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${filters.accountType === 'consolidated'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }`}
            >
              <Link className="w-3 h-3" />
              Consolidadas
            </button>
            <button
              onClick={() => setFilters({ ...filters, accountType: 'normal' })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${filters.accountType === 'normal'
                ? 'bg-gray-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }`}
            >
              <Users className="w-3 h-3" />
              Normales
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Filtros Avanzados
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Estado</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="cancelled">Cancelados</option>
                  <option value="migrated">Migrados</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de Cliente</label>
                <select
                  value={filters.customerType}
                  onChange={(e) => setFilters({ ...filters, customerType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="comercio">Comercio</option>
                  <option value="casa">Casa</option>
                  <option value="banco">Banco</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de Facturación</label>
                <select
                  value={filters.billingType}
                  onChange={(e) => setFilters({ ...filters, billingType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="ticket">Ticket</option>
                  <option value="factura">Factura</option>
                  <option value="ambos">Ambos</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Plan de Servicio</label>
                <select
                  value={filters.servicePlan}
                  onChange={(e) => setFilters({ ...filters, servicePlan: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="basico">Básico</option>
                  <option value="premium">Premium</option>
                  <option value="empresarial">Empresarial</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Tecnología</label>
                <select
                  value={filters.connectionTech}
                  onChange={(e) => setFilters({ ...filters, connectionTech: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas</option>
                  <option value="telefono">Teléfono</option>
                  <option value="ip">IP</option>
                  <option value="dual">Dual</option>
                  <option value="celular">Celular</option>
                  <option value="radio">Radio</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Estado de Pago</label>
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="puntual">Puntual</option>
                  <option value="tardado">Tardado</option>
                  <option value="moroso">Moroso</option>
                  <option value="suspendido">Suspendido</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Colonia</label>
                <select
                  value={filters.neighborhood}
                  onChange={(e) => setFilters({ ...filters, neighborhood: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas</option>
                  {neighborhoods.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Ciudad</label>
                <select
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas</option>
                  {cities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Estado</label>
                <select
                  value={filters.state}
                  onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  {states.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Cuenta Maestra</label>
                <select
                  value={filters.isMasterAccount}
                  onChange={(e) => setFilters({ ...filters, isMasterAccount: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas</option>
                  <option value="yes">Sí (más de 2 servicios)</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de Cuenta</label>
                <select
                  value={filters.accountType}
                  onChange={(e) => setFilters({ ...filters, accountType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas</option>
                  <option value="normal">Normal</option>
                  <option value="master">Maestra</option>
                  <option value="consolidated">Consolidada</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Fecha Desde</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Fecha Hasta</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Leyenda de Colores</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-50 border-2 border-orange-300 rounded"></div>
              <span>Plan Clásico</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-50 border-2 border-purple-300 rounded"></div>
              <span>Plan Premium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-50 border-2 border-blue-300 rounded"></div>
              <span>Planes con Comunicador</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-50 border-2 border-yellow-400 rounded"></div>
              <span>Cuenta Maestra</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-900 border-2 border-gray-900 rounded"></div>
              <span>Consolidada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-50 border-2 border-gray-300 rounded"></div>
              <span>Cancelada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border-2 border-green-300 rounded"></div>
              <span>Migrado</span>
            </div>
          </div>

          <h5 className="font-semibold text-gray-900 mt-4 mb-2">Estados de Pago</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 rounded"></div>
              <span>Puntual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 rounded"></div>
              <span>Moroso</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 rounded"></div>
              <span>Cancelado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-lime-100 rounded"></div>
              <span>Suspendido</span>
            </div>
          </div>
        </div>

        {loading && customers.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No se encontraron clientes</p>
            <p className="text-gray-500 text-sm mt-2">Intenta ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${getCustomerColor(customer)} ${customer.is_consolidated_account ? 'text-white' : ''
                    }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg ${customer.is_consolidated_account ? 'bg-white/20' : 'bg-gray-100'}`}>
                        {getTypeIcon(customer.customer_type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm text-gray-500">
                            #{customer.account_number || 'S/N'}
                          </span>
                          <h3 className="font-bold text-lg truncate">
                            {customer.business_name || customer.name}
                          </h3>
                          {customer.is_master_account && (
                            <span className="px-2 py-0.5 bg-yellow-500 text-white rounded text-xs font-bold flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              MAESTRA
                            </span>
                          )}
                          {customer.is_consolidated_account && (
                            <span className="px-2 py-0.5 bg-white text-gray-900 rounded text-xs font-bold">
                              CONSOLIDADA
                            </span>
                          )}
                          {customer.is_suspended && (
                            <span className="px-2 py-0.5 bg-lime-500 text-white rounded text-xs font-bold">
                              SUSPENDIDO
                            </span>
                          )}
                          {customer.cards_count && customer.cards_count > 0 && (
                            <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded text-xs font-medium flex items-center gap-1">
                              <CreditCard className="w-3 h-3" />
                              {customer.active_cards} tarjeta{customer.active_cards !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {customer.business_name && customer.name !== customer.business_name && (
                          <p className="text-sm mb-2">{customer.name}</p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-2 mb-2">
                          {customer.account_type === 'master' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                              <Star className="w-3 h-3 fill-yellow-600" />
                              Maestra
                            </span>
                          )}

                          {customer.account_type === 'consolidated' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                              <Link className="w-3 h-3" />
                              Consolidada
                            </span>
                          )}

                          {customer.branch_name && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                              <Building2 className="w-3 h-3" />
                              {customer.branch_name}
                              {customer.is_single_branch && (
                                <span className="ml-1 text-[10px] bg-gray-200 px-1 rounded">
                                  U
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-sm mb-2">
                          {customer.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                          {customer.address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span className="truncate max-w-xs">
                                {customer.address}
                                {customer.neighborhood && `, ${customer.neighborhood}`}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {customer.service_plan && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${customer.service_plan === 'premium'
                              ? 'bg-purple-600 text-white'
                              : customer.service_plan === 'basico' || customer.service_plan === 'clasico'
                                ? 'bg-orange-600 text-white'
                                : customer.service_plan?.includes('plus') || customer.service_plan?.includes('comunicador')
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-800'
                              }`}>
                              {customer.service_plan.toUpperCase()}
                            </span>
                          )}

                          {customer.connection_technology && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getTechColor(customer.connection_technology)}`}>
                              <Wifi className="w-3 h-3 inline mr-1" />
                              {customer.connection_technology.toUpperCase()}
                            </span>
                          )}

                          {customer.billing_type && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${customer.billing_type === 'factura'
                              ? 'bg-orange-600 text-white'
                              : customer.billing_type === 'ticket'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-600 text-white'
                              }`}>
                              <CreditCard className="w-3 h-3 inline mr-1" />
                              {customer.billing_type.toUpperCase()}
                            </span>
                          )}

                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentStatusColor(customer)}`}>
                            {customer.is_suspended ? 'SUSPENDIDO' :
                              customer.status === 'cancelled' ? 'CANCELADO' :
                                customer.payment_status?.toUpperCase() || 'SIN ESTADO'}
                          </span>

                          {customer.service_count && customer.service_count > 1 && (
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                              <TrendingUp className="w-3 h-3 inline mr-1" />
                              {customer.service_count} Servicios
                            </span>
                          )}

                          {customer.migrated_to_company && (
                            <span className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium">
                              Migrado: {customer.migrated_to_company}
                            </span>
                          )}
                        </div>

                        {customer.general_notes && (
                          <div className="mt-2 flex items-start gap-1 text-xs text-gray-600">
                            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{customer.general_notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${customer.is_consolidated_account
                        ? 'bg-white text-gray-900 hover:bg-gray-100'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                      <Eye className="w-4 h-4" />
                      Ver Perfil
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div ref={observerTarget} className="py-4 text-center">
              {loading && (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">Cargando más clientes...</span>
                </div>
              )}
              {!hasMore && customers.length > 0 && (
                <p className="text-gray-500 text-sm">No hay más clientes para mostrar</p>
              )}
            </div>
          </>
        )}
      </div>

      {selectedCustomerId && (
        <CustomerProfile360
          customerId={selectedCustomerId}
          onClose={() => {
            setSelectedCustomerId(null);
            loadCustomers(0, true);
          }}
          onEdit={() => {
            const customer = customers.find(c => c.id === selectedCustomerId);
            setCustomerToEdit(customer);
            setSelectedCustomerId(null);
            setShowNewCustomerForm(true);
          }}
        />
      )}

      {showNewCustomerForm && (
        <NewCustomerForm
          customer={customerToEdit as any}
          onClose={() => {
            setShowNewCustomerForm(false);
            setCustomerToEdit(undefined);
          }}
          onSuccess={() => {
            setShowNewCustomerForm(false);
            setCustomerToEdit(undefined);
            loadCustomers(0, true);
          }}
        />
      )}
    </>
  );
}

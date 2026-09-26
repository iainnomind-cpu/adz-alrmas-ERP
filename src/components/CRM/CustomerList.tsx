import { useEffect, useState, useRef, useCallback, memo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users, Building2, Home, Landmark, Phone, MapPin, Eye, Plus, Search,
  Filter, X, Calendar, CreditCard, Wifi, AlertCircle, TrendingUp, Star, Link, Database
} from 'lucide-react';
import { CustomerProfile360 } from './CustomerProfile360';
import { NewCustomerForm } from './NewCustomerForm';
import { CustomerGeneratorModal } from './CustomerGeneratorModal';
import { formatCustomerAccountNumber } from '../../utils/customerAccountNumber';
import type { Database as DB } from '../../lib/database.types';

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
  status: 'all' | 'active' | 'suspended' | 'inactive' | 'cancelled' | 'migrated';
  customerType: 'all' | 'comercio' | 'casa' | 'banco';
  propertyType: 'all' | 'casa' | 'comercio' | 'banco' | 'rancho' | 'gobierno' | 'pozo' | 'colegio';
  billingPreference: 'all' | 'factura_credito' | 'factura_contado' | 'ticket_tf' | 'ticket_v';
  billingCycle: 'all' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  monitoringPlan: 'all' | 'plus_clasico' | 'plus_premium' | 'premium_com_15' | 'premium_com_20' | 'plus_com_15' | 'plus_com_20' | 'medical_premium' | 'boton_panico';
  communicationTech: 'all' | 'telefono' | 'ip' | 'dual' | 'celular' | 'radio';
  creditClassification: 'all' | 'puntual' | 'retrasado' | '15_dias' | '30_dias' | 'moroso';
  neighborhood: string;
  city: string;
  state: string;
  dateFrom: string;
  dateTo: string;
  isMasterAccount: 'all' | 'yes' | 'no';
  accountType: 'all' | 'normal' | 'master' | 'consolidated' | 'corporativo';
  alarmModel: string;
  communicatorModel: string;
}

interface CustomerListProps {
  systemType?: string;
}

export function CustomerList({ systemType }: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
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
    propertyType: 'all',
    billingPreference: 'all',
    billingCycle: 'all',
    monitoringPlan: 'all',
    communicationTech: 'all',
    creditClassification: 'all',
    neighborhood: '',
    city: '',
    state: '',
    dateFrom: '',
    dateTo: '',
    isMasterAccount: 'all',
    accountType: 'all',
    alarmModel: '',
    communicatorModel: ''
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
  }, [filters, systemType]);

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
      let selectStr = '*';
      if (filters.alarmModel || filters.communicatorModel) {
        selectStr = '*, assets!inner(alarm_model, communicator_model)';
      }

      let query = supabase
        .from('customers')
        .select(selectStr, { count: 'exact' })
        .order('account_number', { ascending: true });

      if (filters.searchTerm) {
        const t = filters.searchTerm;
        let q = `name.ilike.%${t}%,business_name.ilike.%${t}%,branch_name.ilike.%${t}%,contract_number.ilike.%${t}%`;
        const n = parseInt(t.replace(/\D/g, ''), 10);
        if (!isNaN(n)) { q += `,account_number.eq.${n}`; }
        query = query.or(q);
      }

      if (systemType) {
        if (systemType === 'alarma') {
          query = query.or('system_type.eq.alarma,system_type.eq.Alarma,system_type.is.null');
        } else if (systemType === 'control_acceso') {
          query = query.or('system_type.eq.control_acceso,system_type.eq.Control de Acceso');
        } else if (systemType === 'video_portero') {
          query = query.or('system_type.eq.video_portero,system_type.eq.Video Portero');
        } else if (systemType === 'control_asistencia') {
          query = query.or('system_type.eq.control_asistencia,system_type.eq.Control de Asistencia');
        } else if (systemType === 'gps_personal') {
          query = query.or('system_type.eq.gps_personal,system_type.eq.GPS Personal');
        } else if (systemType === 'gps_vehicular') {
          query = query.or('system_type.eq.gps_vehicular,system_type.eq.GPS Vehicular');
        } else {
          // fallback to exact match or capitalized exact match
          const capitalized = systemType.charAt(0).toUpperCase() + systemType.slice(1);
          query = query.or(`system_type.eq.${systemType},system_type.eq.${capitalized}`);
        }
      }

      // --- GPS Vehicular Specific Filters ---
      if (systemType && systemType.toLowerCase() === 'gps_vehicular') {
        if (filters.gpsVehicularCuenta !== 'all') {
          if (['normal', 'master', 'corporativa', 'consolidada'].includes(filters.gpsVehicularCuenta)) {
            const map: any = { master: 'master', corporativa: 'corporativo', consolidada: 'consolidated', normal: 'normal' };
            query = query.eq('account_type', map[filters.gpsVehicularCuenta]);
            query = query.eq('status', 'Activa');
          } else if (filters.gpsVehicularCuenta === 'suspendida') {
            query = query.eq('status', 'Suspendida');
          } else if (filters.gpsVehicularCuenta === 'cancelada') {
            query = query.in('status', ['Cancelada', 'Baja Cliente', 'Baja Moroso']);
          }
        }
        if (filters.gpsVehicularPlan !== 'all') {
          query = query.eq('monitoring_plan', filters.gpsVehicularPlan);
        }
      }

      // --- Red Specific Filters ---
      if (systemType && systemType.toLowerCase() === 'red') {
        if (filters.redCuenta !== 'all') {
          if (['normal', 'master', 'corporativa', 'consolidada'].includes(filters.redCuenta)) {
            const map: any = { master: 'master', corporativa: 'corporativo', consolidada: 'consolidated', normal: 'normal' };
            query = query.eq('account_type', map[filters.redCuenta]);
            query = query.eq('status', 'Activa');
          } else if (filters.redCuenta === 'suspendida') {
            query = query.eq('status', 'Suspendida');
          } else if (filters.redCuenta === 'cancelada') {
            query = query.in('status', ['Cancelada', 'Baja Cliente', 'Baja Moroso']);
          }
        }
        if (filters.redPlan !== 'all') {
          query = query.eq('monitoring_plan', filters.redPlan);
        }
        if (filters.redDispositivo !== 'all') {
           query = query.or(`alarm_model.ilike.%${filters.redDispositivo}%`);
        }
      }

      // --- Video Portero Specific Filters ---
      if (systemType && systemType.toLowerCase() === 'video_portero') {
        if (filters.vpCuenta !== 'all') {
          if (['normal', 'master', 'corporativa', 'consolidada'].includes(filters.vpCuenta)) {
            const map: any = { master: 'master', corporativa: 'corporativo', consolidada: 'consolidated', normal: 'normal' };
            query = query.eq('account_type', map[filters.vpCuenta]);
            query = query.eq('status', 'Activa');
          } else if (filters.vpCuenta === 'suspendida') {
            query = query.eq('status', 'Suspendida');
          } else if (filters.vpCuenta === 'cancelada') {
            query = query.in('status', ['Cancelada', 'Baja Cliente', 'Baja Moroso']);
          }
        }
        if (filters.vpPlan !== 'all') {
          query = query.eq('monitoring_plan', filters.vpPlan);
        }
        if (filters.vpMarca !== 'all') {
          query = query.or(`alarm_model.ilike.%${filters.vpMarca}%,video_portero_details->frente_calle->>marca.ilike.%${filters.vpMarca}%`);
        }
        if (filters.vpDispositivo !== 'all') {
          query = query.or(`connection_technology.ilike.%${filters.vpDispositivo}%,video_portero_details->frente_calle->>tecnologia.ilike.%${filters.vpDispositivo}%`);
        }
      }

      // --- GPS Personal Specific Filters ---
      if (systemType && systemType.toLowerCase() === 'gps_personal') {
        if (filters.gpsPersonalCuenta !== 'all') {
          if (['normal', 'master', 'corporativa', 'consolidada'].includes(filters.gpsPersonalCuenta)) {
            const map: any = { master: 'master', corporativa: 'corporativo', consolidada: 'consolidated', normal: 'normal' };
            query = query.eq('account_type', map[filters.gpsPersonalCuenta]);
            query = query.eq('status', 'Activa');
          } else if (filters.gpsPersonalCuenta === 'suspendida') {
            query = query.eq('status', 'Suspendida');
          } else if (filters.gpsPersonalCuenta === 'cancelada') {
            query = query.in('status', ['Cancelada', 'Baja Cliente', 'Baja Moroso']);
          }
        }
        if (filters.gpsPersonalPlan !== 'all') {
          query = query.eq('monitoring_plan', filters.gpsPersonalPlan);
        }
      }

      // --- Domotica Specific Filters ---
      if (systemType && systemType.toLowerCase() === 'domotica') {
        if (filters.domoticaCuenta !== 'all') {
          if (['normal', 'master', 'corporativa', 'consolidada'].includes(filters.domoticaCuenta)) {
            const map: any = { master: 'master', corporativa: 'corporativo', consolidada: 'consolidated', normal: 'normal' };
            query = query.eq('account_type', map[filters.domoticaCuenta]);
            query = query.eq('status', 'Activa');
          } else if (filters.domoticaCuenta === 'suspendida') {
            query = query.eq('status', 'Suspendida');
          } else if (filters.domoticaCuenta === 'cancelada') {
            query = query.in('status', ['Cancelada', 'Baja Cliente', 'Baja Moroso']);
          }
        }
        if (filters.domoticaPlan !== 'all') {
          query = query.eq('monitoring_plan', filters.domoticaPlan);
        }
        if (filters.domoticaDispositivo !== 'all') {
           query = query.or(`alarm_model.ilike.%${filters.domoticaDispositivo}%,domotica_details->aparato->>tipo_dispositivo.eq.${filters.domoticaDispositivo}`);
        }
      }

      // --- Attendance Control Specific Filters ---
      if (systemType && systemType.toLowerCase() === 'control_asistencia') {
        if (filters.asistenciaCuenta !== 'all') {
          if (['normal', 'master', 'corporativa', 'consolidada'].includes(filters.asistenciaCuenta)) {
            const map: any = { master: 'master', corporativa: 'corporativo', consolidada: 'consolidated', normal: 'normal' };
            query = query.eq('account_type', map[filters.asistenciaCuenta]);
            query = query.eq('status', 'Activa');
          } else if (filters.asistenciaCuenta === 'suspendida') {
            query = query.eq('status', 'Suspendida');
          } else if (filters.asistenciaCuenta === 'cancelada') {
            query = query.in('status', ['Cancelada', 'Baja Cliente', 'Baja Moroso']);
          }
        }
        if (filters.asistenciaTipo !== 'all') {
           // Same logic as Access Control
           query = query.or(`alarm_model.ilike.%${filters.asistenciaTipo}%,attendance_control_details->aparato->>tipo_control.eq.${filters.asistenciaTipo}`);
        }
      }

      // --- Access Control Specific Filters ---
      if (systemType && systemType.toLowerCase() === 'control_acceso') {
        if (filters.accesoCuenta !== 'all') {
          if (['normal', 'master', 'corporativa', 'consolidada'].includes(filters.accesoCuenta)) {
            const map: any = { master: 'master', corporativa: 'corporativo', consolidada: 'consolidated', normal: 'normal' };
            query = query.eq('account_type', map[filters.accesoCuenta]);
            query = query.eq('status', 'Activa');
          } else if (filters.accesoCuenta === 'suspendida') {
            query = query.eq('status', 'Suspendida');
          } else if (filters.accesoCuenta === 'cancelada') {
            query = query.in('status', ['Cancelada', 'Baja Cliente', 'Baja Moroso']);
          }
        }
        if (filters.accesoTipo !== 'all') {
           // Wait, the Tipo is stored inside access_control_details->aparato->tipo_control
           // Since JSON querying in PostgREST is like access_control_details->>aparato.tipo_control
           // we can try ilike or just ignore for now if we can't easily query JSON. 
           // Actually supabase uses: access_control_details->aparato->>tipo_control
           // But since NewCustomerForm might just put it in alarm_model (fallback), let's check alarm_model too
           query = query.or(`alarm_model.ilike.%${filters.accesoTipo}%,access_control_details->aparato->>tipo_control.eq.${filters.accesoTipo}`);
        }
      }

      // --- CCTV Specific Filters ---
      if (systemType && systemType.toLowerCase() === 'cctv') {
        if (filters.cctvCuenta !== 'all') {
          if (['normal', 'master', 'corporativa', 'consolidada'].includes(filters.cctvCuenta)) {
            const map: any = { master: 'master', corporativa: 'corporativo', consolidada: 'consolidated', normal: 'normal' };
            query = query.eq('account_type', map[filters.cctvCuenta]);
            query = query.eq('status', 'Activa');
          } else if (filters.cctvCuenta === 'suspendida') {
            query = query.eq('status', 'Suspendida');
          } else if (filters.cctvCuenta === 'cancelada') {
            query = query.in('status', ['Cancelada', 'Baja Cliente', 'Baja Moroso']);
          }
        }
        if (filters.cctvPlan !== 'all') {
          query = query.eq('monitoring_plan', filters.cctvPlan);
        }
        if (filters.cctvDispositivo !== 'all') {
          // Typically stored in alarm_model or communication_tech depending on how they save it, 
          // but we'll try to match it generically or check cctv specific fields.
          // For now, let's assume it maps to 'alarm_model' for the device type
          query = query.ilike('alarm_model', `%${filters.cctvDispositivo}%`);
        }
        if (filters.cctvCanales !== 'all') {
          query = query.eq('dvr_channels', parseInt(filters.cctvCanales));
        }
      }

      // --- Alarm Specific Filters ---
      if (systemType && (systemType.toLowerCase().includes('alarm') || systemType.toLowerCase() === 'cctv' || systemType.toLowerCase() === 'control_acceso' || systemType.toLowerCase() === 'control_asistencia' || systemType.toLowerCase() === 'domotica' || systemType.toLowerCase() === 'gps_personal' || systemType.toLowerCase() === 'gps_vehicular' || systemType.toLowerCase() === 'red' || systemType.toLowerCase() === 'video_portero')) {
        if (filters.alarmaCuenta !== 'all') {
          if (['normal', 'master', 'corporativa', 'consolidada'].includes(filters.alarmaCuenta)) {
            const map: any = { master: 'master', corporativa: 'corporativo', consolidada: 'consolidated', normal: 'normal' };
            query = query.eq('account_type', map[filters.alarmaCuenta]);
            query = query.eq('status', 'Activa');
          } else if (filters.alarmaCuenta === 'suspendida') {
            query = query.eq('status', 'Suspendida');
          } else if (filters.alarmaCuenta === 'cancelada') {
            query = query.in('status', ['Cancelada', 'Baja Cliente', 'Baja Moroso']);
          }
        }
        if (filters.alarmaPlan !== 'all') {
          query = query.eq('monitoring_plan', filters.alarmaPlan);
        }
        if (filters.alarmaMarca !== 'all') {
          // Marca mapping could refer to alarm_model
          query = query.ilike('alarm_model', `%${filters.alarmaMarca}%`);
        }
        if (filters.alarmaTecnologia !== 'all') {
          query = query.eq('communication_tech', filters.alarmaTecnologia);
        }
      }
      // -------------------------------

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

      if (filters.propertyType !== 'all') {
        query = query.eq('property_type', filters.propertyType);
      }

      if (filters.billingPreference !== 'all') {
        query = query.eq('billing_preference', filters.billingPreference);
      }

      if (filters.billingCycle !== 'all') {
        query = query.eq('billing_cycle', filters.billingCycle);
      }

      if (filters.monitoringPlan !== 'all') {
        query = query.eq('monitoring_plan', filters.monitoringPlan);
      }

      if (filters.communicationTech !== 'all') {
        query = query.eq('communication_tech', filters.communicationTech);
      }

      if (filters.creditClassification !== 'all') {
        if (filters.creditClassification === 'retrasado') {
          query = query.in('credit_classification', ['retrasado', '15_dias', '30_dias']);
        } else {
          query = query.eq('credit_classification', filters.creditClassification);
        }
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
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters.alarmModel) {
        query = query.ilike('assets.alarm_model', `%${filters.alarmModel}%`);
      }

      if (filters.communicatorModel) {
        query = query.ilike('assets.communicator_model', `%${filters.communicatorModel}%`);
      }

      const { data, error, count } = await (query as any)
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
      propertyType: 'all',
      billingPreference: 'all',
      billingCycle: 'all',
      monitoringPlan: 'all',
      communicationTech: 'all',
      creditClassification: 'all',
      neighborhood: '',
      city: '',
      state: '',
      dateFrom: '',
      dateTo: '',
      isMasterAccount: 'all',
      accountType: 'all',
      alarmModel: '',
      communicatorModel: ''
    });
  };

  const hasActiveFilters = () => {
    return filters.status !== 'all' ||
      filters.customerType !== 'all' ||
      filters.propertyType !== 'all' ||
      filters.billingPreference !== 'all' ||
      filters.billingCycle !== 'all' ||
      filters.monitoringPlan !== 'all' ||
      filters.communicationTech !== 'all' ||
      filters.creditClassification !== 'all' ||
      filters.neighborhood !== '' ||
      filters.city !== '' ||
      filters.state !== '' ||
      filters.dateFrom !== '' ||
      filters.dateTo !== '' ||
      filters.isMasterAccount !== 'all' ||
      filters.accountType !== 'all' ||
      filters.alarmModel !== '' ||
      filters.communicatorModel !== '';
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Clientes ({customers.length})
          </h2>
          <div className="flex items-center gap-2">
            {systemType && !systemType.toLowerCase().includes('alarm') && (
              <button
                onClick={() => setShowGeneratorModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium"
                title="Generar base de datos de clientes con numeración progresiva"
              >
                <Database className="w-5 h-5" />
                Generar BD
              </button>
            )}
            <button
              onClick={() => setShowNewCustomerForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              Nuevo Cliente
            </button>
          </div>
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
            <button
              onClick={() => setFilters({ ...filters, accountType: 'corporativo' })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${filters.accountType === 'corporativo'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }`}
            >
              <Building2 className="w-3 h-3" />
              Corporativos
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
                  <option value="suspended">Suspendidos</option>
                  <option value="inactive">Inactivos</option>
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
                <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de Propiedad</label>
                <select
                  value={filters.propertyType}
                  onChange={(e) => setFilters({ ...filters, propertyType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas</option>
                  <option value="casa">Casa</option>
                  <option value="comercio">Comercio</option>
                  <option value="banco">Banco</option>
                  <option value="rancho">Rancho</option>
                  <option value="gobierno">Gobierno</option>
                  <option value="pozo">Pozo</option>
                  <option value="colegio">Colegio</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Plan de Monitoreo</label>
                <select
                  value={filters.monitoringPlan}
                  onChange={(e) => setFilters({ ...filters, monitoringPlan: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="plus_clasico">Plus Clásico</option>
                  <option value="plus_premium">Plus Premium</option>
                  <option value="premium_com_15">Premium Com. $15</option>
                  <option value="premium_com_20">Premium Com. $20</option>
                  <option value="plus_com_15">Plus Com. $15</option>
                  <option value="plus_com_20">Plus Com. $20</option>
                  <option value="medical_premium">Medical Premium</option>
                  <option value="boton_panico">Botón de Pánico</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Preferencia de Facturación</label>
                <select
                  value={filters.billingPreference}
                  onChange={(e) => setFilters({ ...filters, billingPreference: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas</option>
                  <option value="factura_credito">Factura Crédito</option>
                  <option value="factura_contado">Factura Contado</option>
                  <option value="ticket_tf">Ticket T/F</option>
                  <option value="ticket_v">Ticket T/V</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Ciclo de Facturación</label>
                <select
                  value={filters.billingCycle}
                  onChange={(e) => setFilters({ ...filters, billingCycle: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="semiannual">Semestral</option>
                  <option value="annual">Anual</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Tecnología de Comunicación</label>
                <select
                  value={filters.communicationTech}
                  onChange={(e) => setFilters({ ...filters, communicationTech: e.target.value as any })}
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
                <label className="text-sm font-medium text-gray-700 mb-1 block">Buró</label>
                <select
                  value={filters.creditClassification}
                  onChange={(e) => setFilters({ ...filters, creditClassification: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas</option>
                  <option value="puntual">Puntual</option>
                  <option value="retrasado">Retrasado</option>
                  <option value="moroso">Moroso</option>
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
                  <option value="corporativo">Corporativo</option>
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
                <label className="text-sm font-medium text-gray-700 mb-1 block">Estado (Ubicación)</label>
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

            {/* Filtros de modelo/comunicador del equipo */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
                Filtros por Equipo (Activos instalados)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Modelo de Alarma</label>
                  <input
                    type="text"
                    value={filters.alarmModel}
                    onChange={(e) => setFilters({ ...filters, alarmModel: e.target.value })}
                    placeholder="Ej. Neo, Power Series, Vista..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Modelo de Comunicador</label>
                  <input
                    type="text"
                    value={filters.communicatorModel}
                    onChange={(e) => setFilters({ ...filters, communicatorModel: e.target.value })}
                    placeholder="Ej. Cenor, TL280, IP150..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ⚠️ Estos filtros buscan en los activos instalados del cliente. Solo se mostrarán clientes que tengan al menos un activo que coincida.
                            </p>
            </div>

            {systemType && systemType.toLowerCase() === 'cctv' && (
              <div className="bg-emerald-50/50 p-4 rounded-lg mb-4 border border-emerald-100 mt-4">
                <h4 className="font-semibold text-emerald-900 mb-3 text-sm flex items-center gap-2">
                  <Star className="w-4 h-4" /> Filtros de CCTV
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Cuenta</label>
                    <select value={filters.cctvCuenta} onChange={e => setFilters({...filters, cctvCuenta: e.target.value as any})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm">
                      <option value="all">Todas</option>
                      <option value="normal">Normal</option>
                      <option value="master">Maestra</option>
                      <option value="corporativa">Corporativa</option>
                      <option value="consolidada">Consolidada</option>
                      <option value="suspendida">Suspendida</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Plan</label>
                    <select value={filters.cctvPlan} onChange={e => setFilters({...filters, cctvPlan: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm">
                      <option value="all">Todos</option>
                      <option value="Local">Local</option>
                      <option value="Cloud">Cloud</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Dispositivo</label>
                    <select value={filters.cctvDispositivo} onChange={e => setFilters({...filters, cctvDispositivo: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm">
                      <option value="all">Todos</option>
                      <option value="Cámaras IP">Cámaras IP</option>
                      <option value="DVR">DVR</option>
                      <option value="NVR">NVR</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Canales</label>
                    <select value={filters.cctvCanales} onChange={e => setFilters({...filters, cctvCanales: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm">
                      <option value="all">Todos</option>
                      <option value="4Ch">4Ch</option>
                      <option value="8Ch">8Ch</option>
                      <option value="16Ch">16Ch</option>
                      <option value="32Ch">32Ch</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {systemType && systemType.toLowerCase() === 'control_acceso' && (
              <div className="bg-indigo-50/50 p-4 rounded-lg mb-4 border border-indigo-100 mt-4">
                <h4 className="font-semibold text-indigo-900 mb-3 text-sm flex items-center gap-2">
                  <Star className="w-4 h-4" /> Filtros de Control de Acceso
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Cuenta</label>
                    <select value={filters.accesoCuenta} onChange={e => setFilters({...filters, accesoCuenta: e.target.value as any})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                      <option value="all">Todas</option>
                      <option value="normal">Normal</option>
                      <option value="master">Maestra</option>
                      <option value="corporativa">Corporativa</option>
                      <option value="consolidada">Consolidada</option>
                      <option value="suspendida">Suspendida</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de Control de Acceso</label>
                    <select value={filters.accesoTipo} onChange={e => setFilters({...filters, accesoTipo: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                      <option value="all">Todos</option>
                      <option value="Clave">Clave</option>
                      <option value="Biométrica Huella">Biométrica Huella</option>
                      <option value="Biométrica Huella y Clave">Biométrica Huella y Clave</option>
                      <option value="Biométrica Huella, Clave y Tarjeta">Biométrica Huella, Clave y Tarjeta</option>
                      <option value="Biométrica Iris">Biométrica Iris</option>
                      <option value="Biométrica Palma de Mano">Biométrica Palma de Mano</option>
                      <option value="Biométrica Rostro">Biométrica Rostro</option>
                      <option value="Biométrica Rostro y Clave">Biométrica Rostro y Clave</option>
                      <option value="Biométrica Rostro, Clave y Tarjeta">Biométrica Rostro, Clave y Tarjeta</option>
                      <option value="Biométrica Rostro, Huella y Tarjeta">Biométrica Rostro, Huella y Tarjeta</option>
                      <option value="Biométrica Rostro y Tarjeta">Biométrica Rostro y Tarjeta</option>
                      <option value="Panel con Lectores Esclavos">Panel con Lectores Esclavos</option>
                      <option value="Stand Alone Clave">Stand Alone Clave</option>
                      <option value="Stand Alone Clave y Tarjeta">Stand Alone Clave y Tarjeta</option>
                      <option value="Stand Alone Huella y Tarjeta">Stand Alone Huella y Tarjeta</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {systemType && systemType.toLowerCase() === 'control_asistencia' && (
              <div className="bg-sky-50/50 p-4 rounded-lg mb-4 border border-sky-100 mt-4">
                <h4 className="font-semibold text-sky-900 mb-3 text-sm flex items-center gap-2">
                  <Star className="w-4 h-4" /> Filtros de Control de Asistencia
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Cuenta</label>
                    <select value={filters.asistenciaCuenta} onChange={e => setFilters({...filters, asistenciaCuenta: e.target.value as any})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm">
                      <option value="all">Todas</option>
                      <option value="normal">Normal</option>
                      <option value="master">Maestra</option>
                      <option value="corporativa">Corporativa</option>
                      <option value="consolidada">Consolidada</option>
                      <option value="suspendida">Suspendida</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de Control de Asistencia</label>
                    <select value={filters.asistenciaTipo} onChange={e => setFilters({...filters, asistenciaTipo: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm">
                      <option value="all">Todos</option>
                      <option value="Clave">Clave</option>
                      <option value="Biométrica Huella">Biométrica Huella</option>
                      <option value="Biométrica Huella y Clave">Biométrica Huella y Clave</option>
                      <option value="Biométrica Huella, Clave y Tarjeta">Biométrica Huella, Clave y Tarjeta</option>
                      <option value="Biométrica Iris">Biométrica Iris</option>
                      <option value="Biométrica Palma de Mano">Biométrica Palma de Mano</option>
                      <option value="Biométrica Rostro">Biométrica Rostro</option>
                      <option value="Biométrica Rostro y Clave">Biométrica Rostro y Clave</option>
                      <option value="Biométrica Rostro, Clave y Tarjeta">Biométrica Rostro, Clave y Tarjeta</option>
                      <option value="Biométrica Rostro, Huella y Tarjeta">Biométrica Rostro, Huella y Tarjeta</option>
                      <option value="Biométrica Rostro y Tarjeta">Biométrica Rostro y Tarjeta</option>
                      <option value="Panel con Lectores Esclavos">Panel con Lectores Esclavos</option>
                      <option value="Stand Alone Clave">Stand Alone Clave</option>
                      <option value="Stand Alone Clave y Tarjeta">Stand Alone Clave y Tarjeta</option>
                      <option value="Stand Alone Huella y Tarjeta">Stand Alone Huella y Tarjeta</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {systemType && systemType.toLowerCase() === 'domotica' && (
              <div className="bg-fuchsia-50/50 p-4 rounded-lg mb-4 border border-fuchsia-100 mt-4">
                <h4 className="font-semibold text-fuchsia-900 mb-3 text-sm flex items-center gap-2">
                  <Star className="w-4 h-4" /> Filtros de Domótica
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Cuenta</label>
                    <select value={filters.domoticaCuenta} onChange={e => setFilters({...filters, domoticaCuenta: e.target.value as any})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 text-sm">
                      <option value="all">Todas</option>
                      <option value="normal">Normal</option>
                      <option value="master">Maestra</option>
                      <option value="corporativa">Corporativa</option>
                      <option value="consolidada">Consolidada</option>
                      <option value="suspendida">Suspendida</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Plan</label>
                    <select value={filters.domoticaPlan} onChange={e => setFilters({...filters, domoticaPlan: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 text-sm">
                      <option value="all">Todos</option>
                      <option value="Local">Local</option>
                      <option value="Cloud">Cloud</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Dispositivo de Domótica</label>
                    <select value={filters.domoticaDispositivo} onChange={e => setFilters({...filters, domoticaDispositivo: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 text-sm">
                      <option value="all">Todos</option>
                      <option value="Abre Garage">Abre Garage</option>
                      <option value="Aire Acondicionado">Aire Acondicionado</option>
                      <option value="Apagador Inteligente">Apagador Inteligente</option>
                      <option value="Cerradura">Cerradura</option>
                      <option value="Chapa">Chapa</option>
                      <option value="Contacto Eléctrico">Contacto Eléctrico</option>
                      <option value="Detectores de Agua">Detectores de Agua</option>
                      <option value="Detectores de Humo">Detectores de Humo</option>
                      <option value="Foco">Foco</option>
                      <option value="Lámpara">Lámpara</option>
                      <option value="Lámpara Atenuable">Lámpara Atenuable</option>
                      <option value="Multicontactos">Multicontactos</option>
                      <option value="Socket">Socket</option>
                      <option value="Termostato">Termostato</option>
                      <option value="Válvula de Agua">Válvula de Agua</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {systemType && systemType.toLowerCase() === 'gps_personal' && (
              <div className="bg-rose-50/50 p-4 rounded-lg mb-4 border border-rose-100 mt-4">
                <h4 className="font-semibold text-rose-900 mb-3 text-sm flex items-center gap-2">
                  <Star className="w-4 h-4" /> Filtros de GPS Personal
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Cuenta</label>
                    <select value={filters.gpsPersonalCuenta} onChange={e => setFilters({...filters, gpsPersonalCuenta: e.target.value as any})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm">
                      <option value="all">Todas</option>
                      <option value="normal">Normal</option>
                      <option value="master">Maestra</option>
                      <option value="corporativa">Corporativa</option>
                      <option value="consolidada">Consolidada</option>
                      <option value="suspendida">Suspendida</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Plan GPS Personal</label>
                    <select value={filters.gpsPersonalPlan} onChange={e => setFilters({...filters, gpsPersonalPlan: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm">
                      <option value="all">Todos</option>
                      <option value="Clásico">Clásico</option>
                      <option value="Plus">Plus</option>
                      <option value="Médical Premium">Médical Premium</option>
                      <option value="Taxi">Taxi</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

        {systemType && systemType.toLowerCase() === 'gps_vehicular' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex flex-col gap-2 text-xs font-medium text-gray-600">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-bold text-gray-800 mr-2">Cuentas GPS Vehicular:</span>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Normal</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Maestra</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Corporativa</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Consolidada</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> Suspendida</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div> Cancelada / Baja</div>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-2">
                <span className="font-bold text-gray-800 mr-2">Plan:</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded">GPSV</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded">Plus</span>
              </div>
            </div>
          </div>
        )}

        {systemType && systemType.toLowerCase() === 'red' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex flex-col gap-2 text-xs font-medium text-gray-600">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-bold text-gray-800 mr-2">Cuentas Red:</span>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Normal</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Maestra</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Corporativa</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Consolidada</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> Suspendida</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div> Cancelada / Baja</div>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-2">
                <span className="font-bold text-gray-800 mr-2">Plan:</span>
                <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded">Local</span>
                <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded">Cloud</span>
                
                <span className="font-bold text-gray-800 mr-2 ml-4">Dispositivo:</span>
                <span className="text-gray-500 text-xs">Usa el menú "Filtros Avanzados" para buscar Switch, Modem, Access Point, etc.</span>
              </div>
            </div>
          </div>
        )}

        {systemType && systemType.toLowerCase() === 'video_portero' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex flex-col gap-2 text-xs font-medium text-gray-600">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-bold text-gray-800 mr-2">Cuentas Video Portero:</span>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Normal</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Maestra</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Corporativa</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Consolidada</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> Suspendida</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div> Cancelada / Baja</div>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-2">
                <span className="font-bold text-gray-800 mr-2">Plan:</span>
                <span className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded">Local</span>
                <span className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded">Cloud</span>
                
                <span className="font-bold text-gray-800 mr-2 ml-4">Marca:</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded border border-gray-300">Commax</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded border border-gray-300">Dahua</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded border border-gray-300">Epcom</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded border border-gray-300">Hikvision</span>

                <span className="font-bold text-gray-800 mr-2 ml-4">Tipo:</span>
                <span className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded">Análogo</span>
                <span className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded">IP</span>
                <span className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded">WiFi</span>
              </div>
            </div>
          </div>
        )}

            {systemType && systemType.toLowerCase() === 'gps_vehicular' && (
              <div className="bg-amber-50/50 p-4 rounded-lg mb-4 border border-amber-100 mt-4">
                <h4 className="font-semibold text-amber-900 mb-3 text-sm flex items-center gap-2">
                  <Star className="w-4 h-4" /> Filtros de GPS Vehicular
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Cuenta</label>
                    <select value={filters.gpsVehicularCuenta} onChange={e => setFilters({...filters, gpsVehicularCuenta: e.target.value as any})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm">
                      <option value="all">Todas</option>
                      <option value="normal">Normal</option>
                      <option value="master">Maestra</option>
                      <option value="corporativa">Corporativa</option>
                      <option value="consolidada">Consolidada</option>
                      <option value="suspendida">Suspendida</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Plan GPS Vehicular</label>
                    <select value={filters.gpsVehicularPlan} onChange={e => setFilters({...filters, gpsVehicularPlan: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm">
                      <option value="all">Todos</option>
                      <option value="GPSV">GPSV</option>
                      <option value="Plus">Plus</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {systemType && systemType.toLowerCase() === 'red' && (
              <div className="bg-cyan-50/50 p-4 rounded-lg mb-4 border border-cyan-100 mt-4">
                <h4 className="font-semibold text-cyan-900 mb-3 text-sm flex items-center gap-2">
                  <Star className="w-4 h-4" /> Filtros de Red
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Cuenta</label>
                    <select value={filters.redCuenta} onChange={e => setFilters({...filters, redCuenta: e.target.value as any})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm">
                      <option value="all">Todas</option>
                      <option value="normal">Normal</option>
                      <option value="master">Maestra</option>
                      <option value="corporativa">Corporativa</option>
                      <option value="consolidada">Consolidada</option>
                      <option value="suspendida">Suspendida</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Plan</label>
                    <select value={filters.redPlan} onChange={e => setFilters({...filters, redPlan: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm">
                      <option value="all">Todos</option>
                      <option value="Local">Local</option>
                      <option value="Cloud">Cloud</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de Dispositivo</label>
                    <select value={filters.redDispositivo} onChange={e => setFilters({...filters, redDispositivo: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm">
                      <option value="all">Todos</option>
                      <option value="Switch">Switch</option>
                      <option value="Switch PoE">Switch PoE</option>
                      <option value="Ruteador">Ruteador</option>
                      <option value="Access Point">Access Point</option>
                      <option value="Extensor">Extensor</option>
                      <option value="Modem">Modem</option>
                      <option value="ONU">ONU</option>
                      <option value="Sistema Mesh">Sistema Mesh</option>
                      <option value="Enlace Punto a Punto">Enlace Punto a Punto</option>
                      <option value="StarLink">StarLink</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {systemType && systemType.toLowerCase() === 'video_portero' && (
              <div className="bg-violet-50/50 p-4 rounded-lg mb-4 border border-violet-100 mt-4">
                <h4 className="font-semibold text-violet-900 mb-3 text-sm flex items-center gap-2">
                  <Star className="w-4 h-4" /> Filtros de Video Portero
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Cuenta</label>
                    <select value={filters.vpCuenta} onChange={e => setFilters({...filters, vpCuenta: e.target.value as any})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm">
                      <option value="all">Todas</option>
                      <option value="normal">Normal</option>
                      <option value="master">Maestra</option>
                      <option value="corporativa">Corporativa</option>
                      <option value="consolidada">Consolidada</option>
                      <option value="suspendida">Suspendida</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Plan</label>
                    <select value={filters.vpPlan} onChange={e => setFilters({...filters, vpPlan: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm">
                      <option value="all">Todos</option>
                      <option value="Local">Local</option>
                      <option value="Cloud">Cloud</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Marca</label>
                    <select value={filters.vpMarca} onChange={e => setFilters({...filters, vpMarca: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm">
                      <option value="all">Todas</option>
                      <option value="Commax">Commax</option>
                      <option value="Dahua">Dahua</option>
                      <option value="Epcom">Epcom</option>
                      <option value="Hikvision">Hikvision</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de Dispositivo</label>
                    <select value={filters.vpDispositivo} onChange={e => setFilters({...filters, vpDispositivo: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm">
                      <option value="all">Todos</option>
                      <option value="Análogo">Análogo</option>
                      <option value="IP">IP</option>
                      <option value="WiFi">WiFi</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        
        {systemType && systemType.toLowerCase() === 'cctv' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex flex-col gap-2 text-xs font-medium text-gray-600">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-bold text-gray-800 mr-2">Cuentas CCTV:</span>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Normal</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Maestra</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Corporativa</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Consolidada</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> Suspendida</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div> Cancelada / Baja</div>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-2">
                <span className="font-bold text-gray-800 mr-2">Plan:</span>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">Local</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">Cloud</span>
                
                <span className="font-bold text-gray-800 mr-2 ml-4">Dispositivo:</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded border border-gray-300">Cámaras IP</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded border border-gray-300">DVR</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded border border-gray-300">NVR</span>

                <span className="font-bold text-gray-800 mr-2 ml-4">Canales:</span>
                <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded">4Ch</span>
                <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded">8Ch</span>
                <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded">16Ch</span>
                <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded">32Ch</span>
              </div>
            </div>
          </div>
        )}

        {systemType && systemType.toLowerCase() === 'control_acceso' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex flex-col gap-2 text-xs font-medium text-gray-600">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-bold text-gray-800 mr-2">Cuentas Control de Acceso:</span>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Normal</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Maestra</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Corporativa</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Consolidada</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> Suspendida</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div> Cancelada / Baja</div>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-2">
                <span className="font-bold text-gray-800 mr-2">Filtros Activos:</span>
                <span className="text-gray-500 text-xs">Usa el menú "Filtros Avanzados" para buscar por Tipo de Control de Acceso (Biométrico, Stand Alone, etc.)</span>
              </div>
            </div>
          </div>
        )}

        {systemType && systemType.toLowerCase() === 'control_asistencia' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex flex-col gap-2 text-xs font-medium text-gray-600">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-bold text-gray-800 mr-2">Cuentas Control de Asistencia:</span>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Normal</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Maestra</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Corporativa</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Consolidada</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> Suspendida</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div> Cancelada / Baja</div>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-2">
                <span className="font-bold text-gray-800 mr-2">Filtros Activos:</span>
                <span className="text-gray-500 text-xs">Usa el menú "Filtros Avanzados" para buscar por Tipo de Control de Asistencia</span>
              </div>
            </div>
          </div>
        )}

        {systemType && systemType.toLowerCase() === 'domotica' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex flex-col gap-2 text-xs font-medium text-gray-600">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-bold text-gray-800 mr-2">Cuentas Domótica:</span>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Normal</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Maestra</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Corporativa</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Consolidada</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> Suspendida</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div> Cancelada / Baja</div>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-2">
                <span className="font-bold text-gray-800 mr-2">Plan:</span>
                <span className="px-2 py-0.5 bg-fuchsia-100 text-fuchsia-800 rounded">Local</span>
                <span className="px-2 py-0.5 bg-fuchsia-100 text-fuchsia-800 rounded">Cloud</span>
                
                <span className="font-bold text-gray-800 mr-2 ml-4">Dispositivo:</span>
                <span className="text-gray-500 text-xs">Usa el menú "Filtros Avanzados" para buscar por Tipo de Dispositivo</span>
              </div>
            </div>
          </div>
        )}

        {systemType && systemType.toLowerCase() === 'gps_personal' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex flex-col gap-2 text-xs font-medium text-gray-600">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-bold text-gray-800 mr-2">Cuentas GPS Personal:</span>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Normal</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Maestra</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Corporativa</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Consolidada</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> Suspendida</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div> Cancelada / Baja</div>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-2">
                <span className="font-bold text-gray-800 mr-2">Plan GPS Personal:</span>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded">Clásico</span>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded">Plus</span>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded">Médical Premium</span>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded">Taxi</span>
              </div>
            </div>
          </div>
        )}

        {(!systemType || systemType.toLowerCase() === 'alarma') && (
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

          {systemType !== 'control_acceso' && systemType !== 'control_asistencia' && (
            <>
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
            </>
          )}
        </div>
        )}

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
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${(systemType && (systemType.toLowerCase().includes('alarm') || systemType.toLowerCase() === 'cctv' || systemType.toLowerCase() === 'control_acceso' || systemType.toLowerCase() === 'control_asistencia' || systemType.toLowerCase() === 'domotica' || systemType.toLowerCase() === 'gps_personal' || systemType.toLowerCase() === 'gps_vehicular' || systemType.toLowerCase() === 'red' || systemType.toLowerCase() === 'video_portero')) ? getAlarmBorderColor(customer) : getCustomerColor(customer)} ${customer.is_consolidated_account ? 'text-white' : ''
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
                            #{formatCustomerAccountNumber(customer.account_number, customer.system_type)}
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
                          
                          
                          
                          
                          
                          {customer.system_type === 'gps_personal' && customer.monitoring_plan && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-xs font-bold">
                              PLAN: {customer.monitoring_plan.toUpperCase()}
                            </span>
                          )}
                          {customer.system_type === 'gps_vehicular' && customer.monitoring_plan && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-bold">
                              PLAN: {customer.monitoring_plan.toUpperCase()}
                            </span>
                          )}
                          {customer.system_type === 'red' && customer.monitoring_plan && (
                            <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded text-xs font-bold">
                              PLAN: {customer.monitoring_plan.toUpperCase()}
                            </span>
                          )}
                          {customer.system_type === 'red' && customer.alarm_model && (
                            <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded text-xs font-bold">
                              {customer.alarm_model}
                            </span>
                          )}
                          {customer.system_type === 'video_portero' && customer.monitoring_plan && (
                            <span className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded text-xs font-bold">
                              PLAN: {customer.monitoring_plan.toUpperCase()}
                            </span>
                          )}
                          {customer.system_type === 'video_portero' && customer.alarm_model && (
                            <span className="px-2 py-0.5 bg-fuchsia-100 text-fuchsia-800 rounded text-xs font-bold">
                              {customer.alarm_model}
                            </span>
                          )}

{customer.system_type === 'domotica' && customer.monitoring_plan && (
                            <span className="px-2 py-0.5 bg-fuchsia-100 text-fuchsia-800 rounded text-xs font-bold">
                              PLAN: {customer.monitoring_plan.toUpperCase()}
                            </span>
                          )}
                          {customer.system_type === 'domotica' && customer.alarm_model && (
                            <span className="px-2 py-0.5 bg-pink-100 text-pink-800 rounded text-xs font-bold">
                              {customer.alarm_model}
                            </span>
                          )}

{customer.system_type === 'control_asistencia' && customer.attendance_control_details?.aparato?.tipo_control && (
                            <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded text-xs font-bold">
                              {customer.attendance_control_details.aparato.tipo_control}
                            </span>
                          )}
                          {customer.system_type === 'control_asistencia' && customer.alarm_model && !customer.attendance_control_details?.aparato?.tipo_control && (
                            <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded text-xs font-bold">
                              {customer.alarm_model}
                            </span>
                          )}

{customer.system_type === 'control_acceso' && customer.access_control_details?.aparato?.tipo_control && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs font-bold">
                              {customer.access_control_details.aparato.tipo_control}
                            </span>
                          )}
                          {customer.system_type === 'control_acceso' && customer.alarm_model && !customer.access_control_details?.aparato?.tipo_control && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs font-bold">
                              {customer.alarm_model}
                            </span>
                          )}

{customer.system_type === 'cctv' && customer.monitoring_plan && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs font-bold">
                              PLAN: {customer.monitoring_plan.toUpperCase()}
                            </span>
                          )}
                          {customer.system_type === 'cctv' && customer.dvr_channels && (
                            <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded text-xs font-bold">
                              {customer.dvr_channels} CH
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

                          {systemType !== 'control_acceso' && systemType !== 'control_asistencia' && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentStatusColor(customer)}`}>
                            {customer.is_suspended ? 'SUSPENDIDO' :
                              customer.status === 'cancelled' ? 'CANCELADO' :
                                customer.payment_status?.toUpperCase() || 'SIN ESTADO'}
                          </span>
                          )}

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
          defaultSystemType={systemType || 'alarma'}
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

      {showGeneratorModal && (
        <CustomerGeneratorModal
          initialSystemType={systemType}
          onClose={() => setShowGeneratorModal(false)}
          onSuccess={() => {
            setShowGeneratorModal(false);
            loadCustomers(0, true);
          }}
        />
      )}
    </>
  );
}

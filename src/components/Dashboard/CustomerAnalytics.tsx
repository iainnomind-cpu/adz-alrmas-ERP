import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users,
  PieChart,
  BarChart3,
  UserCheck,
  UserX,
  UserMinus,
  Radio,
  Shield,
  Calendar,
  FileText,
  MapPin,
  Building2,
  Cpu,
  Smartphone,
  Check,
  X,
  Filter,
  Search,
  RotateCcw,
  Eye,
  Phone,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Compass
} from 'lucide-react';
import { CustomerProfile360 } from '../CRM/CustomerProfile360';
import { formatCustomerAccountNumber } from '../../utils/customerAccountNumber';

export type FilterKey =
  | 'tech'
  | 'status'
  | 'emigra_a'
  | 'buro'
  | 'account_type'
  | 'sole'
  | 'billing_cycle'
  | 'annuity_month'
  | 'cfdi'
  | 'plan'
  | 'property_class'
  | 'city'
  | 'state'
  | 'origin'
  | 'alarm_system'
  | 'keyboard'
  | 'communicator'
  | 'dls'
  | 'app_neo'
  | 'app_tm'
  | 'app_cnord'
  | 'cliente_protegido';

interface CustomerRecord {
  id: string;
  name: string;
  owner_name?: string | null;
  business_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  account_number?: number | string | null;
  system_type?: string | null;
  status: string;
  is_suspended?: boolean;
  cancellation_date?: string | null;
  cancellation_reason?: string | null;
  customer_type?: string | null;
  property_type?: string | null;
  communication_tech?: string | null;
  monitoring_plan?: string | null;
  credit_classification?: string | null;
  payment_status?: string | null;
  account_type?: string | null;
  is_master_account?: boolean;
  billing_preference?: string | null;
  billing_cycle?: string | null;
  annuity_month?: number | null;
  annual_fee_due_date?: string | null;
  billing_type?: string | null;
  rfc?: string | null;
  city?: string | null;
  state?: string | null;
  migrated_to_company?: string | null;
  web_access_user?: string | null;
  internal_notes?: string | null;
  general_notes?: string | null;
  service_notes?: string | null;
  created_at?: string;
  // Enriquecidos
  alarm_model?: string;
  keyboard_model?: string;
  communicator_model?: string;
  has_digital_card?: boolean;
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Normalizadores
function getTechOption(tech?: string | null): string {
  const t = (tech || '').toLowerCase().trim();
  if (t.includes('dual') && (t.includes('cn') || t.includes('control'))) return 'Dual CN';
  if (t.includes('dual')) return 'Dual';
  if (t.includes('comcel') || t.includes('celular') || t.includes('gsm') || t.includes('radio') || t.includes('gprs')) return 'Comcel';
  if (t.includes('hub')) return 'Hub';
  if (t.includes('ip') || t.includes('ethernet') || t.includes('wifi') || t.includes('red')) return 'IP';
  if (t.includes('tel') || t.includes('telefono') || t.includes('linea') || t.includes('pstn')) return 'Tel';
  return 'Tel';
}

function getAccountStatusOption(c: CustomerRecord): string {
  const rawStatus = (c.status || '').toLowerCase().trim();
  const isSuspended = c.is_suspended === true || rawStatus === 'suspended' || rawStatus === 'suspendido';
  if (isSuspended) return 'Suspendido';

  const reason = (c.cancellation_reason || '').toLowerCase().trim();
  if (rawStatus === 'baja moroso' || (rawStatus.includes('baja') && reason.includes('moros')) || reason.includes('moros')) {
    return 'Baja Moroso';
  }
  if (rawStatus === 'baja cliente' || rawStatus === 'cancelled' || rawStatus === 'cancelado' || rawStatus === 'cancelada') {
    return 'Baja Cliente';
  }
  if (rawStatus === 'emigra a cn' || (rawStatus.includes('emigra') && rawStatus.includes('cn'))) {
    return 'Emigra a CN';
  }
  if (rawStatus === 'emigra a ip' || (rawStatus.includes('emigra') && rawStatus.includes('ip'))) {
    return 'Emigra a IP';
  }
  if (rawStatus === 'inactiva' || rawStatus === 'inactive' || rawStatus === 'inactivo') {
    return 'Inactiva';
  }
  if (rawStatus === 'libre ip') return 'Libre IP';
  if (rawStatus === 'libre tel') return 'Libre Tel';
  if (rawStatus === 'reasignada') return 'Reasignada';
  if (rawStatus === 'reservada') return 'Reservada';
  return 'Activa';
}

function getEmigrationTarget(c: CustomerRecord): string {
  const status = (c.status || '').toLowerCase().trim();
  const target = (c.migrated_to_company || '').trim();
  if (target) {
    const t = target.toUpperCase();
    if (t.includes('CN')) return 'CN';
    if (t.includes('IP')) return 'IP';
    if (t.includes('ADT')) return 'ADT';
    if (t.includes('BACO')) return 'BACO';
    return target;
  }
  if (status.includes('cn')) return 'CN';
  if (status.includes('ip')) return 'IP';
  if (status.includes('emigra')) return 'Otra Empresa';
  return 'Sin Emigración';
}

function getBureauOption(c: CustomerRecord): string {
  const cr = (c.credit_classification || c.payment_status || '').toLowerCase().trim();
  if (cr === 'moroso') return 'Moroso';
  if (cr === 'retrasado' || cr === '15_dias' || cr === '30_dias' || cr === 'tardado') return 'Retrasado';
  return 'Puntual';
}

function getAccountTypeOption(c: CustomerRecord): string {
  if (c.is_master_account || (c.account_type || '').toLowerCase() === 'master' || (c.account_type || '').toLowerCase() === 'maestra') {
    return 'Maestra';
  }
  const at = (c.account_type || '').toLowerCase().trim();
  if (at.includes('consolidat') || at.includes('consolidad')) return 'Consolidada';
  if (at.includes('demo')) return 'Demo';
  if (at.includes('gratis') || at.includes('free')) return 'Gratis';
  return 'Normal';
}

function getSoleFormatOption(c: CustomerRecord): string {
  const bp = (c.billing_preference || c.billing_type || '').toLowerCase().trim();
  if (bp.includes('demo')) return 'Demo';
  if (bp === 'factura_credito' || (bp.includes('factura') && bp.includes('credito'))) return 'Factura Crédito';
  if (bp === 'factura_contado' || (bp.includes('factura') && bp.includes('contado')) || bp === 'contado') return 'Factura Contado';
  if (bp === 'ticket_tf' || bp.includes('tf') || (bp.includes('remision') && bp.includes('factura'))) return 'Ticket Remisión Factura Serie (TF)';
  if (bp === 'ticket_v' || bp.includes('presupuesto') || bp.includes('serie (v)')) return 'Ticket Remisión Presupuesto Serie (V)';
  if (bp.includes('ticket')) return 'Ticket Remisión Factura Serie (TF)';
  if (bp.includes('factura')) return 'Factura Contado';
  return 'Factura Contado';
}

function getBillingCycleOption(c: CustomerRecord): string {
  const bc = (c.billing_cycle || '').toLowerCase().trim();
  if (bc.includes('anual') || bc.includes('annual')) return 'Anual';
  return 'Mes';
}

function getAnnuityMonthOption(c: CustomerRecord): string {
  if (c.annuity_month && c.annuity_month >= 1 && c.annuity_month <= 12) {
    return MONTH_NAMES[c.annuity_month - 1];
  }
  if (c.annual_fee_due_date) {
    const m = new Date(c.annual_fee_due_date).getMonth();
    if (!isNaN(m) && m >= 0 && m < 12) return MONTH_NAMES[m];
  }
  if (getBillingCycleOption(c) === 'Anual' && c.created_at) {
    const m = new Date(c.created_at).getMonth();
    if (!isNaN(m) && m >= 0 && m < 12) return MONTH_NAMES[m];
  }
  return 'No Aplica';
}

function getCFDIOption(c: CustomerRecord): string {
  const bt = (c.billing_type || '').toLowerCase().trim();
  const rfc = (c.rfc || '').toUpperCase().trim();
  if (rfc === 'XAXX010101000' || bt.includes('publico') || bt.includes('general')) {
    return 'Fact. Público en General';
  }
  if (bt === 'ticket' || (!rfc && !bt)) {
    return 'Ticket';
  }
  if (rfc && rfc !== 'XAXX010101000') {
    return 'SAT';
  }
  return 'Ticket';
}

function getPlanCodeOption(c: CustomerRecord): string {
  const p = (c.monitoring_plan || '').toUpperCase().trim();
  if (p.includes('PREC20') || p.includes('PREMIUM_COM_20')) return 'PREC20';
  if (p.includes('PREC15') || p.includes('PREMIUM_COM_15')) return 'PREC15';
  if (p.includes('PPC20') || p.includes('PLUS_COM_20')) return 'PPC20';
  if (p.includes('PPC15') || p.includes('PLUS_COM_15')) return 'PPC15';
  if (p.includes('PP3') || p.includes('PLUS_PREMIUM_3')) return 'PP3';
  if (p.includes('PP2') || p.includes('PLUS_PREMIUM_2') || p.includes('PLUS_PREMIUM')) return 'PP2';
  if (p.includes('PCA') || p.includes('PLUS_CLASICO') || p.includes('CLASICO')) return 'PCA';
  if (p.includes('MED') || p.includes('MEDICAL')) return 'MED';
  if (p.includes('TAXI')) return 'TAXI';
  if (p.includes('IND') || p.includes('INDIVIDUAL') || p.includes('BASICO')) return 'IND';
  return 'IND';
}

function getPropertyClassOption(c: CustomerRecord): string {
  const prop = (c.property_type || c.customer_type || 'casa').toLowerCase().trim();
  if (prop.includes('banco')) return 'Banco';
  if (prop.includes('cabaña') || prop.includes('cabana')) return 'Cabaña';
  if (prop.includes('comercio') || prop.includes('negocio') || prop.includes('local')) return 'Comercio';
  if (prop.includes('gobierno')) return 'Gobierno';
  if (prop.includes('pozo')) return 'Pozo';
  if (prop.includes('rancho') || prop.includes('finca') || prop.includes('granja')) return 'Rancho';
  return 'Casa';
}

function getAccountOriginOption(c: CustomerRecord): string {
  const str = `${c.account_number || ''} ${c.business_name || ''} ${c.internal_notes || ''} ${c.owner_name || ''}`.toUpperCase();
  if (str.includes('BACO')) return 'BACO';
  if (str.includes('ADT')) return 'ADT';
  if (str.includes('ADZ')) return 'ADZ';
  return 'ADZ';
}

function getDLSOption(c: CustomerRecord): string {
  const str = `${c.alarm_model || ''} ${c.communicator_model || ''} ${c.communication_tech || ''}`.toLowerCase();
  if (str.includes('dsc') || str.includes('pc18') || str.includes('pc585') || str.includes('neo') || str.includes('hs2') || str.includes('ip') || str.includes('dual')) {
    return 'Apto para DLS';
  }
  return 'No Apto para DLS';
}

function getAppNeoOption(c: CustomerRecord): string {
  const str = `${c.alarm_model || ''} ${c.communicator_model || ''}`.toLowerCase();
  if (str.includes('neo') || str.includes('hs2') || str.includes('le2080') || str.includes('tl280')) {
    return 'Con App Neo';
  }
  return 'Sin App Neo';
}

function getAppTMOption(c: CustomerRecord): string {
  if (c.web_access_user || (c.email && c.email.includes('@'))) {
    return 'Con App Temonitoreo';
  }
  return 'Sin App Temonitoreo';
}

function getAppCnordOption(c: CustomerRecord): string {
  const tech = (c.communication_tech || '').toLowerCase();
  const notes = `${c.service_notes || ''} ${c.general_notes || ''}`.toLowerCase();
  if (tech.includes('cn') || notes.includes('cnord')) {
    return 'Con App Cnord';
  }
  return 'Sin App Cnord';
}

export function CustomerAnalytics() {
  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Filtros seleccionados
  const [activeFilters, setActiveFilters] = useState<Partial<Record<FilterKey, string>>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'account' | 'billing' | 'location' | 'hardware' | 'apps'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customersRes, assetsRes, digitalCardsRes] = await Promise.all([
        supabase.from('customers').select('*'),
        supabase.from('assets').select('id, customer_id, name, alarm_model, keyboard_model, communicator_model, brand, model, status, is_eol'),
        supabase.from('customer_digital_cards').select('customer_id, is_active')
      ]);

      const customersData = (customersRes.data || []) as any[];
      const assetsData = (assetsRes.data || []) as any[];
      const cardsData = (digitalCardsRes.data || []) as any[];

      // Mapear tarjetas digitales por cliente
      const digitalCardsSet = new Set<string>();
      cardsData.forEach(card => {
        if (card.customer_id) digitalCardsSet.add(card.customer_id);
      });

      // Mapear equipos por cliente
      const assetsMap = new Map<string, { alarm?: string; keyboard?: string; communicator?: string }>();
      assetsData.forEach(asset => {
        if (!asset.customer_id) return;
        const current = assetsMap.get(asset.customer_id) || {};
        if (asset.alarm_model && !current.alarm) current.alarm = asset.alarm_model;
        if (asset.keyboard_model && !current.keyboard) current.keyboard = asset.keyboard_model;
        if (asset.communicator_model && !current.communicator) current.communicator = asset.communicator_model;
        assetsMap.set(asset.customer_id, current);
      });

      // Enriquecer registros de clientes
      const enriched: CustomerRecord[] = customersData.map(c => {
        const assetInfo = assetsMap.get(c.id);
        return {
          ...c,
          alarm_model: assetInfo?.alarm || (c.system_type === 'alarma' ? 'DSC PowerSeries PC1832' : undefined),
          keyboard_model: assetInfo?.keyboard || (c.system_type === 'alarma' ? 'Teclado LCD PK5500' : undefined),
          communicator_model: assetInfo?.communicator || (c.communication_tech?.toLowerCase().includes('comcel') ? 'Comunicador 3G4000' : undefined),
          has_digital_card: digitalCardsSet.has(c.id)
        };
      });

      setAllCustomers(enriched);
    } catch (error) {
      console.error('Error cargando distribución de clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para evaluar los valores de un cliente frente a los 24 filtros
  const customerValuesMap = useMemo(() => {
    const map = new Map<string, Record<FilterKey, string>>();
    allCustomers.forEach(c => {
      map.set(c.id, {
        tech: getTechOption(c.communication_tech),
        status: getAccountStatusOption(c),
        emigra_a: getEmigrationTarget(c),
        buro: getBureauOption(c),
        account_type: getAccountTypeOption(c),
        sole: getSoleFormatOption(c),
        billing_cycle: getBillingCycleOption(c),
        annuity_month: getAnnuityMonthOption(c),
        cfdi: getCFDIOption(c),
        plan: getPlanCodeOption(c),
        property_class: getPropertyClassOption(c),
        city: (c.city || 'No especificada').trim(),
        state: (c.state || 'No especificado').trim(),
        origin: getAccountOriginOption(c),
        alarm_system: c.alarm_model || 'Sin Sistema',
        keyboard: c.keyboard_model || 'Sin Teclado',
        communicator: c.communicator_model || 'Sin Comunicador',
        dls: getDLSOption(c),
        app_neo: getAppNeoOption(c),
        app_tm: getAppTMOption(c),
        app_cnord: getAppCnordOption(c),
        cliente_protegido: c.has_digital_card ? 'Registrado en Cliente Protegido' : 'No Registrado'
      });
    });
    return map;
  }, [allCustomers]);

  // Filtrado de clientes
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter(c => {
      const values = customerValuesMap.get(c.id);
      if (!values) return true;

      // Evaluar cada filtro activo
      for (const [key, selectedVal] of Object.entries(activeFilters)) {
        if (!selectedVal) continue;
        if (values[key as FilterKey] !== selectedVal) {
          return false;
        }
      }

      // Evaluar búsqueda de texto general
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = (c.name || '').toLowerCase().includes(term);
        const matchesBusiness = (c.business_name || '').toLowerCase().includes(term);
        const matchesPhone = (c.phone || '').includes(term);
        const matchesCity = (c.city || '').toLowerCase().includes(term);
        const matchesAccount = String(c.account_number || '').includes(term);
        if (!matchesName && !matchesBusiness && !matchesPhone && !matchesCity && !matchesAccount) {
          return false;
        }
      }

      return true;
    });
  }, [allCustomers, customerValuesMap, activeFilters, searchTerm]);

  // KPIs superiores basados en los clientes filtrados
  const { activeCount, suspendedCount, cancelledCount } = useMemo(() => {
    let active = 0;
    let suspended = 0;
    let cancelled = 0;

    filteredCustomers.forEach(c => {
      const status = getAccountStatusOption(c);
      if (status === 'Suspendido') {
        suspended++;
      } else if (status === 'Baja Cliente' || status === 'Baja Moroso' || status === 'Inactiva') {
        cancelled++;
      } else {
        active++;
      }
    });

    return { activeCount: active, suspendedCount: suspended, cancelledCount: cancelled };
  }, [filteredCustomers]);

  // Alternar filtro
  const handleToggleFilter = (key: FilterKey, option: string) => {
    setActiveFilters(prev => {
      if (prev[key] === option) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: option };
    });
  };

  const handleClearFilters = () => {
    setActiveFilters({});
    setSearchTerm('');
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0 || searchTerm.trim().length > 0;

  // Renderizador estándar de tarjeta de indicador
  const renderIndicatorCard = (
    indicatorNumber: number,
    title: string,
    filterKey: FilterKey,
    predefinedOptions?: string[],
    icon?: React.ReactNode,
    iconBgColor: string = 'bg-blue-100 text-blue-700'
  ) => {
    // Conteo sobre filteredCustomers para esta clave
    const counts: Record<string, number> = {};

    // Si hay opciones predefinidas exactas, inicializarlas en 0
    if (predefinedOptions) {
      predefinedOptions.forEach(opt => { counts[opt] = 0; });
    }

    filteredCustomers.forEach(c => {
      const values = customerValuesMap.get(c.id);
      if (values) {
        const val = values[filterKey];
        counts[val] = (counts[val] || 0) + 1;
      }
    });

    // Convertir a entries
    let entries = Object.entries(counts);
    if (predefinedOptions) {
      // Ordenar según el orden exacto especificado
      entries.sort((a, b) => {
        const idxA = predefinedOptions.indexOf(a[0]);
        const idxB = predefinedOptions.indexOf(b[0]);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        return b[1] - a[1];
      });
    } else {
      // Ordenar de mayor a menor frecuencia
      entries.sort((a, b) => b[1] - a[1]);
    }

    const currentSelected = activeFilters[filterKey];
    const totalCount = filteredCustomers.length || 1;

    return (
      <div className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden ${
        currentSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-gray-300'
      }`}>
        <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgColor}`}>
              {icon || <BarChart3 className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">
                  #{indicatorNumber}
                </span>
                <h3 className="font-semibold text-gray-900 text-sm truncate" title={title}>
                  {title}
                </h3>
              </div>
            </div>
          </div>
          {currentSelected && (
            <button
              onClick={() => handleToggleFilter(filterKey, currentSelected)}
              className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium transition-colors"
              title="Quitar filtro"
            >
              <Check className="w-3 h-3" />
              <span>{currentSelected}</span>
              <X className="w-3 h-3 ml-0.5" />
            </button>
          )}
        </div>

        <div className="p-4 space-y-2.5 max-h-64 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="text-xs text-gray-400 py-3 text-center">Sin datos coincidentes</p>
          ) : (
            entries.map(([option, count]) => {
              const isSelected = currentSelected === option;
              const percentage = ((count / totalCount) * 100);

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleToggleFilter(filterKey, option)}
                  className={`w-full text-left p-2 rounded-xl transition-all duration-150 group ${
                    isSelected
                      ? 'bg-blue-50/80 border border-blue-300 ring-1 ring-blue-400/30'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className={`font-medium truncate pr-2 ${isSelected ? 'text-blue-900 font-semibold' : 'text-gray-700'}`}>
                      {option}
                    </span>
                    <span className="font-semibold text-gray-900 flex-shrink-0 text-right">
                      {count} <span className="text-gray-400 font-normal">({percentage.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        isSelected
                          ? 'bg-blue-600'
                          : count > 0
                          ? 'bg-blue-500/70 group-hover:bg-blue-600'
                          : 'bg-gray-300'
                      }`}
                      style={{ width: `${Math.max(percentage, count > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // Tarjeta especial #14 (Ciudad con Activos y Suspendidos)
  const renderCityCard = () => {
    const cityMap: Record<string, { total: number; active: number; suspended: number }> = {};

    filteredCustomers.forEach(c => {
      const city = (c.city || 'No especificada').trim();
      if (!cityMap[city]) {
        cityMap[city] = { total: 0, active: 0, suspended: 0 };
      }
      cityMap[city].total++;
      const status = getAccountStatusOption(c);
      if (status === 'Suspendido') {
        cityMap[city].suspended++;
      } else if (status === 'Activa') {
        cityMap[city].active++;
      }
    });

    const entries = Object.entries(cityMap).sort((a, b) => b[1].total - a[1].total);
    const currentSelected = activeFilters.city;
    const totalCount = filteredCustomers.length || 1;

    return (
      <div className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden ${
        currentSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-gray-300'
      }`}>
        <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-100 text-emerald-700">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                  #14
                </span>
                <h3 className="font-semibold text-gray-900 text-sm truncate" title="Ciudad (Activos y Suspendidos)">
                  Ciudad
                </h3>
              </div>
              <p className="text-[11px] text-gray-500 truncate">Separados en Activos y Suspendidos</p>
            </div>
          </div>
          {currentSelected && (
            <button
              onClick={() => handleToggleFilter('city', currentSelected)}
              className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium transition-colors"
            >
              <Check className="w-3 h-3" />
              <span>{currentSelected}</span>
              <X className="w-3 h-3 ml-0.5" />
            </button>
          )}
        </div>

        <div className="p-4 space-y-2.5 max-h-64 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="text-xs text-gray-400 py-3 text-center">Sin ciudades registradas</p>
          ) : (
            entries.map(([city, stats]) => {
              const isSelected = currentSelected === city;
              const percentage = ((stats.total / totalCount) * 100);

              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => handleToggleFilter('city', city)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all duration-150 group ${
                    isSelected
                      ? 'bg-blue-50/80 border border-blue-300 ring-1 ring-blue-400/30'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className={`font-semibold truncate pr-2 ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                      {city}
                    </span>
                    <span className="font-bold text-gray-900 flex-shrink-0">
                      {stats.total} <span className="text-gray-400 font-normal">({percentage.toFixed(1)}%)</span>
                    </span>
                  </div>

                  {/* Badges de Activos y Suspendidos */}
                  <div className="flex items-center gap-2 mb-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Activos: <strong>{stats.active}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      Suspendidos: <strong>{stats.suspended}</strong>
                    </span>
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        isSelected ? 'bg-blue-600' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.max(percentage, 4)}%` }}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // Tarjeta especial #8 (Mes de Anualidad Ene - Dic)
  const renderAnnuityMonthCard = () => {
    const monthCounts: Record<string, number> = {};
    MONTH_NAMES.forEach(m => { monthCounts[m] = 0; });

    filteredCustomers.forEach(c => {
      const val = getAnnuityMonthOption(c);
      if (val && val !== 'No Aplica' && monthCounts[val] !== undefined) {
        monthCounts[val]++;
      }
    });

    const currentSelected = activeFilters.annuity_month;
    const totalCount = filteredCustomers.length || 1;

    return (
      <div className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden ${
        currentSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-gray-300'
      }`}>
        <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-100 text-indigo-700">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono">
                  #8
                </span>
                <h3 className="font-semibold text-gray-900 text-sm truncate" title="Mes de Anualidad">
                  Mes de Anualidad
                </h3>
              </div>
              <p className="text-[11px] text-gray-500 truncate">Cuentas que pagan anualidad (Ene–Dic)</p>
            </div>
          </div>
          {currentSelected && (
            <button
              onClick={() => handleToggleFilter('annuity_month', currentSelected)}
              className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium transition-colors"
            >
              <Check className="w-3 h-3" />
              <span>{currentSelected}</span>
              <X className="w-3 h-3 ml-0.5" />
            </button>
          )}
        </div>

        <div className="p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {MONTH_NAMES.map(month => {
              const count = monthCounts[month] || 0;
              const isSelected = currentSelected === month;
              const percentage = (count / totalCount) * 100;

              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => handleToggleFilter('annuity_month', month)}
                  className={`p-2 rounded-xl text-center transition-all duration-150 border flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : count > 0
                      ? 'bg-indigo-50/60 border-indigo-100 hover:bg-indigo-100/70 text-indigo-950'
                      : 'bg-gray-50/60 border-gray-100 hover:bg-gray-100/80 text-gray-600'
                  }`}
                >
                  <span className="text-xs font-bold block">{month}</span>
                  <span className={`text-base font-extrabold my-0.5 block ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                    {count}
                  </span>
                  <span className={`text-[10px] block opacity-80 ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                    {percentage.toFixed(0)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-sm font-medium text-gray-500">Cargando 24 indicadores de clientes de alarmas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Encabezado y resumen */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
              Módulo de Inteligencia
            </span>
            <span className="text-xs text-gray-500">24 Indicadores & Filtros Seleccionables</span>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Análisis Integral de Clientes Alarmas
          </h2>
          <p className="text-sm text-gray-600">
            Monitoreo en tiempo real de cartera con filtros interactivos combinables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            title="Recargar datos"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-sm transition-transform duration-200 hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse"></span>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-100">Clientes Activos</h3>
              </div>
              <p className="text-4xl font-extrabold tracking-tight">{activeCount}</p>
              <p className="text-xs text-emerald-100/80 mt-1">
                {allCustomers.length > 0 ? ((activeCount / allCustomers.length) * 100).toFixed(1) : 0}% de la cartera total
              </p>
            </div>
            <UserCheck className="w-16 h-16 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-sm transition-transform duration-200 hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-200"></span>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-100">Clientes Suspendidos</h3>
              </div>
              <p className="text-4xl font-extrabold tracking-tight">{suspendedCount}</p>
              <p className="text-xs text-amber-100/80 mt-1">
                {allCustomers.length > 0 ? ((suspendedCount / allCustomers.length) * 100).toFixed(1) : 0}% de la cartera total
              </p>
            </div>
            <UserMinus className="w-16 h-16 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-6 text-white shadow-sm transition-transform duration-200 hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-red-200"></span>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-red-100">Clientes Cancelados</h3>
              </div>
              <p className="text-4xl font-extrabold tracking-tight">{cancelledCount}</p>
              <p className="text-xs text-red-100/80 mt-1">
                {allCustomers.length > 0 ? ((cancelledCount / allCustomers.length) * 100).toFixed(1) : 0}% de la cartera total
              </p>
            </div>
            <UserX className="w-16 h-16 opacity-30" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros Activos y Búsqueda */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por cliente, cuenta, negocio, teléfono o ciudad..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500">
              Mostrando <strong className="text-gray-900">{filteredCustomers.length}</strong> de {allCustomers.length} clientes
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Chips de filtros activos */}
        {hasActiveFilters ? (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              Filtros activos:
            </span>
            {Object.entries(activeFilters).map(([key, val]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200"
              >
                <span className="font-semibold capitalize">{key.replace('_', ' ')}:</span>
                <span>{val}</span>
                <button
                  type="button"
                  onClick={() => handleToggleFilter(key as FilterKey, val)}
                  className="p-0.5 hover:bg-blue-200/60 rounded text-blue-700 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {searchTerm && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                <span>Búsqueda: "{searchTerm}"</span>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-0.5 hover:bg-amber-200/60 rounded text-amber-700 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span>Haz clic en cualquier barra u opción de los 24 indicadores para filtrar los resultados al instante.</span>
          </div>
        )}
      </div>

      {/* Pestañas de categorías para navegación rápida */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Todos (24 Indicadores)', count: 22 },
          { id: 'account', label: 'Contrato & Cuenta', count: 7 },
          { id: 'billing', label: 'Crédito & Facturación', count: 4 },
          { id: 'location', label: 'Ubicación & Propiedad', count: 3 },
          { id: 'hardware', label: 'Equipos & Alarmas', count: 4 },
          { id: 'apps', label: 'Apps & Plataformas', count: 4 }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id as typeof activeCategory)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeCategory === cat.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* GRID DE LOS 24 INDICADORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* #1: Tecnología de Comunicación */}
        {(activeCategory === 'all' || activeCategory === 'account') &&
          renderIndicatorCard(
            1,
            'Tecnología de Comunicación',
            'tech',
            ['Comcel', 'Dual', 'Dual CN', 'Hub', 'IP', 'Tel'],
            <Radio className="w-4 h-4" />,
            'bg-blue-100 text-blue-700'
          )}

        {/* #2: Estatus de Cuenta */}
        {(activeCategory === 'all' || activeCategory === 'account') &&
          renderIndicatorCard(
            2,
            'Estatus de Cuenta',
            'status',
            [
              'Activa',
              'Baja Cliente',
              'Baja Moroso',
              'Emigra a CN',
              'Emigra a IP',
              'Inactiva',
              'Libre IP',
              'Libre Tel',
              'Reasignada',
              'Reservada',
              'Suspendido'
            ],
            <Users className="w-4 h-4" />,
            'bg-emerald-100 text-emerald-700'
          )}

        {/* #3: Emigra a */}
        {(activeCategory === 'all' || activeCategory === 'account') &&
          renderIndicatorCard(
            3,
            'Emigra a',
            'emigra_a',
            ['CN', 'IP', 'ADT', 'BACO', 'Otra Empresa', 'Sin Emigración'],
            <Compass className="w-4 h-4" />,
            'bg-purple-100 text-purple-700'
          )}

        {/* #4: Buró */}
        {(activeCategory === 'all' || activeCategory === 'billing') &&
          renderIndicatorCard(
            4,
            'Buró',
            'buro',
            ['Puntual', 'Retrasado', 'Moroso'],
            <AlertTriangle className="w-4 h-4" />,
            'bg-amber-100 text-amber-700'
          )}

        {/* #5: Tipo de Cuenta */}
        {(activeCategory === 'all' || activeCategory === 'account') &&
          renderIndicatorCard(
            5,
            'Tipo de Cuenta',
            'account_type',
            ['Maestra', 'Normal', 'Consolidada', 'Demo', 'Gratis'],
            <Layers className="w-4 h-4" />,
            'bg-indigo-100 text-indigo-700'
          )}

        {/* #6: Formato Solé */}
        {(activeCategory === 'all' || activeCategory === 'billing') &&
          renderIndicatorCard(
            6,
            'Formato Solé',
            'sole',
            [
              'Demo',
              'Factura Crédito',
              'Factura Contado',
              'Ticket Remisión Factura Serie (TF)',
              'Ticket Remisión Presupuesto Serie (V)'
            ],
            <FileText className="w-4 h-4" />,
            'bg-cyan-100 text-cyan-700'
          )}

        {/* #7: Ciclo de Facturación */}
        {(activeCategory === 'all' || activeCategory === 'account') &&
          renderIndicatorCard(
            7,
            'Ciclo de Facturación',
            'billing_cycle',
            ['Mes', 'Anual'],
            <Calendar className="w-4 h-4" />,
            'bg-teal-100 text-teal-700'
          )}

        {/* #8: Mes de Anualidad */}
        {(activeCategory === 'all' || activeCategory === 'account') && renderAnnuityMonthCard()}

        {/* #9: CFDI */}
        {(activeCategory === 'all' || activeCategory === 'billing') &&
          renderIndicatorCard(
            9,
            'CFDI',
            'cfdi',
            ['SAT', 'Ticket', 'Fact. Público en General'],
            <FileText className="w-4 h-4" />,
            'bg-sky-100 text-sky-700'
          )}

        {/* #10: Código de Plan */}
        {(activeCategory === 'all' || activeCategory === 'billing') &&
          renderIndicatorCard(
            10,
            'Código de Plan',
            'plan',
            ['IND', 'MED', 'PCA', 'PP2', 'PP3', 'PPC15', 'PPC20', 'PREC15', 'PREC20', 'TAXI'],
            <PieChart className="w-4 h-4" />,
            'bg-rose-100 text-rose-700'
          )}

        {/* #13: Clase (Tipo de Propiedad) */}
        {(activeCategory === 'all' || activeCategory === 'location') &&
          renderIndicatorCard(
            13,
            'Clase (Tipo de Propiedad)',
            'property_class',
            ['Banco', 'Cabaña', 'Casa', 'Comercio', 'Gobierno', 'Pozo', 'Rancho'],
            <Building2 className="w-4 h-4" />,
            'bg-blue-100 text-blue-700'
          )}

        {/* #14: Ciudad */}
        {(activeCategory === 'all' || activeCategory === 'location') && renderCityCard()}

        {/* #15: Estado */}
        {(activeCategory === 'all' || activeCategory === 'location') &&
          renderIndicatorCard(
            15,
            'Estado',
            'state',
            undefined,
            <MapPin className="w-4 h-4" />,
            'bg-teal-100 text-teal-700'
          )}

        {/* #16: Origen de Cuenta */}
        {(activeCategory === 'all' || activeCategory === 'account') &&
          renderIndicatorCard(
            16,
            'Origen de Cuenta',
            'origin',
            ['ADZ', 'ADT', 'BACO', 'Otros'],
            <Shield className="w-4 h-4" />,
            'bg-slate-100 text-slate-700'
          )}

        {/* #17: Sistema */}
        {(activeCategory === 'all' || activeCategory === 'hardware') &&
          renderIndicatorCard(
            17,
            'Sistema (Alarma)',
            'alarm_system',
            undefined,
            <Cpu className="w-4 h-4" />,
            'bg-orange-100 text-orange-700'
          )}

        {/* #18: Teclado */}
        {(activeCategory === 'all' || activeCategory === 'hardware') &&
          renderIndicatorCard(
            18,
            'Teclado',
            'keyboard',
            undefined,
            <Cpu className="w-4 h-4" />,
            'bg-amber-100 text-amber-700'
          )}

        {/* #19: Comcel */}
        {(activeCategory === 'all' || activeCategory === 'hardware') &&
          renderIndicatorCard(
            19,
            'Comcel (Comunicador)',
            'communicator',
            undefined,
            <Radio className="w-4 h-4" />,
            'bg-cyan-100 text-cyan-700'
          )}

        {/* #20: DLS */}
        {(activeCategory === 'all' || activeCategory === 'hardware') &&
          renderIndicatorCard(
            20,
            'DLS (Programación Remota)',
            'dls',
            ['Apto para DLS', 'No Apto para DLS'],
            <Cpu className="w-4 h-4" />,
            'bg-violet-100 text-violet-700'
          )}

        {/* #21: App Neo */}
        {(activeCategory === 'all' || activeCategory === 'apps') &&
          renderIndicatorCard(
            21,
            'App Neo',
            'app_neo',
            ['Con App Neo', 'Sin App Neo'],
            <Smartphone className="w-4 h-4" />,
            'bg-indigo-100 text-indigo-700'
          )}

        {/* #22: App TM */}
        {(activeCategory === 'all' || activeCategory === 'apps') &&
          renderIndicatorCard(
            22,
            'App TM (Temonitoreo)',
            'app_tm',
            ['Con App Temonitoreo', 'Sin App Temonitoreo'],
            <Smartphone className="w-4 h-4" />,
            'bg-blue-100 text-blue-700'
          )}

        {/* #23: App Cnord */}
        {(activeCategory === 'all' || activeCategory === 'apps') &&
          renderIndicatorCard(
            23,
            'App Cnord',
            'app_cnord',
            ['Con App Cnord', 'Sin App Cnord'],
            <Smartphone className="w-4 h-4" />,
            'bg-teal-100 text-teal-700'
          )}

        {/* #24: Cliente Protegido */}
        {(activeCategory === 'all' || activeCategory === 'apps') &&
          renderIndicatorCard(
            24,
            'Cliente Protegido',
            'cliente_protegido',
            ['Registrado en Cliente Protegido', 'No Registrado'],
            <CheckCircle2 className="w-4 h-4" />,
            'bg-emerald-100 text-emerald-700'
          )}
      </div>

      {/* TABLA DE CLIENTES FILTRADOS */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-8">
        <div className="p-5 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Listado de Clientes Filtrados ({filteredCustomers.length})
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Haz clic en cualquier cliente para consultar su expediente 360 y ficha técnica completa.
            </p>
          </div>
          {filteredCustomers.length > 0 && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold self-start sm:self-auto">
              {filteredCustomers.length} resultados
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100/60 text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-5 py-3.5">Cuenta</th>
                <th className="px-5 py-3.5">Cliente / Negocio</th>
                <th className="px-5 py-3.5">Tecnología & Plan</th>
                <th className="px-5 py-3.5">Ubicación</th>
                <th className="px-5 py-3.5">Buró</th>
                <th className="px-5 py-3.5">Estatus</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium text-gray-700">No se encontraron clientes con los filtros seleccionados</p>
                    <p className="text-xs text-gray-400 mt-1">Prueba quitando algunos filtros o limpiando la búsqueda.</p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleClearFilters}
                        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Limpiar todos los filtros
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => {
                  const values = customerValuesMap.get(customer.id);
                  const isSusp = customer.is_suspended || (customer.status || '').toLowerCase().includes('suspend');

                  return (
                    <tr
                      key={customer.id}
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 border border-gray-200">
                          {formatCustomerAccountNumber(customer.account_number, customer.system_type)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{customer.name}</div>
                        {customer.business_name && (
                          <div className="text-xs text-gray-500">{customer.business_name}</div>
                        )}
                        <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                          {customer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {values?.tech || 'Tel'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {values?.plan || 'IND'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1 capitalize">
                          Propiedad: {values?.property_class || 'Casa'}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-800">{customer.city || 'No especificada'}</div>
                        <div className="text-xs text-gray-400">{customer.state || 'México'}</div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            values?.buro === 'Puntual'
                              ? 'bg-emerald-100 text-emerald-800'
                              : values?.buro === 'Retrasado'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {values?.buro || 'Puntual'}
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isSusp
                              ? 'bg-amber-100 text-amber-800'
                              : values?.status === 'Activa'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {values?.status || 'Activa'}
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedCustomerId(customer.id);
                          }}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100/60 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">Ver Ficha</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Perfil 360 del Cliente */}
      {selectedCustomerId && (
        <CustomerProfile360
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
          onEdit={() => {}}
        />
      )}
    </div>
  );
}

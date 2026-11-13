import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  X, Save, Loader2, Search, Plus, Trash2, Package, AlertCircle, User, UserPlus, FileText
} from 'lucide-react';
import { useIvaRate, round2, formatPercent } from '../../lib/tax';
import { describeSupabaseError, isDuplicateError } from '../../lib/supabaseErrors';
import { getNextQuoteFolio } from '../../lib/folios';
import { buildSearchPatterns } from '../../constants/customerLegend';
import { SYSTEM_TYPES } from '../../constants/systemTypes';
import {
  type Quote, type QuoteItem, type QuoteCustomer,
  DEFAULT_QUOTE_TERMS, DEFAULT_VALIDITY_DAYS,
  computeQuoteTotals, lineTotal, todayISO, addDaysISO, formatMoney
} from './quoteTypes';

interface QuoteFormProps {
  /** Cotización a editar. Sin ella se crea una nueva. */
  quote?: Quote | null;
  /** Cotización a usar como plantilla (duplicar). */
  template?: Quote | null;
  /** Cliente preseleccionado (al cotizar desde el perfil del cliente). */
  initialCustomerId?: string;
  onClose: () => void;
  onSaved: (quoteId: string) => void;
}

interface CatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  base_price_mxn: number | null;
  price_with_tax_mxn: number | null;
  has_tax: boolean | null;
  tax_rate: number | null;
  stock_quantity: number | null;
  discount_tier_1: number | null;
  discount_tier_2: number | null;
  discount_tier_3: number | null;
  discount_tier_4: number | null;
  discount_tier_5: number | null;
}

const ITEM_GROUPS: { key: string; label: string; categories: string[] }[] = [
  { key: 'all', label: 'Todos', categories: [] },
  { key: 'dispositivos', label: 'Dispositivos', categories: ['dispositivo', 'sensor'] },
  { key: 'materiales', label: 'Materiales', categories: ['material', 'accesorio'] },
  { key: 'servicios', label: 'Servicios de monitoreo', categories: ['servicio'] },
  { key: 'tecnicos', label: 'Servicios técnicos', categories: ['mano_obra'] }
];

const CUSTOMER_FIELDS = 'id, name, business_name, phone, email, address, account_number, system_type, pricing_tier';

export function QuoteForm({ quote, template, initialCustomerId, onClose, onSaved }: QuoteFormProps) {
  const { user } = useAuth();
  const { percent: ivaPercent, rate: ivaRate } = useIvaRate();
  const source = quote || template || null;
  const isEditing = !!quote;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Cliente o prospecto ──
  const [clientMode, setClientMode] = useState<'customer' | 'prospect'>(
    source ? (source.customer_id ? 'customer' : 'prospect') : 'customer'
  );
  const [customer, setCustomer] = useState<QuoteCustomer | null>(source?.customers || null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<QuoteCustomer[]>([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const [form, setForm] = useState({
    title: source?.title || '',
    system_type: source?.system_type || '',
    issue_date: isEditing ? (quote?.issue_date || todayISO()) : todayISO(),
    valid_until: isEditing ? (quote?.valid_until || '') : addDaysISO(DEFAULT_VALIDITY_DAYS),
    prospect_name: source?.prospect_name || '',
    prospect_phone: source?.prospect_phone || '',
    prospect_email: source?.prospect_email || '',
    prospect_address: source?.prospect_address || '',
    discount: Number(source?.discount) || 0,
    notes: source?.notes || '',
    terms: source ? (source.terms || '') : DEFAULT_QUOTE_TERMS,
    internal_notes: source?.internal_notes || ''
  });

  // ── Partidas ──
  const [items, setItems] = useState<QuoteItem[]>(() =>
    [...(source?.quote_items || [])]
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((item, i) => ({
        price_list_id: item.price_list_id,
        code: item.code,
        description: item.description,
        category: item.category,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        discount_percent: Number(item.discount_percent) || 0,
        line_total: Number(item.line_total) || 0,
        sort_order: i
      }))
  );
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [itemGroup, setItemGroup] = useState('all');

  // La tasa de una cotización existente se conserva; una nueva usa la configurada
  const taxRatePercent = isEditing && Number(quote?.tax_rate) >= 0 ? Number(quote?.tax_rate) : ivaPercent;
  const totals = useMemo(
    () => computeQuoteTotals(items, form.discount, taxRatePercent),
    [items, form.discount, taxRatePercent]
  );

  useEffect(() => {
    (supabase.from('price_list') as any)
      .select('id, code, name, category, base_price_mxn, price_with_tax_mxn, has_tax, tax_rate, stock_quantity, discount_tier_1, discount_tier_2, discount_tier_3, discount_tier_4, discount_tier_5')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error: loadError }: { data: CatalogItem[] | null; error: unknown }) => {
        if (loadError) console.error('Error cargando inventario:', loadError);
        setCatalog(data || []);
      });
  }, []);

  useEffect(() => {
    if (!initialCustomerId || source) return;
    (supabase.from('customers') as any)
      .select(CUSTOMER_FIELDS)
      .eq('id', initialCustomerId)
      .maybeSingle()
      .then(({ data }: { data: QuoteCustomer | null }) => {
        if (data) {
          setCustomer(data);
          setForm(prev => ({ ...prev, system_type: prev.system_type || data.system_type || '' }));
        }
      });
  }, [initialCustomerId, source]);

  const handleCustomerSearch = (term: string) => {
    setCustomerSearch(term);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (term.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    setSearchingCustomer(true);
    searchTimer.current = setTimeout(async () => {
      try {
        let query = (supabase.from('customers') as any).select(CUSTOMER_FIELDS).limit(12);
        const fields = ['name', 'owner_name', 'business_name', 'phone'];
        buildSearchPatterns(term).forEach((pattern) => {
          query = query.or(fields.map((f) => `${f}.ilike.${pattern}`).join(','));
        });
        const { data, error: searchError } = await query;
        if (searchError) throw searchError;
        setCustomerResults(data || []);
      } catch (err) {
        console.error('Error buscando clientes:', err);
      } finally {
        setSearchingCustomer(false);
      }
    }, 300);
  };

  const selectCustomer = (c: QuoteCustomer) => {
    setCustomer(c);
    setCustomerSearch('');
    setCustomerResults([]);
    setForm(prev => ({ ...prev, system_type: prev.system_type || c.system_type || '' }));
  };

  // ── Precios ──
  const netPriceOf = (item: CatalogItem): number => {
    const withTax = Number(item.price_with_tax_mxn) || 0;
    if (withTax > 0) return round2(withTax);
    const base = Number(item.base_price_mxn) || 0;
    const itemRate = item.has_tax === false ? 0 : (Number(item.tax_rate) > 0 ? Number(item.tax_rate) / 100 : ivaRate);
    return round2(base * (1 + itemRate));
  };

  /** Descuento por nivel de precio del cliente, igual que en las órdenes de servicio. */
  const tierDiscountOf = (item: CatalogItem): number => {
    if (clientMode !== 'customer' || !customer) return 0;
    const tier = Number(customer.pricing_tier) || 1;
    const value = (item as any)[`discount_tier_${tier}`];
    return Number(value) > 0 ? Number(value) : 0;
  };

  const addCatalogItem = (item: CatalogItem) => {
    setItems(prev => {
      const existing = prev.findIndex(l => l.price_list_id === item.id);
      if (existing >= 0) {
        return prev.map((l, i) => i === existing ? { ...l, quantity: l.quantity + 1 } : l);
      }
      return [...prev, {
        price_list_id: item.id,
        code: item.code,
        description: item.name,
        category: item.category,
        quantity: 1,
        unit_price: netPriceOf(item),
        discount_percent: tierDiscountOf(item),
        line_total: 0,
        sort_order: prev.length
      }];
    });
  };

  const addFreeItem = () => {
    setItems(prev => [...prev, {
      price_list_id: null,
      code: null,
      description: '',
      category: null,
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      line_total: 0,
      sort_order: prev.length
    }]);
  };

  const updateItem = (index: number, changes: Partial<QuoteItem>) => {
    setItems(prev => prev.map((l, i) => i === index ? { ...l, ...changes } : l));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const filteredCatalog = useMemo(() => {
    const group = ITEM_GROUPS.find(g => g.key === itemGroup);
    const term = itemSearch.trim().toLowerCase();
    return catalog.filter(item => {
      if (group && group.categories.length > 0 && !group.categories.includes(item.category)) return false;
      if (!term) return true;
      return item.name.toLowerCase().includes(term) || (item.code || '').toLowerCase().includes(term);
    }).slice(0, 40);
  }, [catalog, itemGroup, itemSearch]);

  // ── Guardar ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) return setError('Escribe un título para la cotización (ej. "Instalación de alarma").');
    if (clientMode === 'customer' && !customer) return setError('Selecciona un cliente o cambia a "Prospecto".');
    if (clientMode === 'prospect' && !form.prospect_name.trim()) return setError('Escribe el nombre del prospecto.');
    if (items.length === 0) return setError('Agrega al menos un producto o servicio.');
    if (items.some(l => !l.description.trim())) return setError('Todas las partidas deben tener descripción.');
    if (form.valid_until && form.valid_until < form.issue_date) return setError('La vigencia no puede ser anterior a la fecha de emisión.');

    setSaving(true);
    try {
      const header = {
        customer_id: clientMode === 'customer' ? customer!.id : null,
        prospect_name: clientMode === 'prospect' ? form.prospect_name.trim() : null,
        prospect_phone: clientMode === 'prospect' ? (form.prospect_phone.trim() || null) : null,
        prospect_email: clientMode === 'prospect' ? (form.prospect_email.trim() || null) : null,
        prospect_address: clientMode === 'prospect' ? (form.prospect_address.trim() || null) : null,
        title: form.title.trim(),
        system_type: form.system_type || null,
        issue_date: form.issue_date,
        valid_until: form.valid_until || null,
        pricing_tier: clientMode === 'customer' ? (Number(customer!.pricing_tier) || 1) : 1,
        tax_rate: taxRatePercent,
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: form.discount || 0,
        total: totals.total,
        notes: form.notes.trim() || null,
        terms: form.terms.trim() || null,
        internal_notes: form.internal_notes.trim() || null
      };

      let quoteId = quote?.id || '';

      if (isEditing) {
        const { error: updateError } = await (supabase.from('quotes') as any).update(header).eq('id', quoteId);
        if (updateError) throw updateError;
        const { error: deleteError } = await (supabase.from('quote_items') as any).delete().eq('quote_id', quoteId);
        if (deleteError) throw deleteError;
      } else {
        // Si otro usuario tomó el folio mientras tanto, se pide el siguiente
        let insertError: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const folio = await getNextQuoteFolio();
          const { data, error: err } = await (supabase.from('quotes') as any)
            .insert([{
              ...header,
              folio,
              status: 'draft',
              created_by: user?.id || null,
              created_by_name: (user as any)?.user_metadata?.full_name || user?.email || 'Sistema'
            }])
            .select('id')
            .single();
          insertError = err;
          if (!err) {
            quoteId = data.id;
            break;
          }
          if (!isDuplicateError(err)) break;
        }
        if (insertError) throw insertError;
      }

      const rows = items.map((l, i) => ({
        quote_id: quoteId,
        price_list_id: l.price_list_id,
        code: l.code,
        description: l.description.trim(),
        category: l.category,
        quantity: l.quantity,
        unit_price: l.unit_price,
        discount_percent: l.discount_percent || 0,
        line_total: lineTotal(l),
        sort_order: i
      }));
      const { error: itemsError } = await (supabase.from('quote_items') as any).insert(rows);
      if (itemsError) throw itemsError;

      onSaved(quoteId);
    } catch (err) {
      console.error('Error guardando cotización:', err);
      setError(describeSupabaseError(err, 'Error al guardar la cotización'));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            {isEditing ? `Editar cotización ${quote?.folio}` : 'Nueva cotización'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" type="button">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Cliente ── */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-gray-900">¿Para quién es?</h3>
              <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setClientMode('customer')}
                  className={`px-4 py-2 flex items-center gap-2 ${clientMode === 'customer' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  <User className="w-4 h-4" /> Cliente existente
                </button>
                <button
                  type="button"
                  onClick={() => setClientMode('prospect')}
                  className={`px-4 py-2 flex items-center gap-2 border-l border-gray-300 ${clientMode === 'prospect' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  <UserPlus className="w-4 h-4" /> Prospecto
                </button>
              </div>
            </div>

            {clientMode === 'customer' ? (
              customer ? (
                <div className="flex items-center justify-between gap-3 bg-green-50 border border-green-300 rounded-lg px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{customer.business_name || customer.name}</p>
                    <p className="text-sm text-gray-600 truncate">
                      {[customer.phone, customer.email].filter(Boolean).join(' • ') || 'Sin datos de contacto'}
                      {' • '}Nivel de precio {Number(customer.pricing_tier) || 1}
                    </p>
                  </div>
                  <button type="button" onClick={() => setCustomer(null)} className="text-sm text-blue-700 hover:underline flex-shrink-0">
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                    placeholder="Buscar cliente por nombre, negocio o teléfono..."
                    className={`${inputClass} pl-10`}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  {searchingCustomer && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 w-4 h-4 animate-spin" />}
                  {customerResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {customerResults.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectCustomer(c)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0"
                        >
                          <div className="font-medium text-gray-900">{c.business_name || c.name}</div>
                          <div className="text-sm text-gray-500">{[c.phone, c.email].filter(Boolean).join(' • ')}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input type="text" value={form.prospect_name} onChange={(e) => setForm({ ...form, prospect_name: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input type="tel" value={form.prospect_phone} onChange={(e) => setForm({ ...form, prospect_phone: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                  <input type="email" value={form.prospect_email} onChange={(e) => setForm({ ...form, prospect_email: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input type="text" value={form.prospect_address} onChange={(e) => setForm({ ...form, prospect_address: e.target.value })} className={inputClass} />
                </div>
              </div>
            )}
          </section>

          {/* ── Datos generales ── */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej. Instalación de alarma con 4 sensores"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de sistema</label>
              <select value={form.system_type} onChange={(e) => setForm({ ...form, system_type: e.target.value })} className={inputClass}>
                <option value="">Sin especificar</option>
                {SYSTEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emisión</label>
                <input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vigencia</label>
                <input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className={inputClass} />
              </div>
            </div>
          </section>

          {/* ── Catálogo ── */}
          <section className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Productos y servicios
              </h3>
              <button type="button" onClick={addFreeItem} className="text-sm text-blue-700 hover:underline flex items-center gap-1">
                <Plus className="w-4 h-4" /> Partida libre (sin inventario)
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {ITEM_GROUPS.map(group => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setItemGroup(group.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${itemGroup === group.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                >
                  {group.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Buscar en el inventario por nombre o código..."
                className={`${inputClass} pl-10`}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>

            <div className="max-h-44 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
              {filteredCatalog.length === 0 ? (
                <p className="text-sm text-gray-500 p-3">
                  {catalog.length === 0 ? 'No hay productos activos en el inventario.' : 'Sin resultados.'}
                </p>
              ) : filteredCatalog.map(item => {
                const stock = Number(item.stock_quantity) || 0;
                const physical = ['dispositivo', 'sensor', 'accesorio', 'material'].includes(item.category);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addCatalogItem(item)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-blue-50"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-900 truncate">{item.name}</span>
                      <span className="block text-xs text-gray-500">
                        {item.code}
                        {physical && (
                          <span className={stock > 0 ? ' text-green-700' : ' text-red-600'}>
                            {' '}• {stock > 0 ? `${stock} en existencia` : 'Sin existencias'}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 flex-shrink-0 text-sm font-semibold text-gray-700">
                      {formatMoney(netPriceOf(item))}
                      <Plus className="w-4 h-4 text-blue-600" />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Partidas ── */}
          {items.length > 0 && (
            <section className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-2 font-medium">Descripción</th>
                    <th className="py-2 px-2 font-medium w-20">Cant.</th>
                    <th className="py-2 px-2 font-medium w-28">Precio neto</th>
                    <th className="py-2 px-2 font-medium w-20">Desc. %</th>
                    <th className="py-2 px-2 font-medium w-28 text-right">Importe</th>
                    <th className="py-2 pl-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((line, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => updateItem(index, { description: e.target.value })}
                          placeholder="Descripción de la partida"
                          className="w-full min-w-[12rem] px-2 py-1 border border-gray-300 rounded"
                        />
                        {line.code && <span className="text-xs text-gray-400">{line.code}</span>}
                      </td>
                      <td className="py-2 px-2 align-top">
                        <input
                          type="number" min="0.01" step="0.01"
                          value={line.quantity}
                          onChange={(e) => updateItem(index, { quantity: Math.max(0.01, parseFloat(e.target.value) || 1) })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      </td>
                      <td className="py-2 px-2 align-top">
                        <input
                          type="number" min="0" step="0.01"
                          value={line.unit_price}
                          onChange={(e) => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      </td>
                      <td className="py-2 px-2 align-top">
                        <input
                          type="number" min="0" max="100" step="0.5"
                          value={line.discount_percent}
                          onChange={(e) => updateItem(index, { discount_percent: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      </td>
                      <td className="py-2 px-2 align-top text-right font-semibold text-gray-900 whitespace-nowrap">
                        {formatMoney(lineTotal(line))}
                      </td>
                      <td className="py-2 pl-2 align-top">
                        <button type="button" onClick={() => removeItem(index)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Quitar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-2">
                Los precios son netos (IVA incluido). El descuento por partida se llena solo con el nivel de precio del cliente y se puede cambiar.
              </p>
            </section>
          )}

          {/* ── Notas y totales ── */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas para el cliente</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condiciones</label>
                <textarea rows={2} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas (no se imprimen)</label>
                <textarea rows={2} value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} className={inputClass} />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm h-fit">
              <div className="flex justify-between text-gray-600">
                <span>Suma de partidas:</span>
                <span className="font-medium text-gray-900">{formatMoney(totals.itemsTotal)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600 gap-3">
                <span>Descuento global:</span>
                <input
                  type="number" min="0" step="0.01"
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })}
                  className="w-28 px-2 py-1 border border-gray-300 rounded text-right text-red-600"
                />
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-medium text-gray-900">{formatMoney(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IVA ({formatPercent(taxRatePercent)}%):</span>
                <span className="font-medium text-gray-900">{formatMoney(totals.tax)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-gray-700 font-medium">Total:</span>
                <span className="text-2xl font-bold text-gray-900">{formatMoney(totals.total)}</span>
              </div>
            </div>
          </section>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4" /> {isEditing ? 'Guardar cambios' : 'Crear cotización'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

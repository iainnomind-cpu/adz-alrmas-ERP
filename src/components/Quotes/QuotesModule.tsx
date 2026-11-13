import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../contexts/PermissionsContext';
import { FileText, Plus, Search, Loader2, AlertCircle, TrendingUp, Clock, CheckCircle2, DollarSign } from 'lucide-react';
import { describeSupabaseError } from '../../lib/supabaseErrors';
import { normalizeKey } from '../../constants/customerLegend';
import { QuoteForm } from './QuoteForm';
import { QuoteDetail } from './QuoteDetail';
import {
  type Quote, type QuoteStatus, QUOTE_SELECT, QUOTE_STATUS_META,
  quoteClientName, isQuoteExpired, formatMoney, formatDate, todayISO
} from './quoteTypes';

interface QuotesModuleProps {
  /** Si se indica, solo muestra las cotizaciones de ese cliente (pestaña del perfil). */
  customerId?: string;
}

type StatusFilter = 'all' | QuoteStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'draft', label: 'Borradores' },
  { value: 'sent', label: 'Enviadas' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'converted', label: 'Convertidas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'expired', label: 'Vencidas' }
];

export function QuotesModule({ customerId }: QuotesModuleProps) {
  const { hasPermission, isAdmin } = usePermissions();
  const canCreate = isAdmin || hasPermission('quotes', 'create');

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const [detailId, setDetailId] = useState<string | null>(null);
  const [formState, setFormState] = useState<{ quote?: Quote; template?: Quote } | null>(null);

  const loadQuotes = async () => {
    setLoading(true);
    setError('');
    try {
      let query = (supabase.from('quotes') as any)
        .select(QUOTE_SELECT)
        .order('created_at', { ascending: false })
        .limit(500);
      if (customerId) query = query.eq('customer_id', customerId);
      const { data, error: loadError } = await query;
      if (loadError) throw loadError;

      let list = (data || []) as Quote[];

      // Las cotizaciones enviadas cuya vigencia ya pasó se marcan como vencidas
      const expiredIds = list.filter(isQuoteExpired).map(q => q.id);
      if (expiredIds.length > 0) {
        const { error: expireError } = await (supabase.from('quotes') as any)
          .update({ status: 'expired' })
          .in('id', expiredIds);
        if (!expireError) {
          list = list.map(q => expiredIds.includes(q.id) ? { ...q, status: 'expired' as QuoteStatus } : q);
        }
      }

      setQuotes(list);
    } catch (err) {
      console.error('Error cargando cotizaciones:', err);
      setError(describeSupabaseError(err, 'Error al cargar las cotizaciones'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const filtered = useMemo(() => {
    const term = normalizeKey(search);
    return quotes.filter(q => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (!term) return true;
      return normalizeKey(`${q.folio} ${q.title} ${quoteClientName(q)} ${q.prospect_phone || ''} ${q.customers?.phone || ''}`).includes(term);
    });
  }, [quotes, statusFilter, search]);

  const stats = useMemo(() => {
    const open = quotes.filter(q => q.status === 'draft' || q.status === 'sent');
    const won = quotes.filter(q => q.status === 'accepted' || q.status === 'converted');
    const closed = quotes.filter(q => ['accepted', 'converted', 'rejected', 'expired'].includes(q.status));
    const month = todayISO().slice(0, 7);
    const wonThisMonth = won.filter(q => (q.accepted_at || q.updated_at || '').slice(0, 7) === month);
    return {
      openCount: open.length,
      openAmount: open.reduce((sum, q) => sum + Number(q.total), 0),
      wonCount: won.length,
      wonAmountMonth: wonThisMonth.reduce((sum, q) => sum + Number(q.total), 0),
      conversion: closed.length > 0 ? Math.round((won.length / closed.length) * 100) : null
    };
  }, [quotes]);

  const countByStatus = (status: StatusFilter) =>
    status === 'all' ? quotes.length : quotes.filter(q => q.status === status).length;

  const handleSaved = (quoteId: string) => {
    setFormState(null);
    loadQuotes();
    setDetailId(quoteId);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {!customerId ? (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-7 h-7 text-blue-600" />
              Cotizaciones
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Cotiza productos y servicios del inventario, da seguimiento y convierte en orden de servicio o cobro.
            </p>
          </div>
        ) : (
          <h3 className="text-lg font-semibold text-gray-900">Cotizaciones del cliente</h3>
        )}
        {canCreate && (
          <button
            onClick={() => setFormState({})}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" /> Nueva cotización
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Indicadores */}
      {!customerId && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm"><Clock className="w-4 h-4" /> En proceso</div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.openCount}</p>
            <p className="text-xs text-gray-500">{formatMoney(stats.openAmount)} por cerrar</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm"><CheckCircle2 className="w-4 h-4" /> Ganadas</div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.wonCount}</p>
            <p className="text-xs text-gray-500">aceptadas o convertidas</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm"><DollarSign className="w-4 h-4" /> Ganado este mes</div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatMoney(stats.wonAmountMonth)}</p>
            <p className="text-xs text-gray-500">IVA incluido</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm"><TrendingUp className="w-4 h-4" /> Tasa de cierre</div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.conversion === null ? '—' : `${stats.conversion}%`}</p>
            <p className="text-xs text-gray-500">ganadas entre cerradas</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por folio, título, cliente o teléfono..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${statusFilter === f.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {f.label} <span className="opacity-70">({countByStatus(f.value)})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-900 font-medium">
              {quotes.length === 0 ? 'Todavía no hay cotizaciones' : 'Ninguna cotización coincide con el filtro'}
            </p>
            {quotes.length === 0 && canCreate && (
              <p className="text-gray-500 text-sm mt-1">Crea la primera con el botón "Nueva cotización".</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Folio</th>
                  <th className="text-left px-4 py-3 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium">Concepto</th>
                  <th className="text-left px-4 py-3 font-medium">Emisión</th>
                  <th className="text-left px-4 py-3 font-medium">Vigencia</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-left px-4 py-3 font-medium">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => {
                  const meta = QUOTE_STATUS_META[q.status] || QUOTE_STATUS_META.draft;
                  return (
                    <tr
                      key={q.id}
                      onClick={() => setDetailId(q.id)}
                      className="border-t border-gray-100 hover:bg-blue-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-gray-900 whitespace-nowrap">{q.folio}</td>
                      <td className="px-4 py-3">
                        <span className="text-gray-900">{quoteClientName(q)}</span>
                        {!q.customer_id && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Prospecto</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{q.title}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(q.issue_date)}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(q.valid_until)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">{formatMoney(Number(q.total))}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${meta.badge}`}>{meta.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailId && (
        <QuoteDetail
          quoteId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={loadQuotes}
          onEdit={(quote) => { setDetailId(null); setFormState({ quote }); }}
          onDuplicate={(quote) => { setDetailId(null); setFormState({ template: quote }); }}
        />
      )}

      {formState && (
        <QuoteForm
          quote={formState.quote}
          template={formState.template}
          initialCustomerId={customerId}
          onClose={() => setFormState(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

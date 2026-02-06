import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
  FileText, AlertTriangle, CheckCircle2, Clock, DollarSign, Plus,
  Search, Filter, X, Eye, Calendar, CreditCard, Receipt, Smartphone,
  Building, Users, TrendingUp, FileCheck, Download
} from 'lucide-react';
import { InvoiceDetailModal } from './InvoiceDetailModal';

interface BillingDocument {
  id: string;
  folio: string;
  customer_id: string;
  document_type: string;
  issue_date: string;
  due_date: string | null;
  total: number;
  paid_amount: number;
  balance: number;
  payment_status: string;
  concept: string | null;
  is_annual: boolean;
  installment_number: number | null;
  total_installments: number | null;
  customers?: {
    name: string;
    business_name: string | null;
    account_number: number | null;
  } | null;
}

interface BillingFilters {
  searchTerm: string;
  documentType: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
}

export function InvoiceList() {
  const [documents, setDocuments] = useState<BillingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const observerTarget = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 50;

  const [filters, setFilters] = useState<BillingFilters>({
    searchTerm: '',
    documentType: 'all',
    paymentStatus: 'all',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: ''
  });

  const [stats, setStats] = useState({
    totalPending: 0,
    totalOverdue: 0,
    totalPaid: 0,
    totalPartial: 0,
    countPending: 0,
    countOverdue: 0,
    countPaid: 0
  });

  useEffect(() => {
    setDocuments([]);
    setPage(0);
    setHasMore(true);
    loadDocuments(0, true);
    loadStats();
  }, [filters]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadDocuments(page + 1);
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

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('billing_documents')
        .select('payment_status, balance, total');

      if (error) throw error;

      const pending = data?.filter(d => d.payment_status === 'pending') || [];
      const overdue = data?.filter(d => d.payment_status === 'overdue') || [];
      const paid = data?.filter(d => d.payment_status === 'paid') || [];
      const partial = data?.filter(d => d.payment_status === 'partial') || [];

      setStats({
        totalPending: pending.reduce((sum, d) => sum + (d.balance || 0), 0),
        totalOverdue: overdue.reduce((sum, d) => sum + (d.balance || 0), 0),
        totalPaid: paid.reduce((sum, d) => sum + (d.total || 0), 0),
        totalPartial: partial.reduce((sum, d) => sum + (d.balance || 0), 0),
        countPending: pending.length,
        countOverdue: overdue.length,
        countPaid: paid.length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadDocuments = async (pageNum: number, reset: boolean = false) => {
    setLoading(true);
    try {
      let query = supabase
        .from('billing_documents')
        .select(`
          *,
          customers (
            name,
            business_name,
            account_number
          )
        `, { count: 'exact' })
        .order('issue_date', { ascending: false });

      if (filters.searchTerm) {
        query = query.or(`folio.ilike.%${filters.searchTerm}%,concept.ilike.%${filters.searchTerm}%`);
      }

      if (filters.documentType !== 'all') {
        query = query.eq('document_type', filters.documentType);
      }

      if (filters.paymentStatus !== 'all') {
        query = query.eq('payment_status', filters.paymentStatus);
      }

      if (filters.dateFrom) {
        query = query.gte('issue_date', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('issue_date', filters.dateTo);
      }

      if (filters.minAmount) {
        query = query.gte('total', parseFloat(filters.minAmount));
      }

      if (filters.maxAmount) {
        query = query.lte('total', parseFloat(filters.maxAmount));
      }

      const { data, error, count } = await query
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      if (reset) {
        setDocuments(data || []);
      } else {
        setDocuments(prev => [...prev, ...(data || [])]);
      }

      setPage(pageNum);
      setHasMore((data?.length || 0) === PAGE_SIZE && (count || 0) > (pageNum + 1) * PAGE_SIZE);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedDocumentId(null);
    // Reload data to reflect any changes
    loadDocuments(0, true);
    loadStats();
  };

  const getDocumentTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      ticket_remision: 'Ticket Remisión',
      ticket_remision_foraneo: 'Ticket Remisión Foráneo',
      ticket_whatsapp: 'Ticket WhatsApp',
      factura_credito_local: 'Factura Crédito Local',
      factura_credito_foraneo: 'Factura Crédito Foráneo',
      factura_credito_maestra: 'Factura Crédito Maestra',
      factura_credito_corporativa: 'Factura Crédito Corporativa',
      ticket_contado: 'Ticket Contado',
      anualidad: 'Anualidad'
    };
    return labels[type] || type;
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'ticket_whatsapp':
        return <Smartphone className="w-4 h-4" />;
      case 'factura_credito_maestra':
        return <Building className="w-4 h-4" />;
      case 'factura_credito_corporativa':
        return <Users className="w-4 h-4" />;
      case 'anualidad':
        return <TrendingUp className="w-4 h-4" />;
      case 'ticket_contado':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getDocumentTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      ticket_remision: 'bg-blue-100 text-blue-800',
      ticket_remision_foraneo: 'bg-cyan-100 text-cyan-800',
      ticket_whatsapp: 'bg-green-100 text-green-800',
      factura_credito_local: 'bg-orange-100 text-orange-800',
      factura_credito_foraneo: 'bg-amber-100 text-amber-800',
      factura_credito_maestra: 'bg-yellow-100 text-yellow-800',
      factura_credito_corporativa: 'bg-purple-100 text-purple-800',
      ticket_contado: 'bg-emerald-100 text-emerald-800',
      anualidad: 'bg-indigo-100 text-indigo-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4" />;
      case 'partial':
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'Por Cobrar',
      partial: 'Pago Parcial',
      paid: 'Pagado',
      overdue: 'Vencido',
      cancelled: 'Cancelado'
    };
    return labels[status] || status;
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      documentType: 'all',
      paymentStatus: 'all',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: ''
    });
  };

  const hasActiveFilters = () => {
    return filters.searchTerm !== '' ||
           filters.documentType !== 'all' ||
           filters.paymentStatus !== 'all' ||
           filters.dateFrom !== '' ||
           filters.dateTo !== '' ||
           filters.minAmount !== '' ||
           filters.maxAmount !== '';
  };

  const getDaysOverdue = (dueDate: string | null): number => {
    if (!dueDate) return 0;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const SearchBar = ({ position }: { position: 'top' | 'bottom' }) => (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      <input
        type="text"
        placeholder="Buscar por folio o concepto..."
        value={filters.searchTerm}
        onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {filters.searchTerm && (
        <button
          onClick={() => setFilters({ ...filters, searchTerm: '' })}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7 text-blue-600" />
          Facturación y Tickets
        </h2>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
        >
          <Plus className="w-5 h-5" />
          Nuevo Documento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100 text-sm font-medium">Por Cobrar</span>
            <Clock className="w-5 h-5 text-blue-100" />
          </div>
          <p className="text-3xl font-bold mb-1">${stats.totalPending.toFixed(2)}</p>
          <p className="text-blue-100 text-sm">{stats.countPending} documentos</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-yellow-100 text-sm font-medium">Pago Parcial</span>
            <DollarSign className="w-5 h-5 text-yellow-100" />
          </div>
          <p className="text-3xl font-bold mb-1">${stats.totalPartial.toFixed(2)}</p>
          <p className="text-yellow-100 text-sm">Saldo por cobrar</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-100 text-sm font-medium">Vencido</span>
            <AlertTriangle className="w-5 h-5 text-red-100" />
          </div>
          <p className="text-3xl font-bold mb-1">${stats.totalOverdue.toFixed(2)}</p>
          <p className="text-red-100 text-sm">{stats.countOverdue} documentos</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-100 text-sm font-medium">Cobrado</span>
            <CheckCircle2 className="w-5 h-5 text-green-100" />
          </div>
          <p className="text-3xl font-bold mb-1">${stats.totalPaid.toFixed(2)}</p>
          <p className="text-green-100 text-sm">{stats.countPaid} documentos</p>
        </div>
      </div>

      <SearchBar position="top" />

      <div className="flex gap-2 items-center flex-wrap">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
            showFilters || hasActiveFilters()
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

      {showFilters && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            Filtros Avanzados
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de Documento</label>
              <select
                value={filters.documentType}
                onChange={(e) => setFilters({ ...filters, documentType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="ticket_remision">Ticket Remisión</option>
                <option value="ticket_remision_foraneo">Ticket Remisión Foráneo</option>
                <option value="ticket_whatsapp">Ticket WhatsApp</option>
                <option value="factura_credito_local">Factura Crédito Local</option>
                <option value="factura_credito_foraneo">Factura Crédito Foráneo</option>
                <option value="factura_credito_maestra">Factura Crédito Maestra</option>
                <option value="factura_credito_corporativa">Factura Crédito Corporativa</option>
                <option value="ticket_contado">Ticket Contado</option>
                <option value="anualidad">Anualidad</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Estado de Pago</label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="pending">Por Cobrar</option>
                <option value="partial">Pago Parcial</option>
                <option value="paid">Pagado</option>
                <option value="overdue">Vencido</option>
                <option value="cancelled">Cancelado</option>
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

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Monto Mínimo</label>
              <input
                type="number"
                step="0.01"
                value={filters.minAmount}
                onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Monto Máximo</label>
              <input
                type="number"
                step="0.01"
                value={filters.maxAmount}
                onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {loading && documents.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No se encontraron documentos</p>
          <p className="text-gray-500 text-sm mt-2">Intenta ajustar los filtros de búsqueda</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {documents.map((doc) => {
              const daysOverdue = getDaysOverdue(doc.due_date);
              const customerName = doc.customers?.business_name || doc.customers?.name || 'Cliente sin nombre';

              return (
                <div
                  key={doc.id}
                  className="bg-white p-4 rounded-lg border-2 border-gray-200 transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-lg text-gray-900">{doc.folio}</span>
                        {doc.is_annual && doc.installment_number && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs font-bold">
                            Cuota {doc.installment_number}/{doc.total_installments}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        {doc.customers?.account_number && (
                          <span className="text-sm text-gray-500 font-semibold">
                            #{doc.customers.account_number}
                          </span>
                        )}
                        <span className="text-sm text-gray-900">{customerName}</span>
                      </div>

                      {doc.concept && (
                        <p className="text-sm text-gray-600 mb-3">{doc.concept}</p>
                      )}

                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getDocumentTypeColor(doc.document_type)}`}>
                          {getDocumentTypeIcon(doc.document_type)}
                          {getDocumentTypeLabel(doc.document_type)}
                        </span>

                        <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getStatusColor(doc.payment_status)}`}>
                          {getStatusIcon(doc.payment_status)}
                          {getStatusLabel(doc.payment_status)}
                        </span>

                        {doc.due_date && (
                          <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                            daysOverdue > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            Vence: {new Date(doc.due_date).toLocaleDateString()}
                            {daysOverdue > 0 && ` (+${daysOverdue}d)`}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Total:</span>
                          <span className="ml-1 font-bold text-gray-900">${doc.total.toFixed(2)}</span>
                        </div>
                        {doc.paid_amount > 0 && (
                          <div>
                            <span className="text-gray-500">Pagado:</span>
                            <span className="ml-1 font-semibold text-green-600">${doc.paid_amount.toFixed(2)}</span>
                          </div>
                        )}
                        {doc.balance > 0 && (
                          <div>
                            <span className="text-gray-500">Saldo:</span>
                            <span className="ml-1 font-semibold text-red-600">${doc.balance.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewDocument(doc.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      Ver
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div ref={observerTarget} className="py-4 text-center">
            {loading && (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Cargando más documentos...</span>
              </div>
            )}
            {!hasMore && documents.length > 0 && (
              <p className="text-gray-500 text-sm">No hay más documentos para mostrar</p>
            )}
          </div>

          <SearchBar position="bottom" />
        </>
      )}

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseModal}
        documentId={selectedDocumentId}
      />
    </div>
  );
}
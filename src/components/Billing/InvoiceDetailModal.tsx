import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, FileText, Calendar, DollarSign, CreditCard, Download,
  AlertTriangle, CheckCircle2, Clock, Building, User,
  Smartphone, Users, TrendingUp, Plus, Ban, Eye, Loader2,
  CalendarDays, Receipt, Mail
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PaymentModal } from './PaymentModal';


interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
}

interface BillingDocument {
  id: string;
  folio: string;
  customer_id: string;
  document_type: string;
  issue_date: string;
  due_date: string | null;
  period_start: string | null;
  period_end: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paid_amount: number;
  balance: number;
  payment_status: string;
  fiscal_folio: string | null;
  rfc: string | null;
  legal_name: string | null;
  concept: string | null;
  description: string | null;
  service_period: string | null;
  credit_days: number;
  late_payment_fee: number;
  is_annual: boolean;
  annual_total: number | null;
  monthly_installment: number | null;
  installment_number: number | null;
  total_installments: number | null;
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  customers?: {
    name: string;
    business_name: string | null;
    account_number: number | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
}

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  authorization_code: string | null;
  bank_name: string | null;
  notes: string | null;
  created_at: string;
}

export function InvoiceDetailModal({ isOpen, onClose, documentId }: InvoiceDetailModalProps) {
  const [document, setDocument] = useState<BillingDocument | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (documentId && isOpen) {
      loadDocumentDetails();
    }
  }, [documentId, isOpen]);

  const loadDocumentDetails = async () => {
    if (!documentId) return;

    setLoading(true);
    setError(null);

    try {
      // Load document with customer info
      const { data: documentData, error: documentError } = await supabase
        .from('billing_documents')
        .select(`
          *,
          customers (
            name,
            business_name,
            account_number,
            email,
            phone,
            address
          )
        `)
        .eq('id', documentId)
        .single();

      if (documentError) throw documentError;

      // Load payment history
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('billing_payments')
        .select('*')
        .eq('billing_document_id', documentId)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      setDocument(documentData);
      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error loading document details:', error);
      setError('Error al cargar los detalles del documento');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDocument = async () => {
    if (!document || actionLoading) return;

    if (!window.confirm('¿Estás seguro de que deseas cancelar este documento? Esta acción no se puede deshacer.')) {
      return;
    }

    setActionLoading('cancel');

    try {
      const { error } = await supabase
        .from('billing_documents')
        .update({
          payment_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Cancelado desde la interfaz de usuario'
        })
        .eq('id', document.id);

      if (error) throw error;

      await loadDocumentDetails();
    } catch (error) {
      console.error('Error cancelling document:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = async () => {
    if (!document || actionLoading) return;
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
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
        return <Smartphone className="w-5 h-5" />;
      case 'factura_credito_maestra':
        return <Building className="w-5 h-5" />;
      case 'factura_credito_corporativa':
        return <Users className="w-5 h-5" />;
      case 'anualidad':
        return <TrendingUp className="w-5 h-5" />;
      case 'ticket_contado':
        return <DollarSign className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getDocumentTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      ticket_remision: 'bg-blue-100 text-blue-800 border-blue-200',
      ticket_remision_foraneo: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      ticket_whatsapp: 'bg-green-100 text-green-800 border-green-200',
      factura_credito_local: 'bg-orange-100 text-orange-800 border-orange-200',
      factura_credito_foraneo: 'bg-amber-100 text-amber-800 border-amber-200',
      factura_credito_maestra: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      factura_credito_corporativa: 'bg-purple-100 text-purple-800 border-purple-200',
      ticket_contado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      anualidad: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'overdue':
        return <AlertTriangle className="w-5 h-5" />;
      case 'partial':
        return <Clock className="w-5 h-5" />;
      case 'cancelled':
        return <Ban className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
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

  const getPaymentMethodLabel = (method: string): string => {
    const labels: Record<string, string> = {
      efectivo: 'Efectivo',
      transferencia: 'Transferencia',
      tarjeta_debito: 'Tarjeta de Débito',
      tarjeta_credito: 'Tarjeta de Crédito',
      cheque: 'Cheque',
      whatsapp: 'WhatsApp',
      deposito: 'Depósito',
      otro: 'Otro'
    };
    return labels[method] || method;
  };

  const getDaysOverdue = (dueDate: string | null): number => {
    if (!dueDate) return 0;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 rounded-t-xl">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                Detalle del Documento
              </h2>
              {document && (
                <p className="text-sm text-gray-600 mt-1">
                  {document.folio}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          ) : !document ? (
            <div className="p-6 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Documento no encontrado</p>
            </div>
          ) : (
            <div className="p-6 space-y-8">
              {/* Document Header */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Información del Documento
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Folio</label>
                        <p className="text-lg font-bold text-gray-900">{document.folio}</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-500">Tipo de Documento</label>
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium border mt-1 ${getDocumentTypeColor(document.document_type)}`}>
                          {getDocumentTypeIcon(document.document_type)}
                          {getDocumentTypeLabel(document.document_type)}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-500">Fecha de Emisión</label>
                        <p className="text-gray-900">{new Date(document.issue_date).toLocaleDateString()}</p>
                      </div>

                      {document.due_date && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Fecha de Vencimiento</label>
                          <p className="text-gray-900">
                            {new Date(document.due_date).toLocaleDateString()}
                            {getDaysOverdue(document.due_date) > 0 && (
                              <span className="ml-2 text-red-600 font-medium text-sm">
                                (+{getDaysOverdue(document.due_date)} días)
                              </span>
                            )}
                          </p>
                        </div>
                      )}

                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-500">Estado</label>
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium border mt-1 ${getStatusColor(document.payment_status)}`}>
                          {getStatusIcon(document.payment_status)}
                          {getStatusLabel(document.payment_status)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Información del Cliente
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Nombre / Razón Social</label>
                        <p className="text-gray-900 font-medium">
                          {document.customers?.business_name || document.customers?.name || 'Sin nombre'}
                        </p>
                      </div>

                      {document.customers?.account_number && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Número de Cuenta</label>
                          <p className="text-gray-900 font-mono">#{document.customers.account_number}</p>
                        </div>
                      )}

                      {document.customers?.email && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Correo Electrónico</label>
                          <p className="text-gray-900">{document.customers.email}</p>
                        </div>
                      )}

                      {document.customers?.phone && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Teléfono</label>
                          <p className="text-gray-900">{document.customers.phone}</p>
                        </div>
                      )}

                      {document.customers?.address && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-500">Dirección</label>
                          <p className="text-gray-900">{document.customers.address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      Resumen Financiero
                    </h3>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">${document.subtotal.toFixed(2)}</span>
                      </div>

                      {document.tax > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Impuestos:</span>
                          <span className="font-medium">${document.tax.toFixed(2)}</span>
                        </div>
                      )}

                      {document.discount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Descuento:</span>
                          <span className="font-medium text-green-600">-${document.discount.toFixed(2)}</span>
                        </div>
                      )}

                      <hr className="border-gray-300" />

                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>${document.total.toFixed(2)}</span>
                      </div>

                      {document.paid_amount > 0 && (
                        <div className="flex justify-between text-green-600 font-medium">
                          <span>Pagado:</span>
                          <span>${document.paid_amount.toFixed(2)}</span>
                        </div>
                      )}

                      {document.balance > 0 && (
                        <div className="flex justify-between text-red-600 font-bold">
                          <span>Saldo:</span>
                          <span>${document.balance.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Annual Information */}
                  {document.is_annual && (
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        Información de Anualidad
                      </h3>

                      <div className="space-y-3">
                        {document.installment_number && document.total_installments && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Cuota:</span>
                            <span className="font-medium">
                              {document.installment_number} de {document.total_installments}
                            </span>
                          </div>
                        )}

                        {document.monthly_installment && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Monto Mensual:</span>
                            <span className="font-medium">${document.monthly_installment.toFixed(2)}</span>
                          </div>
                        )}

                        {document.annual_total && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Anual:</span>
                            <span className="font-bold">${document.annual_total.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {document.payment_status !== 'cancelled' && document.balance > 0 && (
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Registrar Pago
                      </button>
                    )}

                    <button
                      onClick={handleDownload}
                      disabled={actionLoading === 'download'}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      {actionLoading === 'download' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Descargar/Imprimir
                    </button>

                    {document.payment_status !== 'cancelled' && (
                      <button
                        onClick={handleCancelDocument}
                        disabled={actionLoading === 'cancel'}
                        className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        {actionLoading === 'cancel' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Ban className="w-4 h-4" />
                        )}
                        Cancelar Documento
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Concept and Description */}
              {(document.concept || document.description) && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles del Servicio</h3>

                  {document.concept && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-500">Concepto</label>
                      <p className="text-gray-900 mt-1">{document.concept}</p>
                    </div>
                  )}

                  {document.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Descripción</label>
                      <p className="text-gray-900 mt-1">{document.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Payment History */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-blue-600" />
                    Historial de Pagos
                  </h3>
                  <span className="text-sm text-gray-500">
                    {payments.length} {payments.length === 1 ? 'pago' : 'pagos'}
                  </span>
                </div>

                {payments.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No hay pagos registrados</p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Fecha</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Monto</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Método</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Referencia</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Notas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {payments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <CalendarDays className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {new Date(payment.payment_date).toLocaleDateString()}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-bold text-green-600">
                                  ${payment.amount.toFixed(2)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-900">
                                  {getPaymentMethodLabel(payment.payment_method)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-600 font-mono">
                                  {payment.reference_number || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-600">
                                  {payment.notes || '-'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {(document.notes || document.internal_notes) && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notas</h3>

                  {document.notes && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-500">Notas Públicas</label>
                      <p className="text-gray-900 mt-1">{document.notes}</p>
                    </div>
                  )}

                  {document.internal_notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Notas Internas</label>
                      <p className="text-gray-900 mt-1">{document.internal_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        documentId={documentId || ''}
        currentBalance={document?.balance || 0}
        folio={document?.folio || ''}
        customerEmail={document?.customers?.email}
        customerName={document?.customers?.business_name || document?.customers?.name}
        totalAmount={document?.total}
        onPaymentAdded={loadDocumentDetails}
      />

      {/* Print Portal for Invoice PDF */}
      {isPrinting && document && createPortal(
        <div className="print-portal-container">
          <div className="print-content">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-red-600 pb-4 mb-6">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-red-600">ALARMAS ADZ</h1>
                  <p className="text-sm text-gray-600">Sistemas de Seguridad Electrónica</p>
                </div>
                <div className="text-sm text-gray-600 border-l border-gray-300 pl-4">
                  <p>Bustamante #1 Int. A, Centro, Cd. Guzmán, Jal. CP 49000</p>
                  <p>Tel: (341) 41-25850 / 41-24070 / 41-29847</p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-red-600 text-white px-4 py-2 rounded font-bold mb-2">
                  {getDocumentTypeLabel(document.document_type).toUpperCase()}
                </div>
                <p className="text-sm text-gray-600">Folio: <span className="font-bold text-gray-900">{document.folio}</span></p>
                <p className="text-sm text-gray-600">Fecha: <span className="font-semibold">{new Date(document.issue_date).toLocaleDateString('es-MX')}</span></p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">Información del Cliente</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Cliente:</span>
                  <span className="ml-2 font-semibold">{document.customers?.business_name || document.customers?.name || 'Sin nombre'}</span>
                </div>
                {document.customers?.account_number && (
                  <div>
                    <span className="text-gray-600">Número de Cuenta:</span>
                    <span className="ml-2 font-mono font-semibold">#{document.customers.account_number}</span>
                  </div>
                )}
                {document.customers?.phone && (
                  <div>
                    <span className="text-gray-600">Teléfono:</span>
                    <span className="ml-2 font-semibold">{document.customers.phone}</span>
                  </div>
                )}
                {document.customers?.email && (
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-semibold">{document.customers.email}</span>
                  </div>
                )}
                {document.customers?.address && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Dirección:</span>
                    <span className="ml-2 font-semibold">{document.customers.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Concept and Description */}
            {(document.concept || document.description) && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">Detalles del Servicio</h3>
                {document.concept && (
                  <p className="text-sm"><span className="text-gray-600">Concepto:</span> <span className="font-semibold">{document.concept}</span></p>
                )}
                {document.description && (
                  <p className="text-sm mt-2"><span className="text-gray-600">Descripción:</span> <span>{document.description}</span></p>
                )}
              </div>
            )}

            {/* Financial Summary */}
            <div className="border-2 border-gray-300 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 border-b-2 border-gray-300 pb-2">Resumen Financiero</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">${document.subtotal.toFixed(2)}</span>
                </div>
                {document.tax > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">IVA (16%):</span>
                    <span className="font-semibold">${document.tax.toFixed(2)}</span>
                  </div>
                )}
                {document.discount > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Descuento:</span>
                    <span className="font-semibold text-green-600">-${document.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t-2 border-red-600">
                  <span className="text-lg font-bold text-gray-900">TOTAL:</span>
                  <span className="text-xl font-bold text-red-600">${document.total.toFixed(2)}</span>
                </div>
                {document.paid_amount > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Pagado:</span>
                    <span className="font-semibold text-green-600">${document.paid_amount.toFixed(2)}</span>
                  </div>
                )}
                {document.balance > 0 && (
                  <div className="flex justify-between py-1 bg-red-50 px-2 rounded">
                    <span className="font-bold text-red-600">SALDO PENDIENTE:</span>
                    <span className="font-bold text-red-600">${document.balance.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment History */}
            {payments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">Historial de Pagos</h3>
                <table className="w-full text-sm border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left border-b">Fecha</th>
                      <th className="px-3 py-2 text-left border-b">Monto</th>
                      <th className="px-3 py-2 text-left border-b">Método</th>
                      <th className="px-3 py-2 text-left border-b">Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b">
                        <td className="px-3 py-2">{new Date(payment.payment_date).toLocaleDateString('es-MX')}</td>
                        <td className="px-3 py-2 font-semibold text-green-600">${payment.amount.toFixed(2)}</td>
                        <td className="px-3 py-2">{getPaymentMethodLabel(payment.payment_method)}</td>
                        <td className="px-3 py-2 font-mono">{payment.reference_number || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Status Badge */}
            <div className="text-center mb-6">
              <span className={`inline-block px-6 py-2 rounded-full text-lg font-bold ${document.payment_status === 'paid' ? 'bg-green-100 text-green-800 border-2 border-green-300' :
                document.payment_status === 'cancelled' ? 'bg-gray-100 text-gray-800 border-2 border-gray-300' :
                  document.payment_status === 'overdue' ? 'bg-red-100 text-red-800 border-2 border-red-300' :
                    'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                }`}>
                {getStatusLabel(document.payment_status).toUpperCase()}
              </span>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t-2 border-red-600 text-center">
              <p className="text-sm font-bold text-red-600">ALARMAS ADZ - Su seguridad de principio a fin</p>
              <p className="text-xs text-gray-500 mt-1">Este documento es un comprobante oficial de facturación</p>
            </div>
          </div>
        </div>,
        window.document.body
      )}
    </>
  );
}
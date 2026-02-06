import { useState } from 'react';
import { X, CreditCard, DollarSign, Calendar, FileText, AlertCircle, Loader2, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  currentBalance: number;
  folio: string;
  customerEmail?: string | null;
  customerName?: string | null;
  totalAmount?: number;
  onPaymentAdded: () => void;
}

interface PaymentForm {
  amount: string;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber: string;
  authorizationCode: string;
  bankName: string;
  accountNumber: string;
  receiptNumber: string;
  notes: string;
}

const paymentMethods = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta_debito', label: 'Tarjeta de Débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta de Crédito' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'deposito', label: 'Depósito' },
  { value: 'otro', label: 'Otro' }
];

export function PaymentModal({ isOpen, onClose, documentId, currentBalance, folio, customerEmail, customerName, totalAmount, onPaymentAdded }: PaymentModalProps) {
  const [form, setForm] = useState<PaymentForm>({
    amount: '',
    paymentMethod: 'transferencia',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    authorizationCode: '',
    bankName: '',
    accountNumber: '',
    receiptNumber: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendEmailReceipt, setSendEmailReceipt] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('El monto debe ser mayor a cero');
      return;
    }

    if (amount > currentBalance) {
      setError(`El monto no puede exceder el saldo pendiente de $${currentBalance.toFixed(2)}`);
      return;
    }

    setLoading(true);

    try {
      const { error: paymentError } = await supabase
        .from('billing_payments')
        .insert({
          billing_document_id: documentId,
          amount: amount,
          payment_method: form.paymentMethod,
          payment_date: form.paymentDate,
          reference_number: form.referenceNumber || null,
          authorization_code: form.authorizationCode || null,
          bank_name: form.bankName || null,
          account_number: form.accountNumber || null,
          receipt_number: form.receiptNumber || null,
          notes: form.notes || null
        });

      if (paymentError) throw paymentError;

      // Send email receipt if requested
      if (sendEmailReceipt && customerEmail) {
        try {
          const newBalance = currentBalance - amount;
          const paymentMethodLabel = paymentMethods.find(m => m.value === form.paymentMethod)?.label || form.paymentMethod;

          await supabase.functions.invoke('send-payment-receipt', {
            body: {
              to_email: customerEmail,
              customer_name: customerName || 'Cliente',
              folio: folio,
              payment_amount: amount,
              payment_method: paymentMethodLabel,
              payment_date: form.paymentDate,
              reference_number: form.referenceNumber || null,
              previous_balance: currentBalance,
              new_balance: newBalance,
              total_invoice: totalAmount || currentBalance,
              is_fully_paid: newBalance <= 0
            }
          });
        } catch (emailError) {
          console.error('Error sending payment receipt email:', emailError);
          // Don't fail the whole operation if email fails
        }
      }

      onPaymentAdded();
      onClose();

      // Reset form
      setForm({
        amount: '',
        paymentMethod: 'transferencia',
        paymentDate: new Date().toISOString().split('T')[0],
        referenceNumber: '',
        authorizationCode: '',
        bankName: '',
        accountNumber: '',
        receiptNumber: '',
        notes: ''
      });
      setSendEmailReceipt(false);
    } catch (error) {
      console.error('Error registering payment:', error);
      setError('Error al registrar el pago. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof PaymentForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              Registrar Pago
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Documento: {folio} • Saldo: ${currentBalance.toFixed(2)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={currentBalance}
                  value={form.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Máximo: ${currentBalance.toFixed(2)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago *
              </label>
              <select
                value={form.paymentMethod}
                onChange={(e) => handleChange('paymentMethod', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                {paymentMethods.map(method => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Pago *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => handleChange('paymentDate', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Referencia
              </label>
              <input
                type="text"
                value={form.referenceNumber}
                onChange={(e) => handleChange('referenceNumber', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Referencia del pago"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Autorización
              </label>
              <input
                type="text"
                value={form.authorizationCode}
                onChange={(e) => handleChange('authorizationCode', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Código de autorización"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banco
              </label>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Nombre del banco"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Cuenta
              </label>
              <input
                type="text"
                value={form.accountNumber}
                onChange={(e) => handleChange('accountNumber', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Últimos 4 dígitos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Recibo
              </label>
              <input
                type="text"
                value={form.receiptNumber}
                onChange={(e) => handleChange('receiptNumber', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Folio del recibo"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <textarea
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Notas adicionales sobre el pago..."
              />
            </div>
          </div>

          {/* Email Receipt Option */}
          {customerEmail && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmailReceipt}
                  onChange={(e) => setSendEmailReceipt(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="font-medium text-gray-900">Enviar comprobante de pago por email</span>
                    <p className="text-sm text-gray-600">Se enviará a: {customerEmail}</p>
                  </div>
                </div>
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar Pago
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
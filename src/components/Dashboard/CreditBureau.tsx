import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, Clock, AlertTriangle, Phone, Mail } from 'lucide-react';
import { DebtReminderModal } from './DebtReminderModal';

interface CustomerCredit {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  creditClassification: string;
  totalInvoices: number;
  totalPaid: number;
  pendingAmount: number;
  overdueAmount: number;
  overdueCount: number;
  maxDaysOverdue: number;
}

export function CreditBureau() {
  const [customers, setCustomers] = useState<CustomerCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'puntual' | 'retrasado' | 'en_mora' | '15_dias' | 'moroso'>('all');
  const [reminderCustomer, setReminderCustomer] = useState<CustomerCredit | null>(null);

  useEffect(() => {
    loadCreditData();
  }, [filter]);

  const loadCreditData = async () => {
    try {
      const [customersData, invoicesData] = await Promise.all([
        supabase.from('customers').select('id, name, phone, email, credit_classification'),
        supabase.from('invoices').select('customer_id, total_amount, status, days_overdue').neq('status', 'cancelled')
      ]);

      const customersMap = new Map<string, CustomerCredit>();

      (customersData.data || []).forEach(c => {
        customersMap.set(c.id, {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email || null,
          creditClassification: c.credit_classification,
          totalInvoices: 0,
          totalPaid: 0,
          pendingAmount: 0,
          overdueAmount: 0,
          overdueCount: 0,
          maxDaysOverdue: 0
        });
      });

      (invoicesData.data || []).forEach(inv => {
        const customer = customersMap.get(inv.customer_id);
        if (customer) {
          customer.totalInvoices++;
          if (inv.status === 'paid') customer.totalPaid += inv.total_amount;
          if (inv.status === 'pending') customer.pendingAmount += inv.total_amount;
          if (inv.status === 'overdue') {
            customer.overdueAmount += inv.total_amount;
            customer.overdueCount++;
            customer.maxDaysOverdue = Math.max(customer.maxDaysOverdue, inv.days_overdue);
          }
        }
      });

      let filtered = Array.from(customersMap.values());

      if (filter === 'puntual') {
        filtered = filtered.filter(c => c.maxDaysOverdue === 0);
      } else if (filter === 'retrasado' || filter === '15_dias') {
        filtered = filtered.filter(c => c.maxDaysOverdue > 0 && c.maxDaysOverdue <= 15);
      } else if (filter === 'en_mora') {
        filtered = filtered.filter(c => c.maxDaysOverdue > 15 && c.maxDaysOverdue <= 30);
      } else if (filter === 'moroso') {
        filtered = filtered.filter(c => c.maxDaysOverdue > 30);
      }

      filtered.sort((a, b) => b.maxDaysOverdue - a.maxDaysOverdue);
      setCustomers(filtered);
    } catch (error) {
      console.error('Error loading credit data:', error);
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

  const puntualCount  = customers.filter(c => c.maxDaysOverdue === 0).length;
  const retrasadoCount = customers.filter(c => c.maxDaysOverdue > 0 && c.maxDaysOverdue <= 15).length;
  const enMoraCount   = customers.filter(c => c.maxDaysOverdue > 15 && c.maxDaysOverdue <= 30).length;
  const morosoCount   = customers.filter(c => c.maxDaysOverdue > 30).length;

  return (
    <>
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <p className="text-sm opacity-90 mb-1">Clientes Puntuales</p>
          <p className="text-4xl font-bold">{puntualCount}</p>
          <p className="text-sm opacity-75 mt-2">Sin mora</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <p className="text-sm opacity-90 mb-1">Retrasados</p>
          <p className="text-4xl font-bold">{retrasadoCount}</p>
          <p className="text-sm opacity-75 mt-2">1-15 días</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <p className="text-sm opacity-90 mb-1">En Mora</p>
          <p className="text-4xl font-bold">{enMoraCount}</p>
          <p className="text-sm opacity-75 mt-2">16-30 días</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <p className="text-sm opacity-90 mb-1">Morosos</p>
          <p className="text-4xl font-bold">{morosoCount}</p>
          <p className="text-sm opacity-75 mt-2">Más de 30 días</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'puntual', 'retrasado', 'en_mora', 'moroso'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              filter === type || (type === 'retrasado' && filter === '15_dias')
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {type === 'all'      ? 'Todos' :
             type === 'puntual'  ? 'Puntuales' :
             type === 'retrasado'? 'Retrasados' :
             type === 'en_mora'  ? 'En mora' :
             'Morosos'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clasificación</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pagado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pendiente</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vencido</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Días Mora</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{customer.name}</div>
                    <div className="text-sm text-gray-500">{customer.totalInvoices} facturas</div>
                  </td>
                  <td className="px-6 py-4">
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        {customer.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      customer.maxDaysOverdue === 0        ? 'bg-green-100 text-green-800' :
                      customer.maxDaysOverdue <= 15        ? 'bg-yellow-100 text-yellow-800' :
                      customer.maxDaysOverdue <= 30        ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {customer.maxDaysOverdue === 0  ? 'Puntual' :
                       customer.maxDaysOverdue <= 15  ? 'Retrasado' :
                       customer.maxDaysOverdue <= 30  ? 'En mora' :
                       'Moroso'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-green-600">
                      ${customer.totalPaid.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-yellow-600">
                      ${customer.pendingAmount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {customer.overdueAmount > 0 && (
                      <div>
                        <span className="font-semibold text-red-600">
                          ${customer.overdueAmount.toFixed(2)}
                        </span>
                        <div className="text-xs text-gray-500">
                          {customer.overdueCount} {customer.overdueCount === 1 ? 'factura' : 'facturas'}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {customer.maxDaysOverdue > 0 ? (
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${
                        customer.maxDaysOverdue <= 15 ? 'bg-yellow-100 text-yellow-800' :
                        customer.maxDaysOverdue <= 30 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {customer.maxDaysOverdue}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setReminderCustomer(customer)}
                      title="Enviar recordatorio de adeudo por email"
                      className={`inline-flex items-center justify-center p-2 rounded-lg transition-all group ${
                        customer.pendingAmount > 0 || customer.overdueAmount > 0
                          ? 'bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-300'
                          : 'bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-500 border border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Debt Reminder Modal */}
    {reminderCustomer && (
      <DebtReminderModal
        customer={{
          id: reminderCustomer.id,
          name: reminderCustomer.name,
          email: reminderCustomer.email,
          pendingAmount: reminderCustomer.pendingAmount,
          overdueAmount: reminderCustomer.overdueAmount,
          maxDaysOverdue: reminderCustomer.maxDaysOverdue,
          totalInvoices: reminderCustomer.totalInvoices,
        }}
        onClose={() => setReminderCustomer(null)}
      />
    )}
    </>
  );
}

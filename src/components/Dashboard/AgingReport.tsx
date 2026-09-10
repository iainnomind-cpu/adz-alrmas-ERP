import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, AlertTriangle, DollarSign } from 'lucide-react';

interface AgingBucket {
  customerId: string;
  customerName: string;
  current: number;
  days_3: number;
  days_7: number;
  days_15: number;
  days_30: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
  total: number;
}

export function AgingReport() {
  const [aging, setAging] = useState<AgingBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAging();
  }, []);

  const loadAging = async () => {
    try {
      const [customersData, invoicesData] = await Promise.all([
        supabase.from('customers').select('id, name'),
        supabase.from('invoices').select('customer_id, total_amount, status, days_overdue, due_date').neq('status', 'cancelled')
      ]);

      const customersMap = new Map<string, AgingBucket>();
      (customersData.data || []).forEach(c => {
        customersMap.set(c.id, {
          customerId: c.id,
          customerName: c.name,
          current: 0,
          days_3: 0,
          days_7: 0,
          days_15: 0,
          days_30: 0,
          days_31_60: 0,
          days_61_90: 0,
          days_90_plus: 0,
          total: 0
        });
      });

      (invoicesData.data || []).forEach(inv => {
        const customer = customersMap.get(inv.customer_id);
        if (customer) {
          if (inv.status === 'pending') {
            customer.current += inv.total_amount;
          } else if (inv.status === 'overdue') {
            let days = inv.days_overdue;
            if ((days === null || days === undefined) && inv.due_date) {
              const diffMs = new Date().getTime() - new Date(inv.due_date).getTime();
              days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
            }
            days = days || 0;
            if (days <= 3) customer.days_3 += inv.total_amount;
            else if (days <= 7) customer.days_7 += inv.total_amount;
            else if (days <= 15) customer.days_15 += inv.total_amount;
            else if (days <= 30) customer.days_30 += inv.total_amount;
            else if (days <= 60) customer.days_31_60 += inv.total_amount;
            else if (days <= 90) customer.days_61_90 += inv.total_amount;
            else customer.days_90_plus += inv.total_amount;
          }
          customer.total = customer.current + customer.days_3 + customer.days_7 + customer.days_15 + customer.days_30 + customer.days_31_60 + customer.days_61_90 + customer.days_90_plus;
        }
      });

      const result = Array.from(customersMap.values()).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
      setAging(result);
    } catch (error) {
      console.error('Error loading aging:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  const totals = aging.reduce((acc, a) => ({
    current: acc.current + a.current,
    days_3: acc.days_3 + a.days_3,
    days_7: acc.days_7 + a.days_7,
    days_15: acc.days_15 + a.days_15,
    days_30: acc.days_30 + a.days_30,
    days_31_60: acc.days_31_60 + a.days_31_60,
    days_61_90: acc.days_61_90 + a.days_61_90,
    days_90_plus: acc.days_90_plus + a.days_90_plus,
    total: acc.total + a.total
  }), { current: 0, days_3: 0, days_7: 0, days_15: 0, days_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0, total: 0 });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
        {[
          { label: 'Actual', value: totals.current, color: 'from-blue-500 to-cyan-500' },
          { label: '3 días', value: totals.days_3, color: 'from-emerald-400 to-teal-500' },
          { label: '7 días', value: totals.days_7, color: 'from-teal-500 to-emerald-600' },
          { label: '15 días', value: totals.days_15, color: 'from-green-500 to-emerald-600' },
          { label: '30 días', value: totals.days_30, color: 'from-yellow-500 to-amber-500' },
          { label: '31-60 días', value: totals.days_31_60, color: 'from-amber-500 to-orange-500' },
          { label: '61-90 días', value: totals.days_61_90, color: 'from-orange-500 to-red-500' },
          { label: '+90 días', value: totals.days_90_plus, color: 'from-red-600 to-rose-700' },
          { label: 'Total', value: totals.total, color: 'from-slate-600 to-slate-700' }
        ].map(item => (
          <div key={item.label} className={`bg-gradient-to-br ${item.color} rounded-xl p-4 text-white shadow-sm`}>
            <p className="text-xs opacity-90 mb-1 font-medium whitespace-nowrap">{item.label}</p>
            <p className="text-xl font-bold">${item.value.toFixed(0)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">3 días</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">7 días</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">15 días</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">30 días</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">31-60</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">61-90</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">+90</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {aging.map(customer => (
                <tr key={customer.customerId} className="hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium text-gray-900">{customer.customerName}</td>
                  <td className="px-4 py-4 text-right font-semibold text-blue-600">${customer.current.toFixed(2)}</td>
                  <td className="px-4 py-4 text-right font-semibold text-teal-600">${customer.days_3.toFixed(2)}</td>
                  <td className="px-4 py-4 text-right font-semibold text-emerald-600">${customer.days_7.toFixed(2)}</td>
                  <td className="px-4 py-4 text-right font-semibold text-green-600">${customer.days_15.toFixed(2)}</td>
                  <td className="px-4 py-4 text-right font-semibold text-yellow-600">${customer.days_30.toFixed(2)}</td>
                  <td className="px-4 py-4 text-right font-semibold text-orange-600">${customer.days_31_60.toFixed(2)}</td>
                  <td className="px-4 py-4 text-right font-semibold text-red-500">${customer.days_61_90.toFixed(2)}</td>
                  <td className="px-4 py-4 text-right font-semibold text-red-700">${customer.days_90_plus.toFixed(2)}</td>
                  <td className="px-4 py-4 text-right font-bold text-gray-900">${customer.total.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td className="px-4 py-4">TOTAL</td>
                <td className="px-4 py-4 text-right text-blue-700">${totals.current.toFixed(2)}</td>
                <td className="px-4 py-4 text-right text-teal-700">${totals.days_3.toFixed(2)}</td>
                <td className="px-4 py-4 text-right text-emerald-700">${totals.days_7.toFixed(2)}</td>
                <td className="px-4 py-4 text-right text-green-700">${totals.days_15.toFixed(2)}</td>
                <td className="px-4 py-4 text-right text-yellow-700">${totals.days_30.toFixed(2)}</td>
                <td className="px-4 py-4 text-right text-orange-700">${totals.days_31_60.toFixed(2)}</td>
                <td className="px-4 py-4 text-right text-red-700">${totals.days_61_90.toFixed(2)}</td>
                <td className="px-4 py-4 text-right text-red-800">${totals.days_90_plus.toFixed(2)}</td>
                <td className="px-4 py-4 text-right text-gray-900">${totals.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
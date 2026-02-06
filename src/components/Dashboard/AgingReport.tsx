import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, AlertTriangle, DollarSign } from 'lucide-react';

interface AgingBucket {
  customerId: string;
  customerName: string;
  current: number;
  days_0_30: number;
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
        supabase.from('invoices').select('customer_id, total_amount, status, days_overdue')
      ]);

      const customersMap = new Map<string, AgingBucket>();
      (customersData.data || []).forEach(c => {
        customersMap.set(c.id, {
          customerId: c.id,
          customerName: c.name,
          current: 0,
          days_0_30: 0,
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
            const days = inv.days_overdue;
            if (days <= 30) customer.days_0_30 += inv.total_amount;
            else if (days <= 60) customer.days_31_60 += inv.total_amount;
            else if (days <= 90) customer.days_61_90 += inv.total_amount;
            else customer.days_90_plus += inv.total_amount;
          }
          customer.total = customer.current + customer.days_0_30 + customer.days_31_60 + customer.days_61_90 + customer.days_90_plus;
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
    days_0_30: acc.days_0_30 + a.days_0_30,
    days_31_60: acc.days_31_60 + a.days_31_60,
    days_61_90: acc.days_61_90 + a.days_61_90,
    days_90_plus: acc.days_90_plus + a.days_90_plus,
    total: acc.total + a.total
  }), { current: 0, days_0_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0, total: 0 });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Actual', value: totals.current, color: 'from-blue-500 to-cyan-500' },
          { label: '0-30 días', value: totals.days_0_30, color: 'from-green-500 to-emerald-500' },
          { label: '31-60 días', value: totals.days_31_60, color: 'from-yellow-500 to-amber-500' },
          { label: '61-90 días', value: totals.days_61_90, color: 'from-orange-500 to-red-500' },
          { label: '90+ días', value: totals.days_90_plus, color: 'from-red-500 to-pink-500' },
          { label: 'Total', value: totals.total, color: 'from-slate-600 to-slate-700' }
        ].map(item => (
          <div key={item.label} className={`bg-gradient-to-br ${item.color} rounded-xl p-6 text-white`}>
            <p className="text-sm opacity-90 mb-1">{item.label}</p>
            <p className="text-3xl font-bold">${item.value.toFixed(0)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">0-30</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">31-60</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">61-90</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">90+</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {aging.map(customer => (
                <tr key={customer.customerId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{customer.customerName}</td>
                  <td className="px-6 py-4 text-right font-semibold text-blue-600">${customer.current.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-green-600">${customer.days_0_30.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-yellow-600">${customer.days_31_60.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-orange-600">${customer.days_61_90.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-red-600">${customer.days_90_plus.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900">${customer.total.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td className="px-6 py-4">TOTAL</td>
                <td className="px-6 py-4 text-right text-blue-700">${totals.current.toFixed(2)}</td>
                <td className="px-6 py-4 text-right text-green-700">${totals.days_0_30.toFixed(2)}</td>
                <td className="px-6 py-4 text-right text-yellow-700">${totals.days_31_60.toFixed(2)}</td>
                <td className="px-6 py-4 text-right text-orange-700">${totals.days_61_90.toFixed(2)}</td>
                <td className="px-6 py-4 text-right text-red-700">${totals.days_90_plus.toFixed(2)}</td>
                <td className="px-6 py-4 text-right text-gray-900">${totals.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
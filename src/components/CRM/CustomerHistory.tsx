import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { History, ArrowRight, User, Calendar } from 'lucide-react';

interface AccountHistory {
  id: string;
  change_type: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  created_at: string;
}

interface CustomerHistoryProps {
  customerId: string;
}

export function CustomerHistory({ customerId }: CustomerHistoryProps) {
  const [history, setHistory] = useState<AccountHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [customerId]);

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from('customer_account_history')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (data) setHistory(data);
    setLoading(false);
  };

  const getChangeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      migration: 'Migración de Cuenta',
      status_change: 'Cambio de Estado',
      plan_change: 'Cambio de Plan',
      billing_change: 'Cambio de Facturación',
      suspension: 'Suspensión',
      reactivation: 'Reactivación',
      cancellation: 'Cancelación',
      other: 'Otro'
    };
    return labels[type] || type;
  };

  const getChangeTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      migration: 'bg-blue-100 text-blue-800',
      status_change: 'bg-cyan-100 text-cyan-800',
      plan_change: 'bg-purple-100 text-purple-800',
      billing_change: 'bg-green-100 text-green-800',
      suspension: 'bg-orange-100 text-orange-800',
      reactivation: 'bg-teal-100 text-teal-800',
      cancellation: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-gray-700" />
        <h3 className="text-lg font-semibold text-gray-900">Historial de Cambios</h3>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No hay cambios registrados</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          <div className="space-y-4">
            {history.map((item, index) => (
              <div key={item.id} className="relative pl-10">
                <div className="absolute left-2 top-1 w-4 h-4 bg-blue-500 rounded-full border-4 border-white"></div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getChangeTypeColor(item.change_type)}`}>
                      {getChangeTypeLabel(item.change_type)}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleString('es-MX')}
                    </div>
                  </div>

                  {item.field_changed && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Campo: <code className="px-2 py-1 bg-gray-100 rounded text-xs">{item.field_changed}</code>
                      </span>
                    </div>
                  )}

                  {(item.old_value || item.new_value) && (
                    <div className="flex items-center gap-3 mb-2 text-sm">
                      {item.old_value && (
                        <div className="flex-1">
                          <span className="text-gray-500 text-xs">Valor anterior:</span>
                          <div className="mt-1 px-3 py-2 bg-red-50 border border-red-200 rounded text-red-700">
                            {item.old_value}
                          </div>
                        </div>
                      )}

                      {item.old_value && item.new_value && (
                        <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}

                      {item.new_value && (
                        <div className="flex-1">
                          <span className="text-gray-500 text-xs">Valor nuevo:</span>
                          <div className="mt-1 px-3 py-2 bg-green-50 border border-green-200 rounded text-green-700">
                            {item.new_value}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {item.description && (
                    <p className="text-sm text-gray-600 mt-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

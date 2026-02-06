import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertTriangle, XCircle, AlertCircle, Package } from 'lucide-react';

interface LowStockAlert {
  id: string;
  code: string;
  name: string;
  brand: string | null;
  model: string | null;
  stock_quantity: number;
  min_stock_level: number;
}

export function InventoryAlerts() {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    // Fetch items with stock <= min_stock_level
    // Note: Supabase doesn't support "col1 <= col2" directly in filters easily without RPC,
    // so we fetch all active items and filter in client for now (assuming catalog isn't massive yet),
    // OR we can just fetch items with stock < some safe upper bound (e.g. 100) and filter.
    // For now, fetching all active items and filtering is safe for < 1000 items. 
    // Optimization: Create a DB View for this later.
    const { data, error } = await supabase
      .from('price_list')
      .select('id, code, name, brand, model, stock_quantity, min_stock_level')
      .eq('is_active', true)
      .order('stock_quantity', { ascending: true });

    if (error) {
      console.error('Error loading alerts:', error);
    } else {
      const lowStockItems = (data || []).filter(
        item => item.stock_quantity <= item.min_stock_level
      );
      setAlerts(lowStockItems);
    }
    setLoading(false);
  };

  const getSeverityConfig = (stock: number, min: number) => {
    if (stock === 0) {
      return {
        level: 'critical',
        label: 'AGOTADO',
        color: 'bg-red-50 border-red-200 text-red-900',
        icon: XCircle,
        badge: 'bg-red-600 text-white'
      };
    } else {
      return {
        level: 'high',
        label: 'STOCK BAJO',
        color: 'bg-orange-50 border-orange-200 text-orange-900',
        icon: AlertTriangle,
        badge: 'bg-orange-600 text-white'
      };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          Alertas de Stock
        </h3>
        <span className="text-sm text-gray-500">
          {alerts.length} alertas activas
        </span>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const config = getSeverityConfig(alert.stock_quantity, alert.min_stock_level);
          const Icon = config.icon;

          return (
            <div
              key={alert.id}
              className={`rounded-xl p-4 border-2 ${config.color} transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">
                        {alert.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${config.badge}`}>
                        {config.label}
                      </span>
                    </div>
                    <div className="text-sm opacity-90 flex flex-col gap-0.5">
                      <span className="font-medium">
                        {alert.brand} {alert.model} - {alert.code}
                      </span>
                      <span>
                        Stock Actual: <span className="font-bold">{alert.stock_quantity}</span> / Mínimo: {alert.min_stock_level}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {/* Actions could go here, e.g. "Restock" */}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {alerts.length === 0 && (
        <div className="text-center py-12 bg-green-50 rounded-xl border-2 border-dashed border-green-200">
          <Package className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-green-800 font-semibold mb-1">¡Todo en orden!</h3>
          <p className="text-green-600">
            No hay productos con stock bajo o agotado.
          </p>
        </div>
      )}
    </div>
  );
}

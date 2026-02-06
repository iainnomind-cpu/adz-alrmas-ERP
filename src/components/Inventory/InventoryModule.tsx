import { useState } from 'react';
import { InventoryDashboard } from './InventoryDashboard';
import { StockMovements } from './StockMovements';
import { InventoryAlerts } from './InventoryAlerts';
import { PriceListManager } from './PriceListManager';
import { Package, TrendingUp, AlertTriangle, BarChart3, DollarSign } from 'lucide-react';

type TabType = 'dashboard' | 'products' | 'prices' | 'movements' | 'alerts';

export function InventoryModule() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: BarChart3 },
    { id: 'prices' as TabType, label: 'Productos y Precios', icon: DollarSign },
    { id: 'movements' as TabType, label: 'Movimientos', icon: TrendingUp },
    { id: 'alerts' as TabType, label: 'Alertas', icon: AlertTriangle }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <InventoryDashboard />;
      case 'prices':
        return <PriceListManager />;
      case 'movements':
        return <StockMovements />;
      case 'alerts':
        return <InventoryAlerts />;
      default:
        return <InventoryDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Inventario</h2>
        <p className="text-gray-600">Control completo de productos, stock y movimientos</p>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-all border-b-2 ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>{renderContent()}</div>
    </div>
  );
}

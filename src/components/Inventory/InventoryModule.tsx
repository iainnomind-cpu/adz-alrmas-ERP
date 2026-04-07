import { useState, useEffect } from 'react';
import { usePermissions } from '../../contexts/PermissionsContext';
import { LocationStockView } from './LocationStockView';
import { LocationManager } from './LocationManager';
import { StockMovements } from './StockMovements';
import { PriceListManager } from './PriceListManager';
import { MaterialRequests } from './MaterialRequests';
import { TrendingUp, DollarSign, MapPin, ClipboardList, Settings } from 'lucide-react';

type TabType = 'locations' | 'manage-locations' | 'requests' | 'products' | 'prices' | 'movements';

export function InventoryModule() {
  const { isAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState<TabType>('requests');

  useEffect(() => {
    setActiveTab(isAdmin ? 'prices' : 'requests');
  }, [isAdmin]);

  const allTabs = [
    { id: 'prices' as TabType, label: 'Productos y Precios', icon: DollarSign },
    { id: 'locations' as TabType, label: 'Distribución por Ubicación', icon: MapPin },
    { id: 'requests' as TabType, label: 'Solicitudes', icon: ClipboardList },
    { id: 'movements' as TabType, label: 'Movimientos', icon: TrendingUp },
    { id: 'manage-locations' as TabType, label: 'Ajustes de Almacén', icon: Settings }
  ];

  const tabs = isAdmin ? allTabs : allTabs.filter(t => t.id === 'requests');

  const renderContent = () => {
    if (!isAdmin && activeTab !== 'requests') return null; // Fallback in case of invalid state

    switch (activeTab) {
      case 'locations':
        return <LocationStockView />;
      case 'manage-locations':
        return <LocationManager />;
      case 'requests':
        return <MaterialRequests />;
      case 'prices':
        return <PriceListManager />;
      case 'movements':
        return <StockMovements />;
      default:
        return <MaterialRequests />;
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

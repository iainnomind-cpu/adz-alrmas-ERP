import { useState } from 'react';
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { CustomerAnalytics } from './CustomerAnalytics';
import { PortfolioAnalysis } from './PortfolioAnalysis';
import { CreditBureau } from './CreditBureau';
import { ServiceAnalytics } from './ServiceAnalytics';
import { TechnicianProductivity } from './TechnicianProductivity';
import { FinancialAnalytics } from './FinancialAnalytics';
import { InventoryReport } from './InventoryReport';
import { AgingReport } from './AgingReport';
import { TemporalTrends } from './TemporalTrends';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CreditCard,
  Wrench,
  UserCheck,
  TrendingUp,
  Package,
  Clock,
  Calendar
} from 'lucide-react';

type TabType = 'portfolio' | 'customers' | 'services' | 'executive' | 'credit' | 'trends' | 'financial' | 'inventory' | 'technicians' | 'aging';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('executive');

  const tabs = [
    { id: 'portfolio' as TabType, label: '1.- Cartera Clientes', icon: Briefcase },
    { id: 'customers' as TabType, label: '2.- Clientes Alarmas', icon: Users },
    { id: 'services' as TabType, label: '3.- Servicios', icon: Wrench },
    { id: 'technicians' as TabType, label: '4.- Técnicos', icon: UserCheck },
    { id: 'credit' as TabType, label: '5.- Buró', icon: CreditCard },
    { id: 'aging' as TabType, label: '6.- Mora', icon: Clock },
    { id: 'financial' as TabType, label: '7.- Financiero', icon: TrendingUp },
    { id: 'inventory' as TabType, label: '8.- Inventario', icon: Package },
    { id: 'executive' as TabType, label: 'Ejecutivo', icon: LayoutDashboard },
    { id: 'trends' as TabType, label: 'Metas', icon: Calendar }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'executive':
        return <ExecutiveDashboard />;
      case 'customers':
        return <CustomerAnalytics />;
      case 'portfolio':
        return <PortfolioAnalysis />;
      case 'credit':
        return <CreditBureau />;
      case 'services':
        return <ServiceAnalytics />;
      case 'technicians':
        return <TechnicianProductivity />;
      case 'financial':
        return <FinancialAnalytics />;
      case 'inventory':
        return <InventoryReport />;
      case 'aging':
        return <AgingReport />;
      case 'trends':
        return <TemporalTrends />;
      default:
        return <ExecutiveDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Ejecutivo</h2>
        <p className="text-gray-600">Análisis integral del negocio en tiempo real</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-all border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

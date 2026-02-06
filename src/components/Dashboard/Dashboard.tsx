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

type TabType = 'executive' | 'customers' | 'portfolio' | 'credit' | 'services' | 'technicians' | 'financial' | 'inventory' | 'aging' | 'trends';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('executive');

  const tabs = [
    { id: 'executive' as TabType, label: 'Ejecutivo', icon: LayoutDashboard },
    { id: 'customers' as TabType, label: 'Clientes', icon: Users },
    { id: 'portfolio' as TabType, label: 'Cartera', icon: Briefcase },
    { id: 'credit' as TabType, label: 'Buró', icon: CreditCard },
    { id: 'services' as TabType, label: 'Servicios', icon: Wrench },
    { id: 'technicians' as TabType, label: 'Técnicos', icon: UserCheck },
    { id: 'financial' as TabType, label: 'Financiero', icon: TrendingUp },
    { id: 'inventory' as TabType, label: 'Inventario', icon: Package },
    { id: 'aging' as TabType, label: 'Mora', icon: Clock },
    { id: 'trends' as TabType, label: 'Tendencias', icon: Calendar }
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

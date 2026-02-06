import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useAutoRescheduling } from './hooks/useAutoRescheduling';
import { LoginForm } from './components/Auth/LoginForm';
import { MainLayout } from './components/Layout/MainLayout';
import { Dashboard } from './components/Dashboard/Dashboard';
import { CustomerList } from './components/CRM/CustomerList';
import { ServiceOrderList } from './components/FSM/ServiceOrderList';
import { InvoiceList } from './components/Billing/InvoiceList';
import { AssetList } from './components/Assets/AssetList';
import { InventoryModule } from './components/Inventory/InventoryModule';
import { SettingsModule } from './components/Settings/SettingsModule';
import { CalendarView } from './components/Calendar/CalendarView';

function App() {
  const { user, loading } = useAuth();
  useAutoRescheduling(!!user);
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'customers':
        return <CustomerList />;
      case 'service-orders':
        return <ServiceOrderList />;
      case 'calendar':
        return <CalendarView />;
      case 'invoices':
        return <InvoiceList />;
      case 'assets':
        return <AssetList />;
      case 'inventory':
        return <InventoryModule />;
      case 'settings':
        return <SettingsModule />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </MainLayout>
  );
}

export default App;

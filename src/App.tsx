import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { usePermissions } from './contexts/PermissionsContext';
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
import { ShieldAlert } from 'lucide-react';

// Map tab IDs to permission module names
const tabToModuleMap: Record<string, string> = {
  'dashboard': 'dashboard',
  'customers': 'customers',
  'customers-alarma': 'customers',
  'customers-cctv': 'customers',
  'customers-acceso': 'customers',
  'service-orders': 'service_orders',
  'calendar': 'service_orders',
  'invoices': 'invoices',
  'assets': 'assets',
  'inventory': 'inventory',
  'settings': 'settings',
};

function App() {
  const { user, loading } = useAuth();
  const { hasModuleAccess } = usePermissions();
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

  const AccessDenied = () => (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <div className="p-4 bg-red-100 rounded-full mb-4">
        <ShieldAlert className="w-12 h-12 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
      <p className="text-gray-600 max-w-md">
        No tienes permisos para acceder a este módulo. Contacta al administrador si necesitas acceso.
      </p>
    </div>
  );

  const renderContent = () => {
    // Check permission for the active module
    const module = tabToModuleMap[activeTab];
    if (module && module !== 'dashboard' && !hasModuleAccess(module)) {
      return <AccessDenied />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'customers':
      case 'customers-alarma':
        return <CustomerList systemType="alarma" />;
      case 'customers-cctv':
        return <CustomerList systemType="cctv" />;
      case 'customers-acceso':
        return <CustomerList systemType="control_acceso" />;
      case 'customers-asistencia':
        return <CustomerList systemType="control_asistencia" />;
      case 'customers-domotica':
        return <CustomerList systemType="domotica" />;
      case 'customers-gps-personal':
        return <CustomerList systemType="gps_personal" />;
      case 'customers-gps-vehicular':
        return <CustomerList systemType="gps_vehicular" />;
      case 'customers-videoportero':
        return <CustomerList systemType="video_portero" />;
      case 'customers-red':
        return <CustomerList systemType="red" />;
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


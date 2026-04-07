import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import { TechnicianNotifications } from '../Calendar/TechnicianNotifications';
import { InventoryNotificationsBell } from '../Inventory/InventoryNotificationsBell';
import {
  LayoutDashboard,
  Users,
  Wrench,
  FileText,
  Shield,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  Calendar
} from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Map sidebar IDs to permission module names
const sidebarToModuleMap: Record<string, string> = {
  'dashboard': 'dashboard',
  'customers-group': 'customers',
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

export function MainLayout({ children, activeTab, onTabChange }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { hasModuleAccess, isAdmin, userRole } = usePermissions();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'customers-group',
      label: 'Clientes',
      icon: Users,
      subItems: [
        { id: 'customers-alarma', label: 'Alarma' },
        { id: 'customers-cctv', label: 'CCTV' },
        { id: 'customers-acceso', label: 'Control de Acceso' },
        { id: 'customers-asistencia', label: 'Control de Asistencia' },
        { id: 'customers-videoportero', label: 'Video Portero' },
        { id: 'customers-red', label: 'Red' }
      ]
    },
    { id: 'service-orders', label: 'Órdenes de Servicio', icon: Wrench },
    { id: 'calendar', label: 'Calendario', icon: Calendar },
    { id: 'invoices', label: 'Facturación', icon: FileText },
    { id: 'assets', label: 'Activos', icon: Shield },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'settings', label: 'Configuración', icon: Settings }
  ];

  // Filter menu items based on permissions
  const menuItems = allMenuItems.filter(item => {
    const module = sidebarToModuleMap[item.id];
    if (!module) return true; // always show if no mapping
    if (module === 'dashboard') return true; // dashboard always visible
    if (module === 'settings') return isAdmin || hasModuleAccess('settings');
    if (module === 'inventory' && userRole === 'technician') return true;
    return hasModuleAccess(module);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation for Notifications (Desktop & Mobile) */}
      <div className="fixed top-0 right-0 left-0 bg-transparent z-[60] pointer-events-none">
        <div className="max-w-7xl mx-auto flex justify-end px-4 py-2 lg:py-3 lg:pr-8">
          <div className="flex items-center gap-2 pointer-events-auto bg-white/80 backdrop-blur-md rounded-full px-3 py-1.5 shadow-sm border border-gray-200">
            <InventoryNotificationsBell />
            <TechnicianNotifications />
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 z-50 flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <h1 className="text-xl font-bold text-gray-900">ERP System</h1>
      </div>

      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 transform transition-transform lg:translate-x-0 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ERP System</h1>
            <p className="text-sm text-gray-600 mt-1">Field Service Management</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0">
          {menuItems.map((item) => {
            const Icon = item.icon;

            if (item.subItems) {
              return (
                <div key={item.id} className="mb-2">
                  <div className="flex items-center gap-3 px-4 py-2 text-gray-700 font-medium">
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  <div className="ml-9 space-y-1 mt-1">
                    {item.subItems.map(sub => {
                      const isActive = activeTab === sub.id || (activeTab === 'customers' && sub.id === 'customers-alarma');
                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            onTabChange(sub.id);
                            setSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${isActive
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3 space-y-2">
          <div>
            <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
            <p className="text-xs text-gray-600 mt-0.5">Sesión activa</p>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="lg:ml-64 min-h-screen flex flex-col min-w-0">
        <div className="flex-1 p-4 lg:p-8 pt-20 lg:pt-16 max-w-7xl mx-auto w-full min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}

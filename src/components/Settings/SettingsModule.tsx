import { useState } from 'react';
import { UserManagement } from './UserManagement';
import { RolePermissions } from './RolePermissions';
import { SystemSettings } from './SystemSettings';
import { FolioSeriesManagement } from './FolioSeriesManagement';
import { NotificationsManager } from './NotificationsManager';
import { Users, Shield, Settings as SettingsIcon, FileText, Bell } from 'lucide-react';

type TabType = 'users' | 'roles' | 'settings' | 'folios' | 'notifications';

export function SettingsModule() {
  const [activeTab, setActiveTab] = useState<TabType>('users');

  const tabs = [
    { id: 'users' as TabType, label: 'Usuarios', icon: Users },
    { id: 'roles' as TabType, label: 'Roles y Permisos', icon: Shield },
    { id: 'settings' as TabType, label: 'Configuración', icon: SettingsIcon },
    { id: 'folios' as TabType, label: 'Series de Folios', icon: FileText },
    { id: 'notifications' as TabType, label: 'Notificaciones', icon: Bell }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'roles':
        return <RolePermissions />;
      case 'settings':
        return <SystemSettings />;
      case 'folios':
        return <FolioSeriesManagement />;
      case 'notifications':
        return <NotificationsManager />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Configuración del Sistema</h2>
        <p className="text-gray-600">Gestión de usuarios, roles, permisos y configuración</p>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.id
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

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, CheckCircle2, XCircle } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_active: boolean;
}

interface Permission {
  id: string;
  module: string;
  action: string;
  description: string;
}

interface RolePermission {
  role_id: string;
  permission_id: string;
}

export function RolePermissions() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [rolesData, permissionsData, rolePermsData] = await Promise.all([
      supabase.from('roles').select('*').order('name'),
      supabase.from('permissions').select('*').order('module, action'),
      supabase.from('role_permissions').select('role_id, permission_id')
    ]);

    if (rolesData.data) setRoles(rolesData.data);
    if (permissionsData.data) setPermissions(permissionsData.data);
    if (rolePermsData.data) setRolePermissions(rolePermsData.data);
    setLoading(false);
  };

  const hasPermission = (roleId: string, permissionId: string) => {
    return rolePermissions.some(
      rp => rp.role_id === roleId && rp.permission_id === permissionId
    );
  };

  const togglePermission = async (roleId: string, permissionId: string) => {
    setSaving(true);
    const hasIt = hasPermission(roleId, permissionId);

    if (hasIt) {
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
        .eq('permission_id', permissionId);

      if (!error) {
        setRolePermissions(prev =>
          prev.filter(rp => !(rp.role_id === roleId && rp.permission_id === permissionId))
        );
      }
    } else {
      const { error } = await supabase
        .from('role_permissions')
        .insert([{ role_id: roleId, permission_id: permissionId }]);

      if (!error) {
        setRolePermissions(prev => [...prev, { role_id: roleId, permission_id: permissionId }]);
      }
    }
    setSaving(false);
  };



  const getRoleLabel = (roleName: string) => {
    switch (roleName) {
      case 'admin': return 'Administrador';
      case 'technician': return 'Técnico';
      case 'customer_service': return 'Atención a Cliente';
      case 'collector': return 'Cobrador';
      default: return roleName;
    }
  };

  const getModuleLabel = (module: string) => {
    switch (module) {
      case 'dashboard': return 'Dashboard';
      case 'customers': return 'Clientes';
      case 'service_orders': return 'Órdenes de Servicio';
      case 'invoices': return 'Facturación';
      case 'assets': return 'Activos';
      case 'inventory': return 'Inventario';
      case 'settings': return 'Configuración';
      default: return module;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'view': return 'Ver';
      case 'create': return 'Crear';
      case 'edit': return 'Editar';
      case 'delete': return 'Eliminar';
      case 'export': return 'Exportar';
      case 'assign': return 'Asignar';
      case 'complete': return 'Completar';
      case 'adjust': return 'Ajustar';
      case 'manage_users': return 'Gestionar Usuarios';
      case 'manage_roles': return 'Gestionar Roles';
      case 'view_financial': return 'Ver Información Financiera';
      case 'view_analytics': return 'Ver Análisis';
      case 'view_materials': return 'Ver Materiales';
      case 'add_materials': return 'Agregar Materiales';
      case 'process_payment': return 'Procesar Pagos';
      case 'view_reports': return 'Ver Reportes';
      default: return action;
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const permissionsByModule = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);



  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8" />
          <h3 className="text-xl font-semibold">Gestión de Roles y Permisos</h3>
        </div>
        <p className="text-blue-100">
          Configure los permisos granulares para cada rol del sistema
        </p>
      </div>

      {saving && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
          Guardando cambios...
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
          <div key={module} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {getModuleLabel(module)}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Acción
                    </th>
                    {roles.map((role) => (
                      <th key={role.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        {getRoleLabel(role.name)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {modulePermissions.map((permission) => (
                    <tr key={permission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {getActionLabel(permission.action)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {permission.description}
                          </p>
                        </div>
                      </td>
                      {roles.map((role) => {
                        const hasIt = hasPermission(role.id, permission.id);
                        const isAdmin = role.name === 'admin';

                        return (
                          <td key={role.id} className="px-6 py-4 text-center">
                            <button
                              onClick={() => !isAdmin && togglePermission(role.id, permission.id)}
                              disabled={isAdmin || saving}
                              className={`inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                                isAdmin
                                  ? 'bg-gray-100 cursor-not-allowed'
                                  : hasIt
                                  ? 'bg-green-100 hover:bg-green-200 text-green-600'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
                              }`}
                              title={isAdmin ? 'Los administradores tienen todos los permisos' : ''}
                            >
                              {hasIt ? (
                                <CheckCircle2 className="w-6 h-6" />
                              ) : (
                                <XCircle className="w-6 h-6" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <span className="font-semibold">Nota:</span> Los cambios en permisos se aplican inmediatamente.
          Los usuarios afectados verán los cambios en su próxima acción o al recargar la página.
        </p>
      </div>
    </div>
  );
}

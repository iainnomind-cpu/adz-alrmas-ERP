import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, CheckCircle2, XCircle, Eye, Edit, Lock, Unlock } from 'lucide-react';

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

interface FieldPermission {
  id: string;
  table_name: string;
  field_name: string;
  field_label: string;
  description: string;
  category: string;
  is_sensitive: boolean;
}

interface RolePermission {
  role_id: string;
  permission_id: string;
}

interface RoleFieldPermission {
  role_id: string;
  field_permission_id: string;
  can_view: boolean;
  can_edit: boolean;
}

type ViewMode = 'modules' | 'fields';

export function RolePermissions() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [fieldPermissions, setFieldPermissions] = useState<FieldPermission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [roleFieldPermissions, setRoleFieldPermissions] = useState<RoleFieldPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('modules');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [rolesData, permissionsData, fieldPermsData, rolePermsData, roleFieldPermsData] = await Promise.all([
      supabase.from('roles').select('*').order('name'),
      supabase.from('permissions').select('*').order('module, action'),
      supabase.from('field_permissions').select('*').order('table_name, category, field_name'),
      supabase.from('role_permissions').select('role_id, permission_id'),
      supabase.from('role_field_permissions').select('role_id, field_permission_id, can_view, can_edit')
    ]);

    if (rolesData.data) setRoles(rolesData.data);
    if (permissionsData.data) setPermissions(permissionsData.data);
    if (fieldPermsData.data) setFieldPermissions(fieldPermsData.data);
    if (rolePermsData.data) setRolePermissions(rolePermsData.data);
    if (roleFieldPermsData.data) setRoleFieldPermissions(roleFieldPermsData.data);
    setLoading(false);
  };

  const hasPermission = (roleId: string, permissionId: string) => {
    return rolePermissions.some(
      rp => rp.role_id === roleId && rp.permission_id === permissionId
    );
  };

  const hasFieldPermission = (roleId: string, fieldPermissionId: string) => {
    return roleFieldPermissions.find(
      rfp => rfp.role_id === roleId && rfp.field_permission_id === fieldPermissionId
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

  const toggleFieldPermission = async (roleId: string, fieldPermissionId: string, permissionType: 'view' | 'edit') => {
    setSaving(true);
    const existing = hasFieldPermission(roleId, fieldPermissionId);

    if (existing) {
      const newCanView = permissionType === 'view' ? !existing.can_view : existing.can_view;
      const newCanEdit = permissionType === 'edit' ? !existing.can_edit : existing.can_edit;

      if (!newCanView && !newCanEdit) {
        const { error } = await supabase
          .from('role_field_permissions')
          .delete()
          .eq('role_id', roleId)
          .eq('field_permission_id', fieldPermissionId);

        if (!error) {
          setRoleFieldPermissions(prev =>
            prev.filter(rfp => !(rfp.role_id === roleId && rfp.field_permission_id === fieldPermissionId))
          );
        }
      } else {
        const { error } = await supabase
          .from('role_field_permissions')
          .update({
            can_view: newCanView,
            can_edit: newCanEdit
          })
          .eq('role_id', roleId)
          .eq('field_permission_id', fieldPermissionId);

        if (!error) {
          setRoleFieldPermissions(prev =>
            prev.map(rfp =>
              rfp.role_id === roleId && rfp.field_permission_id === fieldPermissionId
                ? { ...rfp, can_view: newCanView, can_edit: newCanEdit }
                : rfp
            )
          );
        }
      }
    } else {
      const newPerm = {
        role_id: roleId,
        field_permission_id: fieldPermissionId,
        can_view: permissionType === 'view',
        can_edit: permissionType === 'edit'
      };

      const { error } = await supabase
        .from('role_field_permissions')
        .insert([newPerm]);

      if (!error) {
        setRoleFieldPermissions(prev => [...prev, newPerm]);
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

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'basic': return 'Básico';
      case 'contact': return 'Contacto';
      case 'location': return 'Ubicación';
      case 'technical': return 'Técnico';
      case 'service': return 'Servicio';
      case 'status': return 'Estado';
      case 'financial': return 'Financiero';
      case 'account': return 'Cuenta';
      default: return category;
    }
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      basic: 'bg-blue-100 text-blue-800',
      contact: 'bg-green-100 text-green-800',
      location: 'bg-purple-100 text-purple-800',
      technical: 'bg-orange-100 text-orange-800',
      service: 'bg-cyan-100 text-cyan-800',
      status: 'bg-yellow-100 text-yellow-800',
      financial: 'bg-red-100 text-red-800',
      account: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
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

  const fieldPermissionsByCategory = fieldPermissions
    .filter(fp => fp.table_name === 'customers')
    .reduce((acc, fp) => {
      if (!acc[fp.category]) {
        acc[fp.category] = [];
      }
      acc[fp.category].push(fp);
      return acc;
    }, {} as Record<string, FieldPermission[]>);

  const adminRole = roles.find(r => r.name === 'admin');
  const techRole = roles.find(r => r.name === 'technician');

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('modules')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'modules'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Permisos por Módulo
          </button>
          <button
            onClick={() => setViewMode('fields')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'fields'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Niveles de Acceso (Clientes)
          </button>
        </div>
      </div>

      {viewMode === 'modules' && (
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
      )}

      {viewMode === 'fields' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-3">
              <Shield className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-yellow-900 text-lg mb-2">Niveles de Acceso a Datos de Clientes</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Unlock className="w-5 h-5 text-green-600" />
                      <span className="font-bold text-green-900">Administrador (GRM)</span>
                    </div>
                    <p className="text-gray-700">Acceso total a todas las columnas y funcionalidades</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-5 h-5 text-orange-600" />
                      <span className="font-bold text-orange-900">Técnicos</span>
                    </div>
                    <p className="text-gray-700">Acceso limitado solo a campos necesarios para trabajo de campo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {Object.entries(fieldPermissionsByCategory).map(([category, categoryFields]) => (
            <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getCategoryLabel(category)}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(category)}`}>
                    {categoryFields.length} campos
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Campo
                      </th>
                      {[adminRole, techRole].filter(Boolean).map((role) => (
                        <th key={role!.id} className="px-6 py-3 text-center">
                          <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                            {role!.display_name}
                          </div>
                          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              Ver
                            </span>
                            <span className="flex items-center gap-1">
                              <Edit className="w-3 h-3" />
                              Editar
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {categoryFields.map((field) => (
                      <tr key={field.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2">
                            {field.is_sensitive && (
                              <Lock className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{field.field_label}</p>
                              <p className="text-sm text-gray-600">{field.description}</p>
                              <code className="text-xs text-gray-500 font-mono mt-1 inline-block">
                                {field.field_name}
                              </code>
                            </div>
                          </div>
                        </td>
                        {[adminRole, techRole].filter(Boolean).map((role) => {
                          const fieldPerm = hasFieldPermission(role!.id, field.id);
                          const canView = fieldPerm?.can_view || false;
                          const canEdit = fieldPerm?.can_edit || false;
                          const isAdmin = role!.name === 'admin';

                          return (
                            <td key={role!.id} className="px-6 py-4">
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  onClick={() => !isAdmin && toggleFieldPermission(role!.id, field.id, 'view')}
                                  disabled={isAdmin || saving}
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                                    isAdmin
                                      ? 'bg-gray-100 cursor-not-allowed'
                                      : canView
                                      ? 'bg-blue-100 hover:bg-blue-200 text-blue-600'
                                      : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
                                  }`}
                                  title={isAdmin ? 'Admin tiene todos los permisos' : canView ? 'Puede ver' : 'No puede ver'}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => !isAdmin && toggleFieldPermission(role!.id, field.id, 'edit')}
                                  disabled={isAdmin || saving}
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                                    isAdmin
                                      ? 'bg-gray-100 cursor-not-allowed'
                                      : canEdit
                                      ? 'bg-green-100 hover:bg-green-200 text-green-600'
                                      : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
                                  }`}
                                  title={isAdmin ? 'Admin tiene todos los permisos' : canEdit ? 'Puede editar' : 'No puede editar'}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Campos Accesibles para Técnicos</h4>
            <div className="grid md:grid-cols-2 gap-2 text-sm text-blue-800">
              {fieldPermissions
                .filter(fp => {
                  const techPerm = hasFieldPermission(techRole?.id || '', fp.id);
                  return techPerm?.can_view;
                })
                .map(fp => (
                  <div key={fp.id} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>{fp.field_label}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <span className="font-semibold">Nota:</span> Los cambios en permisos se aplican inmediatamente.
          Los usuarios afectados verán los cambios en su próxima acción o al recargar la página.
        </p>
      </div>
    </div>
  );
}

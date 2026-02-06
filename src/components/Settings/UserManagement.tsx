import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Plus, Edit2, Trash2, UserCheck, Clock } from 'lucide-react';
import { NewUserForm } from './NewUserForm';

interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  roles: {
    name: string;
    description: string;
  } | null;
  technician_details: Array<{
    specialty: string | null;
    hourly_rate: number;
    work_schedule_start: string | null;
    work_schedule_end: string | null;
  }> | null;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  useEffect(() => {
    loadUsers();
  }, [filter]);

  const loadUsers = async () => {
    let query = supabase
      .from('user_profiles')
      .select(`
        *,
        roles (name, description),
        technician_details (specialty, hourly_rate, work_schedule_start, work_schedule_end)
      `)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('is_active', filter === 'active');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading users:', error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: !currentStatus })
      .eq('id', userId);

    if (!error) {
      loadUsers();
    }
  };

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'technician': return 'bg-blue-100 text-blue-800';
      case 'customer_service': return 'bg-green-100 text-green-800';
      case 'collector': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'active', 'inactive'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                filter === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'Todos' : type === 'active' ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowNewForm(true)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  user.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                  {user.phone && (
                    <p className="text-sm text-gray-600">{user.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {user.roles && (
              <div className="mb-3">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.roles.name)}`}>
                  {getRoleLabel(user.roles.name)}
                </span>
              </div>
            )}

            {user.technician_details && user.technician_details[0] && (
              <div className="bg-blue-50 rounded-lg p-3 mb-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {user.technician_details[0].specialty || 'Técnico General'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <Clock className="w-4 h-4" />
                  <span>
                    ${user.technician_details[0].hourly_rate}/hora
                  </span>
                </div>
                {user.technician_details[0].work_schedule_start && (
                  <div className="text-xs text-blue-700">
                    Horario: {user.technician_details[0].work_schedule_start.slice(0, 5)} - {user.technician_details[0].work_schedule_end?.slice(0, 5)}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={() => toggleUserStatus(user.id, user.is_active)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  user.is_active
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
              >
                {user.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No hay usuarios registrados</p>
        </div>
      )}

      {showNewForm && (
        <NewUserForm
          onClose={() => setShowNewForm(false)}
          onSuccess={() => {
            loadUsers();
            setShowNewForm(false);
          }}
        />
      )}
    </div>
  );
}

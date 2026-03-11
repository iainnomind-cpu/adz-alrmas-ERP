import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, Loader2, User, Clock, Shield, Key } from 'lucide-react';

interface Role {
    id: string;
    name: string;
    description: string;
}

interface EditUserFormProps {
    user: {
        id: string;
        full_name: string;
        phone: string | null;
        is_active: boolean;
        role_id: string | null;
        role_name: string | null;
        technician_details: {
            specialty: string | null;
            hourly_rate: number;
            work_schedule_start: string | null;
            work_schedule_end: string | null;
        } | null;
    };
    onClose: () => void;
    onSuccess: () => void;
}

export function EditUserForm({ user, onClose, onSuccess }: EditUserFormProps) {
    const [loading, setLoading] = useState(false);
    const [rolesLoading, setRolesLoading] = useState(true);
    const [roles, setRoles] = useState<Role[]>([]);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showPasswordSection, setShowPasswordSection] = useState(false);

    const [formData, setFormData] = useState({
        role_id: user.role_id || '',
        full_name: user.full_name || '',
        phone: user.phone || '',
        is_active: user.is_active,
        new_password: '',
        confirm_password: '',
        specialty: user.technician_details?.specialty || '',
        hourly_rate: user.technician_details?.hourly_rate || 0,
        work_schedule_start: user.technician_details?.work_schedule_start?.slice(0, 5) || '08:00',
        work_schedule_end: user.technician_details?.work_schedule_end?.slice(0, 5) || '17:00',
    });

    useEffect(() => {
        loadRoles();
    }, []);

    const loadRoles = async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('roles')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setRoles(data || []);

            // If no role_id is set yet, try to select it from loaded roles
            if (!formData.role_id && data && data.length > 0) {
                const matchingRole = user.role_name ? data.find((r: any) => r.name === user.role_name) : null;
                if (matchingRole) {
                    setFormData(prev => ({ ...prev, role_id: matchingRole.id }));
                }
            }
        } catch (err) {
            console.error('Error loading roles:', err);
            setError('Error al cargar los roles disponibles');
        } finally {
            setRolesLoading(false);
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

    const isTechnician = roles.find(r => r.id === formData.role_id)?.name === 'technician';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');

        if (!formData.full_name || !formData.role_id) {
            setError('Nombre completo y rol son obligatorios');
            setLoading(false);
            return;
        }

        // Validate passwords match if provided
        if (formData.new_password) {
            if (formData.new_password.length < 6) {
                setError('La contraseña debe tener al menos 6 caracteres');
                setLoading(false);
                return;
            }
            if (formData.new_password !== formData.confirm_password) {
                setError('Las contraseñas no coinciden');
                setLoading(false);
                return;
            }
        }

        try {
            // 1. Update user_profiles
            const { error: profileError } = await (supabase
                .from('user_profiles') as any)
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone || null,
                    is_active: formData.is_active,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (profileError) {
                console.error('Error updating profile:', profileError);
                throw new Error('Error al actualizar el perfil');
            }

            // 2. Update role - delete old ones & insert new
            await (supabase.from('user_roles') as any)
                .delete()
                .eq('user_id', user.id);

            const { error: roleError } = await (supabase
                .from('user_roles') as any)
                .insert({
                    user_id: user.id,
                    role_id: formData.role_id
                });

            if (roleError && roleError.code !== '23505') {
                console.error('Error updating role:', roleError);
            }

            // 3. Update technicians table
            await (supabase.from('technicians') as any)
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone || null,
                    is_active: formData.is_active,
                })
                .eq('id', user.id);

            // 4. If technician, upsert technician_details
            if (isTechnician) {
                const { error: tdError } = await (supabase
                    .from('technician_details') as any)
                    .upsert({
                        user_profile_id: user.id,
                        specialty: formData.specialty || null,
                        hourly_rate: formData.hourly_rate,
                        work_schedule_start: formData.work_schedule_start,
                        work_schedule_end: formData.work_schedule_end,
                    }, { onConflict: 'user_profile_id' });

                if (tdError) console.error('Error updating technician_details:', tdError);

                // Also update technicians table with tech-specific fields
                await (supabase.from('technicians') as any)
                    .update({
                        specialty: formData.specialty || null,
                        hourly_rate: formData.hourly_rate,
                        work_schedule_start: formData.work_schedule_start,
                        work_schedule_end: formData.work_schedule_end,
                    })
                    .eq('id', user.id);
            }

            // 5. Change password if provided
            if (formData.new_password) {
                const { error: pwError } = await (supabase.rpc as any)('admin_change_user_password', {
                    target_user_id: user.id,
                    new_password: formData.new_password
                });

                if (pwError) {
                    console.error('Error changing password:', pwError);
                    throw new Error('Error al cambiar la contraseña: ' + pwError.message);
                }
            }

            setSuccessMsg('Usuario actualizado correctamente');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 800);
        } catch (err: any) {
            console.error('Error:', err);
            setError(err instanceof Error ? err.message : 'Error al actualizar el usuario');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
            <div className="min-h-screen px-4 py-8 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-6 rounded-t-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <User className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Editar Usuario</h2>
                                <p className="text-white/80 text-sm">{user.full_name}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}
                        {successMsg && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                                {successMsg}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rol del Usuario <span className="text-red-600">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Shield className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <select
                                        value={formData.role_id}
                                        onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
                                        required
                                        disabled={rolesLoading}
                                    >
                                        <option value="">Seleccione un rol...</option>
                                        {roles.map(role => (
                                            <option key={role.id} value={role.id}>
                                                {getRoleLabel(role.name)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nombre Completo <span className="text-red-600">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    placeholder="Juan Pérez"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Teléfono
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    placeholder="555-1234"
                                />
                            </div>
                        </div>

                        {/* Technician details section */}
                        {isTechnician && (
                            <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200 space-y-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-semibold text-gray-900">Información del Técnico</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Especialidad
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.specialty}
                                            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Ej: Sistemas de Alarmas"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Pago por Hora ($)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.hourly_rate}
                                            onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Hora de Inicio
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.work_schedule_start}
                                            onChange={(e) => setFormData({ ...formData, work_schedule_start: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Hora de Fin
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.work_schedule_end}
                                            onChange={(e) => setFormData({ ...formData, work_schedule_end: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Password change section */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowPasswordSection(!showPasswordSection)}
                                className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Key className="w-5 h-5 text-amber-600" />
                                    <span className="font-medium text-gray-700">Cambiar Contraseña</span>
                                </div>
                                <span className="text-sm text-gray-500">
                                    {showPasswordSection ? '▲ Ocultar' : '▼ Mostrar'}
                                </span>
                            </button>

                            {showPasswordSection && (
                                <div className="p-6 bg-amber-50 border-t border-amber-200 space-y-4">
                                    <p className="text-sm text-amber-700 mb-4">
                                        Deja estos campos vacíos si no deseas cambiar la contraseña.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nueva Contraseña
                                            </label>
                                            <input
                                                type="password"
                                                value={formData.new_password}
                                                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                placeholder="********"
                                                minLength={6}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Confirmar Contraseña
                                            </label>
                                            <input
                                                type="password"
                                                value={formData.confirm_password}
                                                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                                placeholder="********"
                                                minLength={6}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-5 h-5 text-amber-600 rounded focus:ring-2 focus:ring-amber-500"
                            />
                            <label className="text-sm font-medium text-gray-700">
                                Usuario activo
                            </label>
                        </div>

                        <div className="flex gap-4 justify-end pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading || rolesLoading}
                                className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Guardar Cambios
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

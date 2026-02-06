import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRecurringSchedules } from '../../hooks/useRecurringSchedules';
import {
  X,
  Save,
  Loader2,
  Calendar,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface RecurringEventsProps {
  customerId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Customer {
  id: string;
  name: string;
  address: string | null;
}

interface RecurringScheduleWithCustomer {
  id: string;
  customer_id: string;
  service_type: string;
  frequency: 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  next_date: string;
  is_active: boolean;
  notes: string | null;
  customers?: {
    name: string;
  };
}

export function RecurringEvents({ customerId, onClose, onSuccess }: RecurringEventsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [existingSchedules, setExistingSchedules] = useState<RecurringScheduleWithCustomer[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customer_id: customerId || '',
    frequency: 'monthly' as 'monthly' | 'quarterly' | 'semiannual' | 'annual',
    next_date: '',
    service_type: 'preventive',
    is_active: true,
    notes: ''
  });

  const {
    schedules,
    loading: schedulesLoading,
    loadRecurringSchedules,
    createRecurringSchedule,
    updateRecurringSchedule,
    deleteRecurringSchedule
  } = useRecurringSchedules();

  useEffect(() => {
    if (!customerId) {
      loadCustomers();
    }
    loadExistingSchedules();
  }, []);

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, address')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Error loading customers:', error);
    } else {
      setCustomers(data || []);
    }
  };

  const loadExistingSchedules = async () => {
    const { data, error } = await supabase
      .from('recurring_schedules')
      .select(`
        *,
        customers (name)
      `)
      .order('next_date', { ascending: true });

    if (error) {
      console.error('Error loading schedules:', error);
    } else {
      setExistingSchedules(data || []);
    }
  };

  const validateForm = () => {
    if (!formData.customer_id) {
      setError('Debe seleccionar un cliente');
      return false;
    }

    if (!formData.next_date) {
      setError('Debe seleccionar una fecha');
      return false;
    }

    const selectedDate = new Date(formData.next_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setError('La fecha debe ser futura');
      return false;
    }

    return true;
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const success = await createRecurringSchedule({
        customer_id: formData.customer_id,
        service_type: formData.service_type,
        frequency: formData.frequency,
        next_date: formData.next_date,
        is_active: formData.is_active,
        notes: formData.notes || null
      });

      if (success) {
        await loadExistingSchedules();
        setFormData({
          customer_id: customerId || '',
          frequency: 'monthly',
          next_date: '',
          service_type: 'preventive',
          is_active: true,
          notes: ''
        });
        onSuccess();
      } else {
        setError('Error al crear la programación recurrente');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la programación');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (scheduleId: string, currentStatus: boolean) => {
    try {
      const success = await updateRecurringSchedule(scheduleId, {
        is_active: !currentStatus
      });

      if (success) {
        await loadExistingSchedules();
      }
    } catch (err) {
      console.error('Error toggling schedule:', err);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (deleteConfirm !== scheduleId) {
      setDeleteConfirm(scheduleId);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      const success = await deleteRecurringSchedule(scheduleId);

      if (success) {
        await loadExistingSchedules();
        setDeleteConfirm(null);
      }
    } catch (err) {
      console.error('Error deleting schedule:', err);
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'monthly': return 'Mensual';
      case 'quarterly': return 'Trimestral';
      case 'semiannual': return 'Semestral';
      case 'annual': return 'Anual';
      default: return frequency;
    }
  };

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'preventive': return 'Preventivo';
      case 'inspection': return 'Inspección';
      case 'calibration': return 'Calibración';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Programar Mantenimiento Recurrente</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="p-8 space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSchedule} className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Nueva Programación Recurrente
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {!customerId && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cliente <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={formData.customer_id}
                      onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Seleccionar cliente</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} {customer.address ? `- ${customer.address}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frecuencia <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="semiannual">Semestral</option>
                    <option value="annual">Anual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha del Primer Servicio <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.next_date}
                    onChange={(e) => setFormData({ ...formData, next_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Servicio
                  </label>
                  <select
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="preventive">Preventivo</option>
                    <option value="inspection">Inspección</option>
                    <option value="calibration">Calibración</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Notas adicionales sobre el mantenimiento recurrente..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Activar inmediatamente
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-4 justify-end pt-4 border-t border-blue-300">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Guardar Programación
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="bg-white rounded-xl border border-gray-200">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Programaciones Existentes</h3>
              </div>

              {schedulesLoading ? (
                <div className="p-8 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : existingSchedules.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No hay programaciones recurrentes</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frecuencia</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Próxima Fecha</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {existingSchedules.map((schedule) => (
                        <tr key={schedule.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <span className="font-medium text-gray-900">
                              {schedule.customers?.name || 'Cliente desconocido'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-700">
                              {getServiceTypeLabel(schedule.service_type)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-700">
                              {getFrequencyLabel(schedule.frequency)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-900">
                              <Calendar className="w-4 h-4 text-blue-600" />
                              {new Date(schedule.next_date).toLocaleDateString('es-ES')}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleToggleActive(schedule.id, schedule.is_active)}
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                schedule.is_active
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {schedule.is_active ? (
                                <>
                                  <ToggleRight className="w-4 h-4" />
                                  Activo
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-4 h-4" />
                                  Inactivo
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                                deleteConfirm === schedule.id
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-red-50 text-red-600 hover:bg-red-100'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                              {deleteConfirm === schedule.id ? 'Confirmar' : 'Eliminar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

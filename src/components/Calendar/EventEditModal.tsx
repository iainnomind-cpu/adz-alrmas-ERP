import { useState, useEffect } from 'react';
import { X, Clock, User, Save, Trash2, Calendar, RefreshCw, AlertTriangle, Repeat, AlertCircle, Search, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CalendarEvent } from '../../types/calendar.types';

interface EventEditModalProps {
  event: CalendarEvent;
  onClose: () => void;
  onDelete?: (event: CalendarEvent) => void;
  onSave: (updatedEvent: Partial<CalendarEvent> & { id: string }) => Promise<void>;
}

interface Technician {
  id: string;
  full_name: string;
}

interface Customer {
  id: string;
  name: string;
  business_name?: string;
  account_number?: string;
}

export function EventEditModal({ event, onClose, onDelete, onSave }: EventEditModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Editable fields
  const [editTime, setEditTime] = useState(() => {
    const d = event.start;
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [editTechnicianId, setEditTechnicianId] = useState(event.technicianId || '');
  const [editCustomerId, setEditCustomerId] = useState(event.customerId || '');
  const [editCustomerName, setEditCustomerName] = useState(event.customerName || '');
  const [editNotes, setEditNotes] = useState(event.internalNotes || event.description || '');
  const [editPriority, setEditPriority] = useState(event.priority || 'medium');
  const [editStatus, setEditStatus] = useState(event.status || 'requested');

  useEffect(() => {
    if (isEditing) {
      loadDropdownData();
    }
  }, [isEditing]);

  const loadDropdownData = async () => {
    setLoadingData(true);
    try {
      const [techRes, custRes] = await Promise.all([
        supabase.from('technicians').select('id, full_name').order('full_name'),
        supabase.from('customers').select('id, name, business_name, account_number').order('name').limit(100)
      ]);
      if (techRes.data) setTechnicians(techRes.data);
      if (custRes.data) setCustomers(custRes.data);
    } catch (err) {
      console.error('Error loading dropdown data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const searchCustomers = async (query: string) => {
    if (!query || query.length < 2) return;
    try {
      const { data } = await supabase
        .from('customers')
        .select('id, name, business_name, account_number')
        .or(`name.ilike.%${query}%,business_name.ilike.%${query}%`)
        .limit(20);
      if (data) setCustomers(data);
    } catch (err) {
      console.error('Error searching customers:', err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newStart = new Date(event.start);
      const [hours, minutes] = editTime.split(':').map(Number);
      newStart.setHours(hours, minutes, 0, 0);

      const tech = technicians.find(t => t.id === editTechnicianId);

      await onSave({
        id: event.id,
        start: newStart,
        technicianId: editTechnicianId || undefined,
        technicianName: tech?.full_name || event.technicianName,
        customerId: editCustomerId || event.customerId,
        customerName: editCustomerName || event.customerName,
        internalNotes: editNotes,
        description: editNotes,
        priority: editPriority as any,
        status: editStatus as any,
      });

      setIsEditing(false);
    } catch (err) {
      console.error('Error saving event:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const getPriorityLabel = (priority: string) => {
    const map: Record<string, string> = { critical: 'Crítico', urgent: 'Urgente', high: 'Alta', medium: 'Media', low: 'Baja' };
    return map[priority] || priority;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = { requested: 'Solicitado', assigned: 'Asignado', in_progress: 'En Progreso', paused: 'Pausado', completed: 'Completado', paid: 'Pagado', invoiced: 'Facturado' };
    return map[status] || status;
  };

  const getPriorityColor = (priority: string) => {
    const map: Record<string, string> = { critical: 'bg-red-100 text-red-800', urgent: 'bg-orange-100 text-orange-800', high: 'bg-yellow-100 text-yellow-800', medium: 'bg-blue-100 text-blue-800', low: 'bg-green-100 text-green-800' };
    return map[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = { completed: 'bg-green-100 text-green-800', in_progress: 'bg-yellow-100 text-yellow-800', paused: 'bg-orange-100 text-orange-800', assigned: 'bg-blue-100 text-blue-800', requested: 'bg-gray-100 text-gray-800', paid: 'bg-emerald-100 text-emerald-800', invoiced: 'bg-purple-100 text-purple-800' };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredCustomers = customers.filter(c =>
    !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.business_name || '').toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div
          className="px-6 py-4 rounded-t-3xl sm:rounded-t-2xl flex items-center justify-between sticky top-0 z-10"
          style={{ backgroundColor: event.color || '#4f46e5' }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-white/20 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white truncate">
              {event.id.startsWith('concept-') || event.type === 'other'
                ? event.title
                : event.title.split(' - ')[0]}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Editar
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* VIEW MODE */}
          {!isEditing ? (
            <>
              {event.description && (
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-1">Descripción</p>
                  <p className="text-gray-900">{event.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Fecha y Hora</span>
                  </div>
                  <p className="text-gray-900 font-semibold">
                    {event.start.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {event.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {event.customerName && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">Cliente</span>
                    </div>
                    <p className="text-gray-900 font-semibold">{event.customerName}</p>
                  </div>
                )}

                {event.technicianName && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">Técnico Asignado</span>
                    </div>
                    <p className="text-gray-900 font-semibold">{event.technicianName}</p>
                  </div>
                )}

                {event.internalNotes && (
                  <div className="bg-amber-50 rounded-xl p-4 sm:col-span-2">
                    <div className="flex items-center gap-2 text-amber-700 mb-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Observaciones Internas</span>
                    </div>
                    <p className="text-gray-900 text-sm">{event.internalNotes}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getPriorityColor(event.priority)}`}>
                  {getPriorityLabel(event.priority)}
                </span>
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(event.status)}`}>
                  {getStatusLabel(event.status)}
                </span>
                {event.isRecurring && (
                  <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
                    <Repeat className="w-4 h-4" /> Recurrente
                  </span>
                )}
                {event.isModifiedFromSeries && (
                  <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-orange-100 text-orange-800 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Modificado
                  </span>
                )}
              </div>

              {((event.rescheduleCount && event.rescheduleCount > 0) || (event.daysOverdue && event.daysOverdue > 0)) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                  {event.rescheduleCount && event.rescheduleCount > 0 && (
                    <div className="flex items-center gap-2 text-amber-800">
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-sm font-medium">Reprogramado {event.rescheduleCount} {event.rescheduleCount === 1 ? 'vez' : 'veces'}</span>
                    </div>
                  )}
                  {event.daysOverdue && event.daysOverdue > 0 && (
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">{event.daysOverdue} {event.daysOverdue === 1 ? 'día' : 'días'} de retraso</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* EDIT MODE */
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
                Editando evento. Los cambios se guardarán en la base de datos.
              </div>

              {/* Date */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 font-medium mb-2">
                  Fecha: {event.start.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Hora del Evento
                  </label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={e => setEditTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                  />
                </div>
              </div>

              {/* Cliente */}
              <div className="relative">
                <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                  <User className="w-4 h-4" /> Cliente
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearch || editCustomerName}
                    onChange={e => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                      searchCustomers(e.target.value);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Buscar cliente por nombre..."
                    className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                </div>
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setEditCustomerId(c.id);
                          setEditCustomerName(c.name);
                          setCustomerSearch('');
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
                      >
                        <span className="font-medium">{c.name}</span>
                        {c.business_name && <span className="text-gray-500 ml-1">— {c.business_name}</span>}
                        {c.account_number && <span className="text-gray-400 ml-1 text-xs">#{c.account_number}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Responsable (Técnico) */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                  <User className="w-4 h-4" /> Responsable (Técnico)
                </label>
                {loadingData ? (
                  <div className="text-sm text-gray-500 py-2">Cargando técnicos...</div>
                ) : (
                  <select
                    value={editTechnicianId}
                    onChange={e => setEditTechnicianId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">— Sin Asignar —</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Prioridad</label>
                  <select
                    value={editPriority}
                    onChange={e => setEditPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                    <option value="critical">Crítico</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Estado</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="requested">Solicitado</option>
                    <option value="assigned">Asignado</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="paused">Pausado</option>
                    <option value="completed">Completado</option>
                    <option value="paid">Pagado</option>
                    <option value="invoiced">Facturado</option>
                  </select>
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Observaciones / Notas Internas</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Agrega observaciones o instrucciones especiales..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <div className="flex gap-3">
            {onDelete && !isEditing && (
              <button
                onClick={() => onDelete(event)}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" /> Eliminar
              </button>
            )}
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Save className="w-5 h-5" />
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

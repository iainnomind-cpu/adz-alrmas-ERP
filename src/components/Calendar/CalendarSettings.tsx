import { useState, useEffect } from 'react';
import { X, Settings, Trash2, Plus, RotateCcw, Calendar, Search, Check, Eye, Palette, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCalendarSettings, type VisibleFields, type ColorScheme } from '../../hooks/useCalendarSettings';

interface CalendarSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onConceptCreated?: () => void;
  onViewLoaded?: (viewName: string) => void;
}

const FIELD_LABELS: Record<keyof VisibleFields, string> = {
  startTime: 'Hora de inicio',
  endTime: 'Hora de fin',
  technicianName: 'Técnico asignado',
  customerName: 'Nombre del cliente',
  estimatedAmount: 'Importe estimado',
  materials: 'Materiales necesarios',
  customerAcceptance: 'Estado de aceptación',
  paymentStatus: 'Estado de pago',
  address: 'Dirección',
  internalNotes: 'Notas internas'
};

const COLOR_LABELS: Record<keyof ColorScheme, string> = {
  critical: 'Crítico',
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja'
};

const CONCEPT_TYPE_LABELS: Record<string, string> = {
  appointment: 'Cita',
  quote: 'Cotización',
  visit: 'Visita',
  consultation: 'Consulta',
  follow_up: 'Seguimiento',
  manual: 'Manual'
};

export function CalendarSettings({ isOpen, onClose, onConceptCreated, onViewLoaded }: CalendarSettingsProps) {
  const {
    settings,
    updateVisibleFields,
    updateColorScheme,
    saveView,
    loadView,
    deleteView,
    clearAllFilters,
    resetToDefaults,
    getActiveView,
    hasUnsavedChanges,
    clearError
  } = useCalendarSettings();

  const [newViewName, setNewViewName] = useState('');
  const [activeTab, setActiveTab] = useState<'fields' | 'colors' | 'views' | 'concepts'>('fields');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [newConcept, setNewConcept] = useState({
    concept_type: 'appointment' as const,
    title: '',
    description: '',
    duration_minutes: 60,
    customer_id: '',
    estimated_amount: 0,
    priority: 'medium' as const,
    notes: ''
  });

  useEffect(() => {
    if (isOpen && activeTab === 'concepts') {
      loadCustomers();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (isOpen) {
      clearError();
    }
  }, [isOpen, clearError]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const handleCreateConcept = async () => {
    if (!newConcept.title.trim()) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('calendar_concepts')
        .insert([
          {
            ...newConcept,
            customer_id: newConcept.customer_id || null,
            created_by: session.user.id
          }
        ]);

      if (error) throw error;

      setNewConcept({
        concept_type: 'appointment',
        title: '',
        description: '',
        duration_minutes: 60,
        customer_id: '',
        estimated_amount: 0,
        priority: 'medium',
        notes: ''
      });

      showNotification('success', 'Concepto creado exitosamente');
      onConceptCreated?.();
    } catch (error) {
      console.error('Error creating concept:', error);
      showNotification('error', 'Error al crear el concepto');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldToggle = (field: keyof VisibleFields) => {
    updateVisibleFields({
      [field]: !settings.visibleFields[field]
    });
  };

  const handleColorChange = (priority: keyof ColorScheme, color: string) => {
    updateColorScheme({
      [priority]: color
    });
  };

  const handleSaveView = async () => {
    if (!newViewName.trim()) {
      showNotification('error', 'Ingresa un nombre para la vista');
      return;
    }

    // Verificar si ya existe una vista con ese nombre
    const existingView = settings.savedViews.find(v =>
      v.name.toLowerCase() === newViewName.trim().toLowerCase()
    );

    if (existingView) {
      showNotification('error', 'Ya existe una vista con ese nombre');
      return;
    }

    setLoading(true);
    try {
      const result = await saveView(newViewName.trim());
      if (result) {
        setNewViewName('');
        showNotification('success', `Vista "${result.name}" guardada correctamente`);
      } else {
        showNotification('error', 'Error al guardar la vista');
      }
    } catch (error) {
      showNotification('error', 'Error al guardar la vista');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadView = async (viewId: string) => {
    setLoading(true);
    try {
      const result = await loadView(viewId);
      if (result?.success) {
        showNotification('success', result.message);
        onViewLoaded?.(result.view.name);
        // Cerrar el modal para que el calendario se refresque con los nuevos settings
        setTimeout(() => onClose(), 500);
      } else {
        showNotification('error', result?.error || 'Error al cargar la vista');
      }
    } catch (error) {
      showNotification('error', 'Error al cargar la vista');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteView = async (viewId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta vista?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await deleteView(viewId);
      if (result?.success) {
        showNotification('success', result.message);
      } else {
        showNotification('error', result?.error || 'Error al eliminar la vista');
      }
    } catch (error) {
      showNotification('error', 'Error al eliminar la vista');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefaults = async () => {
    setLoading(true);
    try {
      const result = await resetToDefaults();
      if (result?.success) {
        showNotification('success', result.message);
        setShowDeleteConfirm(false);
      } else {
        showNotification('error', result?.error || 'Error al restaurar configuración');
      }
    } catch (error) {
      showNotification('error', 'Error al restaurar configuración');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const activeView = getActiveView();
  const hasChanges = hasUnsavedChanges();

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[90]" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 bg-white w-full max-w-md shadow-2xl z-[95] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Configuración del Calendario</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Notification Bar */}
        {notification && (
          <div className={`mx-6 mt-4 p-3 rounded-lg border-l-4 flex items-center gap-3 ${notification.type === 'success'
              ? 'bg-green-50 border-green-500 text-green-800'
              : notification.type === 'error'
                ? 'bg-red-50 border-red-500 text-red-800'
                : 'bg-blue-50 border-blue-500 text-blue-800'
            }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="ml-auto hover:bg-black/10 rounded p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Active View Indicator */}
        {activeView && (
          <div className="mx-6 mt-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-900">Vista Activa:</span>
              <span className="text-sm text-purple-800 font-medium">{activeView.name}</span>
            </div>
            {hasChanges && (
              <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">
                <AlertCircle className="w-3 h-3" />
                Tienes cambios sin guardar
              </div>
            )}
          </div>
        )}

        <div className="p-6 space-y-6">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('fields')}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${activeTab === 'fields'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Eye className="w-3 h-3" />
              Campos
            </button>
            <button
              onClick={() => setActiveTab('colors')}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${activeTab === 'colors'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Palette className="w-3 h-3" />
              Colores
            </button>
            <button
              onClick={() => setActiveTab('views')}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${activeTab === 'views'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <BookOpen className="w-3 h-3" />
              Vistas
            </button>
            <button
              onClick={() => setActiveTab('concepts')}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${activeTab === 'concepts'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Calendar className="w-3 h-3" />
              Conceptos
            </button>
          </div>

          {activeTab === 'fields' && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800 font-medium">Campos visibles en eventos</p>
                <p className="text-xs text-blue-600 mt-1">
                  Selecciona qué información mostrar en las tarjetas de eventos del calendario.
                </p>
              </div>

              {(Object.keys(settings.visibleFields) as Array<keyof VisibleFields>).map(field => (
                <label key={field} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settings.visibleFields[field]}
                      onChange={() => handleFieldToggle(field)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    {settings.visibleFields[field] && (
                      <Check className="w-3 h-3 text-white absolute top-0.5 left-0.5 pointer-events-none" />
                    )}
                  </div>
                  <span className="text-sm text-gray-700 flex-1 group-hover:text-gray-900">
                    {FIELD_LABELS[field]}
                  </span>
                </label>
              ))}
            </div>
          )}

          {activeTab === 'colors' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-purple-800 font-medium">Esquema de colores</p>
                <p className="text-xs text-purple-600 mt-1">
                  Personaliza los colores para cada nivel de prioridad de los eventos.
                </p>
              </div>

              {(Object.keys(settings.colorScheme) as Array<keyof ColorScheme>).map(priority => (
                <div key={priority} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">{COLOR_LABELS[priority]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full border-2 border-gray-300"
                      style={{ backgroundColor: settings.colorScheme[priority] }}
                    />
                    <input
                      type="color"
                      value={settings.colorScheme[priority]}
                      onChange={(e) => handleColorChange(priority, e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-300 opacity-0 absolute"
                    />
                    <span className="text-xs text-gray-600 font-mono min-w-[70px]">
                      {settings.colorScheme[priority]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'views' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-800 font-medium">Gestión de Vistas</p>
                <p className="text-xs text-green-600 mt-1">
                  Las vistas guardan tu configuración actual de filtros, campos visibles y colores para cargar rápidamente después.
                </p>
              </div>

              {/* Guardar nueva vista */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Guardar configuración actual como vista:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    placeholder="Nombre de la vista"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveView();
                      }
                    }}
                    maxLength={50}
                  />
                  <button
                    onClick={handleSaveView}
                    disabled={!newViewName.trim() || loading}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>

              {/* Lista de vistas guardadas */}
              {settings.savedViews.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Vistas guardadas ({settings.savedViews.length}):
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {settings.savedViews
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(view => (
                        <div
                          key={view.id}
                          className={`flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-all ${activeView?.id === view.id
                              ? 'border-purple-300 bg-purple-50'
                              : 'border-gray-200'
                            }`}
                        >
                          <button
                            onClick={() => handleLoadView(view.id)}
                            disabled={loading}
                            className="flex-1 text-left text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors disabled:opacity-50"
                          >
                            <div className="flex items-center gap-2">
                              {activeView?.id === view.id && (
                                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                              )}
                              <span>{view.name}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Creada: {new Date(view.createdAt).toLocaleDateString('es-ES')}
                            </div>
                          </button>
                          <button
                            onClick={() => handleDeleteView(view.id)}
                            disabled={loading}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors disabled:opacity-50"
                            title="Eliminar vista"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {settings.savedViews.length === 0 && (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No tienes vistas guardadas aún</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Configura filtros y campos, luego guarda como una nueva vista
                  </p>
                </div>
              )}

              <button
                onClick={() => clearAllFilters()}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Limpiar todos los filtros
              </button>
            </div>
          )}

          {activeTab === 'concepts' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-900 font-medium">Crear Nuevo Concepto</p>
                </div>
                <p className="text-xs text-green-800">
                  Los conceptos creados aparecerán en el panel izquierdo del calendario para arrastrar y programar.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Tipo de Concepto</label>
                  <select
                    value={newConcept.concept_type}
                    onChange={(e) => setNewConcept({ ...newConcept, concept_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(CONCEPT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newConcept.title}
                    onChange={(e) => setNewConcept({ ...newConcept, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Revisión de alarma"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Cliente (opcional)</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Buscar cliente..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mb-2"
                    />
                  </div>
                  <select
                    value={newConcept.customer_id}
                    onChange={(e) => setNewConcept({ ...newConcept, customer_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin cliente asignado</option>
                    {filteredCustomers.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Duración (min)</label>
                    <input
                      type="number"
                      value={newConcept.duration_minutes}
                      onChange={(e) => setNewConcept({ ...newConcept, duration_minutes: parseInt(e.target.value) || 60 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      min="15"
                      step="15"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Importe Est. ($)</label>
                    <input
                      type="number"
                      value={newConcept.estimated_amount}
                      onChange={(e) => setNewConcept({ ...newConcept, estimated_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Prioridad</label>
                  <select
                    value={newConcept.priority}
                    onChange={(e) => setNewConcept({ ...newConcept, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                    <option value="critical">Crítico</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Descripción</label>
                  <textarea
                    value={newConcept.description}
                    onChange={(e) => setNewConcept({ ...newConcept, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                    placeholder="Descripción del concepto..."
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Notas internas</label>
                  <textarea
                    value={newConcept.notes}
                    onChange={(e) => setNewConcept({ ...newConcept, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                    placeholder="Notas adicionales..."
                  />
                </div>

                <button
                  onClick={handleCreateConcept}
                  disabled={!newConcept.title.trim() || saving}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  {saving ? 'Guardando...' : 'Crear Concepto'}
                </button>
              </div>
            </div>
          )}

          {activeTab !== 'concepts' && (
            <div className="border-t border-gray-200 pt-6">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {loading ? 'Procesando...' : 'Restaurar valores por defecto'}
              </button>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Restaurar valores por defecto</h3>
              <p className="text-gray-600 text-sm mb-6">
                Esto restaurará la configuración de campos visibles, filtros y colores a los valores por defecto.
                Las vistas guardadas no se eliminarán.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleResetToDefaults}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? 'Restaurando...' : 'Restaurar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
import { useState, useEffect } from 'react';
import { Plus, X, Calendar, DollarSign, User, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ConceptCard } from './ConceptCard';

export interface CalendarConcept {
  id: string;
  concept_type: 'appointment' | 'quote' | 'visit' | 'consultation' | 'follow_up';
  title: string;
  description?: string;
  duration_minutes: number;
  customer_id?: string;
  customer_name?: string;
  assigned_to?: string;
  assigned_name?: string;
  estimated_amount: number;
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
  notes?: string;
  is_scheduled: boolean;
  scheduled_date?: string;
  created_at: string;
}

interface ConceptsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onConceptDragStart: (concept: CalendarConcept) => void;
}

const CONCEPT_TYPE_LABELS: Record<string, string> = {
  appointment: 'Cita',
  quote: 'Cotización',
  visit: 'Visita',
  consultation: 'Consulta',
  follow_up: 'Seguimiento'
};

export function ConceptsManager({ isOpen, onClose, onConceptDragStart }: ConceptsManagerProps) {
  const [concepts, setConcepts] = useState<CalendarConcept[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);

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
    if (isOpen) {
      loadConcepts();
      loadCustomers();
    }
  }, [isOpen]);

  const loadConcepts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_concepts')
        .select(`
          *,
          customers (name)
        `)
        .eq('is_scheduled', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedConcepts = data?.map(concept => ({
        ...concept,
        customer_name: concept.customers?.name
      })) || [];

      setConcepts(formattedConcepts);
    } catch (error) {
      console.error('Error loading concepts:', error);
    } finally {
      setLoading(false);
    }
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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('calendar_concepts')
        .insert([
          {
            ...newConcept,
            customer_id: newConcept.customer_id || null,
            created_by: session.user.id
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setShowNewForm(false);
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

      await loadConcepts();
    } catch (error) {
      console.error('Error creating concept:', error);
    }
  };

  const handleDeleteConcept = async (conceptId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_concepts')
        .delete()
        .eq('id', conceptId);

      if (error) throw error;
      await loadConcepts();
    } catch (error) {
      console.error('Error deleting concept:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[85]" onClick={onClose} />

      <div className="fixed left-0 top-0 bottom-0 bg-white w-full max-w-md shadow-2xl z-[90] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Conceptos</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">Cómo usar:</p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Crea conceptos (citas, cotizaciones, visitas)</li>
              <li>• Arrástralos al calendario para programarlos</li>
              <li>• Se crearán automáticamente en la fecha seleccionada</li>
            </ul>
          </div>

          <button
            onClick={() => setShowNewForm(true)}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo Concepto
          </button>

          {showNewForm && (
            <div className="bg-gray-50 rounded-xl border-2 border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Crear Concepto</h3>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Tipo</label>
                <select
                  value={newConcept.concept_type}
                  onChange={(e) => setNewConcept({ ...newConcept, concept_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                >
                  {Object.entries(CONCEPT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Título</label>
                <input
                  type="text"
                  value={newConcept.title}
                  onChange={(e) => setNewConcept({ ...newConcept, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  placeholder="Título del concepto"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Cliente (opcional)</label>
                <select
                  value={newConcept.customer_id}
                  onChange={(e) => setNewConcept({ ...newConcept, customer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Sin cliente</option>
                  {customers.map(customer => (
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
                    onChange={(e) => setNewConcept({ ...newConcept, duration_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    min="15"
                    step="15"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Importe est.</label>
                  <input
                    type="number"
                    value={newConcept.estimated_amount}
                    onChange={(e) => setNewConcept({ ...newConcept, estimated_amount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 resize-none"
                  rows={2}
                  placeholder="Descripción opcional"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowNewForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateConcept}
                  disabled={!newConcept.title}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Crear
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">
              Conceptos sin programar ({concepts.length})
            </p>

            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              </div>
            ) : concepts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No hay conceptos sin programar
              </div>
            ) : (
              concepts.map(concept => (
                <ConceptCard
                  key={concept.id}
                  concept={concept}
                  onDragStart={onConceptDragStart}
                  onDelete={handleDeleteConcept}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

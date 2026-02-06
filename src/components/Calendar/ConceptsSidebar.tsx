import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { GripVertical, Clock, User, DollarSign, Trash2, ChevronLeft, ChevronRight, Calendar, CheckCircle2 } from 'lucide-react';

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

interface ConceptsSidebarProps {
  onConceptDragStart: (concept: CalendarConcept) => void;
  refreshTrigger?: number;
}

const CONCEPT_TYPE_LABELS: Record<string, string> = {
  appointment: 'Cita',
  quote: 'Cotización',
  visit: 'Visita',
  consultation: 'Consulta',
  follow_up: 'Seguimiento'
};

const CONCEPT_TYPE_COLORS: Record<string, string> = {
  appointment: 'bg-blue-100 text-blue-800 border-blue-200',
  quote: 'bg-green-100 text-green-800 border-green-200',
  visit: 'bg-purple-100 text-purple-800 border-purple-200',
  consultation: 'bg-orange-100 text-orange-800 border-orange-200',
  follow_up: 'bg-teal-100 text-teal-800 border-teal-200'
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'border-l-gray-400',
  medium: 'border-l-blue-500',
  high: 'border-l-orange-500',
  urgent: 'border-l-red-500',
  critical: 'border-l-red-700'
};

export function ConceptsSidebar({ onConceptDragStart, refreshTrigger }: ConceptsSidebarProps) {
  const [concepts, setConcepts] = useState<CalendarConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    loadConcepts();
  }, [refreshTrigger]);

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
        .order('priority', { ascending: false })
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

  const handleDeleteConcept = async (conceptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este concepto?')) return;

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

  const handleDragStart = (e: React.DragEvent, concept: CalendarConcept) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('concept', JSON.stringify(concept));

    const dragImage = document.createElement('div');
    dragImage.className = 'bg-green-100 border border-green-300 rounded-lg px-3 py-2 text-sm font-medium text-green-800 shadow-lg';
    dragImage.textContent = concept.title;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);

    setTimeout(() => document.body.removeChild(dragImage), 0);

    onConceptDragStart(concept);
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-gradient-to-b from-green-50 to-teal-50 border-r border-gray-200 flex flex-col items-center py-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          title="Expandir conceptos"
        >
          <ChevronRight className="w-5 h-5 text-green-600" />
        </button>
        <div className="mt-4 writing-vertical-lr rotate-180 text-xs font-medium text-green-700">
          Conceptos ({concepts.length})
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-gradient-to-b from-green-50 to-teal-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">Conceptos</h3>
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            {concepts.length}
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="Colapsar panel"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="p-3 bg-blue-50 border-b border-blue-100">
        <p className="text-xs text-blue-700">
          Arrastra los conceptos al calendario para programarlos
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : concepts.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-1">No hay conceptos pendientes</p>
            <p className="text-xs text-gray-400">
              Crea conceptos desde Configuración para programarlos
            </p>
          </div>
        ) : (
          concepts.map(concept => (
            <div
              key={concept.id}
              draggable
              onDragStart={(e) => handleDragStart(e, concept)}
              className={`bg-white rounded-lg border-2 border-l-4 ${PRIORITY_COLORS[concept.priority]} shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all group`}
            >
              <div className="p-3">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${CONCEPT_TYPE_COLORS[concept.concept_type]}`}>
                          {CONCEPT_TYPE_LABELS[concept.concept_type]}
                        </span>
                        {concept.is_scheduled && concept.scheduled_date && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            {new Date(concept.scheduled_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleDeleteConcept(concept.id, e)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-500 rounded transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="font-medium text-gray-900 text-sm truncate mb-2">
                      {concept.title}
                    </p>

                    <div className="space-y-1">
                      {concept.customer_name && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate">{concept.customer_name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{concept.duration_minutes} min</span>
                        </div>

                        {concept.estimated_amount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>${concept.estimated_amount.toFixed(0)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {concept.description && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {concept.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

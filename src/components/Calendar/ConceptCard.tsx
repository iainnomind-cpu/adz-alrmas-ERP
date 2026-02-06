import { GripVertical, User, Clock, DollarSign, Trash2, AlertCircle } from 'lucide-react';
import type { CalendarConcept } from './ConceptsManager';

interface ConceptCardProps {
  concept: CalendarConcept;
  onDragStart: (concept: CalendarConcept) => void;
  onDelete: (conceptId: string) => void;
}

const CONCEPT_TYPE_LABELS: Record<string, string> = {
  appointment: 'Cita',
  quote: 'Cotización',
  visit: 'Visita',
  consultation: 'Consulta',
  follow_up: 'Seguimiento'
};

const CONCEPT_TYPE_COLORS: Record<string, string> = {
  appointment: 'bg-blue-100 text-blue-800 border-blue-300',
  quote: 'bg-green-100 text-green-800 border-green-300',
  visit: 'bg-purple-100 text-purple-800 border-purple-300',
  consultation: 'bg-orange-100 text-orange-800 border-orange-300',
  follow_up: 'bg-teal-100 text-teal-800 border-teal-300'
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-yellow-100 text-yellow-700',
  urgent: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700'
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
  critical: 'Crítico'
};

export function ConceptCard({ concept, onDragStart, onDelete }: ConceptCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('concept', JSON.stringify(concept));
    onDragStart(concept);

    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.8';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="bg-white border-2 border-gray-200 rounded-lg p-3 hover:border-green-400 hover:shadow-lg transition-all cursor-move group"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0 group-hover:text-green-600 transition-colors" />

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${CONCEPT_TYPE_COLORS[concept.concept_type]}`}>
                  {CONCEPT_TYPE_LABELS[concept.concept_type]}
                </span>
                {concept.priority !== 'medium' && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[concept.priority]}`}>
                    {PRIORITY_LABELS[concept.priority]}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 text-sm truncate">
                {concept.title}
              </h3>
              {concept.description && (
                <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                  {concept.description}
                </p>
              )}
            </div>

            <button
              onClick={() => onDelete(concept.id)}
              className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors flex-shrink-0"
              title="Eliminar concepto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
            {concept.customer_name && (
              <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                <User className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{concept.customer_name}</span>
              </div>
            )}

            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
              <Clock className="w-3 h-3" />
              <span>{concept.duration_minutes} min</span>
            </div>

            {concept.estimated_amount > 0 && (
              <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded">
                <DollarSign className="w-3 h-3" />
                <span>${concept.estimated_amount.toFixed(2)}</span>
              </div>
            )}
          </div>

          {concept.notes && (
            <div className="flex items-start gap-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              <AlertCircle className="w-3 h-3 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 line-clamp-2">{concept.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

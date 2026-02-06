import { useState } from 'react';
import { X, AlertTriangle, Zap, CheckCircle2, Clock, User } from 'lucide-react';
import type { CalendarEvent } from '../../types/calendar.types';

interface CriticalPriorityModalProps {
  criticalEvent: CalendarEvent;
  suggestedEvents: CalendarEvent[];
  availableTechs: Array<{ id: string; name: string; count: number }>;
  onClose: () => void;
  onApply: (eventsToMove: CalendarEvent[], targetTechId?: string) => Promise<void>;
}

export function CriticalPriorityModal({
  criticalEvent,
  suggestedEvents,
  availableTechs,
  onClose,
  onApply
}: CriticalPriorityModalProps) {
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [targetTechId, setTargetTechId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const toggleEvent = (eventId: string) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEvents(newSelected);
  };

  const handleApply = async () => {
    const eventsToMove = suggestedEvents.filter(e => selectedEvents.has(e.id));

    setLoading(true);
    try {
      await onApply(eventsToMove, targetTechId);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const selectedEventsToMove = suggestedEvents.filter(e => selectedEvents.has(e.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[85] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-4 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Evento Crítico Detectado</h3>
              <p className="text-red-100 text-sm">Sistema de asignación inteligente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-red-900">{criticalEvent.title}</p>
                <p className="text-sm text-red-800 mt-1">{criticalEvent.description}</p>
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-1 text-red-700">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(criticalEvent.start).toLocaleDateString('es-ES')}</span>
                  </div>
                  {criticalEvent.technicianName && (
                    <div className="flex items-center gap-1 text-red-700">
                      <User className="w-4 h-4" />
                      <span>{criticalEvent.technicianName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Eventos que pueden reprogramarse ({suggestedEvents.length}):
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto bg-gray-50 rounded-lg p-3">
              {suggestedEvents.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No hay eventos que puedan reprogramarse</p>
              ) : (
                suggestedEvents.map((event) => (
                  <label
                    key={event.id}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-white transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.has(event.id)}
                      onChange={() => toggleEvent(event.id)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{event.title}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                        <div className={`${event.color} w-2 h-2 rounded-full`} />
                        <span className="font-semibold">
                          {event.priority === 'critical' ? 'Crítico' :
                           event.priority === 'urgent' ? 'Urgente' :
                           event.priority === 'high' ? 'Alta' :
                           event.priority === 'medium' ? 'Media' : 'Baja'}
                        </span>
                        <span>•</span>
                        <span>{new Date(event.start).toLocaleDateString('es-ES')}</span>
                        {event.technicianName && (
                          <>
                            <span>•</span>
                            <span>{event.technicianName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {selectedEventsToMove.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                Reasignar a técnico ({selectedEventsToMove.length} eventos):
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableTechs.map((tech) => (
                  <label
                    key={tech.id}
                    className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      targetTechId === tech.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="technician"
                      value={tech.id}
                      checked={targetTechId === tech.id}
                      onChange={(e) => setTargetTechId(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{tech.name}</p>
                      <p className="text-xs text-gray-600">{tech.count} evento(s) ese día</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Validaciones que se aplicarán:</p>
                <ul className="space-y-1 text-xs">
                  <li>✓ Verificar disponibilidad de técnicos</li>
                  <li>✓ No exceder carga de trabajo diaria</li>
                  <li>✓ Respetar distancia entre servicios</li>
                  <li>✓ Registrar cambios en auditoría</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={loading || selectedEventsToMove.length === 0 || !targetTechId}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Procesando...' : 'Aplicar Reasignación'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { X, Clock, Users, Calendar, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { CalendarEvent } from '../../types/calendar.types';

interface BulkRescheduleProps {
  selectedEvents: CalendarEvent[];
  onClose: () => void;
  onApply: (newDate: Date, timeOffset: number) => Promise<void>;
}

export function BulkReschedule({ selectedEvents, onClose, onApply }: BulkRescheduleProps) {
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeOffset, setTimeOffset] = useState(0);
  const [selectedMode, setSelectedMode] = useState<'same-time' | 'by-technician' | 'distribute'>('same-time');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const technicianGroups = selectedEvents.reduce((acc, event) => {
    const techId = event.technicianId || 'unassigned';
    if (!acc[techId]) {
      acc[techId] = [];
    }
    acc[techId].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  const handleApply = async () => {
    if (!newDate) {
      setError('Selecciona una fecha');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const date = new Date(newDate);
      await onApply(date, timeOffset);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aplicar cambios');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[80] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Reagendar Eventos</h3>
              <p className="text-blue-100 text-sm">{selectedEvents.length} eventos seleccionados</p>
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
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Eventos Seleccionados:</p>
            <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
              {selectedEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 pb-2 border-b border-gray-200 last:border-b-0">
                  <div className={`${event.color} w-3 h-3 rounded-full mt-1.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{event.title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(event.start).toLocaleDateString('es-ES')}</span>
                      {event.technicianName && (
                        <>
                          <span>•</span>
                          <span>{event.technicianName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">Modo de Reagendamiento:</p>

            <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 cursor-pointer transition-colors">
              <input
                type="radio"
                name="mode"
                value="same-time"
                checked={selectedMode === 'same-time'}
                onChange={(e) => setSelectedMode(e.target.value as 'same-time')}
                className="mt-1 w-4 h-4 text-blue-600"
              />
              <div>
                <p className="font-medium text-gray-900">Misma Hora</p>
                <p className="text-sm text-gray-600">Todos los eventos se mueven a la misma fecha y hora</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 cursor-pointer transition-colors">
              <input
                type="radio"
                name="mode"
                value="by-technician"
                checked={selectedMode === 'by-technician'}
                onChange={(e) => setSelectedMode(e.target.value as 'by-technician')}
                className="mt-1 w-4 h-4 text-blue-600"
              />
              <div>
                <p className="font-medium text-gray-900">Por Técnico</p>
                <p className="text-sm text-gray-600">Agrupa eventos por técnico respetando su horario</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 cursor-pointer transition-colors">
              <input
                type="radio"
                name="mode"
                value="distribute"
                checked={selectedMode === 'distribute'}
                onChange={(e) => setSelectedMode(e.target.value as 'distribute')}
                className="mt-1 w-4 h-4 text-blue-600"
              />
              <div>
                <p className="font-medium text-gray-900">Distribuir Equitativamente</p>
                <p className="text-sm text-gray-600">Distribuye eventos entre técnicos y días siguientes</p>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Nueva Fecha
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={today}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {selectedMode === 'same-time' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Offset de Horas
                </label>
                <input
                  type="number"
                  value={timeOffset}
                  onChange={(e) => setTimeOffset(parseInt(e.target.value))}
                  min="-23"
                  max="23"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: 2 (para mover 2 horas después)"
                />
              </div>
            )}
          </div>

          {selectedMode === 'by-technician' && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Eventos por Técnico:</p>
              <div className="space-y-2">
                {Object.entries(technicianGroups).map(([techId, events]) => (
                  <div key={techId} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    <Users className="w-4 h-4 text-gray-600" />
                    <span className="font-medium">{events[0].technicianName || 'Sin Asignar'}:</span>
                    <span className="text-gray-600">{events.length} evento(s)</span>
                  </div>
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
                  <li>✓ Horarios disponibles de técnicos</li>
                  <li>✓ No sobrecargar un solo día</li>
                  <li>✓ Respetar distancia entre servicios</li>
                  <li>✓ Crear registro de cambios en auditoría</li>
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
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Aplicando...
              </>
            ) : (
              'Aplicar Cambios'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

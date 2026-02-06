import { X, Clock, User, AlertCircle, Calendar, Repeat, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';
import type { CalendarEvent } from '../../types/calendar.types';

interface EventDetailModalProps {
  event: CalendarEvent;
  onClose: () => void;
  onDelete?: (event: CalendarEvent) => void;
}

export function EventDetailModal({ event, onClose, onDelete }: EventDetailModalProps) {
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical': return 'Crítico';
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'requested': return 'Solicitado';
      case 'assigned': return 'Asignado';
      case 'in_progress': return 'En Progreso';
      case 'paused': return 'Pausado';
      case 'completed': return 'Completado';
      case 'paid': return 'Pagado';
      case 'invoiced': return 'Facturado';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'urgent': return 'bg-orange-100 text-orange-800';
      case 'high': return 'bg-yellow-100 text-yellow-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto animate-slide-up sm:animate-scale-in">
        <div
          className="px-6 py-4 rounded-t-3xl sm:rounded-t-2xl flex items-center justify-between sticky top-0 z-10"
          style={{ backgroundColor: event.color }}
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {event.description && (
            <div>
              <p className="text-sm text-gray-600 mb-1 font-medium">Descripción</p>
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
                {event.start.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
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
                <Repeat className="w-4 h-4" />
                Recurrente
              </span>
            )}
            {event.isModifiedFromSeries && (
              <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-orange-100 text-orange-800 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Modificado
              </span>
            )}
          </div>

          {((event.rescheduleCount && event.rescheduleCount > 0) || (event.daysOverdue && event.daysOverdue > 0)) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="space-y-2">
                {event.rescheduleCount && event.rescheduleCount > 0 && (
                  <div className="flex items-center gap-2 text-amber-800">
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Reprogramado {event.rescheduleCount} {event.rescheduleCount === 1 ? 'vez' : 'veces'}
                    </span>
                  </div>
                )}
                {event.daysOverdue && event.daysOverdue > 0 && (
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {event.daysOverdue} {event.daysOverdue === 1 ? 'día' : 'días'} de retraso
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {event.originalScheduledDate && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-sm text-purple-800 font-medium mb-1">Fecha Original</p>
              <p className="text-purple-900">
                {event.originalScheduledDate.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <div className="flex gap-3">
            {onDelete && (
              <button
                onClick={() => onDelete(event)}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Eliminar
              </button>
            )}
            <button
              onClick={onClose}
              className={`${onDelete ? 'flex-1' : 'w-full'} px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium`}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

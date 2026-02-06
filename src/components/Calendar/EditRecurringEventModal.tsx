import { useState } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import type { CalendarEvent } from '../../types/calendar.types';

interface EditRecurringEventModalProps {
  event: CalendarEvent;
  newDate: Date;
  onClose: () => void;
  onConfirm: (option: 'single' | 'future' | 'all') => void;
}

export function EditRecurringEventModal({ event, newDate, onClose, onConfirm }: EditRecurringEventModalProps) {
  const [selectedOption, setSelectedOption] = useState<'single' | 'future' | 'all'>('single');

  const handleConfirm = () => {
    onConfirm(selectedOption);
    onClose();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-scale-in">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">Editar Evento Recurrente</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Estás moviendo un evento recurrente
                </p>
                <p className="text-sm text-gray-700 mb-3">
                  <span className="font-semibold">{event.title}</span>
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Fecha original:</span>
                    <p className="font-semibold text-gray-900">{formatDate(event.start)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Nueva fecha:</span>
                    <p className="font-semibold text-blue-600">{formatDate(newDate)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900 mb-3">
              ¿Qué deseas modificar?
            </p>

            <label
              className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                selectedOption === 'single'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="editOption"
                value="single"
                checked={selectedOption === 'single'}
                onChange={(e) => setSelectedOption(e.target.value as 'single')}
                className="mt-1 w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-1">Solo esta ocurrencia</p>
                <p className="text-sm text-gray-600">
                  Se creará una orden de servicio individual para esta fecha. El resto de la serie no se verá afectado.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                selectedOption === 'future'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="editOption"
                value="future"
                checked={selectedOption === 'future'}
                onChange={(e) => setSelectedOption(e.target.value as 'future')}
                className="mt-1 w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-1">Esta y futuras ocurrencias</p>
                <p className="text-sm text-gray-600">
                  Se actualizará la fecha base de la programación recurrente. Todas las ocurrencias futuras se ajustarán automáticamente.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                selectedOption === 'all'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="editOption"
                value="all"
                checked={selectedOption === 'all'}
                onChange={(e) => setSelectedOption(e.target.value as 'all')}
                className="mt-1 w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-1">Toda la serie</p>
                <p className="text-sm text-gray-600">
                  Se cambiará la fecha base de toda la programación recurrente, incluyendo eventos pasados y futuros.
                </p>
              </div>
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Aplicar cambio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

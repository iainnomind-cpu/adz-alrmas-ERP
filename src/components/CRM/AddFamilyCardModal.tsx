import { useState } from 'react';
import { X } from 'lucide-react';
import { relationshipOptions } from '../../utils/cardHelpers';

interface AddFamilyCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, relationship: string) => Promise<void>;
}

export function AddFamilyCardModal({ isOpen, onClose, onSubmit }: AddFamilyCardModalProps) {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('spouse');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(name.trim(), relationship);
      setName('');
      setRelationship('spouse');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar la tarjeta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setRelationship('spouse');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Agregar Tarjeta Familiar
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="familyName" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Familiar *
            </label>
            <input
              id="familyName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="Ej: María López"
              required
            />
          </div>

          <div>
            <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-2">
              Relación
            </label>
            <select
              id="relationship"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              {relationshipOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Generando...' : 'Generar Tarjeta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

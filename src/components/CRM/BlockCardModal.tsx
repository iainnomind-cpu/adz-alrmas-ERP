import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { DigitalCard } from '../../lib/supabase';

interface BlockCardModalProps {
  isOpen: boolean;
  card: DigitalCard | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function BlockCardModal({ isOpen, card, onClose, onConfirm }: BlockCardModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !card) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!reason.trim()) {
      setError('Debe proporcionar un motivo de bloqueo');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al bloquear la tarjeta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Bloquear Tarjeta
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="text-sm text-gray-600">
              <strong>Tarjeta:</strong> {card.card_number}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Titular:</strong> {card.cardholder_name}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Tipo:</strong> {card.card_type === 'titular' ? 'Titular' : 'Familiar'}
            </div>
          </div>

          <div>
            <label htmlFor="blockReason" className="block text-sm font-medium text-gray-700 mb-2">
              Motivo del Bloqueo *
            </label>
            <textarea
              id="blockReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 resize-none"
              placeholder="Ej: Tarjeta extraviada, uso no autorizado, etc."
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Esta acción bloqueará la tarjeta inmediatamente. Podrá reactivarla más tarde si lo desea.
            </p>
          </div>

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
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Bloqueando...' : 'Bloquear Tarjeta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

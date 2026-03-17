import { useState, useEffect } from 'react';
import { X, CreditCard } from 'lucide-react';

interface AddTitularCardModalProps {
  isOpen: boolean;
  suggestedNumber: string;
  onClose: () => void;
  onSubmit: (cardNumber: string) => Promise<void>;
}

export function AddTitularCardModal({ isOpen, suggestedNumber, onClose, onSubmit }: AddTitularCardModalProps) {
  const [cardNumber, setCardNumber] = useState(suggestedNumber);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sincronizar el número sugerido cuando el modal se abre
  useEffect(() => {
    if (isOpen) {
      setCardNumber(suggestedNumber);
      setError('');
    }
  }, [isOpen, suggestedNumber]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cardNumber.trim()) {
      setError('El número de tarjeta es requerido');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(cardNumber.trim().toUpperCase());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar la tarjeta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b bg-blue-50">
          <div className="flex items-center gap-2 text-blue-800">
            <CreditCard className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Generar Tarjeta Titular</h2>
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
          <p className="text-sm text-gray-600 mb-4">
            Confirma o edita el número de cuenta/tarjeta que deseas asignar. Puedes usar prefijos alfanuméricos como <strong>TD-0010</strong> o <strong>IP-001</strong>.
          </p>

          <div>
            <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Número de Tarjeta/Cuenta *
            </label>
            <input
              id="cardNumber"
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value.toUpperCase())}
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 uppercase"
              placeholder="Ej: CARD-12345-001"
              required
            />
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

import { useState, useEffect } from 'react';
import { CreditCard, Plus, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase, DigitalCard as DigitalCardType, CardUsage } from '../../lib/supabase';
import { DigitalCard } from './DigitalCard';
import { AddFamilyCardModal } from './AddFamilyCardModal';
import { BlockCardModal } from './BlockCardModal';
import { generateCardNumber, createQRCodeData } from '../../utils/cardHelpers';

interface DigitalCardsManagerProps {
  customerId: string;
  customerName: string;
  accountNumber: number;
  onUpdate?: () => void;
}

export function DigitalCardsManager({
  customerId,
  customerName,
  accountNumber,
  onUpdate,
}: DigitalCardsManagerProps) {
  const [cards, setCards] = useState<DigitalCardType[]>([]);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [cardToBlock, setCardToBlock] = useState<DigitalCardType | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadCards();
  }, [customerId]);

  const loadCards = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { data: cardsData, error: cardsError } = await supabase
        .from('customer_digital_cards')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true });

      if (cardsError) throw cardsError;

      setCards(cardsData || []);

      if (cardsData && cardsData.length > 0) {
        const cardIds = cardsData.map((card) => card.id);
        const { data: usageData, error: usageError } = await supabase
          .from('digital_card_usage')
          .select('card_id')
          .in('card_id', cardIds);

        if (usageError) throw usageError;

        const counts: Record<string, number> = {};
        (usageData || []).forEach((usage: CardUsage) => {
          counts[usage.card_id] = (counts[usage.card_id] || 0) + 1;
        });
        setUsageCounts(counts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las tarjetas');
    } finally {
      setIsLoading(false);
    }
  };

  const hasTitularCard = cards.some((card) => card.card_type === 'titular');

  const generateTitularCard = async () => {
    setError('');
    setSuccessMessage('');

    try {
      const sequence = cards.length + 1;
      const cardNumber = generateCardNumber(accountNumber, sequence);
      const qrCodeData = createQRCodeData(
        cardNumber,
        customerId,
        accountNumber,
        'titular',
        customerName,
        true
      );

      const { error: insertError } = await supabase
        .from('customer_digital_cards')
        .insert({
          customer_id: customerId,
          customer_name: customerName,
          account_number: accountNumber,
          card_number: cardNumber,
          card_type: 'titular',
          cardholder_name: customerName,
          qr_code_data: qrCodeData,
          is_active: true,
        });

      if (insertError) throw insertError;

      setSuccessMessage('Tarjeta titular generada exitosamente');
      await loadCards();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar la tarjeta');
    }
  };

  const handleAddFamilyCard = async (name: string, relationship: string) => {
    const sequence = cards.length + 1;
    const cardNumber = generateCardNumber(accountNumber, sequence);
    const qrCodeData = createQRCodeData(
      cardNumber,
      customerId,
      accountNumber,
      'familiar',
      name,
      true
    );

    const { error: insertError } = await supabase
      .from('customer_digital_cards')
      .insert({
        customer_id: customerId,
        customer_name: customerName,
        account_number: accountNumber,
        card_number: cardNumber,
        card_type: 'familiar',
        cardholder_name: name,
        relationship: relationship,
        qr_code_data: qrCodeData,
        is_active: true,
      });

    if (insertError) throw insertError;

    setSuccessMessage(`Tarjeta familiar para ${name} generada exitosamente`);
    await loadCards();
    onUpdate?.();
  };

  const handleBlockCard = (card: DigitalCardType) => {
    setCardToBlock(card);
    setShowBlockModal(true);
  };

  const handleConfirmBlock = async (reason: string) => {
    if (!cardToBlock) return;

    const updatedQRData = {
      ...cardToBlock.qr_code_data,
      validUntil: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('customer_digital_cards')
      .update({
        is_active: false,
        block_reason: reason,
        qr_code_data: updatedQRData,
      })
      .eq('id', cardToBlock.id);

    if (updateError) throw updateError;

    setSuccessMessage('Tarjeta bloqueada exitosamente');
    await loadCards();
    onUpdate?.();
  };

  const handleActivateCard = async (card: DigitalCardType) => {
    const updatedQRData = {
      ...card.qr_code_data,
      validUntil: null,
    };

    const { error: updateError } = await supabase
      .from('customer_digital_cards')
      .update({
        is_active: true,
        block_reason: null,
        qr_code_data: updatedQRData,
      })
      .eq('id', card.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccessMessage('Tarjeta activada exitosamente');
    await loadCards();
    onUpdate?.();
  };

  const totalCards = cards.length;
  const activeCards = cards.filter((card) => card.is_active).length;
  const totalUsage = Object.values(usageCounts).reduce((sum, count) => sum + count, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-7 h-7 text-blue-600" />
              Tarjetas Digitales
            </h2>
            <p className="text-gray-600 mt-1">
              Cliente: {customerName} - Cuenta: {accountNumber}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Tarjetas</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{totalCards}</p>
              </div>
              <CreditCard className="w-10 h-10 text-blue-400" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Tarjetas Activas</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{activeCards}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Total Usos</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">{totalUsage}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-400" />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-600">{successMessage}</p>
          </div>
        )}

        <div className="flex gap-3">
          {!hasTitularCard && (
            <button
              onClick={generateTitularCard}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <CreditCard className="w-5 h-5" />
              Generar Tarjeta Titular
            </button>
          )}

          <button
            onClick={() => setShowFamilyModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Agregar Tarjeta Familiar
          </button>
        </div>
      </div>

      {cards.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {cards.map((card) => (
            <DigitalCard
              key={card.id}
              card={card}
              usageCount={usageCounts[card.id] || 0}
              onBlock={handleBlockCard}
              onActivate={handleActivateCard}
            />
          ))}
        </div>
      )}

      {cards.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No hay tarjetas generadas</p>
          <p className="text-gray-500 text-sm mt-2">
            Comienza generando una tarjeta titular para este cliente
          </p>
        </div>
      )}

      <AddFamilyCardModal
        isOpen={showFamilyModal}
        onClose={() => setShowFamilyModal(false)}
        onSubmit={handleAddFamilyCard}
      />

      <BlockCardModal
        isOpen={showBlockModal}
        card={cardToBlock}
        onClose={() => {
          setShowBlockModal(false);
          setCardToBlock(null);
        }}
        onConfirm={handleConfirmBlock}
      />
    </div>
  );
}

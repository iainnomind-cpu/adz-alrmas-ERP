import { supabase } from '../lib/supabase';

export interface CardValidationContext {
  cardNumber: string;
  targetCustomerId: string;
  userId?: string;
  serviceOrderId?: string;
  contextMessage?: string;
}

export const CardValidationService = {
  /**
   * Valida estrictamente si una tarjeta escaneada pertenece al cliente objetivo de la acción.
   * Lanza Excepciones descriptivas en caso de fallas de seguridad o inactividad.
   */
  async validateScannedCard(data: CardValidationContext): Promise<any> {
    const { cardNumber, targetCustomerId } = data;

    try {
      // 1. Obtener la tarjeta cruda basándose en el número
      const { data: card, error: cardError } = await (supabase
        .from('customer_digital_cards')
        .select('*')
        .eq('card_number', cardNumber)
        .maybeSingle() as any);

      if (cardError) {
        throw new Error('Error al consultar el sistema de tarjetas');
      }

      // Validaciones Negativas
      let failureReason = null;

      if (!card) {
        failureReason = 'Tarjeta no encontrada en el sistema';
      } else if (card.customer_id !== targetCustomerId) {
        failureReason = 'La tarjeta no está asociada a este cliente';
      } else if (!card.is_active) {
        failureReason = 'La tarjeta se encuentra bloqueada o inactiva';
      }

      // Si hay una falla de validación, registramos el falso positivo y explotamos con alerta
      if (failureReason) {
        await this.logAccessAttempt({
          ...data,
          isSuccessful: false,
          failureReason
        });
        throw new Error(failureReason);
      }

      // 2. Si la tarjeta es totalmente válida, registramos éxito y la retornamos
      await this.logAccessAttempt({
        ...data,
        isSuccessful: true
      });

      return card;
    } catch (e: any) {
      // Re-throw known errors
      if (e.message) throw e;
      throw new Error('Fallo crítico validando la identidad de la tarjeta');
    }
  },

  /**
   * Realiza el logging de seguridad en BD silenciosamente
   */
  async logAccessAttempt(params: {
    cardNumber: string;
    targetCustomerId: string;
    isSuccessful: boolean;
    failureReason?: string;
    userId?: string;
    serviceOrderId?: string;
    contextMessage?: string;
  }) {
    try {
       await (supabase.from('card_access_logs') as any).insert({
          scanned_card_number: params.cardNumber,
          target_customer_id: params.targetCustomerId,
          is_successful: params.isSuccessful,
          failure_reason: params.failureReason || null,
          user_id: params.userId || null,
          service_order_id: params.serviceOrderId || null,
          context: params.contextMessage || 'Intento de verificación'
       });
    } catch (err) {
      console.error('Error insertando en card_access_logs', err);
    }
  }
};

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
      // 1. Obtener la tarjeta cruda por número (sin filtrar por cliente aún para poder diferenciar tipos)
      const { data: card, error: cardError } = await (supabase
        .from('customer_digital_cards')
        .select('*')
        .eq('card_number', cardNumber)
        .eq('is_active', true)
        .maybeSingle() as any);

      if (cardError) {
        throw new Error('Error al consultar el sistema de tarjetas');
      }

      // Validaciones Negativas
      if (!card) {
        const failureReason = 'La tarjeta no fue encontrada o se encuentra inactiva';
        
        await this.logAccessAttempt({
          ...data,
          isSuccessful: false,
          failureReason
        });
        throw new Error(failureReason);
      }

      // Validación Condicional (Titular vs Familiar)
      if (card.card_type === 'titular' && card.customer_id !== targetCustomerId) {
        const failureReason = 'La tarjeta titular no pertenece al cliente de esta orden';
        
        await this.logAccessAttempt({
          ...data,
          isSuccessful: false,
          failureReason
        });
        throw new Error(failureReason);
      }
      
      // Si es 'familiar', NO requiere coincidencia con targetCustomerId. Se aprueba automáticamente.

      // 2. Si la tarjeta superó todas las reglas, registramos éxito y la retornamos
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

import { supabase } from './supabase';

/**
 * Calcula el siguiente folio consecutivo con prefijo (APP-0001, COT-0001...)
 * a partir del mayor folio existente en la tabla.
 * Quien lo use debe reintentar si el insert falla por folio duplicado.
 */
export async function getNextPrefixedFolio(table: string, prefix: string, pad = 4): Promise<string> {
  const { data, error } = await (supabase.from(table) as any)
    .select('folio')
    .ilike('folio', `${prefix}%`);
  if (error) throw error;

  const max = ((data as { folio: string }[]) || []).reduce((acc, row) => {
    const n = parseInt(String(row.folio).slice(prefix.length), 10);
    return !isNaN(n) && n > acc ? n : acc;
  }, 0);

  return `${prefix}${String(max + 1).padStart(pad, '0')}`;
}

/** Documentos de cobro creados a mano (sin orden de servicio). */
export const APP_FOLIO_PREFIX = 'APP-';
export const getNextAppFolio = () => getNextPrefixedFolio('billing_documents', APP_FOLIO_PREFIX);

/** Cotizaciones. */
export const QUOTE_FOLIO_PREFIX = 'COT-';
export const getNextQuoteFolio = () => getNextPrefixedFolio('quotes', QUOTE_FOLIO_PREFIX);

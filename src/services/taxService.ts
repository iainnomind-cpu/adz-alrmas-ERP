import { supabase } from '../lib/supabase';

export const DEFAULT_TAX_RATE = 16; // 16% por defecto en México
const TAX_RATE_STORAGE_KEY = 'erp_adz_tax_rate';
const TAX_RATE_EVENT = 'erp_adz_tax_rate_changed';

let inMemoryTaxRate: number | null = null;

/**
 * Obtiene la tasa de IVA actual en porcentaje (ej. 16 para 16%)
 * 1. Intenta desde caché en memoria
 * 2. Intenta desde localStorage
 * 3. Consulta la base de datos (system_settings)
 */
export async function getTaxRate(): Promise<number> {
  if (inMemoryTaxRate !== null && !isNaN(inMemoryTaxRate)) {
    return inMemoryTaxRate;
  }

  // Intentar cargar de localStorage si está disponible
  try {
    const cached = localStorage.getItem(TAX_RATE_STORAGE_KEY);
    if (cached !== null) {
      const parsed = parseFloat(cached);
      if (!isNaN(parsed) && parsed >= 0) {
        inMemoryTaxRate = parsed;
      }
    }
  } catch (e) {
    // LocalStorage no disponible o error silencioso
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'tax_rate')
      .maybeSingle();

    if (!error && data && data.setting_value !== undefined && data.setting_value !== null) {
      const parsed = typeof data.setting_value === 'number' 
        ? data.setting_value 
        : parseFloat(String(data.setting_value));

      if (!isNaN(parsed) && parsed >= 0) {
        inMemoryTaxRate = parsed;
        try {
          localStorage.setItem(TAX_RATE_STORAGE_KEY, parsed.toString());
        } catch (e) {}
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Error al consultar tasa de IVA desde system_settings, usando valor por defecto:', error);
  }

  const fallback = inMemoryTaxRate !== null ? inMemoryTaxRate : DEFAULT_TAX_RATE;
  return fallback;
}

/**
 * Obtiene la tasa de IVA sincronizada de manera inmediata (útil para renders síncronos)
 */
export function getTaxRateSync(): number {
  if (inMemoryTaxRate !== null && !isNaN(inMemoryTaxRate)) {
    return inMemoryTaxRate;
  }
  try {
    const cached = localStorage.getItem(TAX_RATE_STORAGE_KEY);
    if (cached !== null) {
      const parsed = parseFloat(cached);
      if (!isNaN(parsed) && parsed >= 0) {
        inMemoryTaxRate = parsed;
        return parsed;
      }
    }
  } catch (e) {}
  return DEFAULT_TAX_RATE;
}

/**
 * Actualiza la tasa de IVA en el sistema
 */
export async function updateTaxRate(newRate: number): Promise<{ success: boolean; error?: any }> {
  if (isNaN(newRate) || newRate < 0) {
    return { success: false, error: 'La tasa de IVA debe ser un número mayor o igual a 0' };
  }

  const rateValue = parseFloat(newRate.toFixed(2));

  try {
    // 1. Verificar si ya existe el registro
    const { data: existing } = await supabase
      .from('system_settings')
      .select('id')
      .eq('setting_key', 'tax_rate')
      .maybeSingle();

    let dbError = null;

    if (existing) {
      const { error } = await supabase
        .from('system_settings')
        .update({
          setting_value: rateValue,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'tax_rate');
      dbError = error;
    } else {
      const { error } = await supabase
        .from('system_settings')
        .insert({
          setting_key: 'tax_rate',
          setting_value: rateValue,
          description: 'Tasa general del Impuesto al Valor Agregado (IVA) en porcentaje (%)',
          category: 'Impuestos'
        });
      dbError = error;
    }

    if (dbError) {
      console.error('Error al guardar tasa de IVA en base de datos:', dbError);
      return { success: false, error: dbError.message || dbError };
    }

    // 2. Actualizar caché y notificar
    inMemoryTaxRate = rateValue;
    try {
      localStorage.setItem(TAX_RATE_STORAGE_KEY, rateValue.toString());
    } catch (e) {}

    window.dispatchEvent(new CustomEvent(TAX_RATE_EVENT, { detail: { rate: rateValue } }));

    return { success: true };
  } catch (err: any) {
    console.error('Excepción al actualizar tasa de IVA:', err);
    return { success: false, error: err.message || err };
  }
}

/**
 * Suscribe un callback a cambios de la tasa de IVA
 */
export function subscribeToTaxRateChanges(callback: (newRate: number) => void): () => void {
  const handler = (event: any) => {
    if (event.detail && typeof event.detail.rate === 'number') {
      callback(event.detail.rate);
    }
  };

  window.addEventListener(TAX_RATE_EVENT, handler);

  // También escuchar cambios en supabase realtime si está disponible
  const channel = supabase
    .channel('system_settings_tax_rate')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'system_settings',
        filter: 'setting_key=eq.tax_rate'
      },
      (payload) => {
        if (payload.new && (payload.new as any).setting_value !== undefined) {
          const val = parseFloat((payload.new as any).setting_value);
          if (!isNaN(val)) {
            inMemoryTaxRate = val;
            try {
              localStorage.setItem(TAX_RATE_STORAGE_KEY, val.toString());
            } catch (e) {}
            callback(val);
          }
        }
      }
    )
    .subscribe();

  return () => {
    window.removeEventListener(TAX_RATE_EVENT, handler);
    supabase.removeChannel(channel);
  };
}

/**
 * Utilidades matemáticas para cálculos de IVA con redondeo consistente a 2 decimales
 */

/**
 * Calcula el monto de IVA a partir de un subtotal (base sin IVA)
 */
export function calculateTax(subtotal: number, rate: number = getTaxRateSync()): number {
  const safeSubtotal = Number(subtotal) || 0;
  const safeRate = Number(rate) || 0;
  return Number((safeSubtotal * (safeRate / 100)).toFixed(2));
}

/**
 * Desglosa el subtotal a partir de un precio neto (que ya incluye IVA)
 * Subtotal = Precio Neto / (1 + tasa / 100)
 */
export function calculateSubtotalFromNet(netPrice: number, rate: number = getTaxRateSync()): number {
  const safeNet = Number(netPrice) || 0;
  const safeRate = Number(rate) || 0;
  const divisor = 1 + (safeRate / 100);
  if (divisor <= 0) return safeNet;
  return Number((safeNet / divisor).toFixed(2));
}

/**
 * Desglosa el IVA a partir de un precio neto (Precio Neto - Subtotal)
 */
export function calculateTaxFromNet(netPrice: number, rate: number = getTaxRateSync()): number {
  const safeNet = Number(netPrice) || 0;
  const subtotal = calculateSubtotalFromNet(safeNet, rate);
  return Number((safeNet - subtotal).toFixed(2));
}

/**
 * Calcula el total con IVA a partir de un subtotal
 * Total = Subtotal * (1 + tasa / 100)
 */
export function calculateTotalWithTax(subtotal: number, rate: number = getTaxRateSync()): number {
  const safeSubtotal = Number(subtotal) || 0;
  const tax = calculateTax(safeSubtotal, rate);
  return Number((safeSubtotal + tax).toFixed(2));
}

/**
 * Formatea el texto de la tasa de IVA (ej. "IVA (16%)")
 */
export function formatTaxLabel(rate: number = getTaxRateSync()): string {
  const safeRate = Number(rate) || 0;
  return `IVA (${safeRate}%)`;
}

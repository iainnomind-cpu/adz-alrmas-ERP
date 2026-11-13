import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * Tasa de IVA configurable.
 * Se guarda en system_settings con la clave `iva_rate` como porcentaje (ej. 16).
 * Si la configuración no existe o no se puede leer, se usa el 16%.
 */
export const DEFAULT_IVA_PERCENT = 16;
export const IVA_SETTING_KEY = 'iva_rate';

let cachedPercent: number | null = null;
let pending: Promise<number> | null = null;

function parsePercent(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!isFinite(n) || n < 0) return null;
  // Tolerar que alguien capture 0.16 en lugar de 16
  return n > 0 && n < 1 ? n * 100 : n;
}

/** Devuelve la tasa de IVA como porcentaje (ej. 16). */
export async function getIvaPercent(): Promise<number> {
  if (cachedPercent !== null) return cachedPercent;
  if (!pending) {
    pending = (async () => {
      try {
        const { data, error } = await (supabase.from('system_settings') as any)
          .select('setting_value')
          .eq('setting_key', IVA_SETTING_KEY)
          .maybeSingle();
        if (error) throw error;
        const parsed = data ? parsePercent(data.setting_value) : null;
        cachedPercent = parsed ?? DEFAULT_IVA_PERCENT;
      } catch (err) {
        console.error('No se pudo leer la tasa de IVA; se usa 16%:', err);
        cachedPercent = DEFAULT_IVA_PERCENT;
      } finally {
        pending = null;
      }
      return cachedPercent as number;
    })();
  }
  return pending;
}

/** Olvida el valor en memoria (llamar después de cambiar la configuración). */
export function clearIvaCache() {
  cachedPercent = null;
}

/** Hook: tasa de IVA como porcentaje (16) y como fracción (0.16). */
export function useIvaRate(): { percent: number; rate: number } {
  const [percent, setPercent] = useState<number>(cachedPercent ?? DEFAULT_IVA_PERCENT);

  useEffect(() => {
    let alive = true;
    getIvaPercent().then((p) => {
      if (alive) setPercent(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { percent, rate: percent / 100 };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Desglosa un precio neto (IVA incluido) en subtotal e IVA.
 * El IVA se obtiene por diferencia para que subtotal + IVA sea exactamente el neto.
 * Ejemplo: 350 al 16% → subtotal 301.72, IVA 48.28.
 */
export function splitNetAmount(net: number, rate: number): { subtotal: number; tax: number; total: number } {
  const total = round2(net || 0);
  const subtotal = round2(total / (1 + (rate || 0)));
  const tax = round2(total - subtotal);
  return { subtotal, tax, total };
}

/** Formatea el porcentaje sin decimales innecesarios (16, 8.5). */
export function formatPercent(percent: number): string {
  return Number.isInteger(percent) ? String(percent) : String(round2(percent));
}

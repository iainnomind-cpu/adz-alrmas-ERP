import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/** Quita acentos, mayúsculas y símbolos para comparar valores guardados con formatos distintos. */
export function normalizeKey(value?: string | null): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// ───────────────────────── Tipos de cuenta ─────────────────────────

export interface AccountTypeLegend {
  key: string;
  label: string;
  /** Clases para la tarjeta del cliente */
  card: string;
  /** Clases para el cuadrito de la leyenda */
  swatch: string;
  /** Valores equivalentes que existen en la base de datos */
  aliases: string[];
}

export const ACCOUNT_TYPE_LEGEND: AccountTypeLegend[] = [
  { key: 'maestra', label: 'Maestra', card: 'bg-yellow-50 border-yellow-400', swatch: 'bg-yellow-50 border-yellow-400', aliases: ['maestra', 'master'] },
  { key: 'consolidada', label: 'Consolidada', card: 'bg-gray-900 text-white border-gray-900', swatch: 'bg-gray-900 border-gray-900', aliases: ['consolidada', 'consolidated', 'linked'] },
  { key: 'normal', label: 'Normal', card: 'bg-white border-gray-300', swatch: 'bg-white border-gray-400', aliases: ['normal', 'standard', 'individual'] },
  { key: 'corporativa', label: 'Corporativa', card: 'bg-indigo-50 border-indigo-300', swatch: 'bg-indigo-50 border-indigo-400', aliases: ['corporativa', 'corporativo', 'corporate'] },
  { key: 'demo', label: 'Demo', card: 'bg-amber-50 border-amber-300', swatch: 'bg-amber-50 border-amber-400', aliases: ['demo', 'prueba'] },
  { key: 'gratis', label: 'Gratis', card: 'bg-emerald-50 border-emerald-300', swatch: 'bg-emerald-50 border-emerald-400', aliases: ['gratis', 'free'] },
  { key: 'cancelada', label: 'Cancelada', card: 'bg-gray-100 border-gray-300 opacity-80', swatch: 'bg-gray-100 border-gray-400', aliases: ['cancelada', 'cancelado', 'cancelled'] }
];

const CANCELLED_STATUSES = ['cancelada', 'cancelado', 'cancelled', 'bajacliente', 'bajamoroso'];

interface CustomerLike {
  status?: string | null;
  account_type?: string | null;
  is_master_account?: boolean | null;
  is_consolidated_account?: boolean | null;
  monitoring_plan?: string | null;
  service_plan?: string | null;
}

/** Determina el tipo de cuenta de un cliente para la leyenda de colores. */
export function getAccountTypeKey(customer: CustomerLike): string {
  if (CANCELLED_STATUSES.includes(normalizeKey(customer.status))) return 'cancelada';
  const at = normalizeKey(customer.account_type);
  const match = ACCOUNT_TYPE_LEGEND.find((t) => t.aliases.includes(at));
  if (match && match.key !== 'normal') return match.key;
  if (customer.is_consolidated_account) return 'consolidada';
  if (customer.is_master_account) return 'maestra';
  return 'normal';
}

export function getAccountTypeLegend(key: string): AccountTypeLegend {
  return ACCOUNT_TYPE_LEGEND.find((t) => t.key === key) || ACCOUNT_TYPE_LEGEND[2];
}

// ───────────────────────── Planes de monitoreo ─────────────────────────

export interface MonitoringPlan {
  name: string;
  /** Color base de Tailwind: orange, blue, rose, ... */
  color: string;
  sort_order: number;
}

/** Colores permitidos (clases completas para que Tailwind las incluya en el build). */
export const PLAN_COLOR_CLASSES: Record<string, { badge: string; swatch: string }> = {
  orange: { badge: 'bg-orange-100 text-orange-800', swatch: 'bg-orange-100 border-orange-400' },
  blue: { badge: 'bg-blue-100 text-blue-800', swatch: 'bg-blue-100 border-blue-400' },
  rose: { badge: 'bg-rose-100 text-rose-800', swatch: 'bg-rose-100 border-rose-400' },
  cyan: { badge: 'bg-cyan-100 text-cyan-800', swatch: 'bg-cyan-100 border-cyan-400' },
  violet: { badge: 'bg-violet-100 text-violet-800', swatch: 'bg-violet-100 border-violet-400' },
  teal: { badge: 'bg-teal-100 text-teal-800', swatch: 'bg-teal-100 border-teal-400' },
  lime: { badge: 'bg-lime-100 text-lime-800', swatch: 'bg-lime-100 border-lime-400' },
  fuchsia: { badge: 'bg-fuchsia-100 text-fuchsia-800', swatch: 'bg-fuchsia-100 border-fuchsia-400' },
  amber: { badge: 'bg-amber-100 text-amber-800', swatch: 'bg-amber-100 border-amber-400' },
  green: { badge: 'bg-green-100 text-green-800', swatch: 'bg-green-100 border-green-400' },
  red: { badge: 'bg-red-100 text-red-800', swatch: 'bg-red-100 border-red-400' },
  gray: { badge: 'bg-gray-100 text-gray-800', swatch: 'bg-gray-100 border-gray-400' }
};

/** Se usan si la tabla customer_plan_options aún no existe o está vacía. */
export const DEFAULT_MONITORING_PLANS: MonitoringPlan[] = [
  { name: 'Clásico', color: 'orange', sort_order: 1 },
  { name: 'Plus', color: 'blue', sort_order: 2 },
  { name: 'Plus con 15', color: 'cyan', sort_order: 3 },
  { name: 'Plus con 20', color: 'violet', sort_order: 4 },
  { name: 'Medical', color: 'rose', sort_order: 5 },
  { name: 'App', color: 'teal', sort_order: 6 },
  { name: 'GPS', color: 'lime', sort_order: 7 },
  { name: 'Driver', color: 'fuchsia', sort_order: 8 }
];

/**
 * Clave de comparación de un plan. Unifica las variantes antiguas:
 * "Pluscom15", "plus_com_15" y "Plus con 15" son el mismo plan.
 */
export function planKey(value?: string | null): string {
  return normalizeKey(value).replace(/com(\d)/, 'con$1');
}

export function findPlan(plans: MonitoringPlan[], value?: string | null): MonitoringPlan | undefined {
  const key = planKey(value);
  if (!key) return undefined;
  return plans.find((p) => planKey(p.name) === key);
}

export function getPlanClasses(plan?: MonitoringPlan) {
  return PLAN_COLOR_CLASSES[plan?.color || 'gray'] || PLAN_COLOR_CLASSES.gray;
}

let cachedPlans: MonitoringPlan[] | null = null;

/** Planes de monitoreo activos, leídos de la tabla customer_plan_options. */
export function useMonitoringPlans(): MonitoringPlan[] {
  const [plans, setPlans] = useState<MonitoringPlan[]>(cachedPlans || DEFAULT_MONITORING_PLANS);

  useEffect(() => {
    if (cachedPlans) return;
    let alive = true;
    (async () => {
      try {
        const { data, error } = await (supabase.from('customer_plan_options') as any)
          .select('name, color, sort_order')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
          cachedPlans = data as MonitoringPlan[];
          if (alive) setPlans(cachedPlans);
        }
      } catch (err) {
        // La tabla puede no existir todavía; se usan los planes por defecto.
        console.warn('No se pudo leer customer_plan_options; se usan los planes por defecto.', err);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return plans;
}

// ───────────────────────── Valores para filtros ─────────────────────────
// En la base conviven valores antiguos (inglés/minúsculas) y los que guarda
// hoy el formulario ("Normal", "Maestra", "Activa"...). Los filtros buscan todos.

const ACCOUNT_TYPE_DB_VALUES: Record<string, string[]> = {
  normal: ['normal', 'Normal', 'standard', 'individual'],
  master: ['master', 'Maestra', 'maestra'],
  consolidated: ['consolidated', 'Consolidada', 'consolidada', 'linked'],
  corporativo: ['corporativo', 'Corporativa', 'corporativa', 'Corporativo'],
  demo: ['demo', 'Demo'],
  gratis: ['gratis', 'Gratis']
};
ACCOUNT_TYPE_DB_VALUES.maestra = ACCOUNT_TYPE_DB_VALUES.master;
ACCOUNT_TYPE_DB_VALUES.consolidada = ACCOUNT_TYPE_DB_VALUES.consolidated;
ACCOUNT_TYPE_DB_VALUES.corporativa = ACCOUNT_TYPE_DB_VALUES.corporativo;

export function accountTypeDbValues(filterValue: string): string[] {
  return ACCOUNT_TYPE_DB_VALUES[filterValue] || [filterValue];
}

export const STATUS_DB_VALUES: Record<string, string[]> = {
  active: ['active', 'Activa', 'Activo'],
  suspended: ['suspended', 'Suspendida', 'Suspendido'],
  inactive: ['inactive', 'Inactiva', 'Inactivo'],
  cancelled: ['cancelled', 'Cancelada', 'Cancelado', 'Baja Cliente', 'Baja Moroso']
};

/** Variantes con las que un plan pudo guardarse (ej. "Plus con 15" ↔ "Pluscom15"). */
export function planDbValues(name: string): string[] {
  const values = new Set<string>([name]);
  const m = name.match(/^(\S+) con (\d+)$/i);
  if (m) {
    values.add(`${m[1]}com${m[2]}`);
    values.add(`${m[1]}con${m[2]}`);
    values.add(`${m[1].toLowerCase()}_com_${m[2]}`);
  }
  const plain = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  values.add(plain);
  values.add(plain.toLowerCase());
  return [...values];
}

/**
 * Convierte un texto de búsqueda en patrones ILIKE que ignoran acentos:
 * cada vocal/ñ se cambia por "_" (un carácter cualquiera), así "magana"
 * encuentra "Magaña" y "sanchez" encuentra "Sánchez". Una palabra = un patrón.
 */
export function buildSearchPatterns(term: string): string[] {
  return term
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[,()"\%*]/g, ''))
    .filter(Boolean)
    .map((word) => `%${word.replace(/[aeiounáéíóúüñAEIOUNÁÉÍÓÚÜÑ]/g, '_')}%`);
}

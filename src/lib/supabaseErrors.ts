/**
 * Traduce un error de Supabase/PostgREST a un mensaje claro en español,
 * para no mostrar solo "Error al guardar" cuando la causa es conocida.
 */

interface SupabaseLikeError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

export function describeSupabaseError(err: unknown, fallback = 'Error al guardar'): string {
  if (!err) return fallback;

  const e = err as SupabaseLikeError;
  const code = e.code || '';
  const message = e.message || (err instanceof Error ? err.message : '');
  const detail = [message, e.details].filter(Boolean).join(' — ');

  switch (code) {
    case '23505':
      return `Ya existe un registro con ese valor (duplicado). ${e.details || ''}`.trim();
    case '23503':
      return `El registro hace referencia a un dato que ya no existe (cliente, técnico u otro). ${e.details || ''}`.trim();
    case '23514':
      return `Un valor no está permitido por la base de datos. ${message}`.trim();
    case '23502':
      return `Falta un dato obligatorio. ${message}`.trim();
    case '42501':
      return 'No tienes permiso para guardar en esta tabla (política RLS de Supabase).';
    case 'PGRST204':
    case '42703':
      return `Falta una columna en la base de datos; hay una migración pendiente por aplicar. ${message}`.trim();
    case 'PGRST301':
      return 'Tu sesión expiró. Vuelve a iniciar sesión e intenta de nuevo.';
    default:
      break;
  }

  if (/row-level security/i.test(message)) {
    return 'No tienes permiso para guardar en esta tabla (política RLS de Supabase).';
  }
  if (/JWT expired/i.test(message)) {
    return 'Tu sesión expiró. Vuelve a iniciar sesión e intenta de nuevo.';
  }
  if (/Failed to fetch|NetworkError/i.test(message)) {
    return 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.';
  }

  return detail ? `${fallback}: ${detail}` : fallback;
}

export function isDuplicateError(err: unknown): boolean {
  return (err as SupabaseLikeError)?.code === '23505';
}

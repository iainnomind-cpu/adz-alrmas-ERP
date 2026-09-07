import { supabase } from '../lib/supabase';

export interface SystemPrefixConfig {
  prefix: string;
  label: string;
  isNumericOnly?: boolean;
  baseOffset?: number;
  moduleNumber?: number;
}

export const SYSTEM_ACCOUNT_CONFIG: Record<string, SystemPrefixConfig> = {
  alarma: { prefix: '', label: 'Alarma', isNumericOnly: true, baseOffset: 0, moduleNumber: 1 },
  cctv: { prefix: 'CCTV-', label: 'CCTV', isNumericOnly: false, baseOffset: 20000, moduleNumber: 2 },
  control_acceso: { prefix: 'ACC-', label: 'Control de Acceso', isNumericOnly: false, baseOffset: 30000, moduleNumber: 3 },
  acceso: { prefix: 'ACC-', label: 'Control de Acceso', isNumericOnly: false, baseOffset: 30000, moduleNumber: 3 },
  control_asistencia: { prefix: 'ASIST-', label: 'Control de Asistencia', isNumericOnly: false, baseOffset: 40000, moduleNumber: 4 },
  asistencia: { prefix: 'ASIST-', label: 'Control de Asistencia', isNumericOnly: false, baseOffset: 40000, moduleNumber: 4 },
  domotica: { prefix: 'DOM-', label: 'Domótica', isNumericOnly: false, baseOffset: 50000, moduleNumber: 5 },
  domótica: { prefix: 'DOM-', label: 'Domótica', isNumericOnly: false, baseOffset: 50000, moduleNumber: 5 },
  gps_personal: { prefix: 'GPS P-', label: 'GPS Personal', isNumericOnly: false, baseOffset: 60000, moduleNumber: 6 },
  'gps personal': { prefix: 'GPS P-', label: 'GPS Personal', isNumericOnly: false, baseOffset: 60000, moduleNumber: 6 },
  gps_p: { prefix: 'GPS P-', label: 'GPS Personal', isNumericOnly: false, baseOffset: 60000, moduleNumber: 6 },
  gps_vehicular: { prefix: 'GPS V-', label: 'GPS Vehicular', isNumericOnly: false, baseOffset: 70000, moduleNumber: 7 },
  'gps vehicular': { prefix: 'GPS V-', label: 'GPS Vehicular', isNumericOnly: false, baseOffset: 70000, moduleNumber: 7 },
  gps_v: { prefix: 'GPS V-', label: 'GPS Vehicular', isNumericOnly: false, baseOffset: 70000, moduleNumber: 7 },
  red: { prefix: 'RED-', label: 'Red', isNumericOnly: false, baseOffset: 80000, moduleNumber: 8 },
  redes: { prefix: 'RED-', label: 'Red', isNumericOnly: false, baseOffset: 80000, moduleNumber: 8 },
  video_portero: { prefix: 'VP-', label: 'Video Portero', isNumericOnly: false, baseOffset: 90000, moduleNumber: 9 },
  videoportero: { prefix: 'VP-', label: 'Video Portero', isNumericOnly: false, baseOffset: 90000, moduleNumber: 9 },
  'video portero': { prefix: 'VP-', label: 'Video Portero', isNumericOnly: false, baseOffset: 90000, moduleNumber: 9 },
  vp: { prefix: 'VP-', label: 'Video Portero', isNumericOnly: false, baseOffset: 90000, moduleNumber: 9 }
};

/**
 * Lista de los módulos 2 al 9 para generación y gestión
 */
export const MODULES_2_TO_9 = [
  { key: 'cctv', label: 'CCTV', prefix: 'CCTV-', moduleNum: 2 },
  { key: 'control_acceso', label: 'Control de Acceso', prefix: 'ACC-', moduleNum: 3 },
  { key: 'control_asistencia', label: 'Control de Asistencia', prefix: 'ASIST-', moduleNum: 4 },
  { key: 'domotica', label: 'Domótica', prefix: 'DOM-', moduleNum: 5 },
  { key: 'gps_personal', label: 'GPS Personal', prefix: 'GPS P-', moduleNum: 6 },
  { key: 'gps_vehicular', label: 'GPS Vehicular', prefix: 'GPS V-', moduleNum: 7 },
  { key: 'red', label: 'Red', prefix: 'RED-', moduleNum: 8 },
  { key: 'video_portero', label: 'Video Portero', prefix: 'VP-', moduleNum: 9 },
] as const;

/**
 * Obtiene la configuración de prefijo y rango para un tipo de sistema
 */
export function getSystemConfig(systemType?: string | null): SystemPrefixConfig {
  if (!systemType) return SYSTEM_ACCOUNT_CONFIG.alarma;
  const key = systemType.toLowerCase().trim();
  return SYSTEM_ACCOUNT_CONFIG[key] || { prefix: '', label: systemType, isNumericOnly: true, baseOffset: 0, moduleNumber: 1 };
}

/**
 * Decodifica la secuencia numérica consecutiva (1, 2, 3...) a partir
 * del account_number numérico o del contract_number alfanumérico
 */
export function decodeAccountSequence(
  accountNumber: number | string | null | undefined,
  systemType?: string | null
): number {
  if (accountNumber === null || accountNumber === undefined || accountNumber === '') return 0;

  const config = getSystemConfig(systemType);

  if (config.isNumericOnly) {
    const num = Number(accountNumber);
    return isNaN(num) ? 0 : num;
  }

  // Si es un número con offset en base de datos (ej. 20001 para CCTV)
  const num = Number(accountNumber);
  if (!isNaN(num) && config.baseOffset && num > config.baseOffset && num < config.baseOffset + 10000) {
    return num - config.baseOffset;
  }

  // Si es un string con prefijo (ej. "CCTV-1", "ACC-5")
  const str = String(accountNumber).trim();
  const prefixes = ['CCTV-', 'ACC-', 'ASIST-', 'DOM-', 'GPS P-', 'GPS V-', 'RED-', 'VP-', 'GPSP-', 'GPSV-'];
  const matchedPrefix = prefixes.find(p => str.toUpperCase().startsWith(p));
  if (matchedPrefix) {
    const rawSeq = parseInt(str.substring(matchedPrefix.length).trim(), 10);
    return isNaN(rawSeq) ? 0 : rawSeq;
  }

  return isNaN(num) ? 0 : num;
}

/**
 * Formatea el número de cuenta con su prefijo progresivo correspondiente
 * Ejemplo:
 * - formatCustomerAccountNumber(20001, 'cctv') => "CCTV-1"
 * - formatCustomerAccountNumber(1, 'cctv') => "CCTV-1"
 * - formatCustomerAccountNumber(30005, 'control_acceso') => "ACC-5"
 * - formatCustomerAccountNumber(2, 'alarma') => "2"
 */
export function formatCustomerAccountNumber(
  accountNumber: number | string | null | undefined,
  systemType?: string | null
): string {
  if (accountNumber === null || accountNumber === undefined || accountNumber === '') {
    return 'S/N';
  }

  const str = String(accountNumber).trim();

  // Si ya contiene algún prefijo conocido, retornarlo limpio
  const prefixes = ['CCTV-', 'ACC-', 'ASIST-', 'DOM-', 'GPS P-', 'GPS V-', 'RED-', 'VP-', 'GPSP-', 'GPSV-'];
  if (prefixes.some(p => str.toUpperCase().startsWith(p))) {
    return str.toUpperCase();
  }

  const config = getSystemConfig(systemType);
  if (config.isNumericOnly || !config.prefix) {
    return str;
  }

  const sequence = decodeAccountSequence(accountNumber, systemType);
  return `${config.prefix}${sequence}`;
}

/**
 * Obtiene el siguiente número de cuenta progresivo y consecutivo para un tipo de sistema específico,
 * garantizando que no existan duplicados y continuando la numeración existente.
 */
export async function getNextProgressiveAccountNumber(systemType: string): Promise<{
  nextSequence: number;
  nextDbAccountNumber: number;
  formattedAccount: string;
}> {
  try {
    const config = getSystemConfig(systemType);
    const normalizedType = systemType.toLowerCase().trim();

    if (config.isNumericOnly) {
      // Para alarmas: buscar el máximo número de cuenta existente (preservando patrón original)
      const { data } = await supabase
        .from('customers')
        .select('account_number')
        .ilike('system_type', '%alarm%')
        .order('account_number', { ascending: false })
        .limit(1);

      const maxAccount = data && data[0]?.account_number ? Number(data[0].account_number) : 5;
      const nextSequence = maxAccount + 1;
      return {
        nextSequence,
        nextDbAccountNumber: nextSequence,
        formattedAccount: String(nextSequence)
      };
    }

    // Para módulos 2 al 9: buscar clientes de ese tipo de sistema
    const baseOffset = config.baseOffset || 20000;

    // Consultar clientes que pertenezcan a este módulo o que usen el rango o prefijo correspondiente
    const { data: systemCustomers } = await supabase
      .from('customers')
      .select('account_number, contract_number, system_type')
      .or(`system_type.ilike.%${normalizedType.replace('_', '%')}%,account_number.gte.${baseOffset},contract_number.ilike.${config.prefix}%`);

    let maxSequence = 0;
    if (systemCustomers && systemCustomers.length > 0) {
      systemCustomers.forEach(c => {
        let seq = 0;
        if (c.account_number) {
          const num = Number(c.account_number);
          if (num >= baseOffset && num < baseOffset + 10000) {
            seq = num - baseOffset;
          } else if (num < 10000) {
            seq = num;
          }
        }
        if (c.contract_number) {
          const contractSeq = decodeAccountSequence(c.contract_number, systemType);
          if (contractSeq > seq) seq = contractSeq;
        }
        if (seq > maxSequence) {
          maxSequence = seq;
        }
      });
    }

    let nextSequence = maxSequence + 1;
    let nextDbAccountNumber = baseOffset + nextSequence;

    // Validación preventiva de no colisión en la base de datos
    let attempts = 0;
    while (attempts < 20) {
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('account_number', nextDbAccountNumber)
        .maybeSingle();

      if (!existing) {
        break; // Número completamente disponible
      }
      nextSequence += 1;
      nextDbAccountNumber = baseOffset + nextSequence;
      attempts += 1;
    }

    const formattedAccount = `${config.prefix}${nextSequence}`;

    return {
      nextSequence,
      nextDbAccountNumber,
      formattedAccount
    };
  } catch (error) {
    console.error('Error calculando siguiente número de cuenta:', error);
    const config = getSystemConfig(systemType);
    const baseOffset = config.baseOffset || 20000;
    return {
      nextSequence: 1,
      nextDbAccountNumber: baseOffset + 1,
      formattedAccount: `${config.prefix}1`
    };
  }
}

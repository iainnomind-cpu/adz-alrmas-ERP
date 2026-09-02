import { supabase } from '../lib/supabase';

export interface SystemPrefixConfig {
  prefix: string;
  label: string;
  isNumericOnly?: boolean;
}

export const SYSTEM_ACCOUNT_CONFIG: Record<string, SystemPrefixConfig> = {
  alarma: { prefix: '', label: 'Alarma', isNumericOnly: true },
  cctv: { prefix: 'CCTV-', label: 'CCTV' },
  control_acceso: { prefix: 'ACC-', label: 'Control de Acceso' },
  acceso: { prefix: 'ACC-', label: 'Control de Acceso' },
  control_asistencia: { prefix: 'ASIST-', label: 'Control de Asistencia' },
  asistencia: { prefix: 'ASIST-', label: 'Control de Asistencia' },
  domotica: { prefix: 'DOM-', label: 'Domótica' },
  domótica: { prefix: 'DOM-', label: 'Domótica' },
  gps_personal: { prefix: 'GPS P-', label: 'GPS Personal' },
  'gps personal': { prefix: 'GPS P-', label: 'GPS Personal' },
  gps_p: { prefix: 'GPS P-', label: 'GPS Personal' },
  gps_vehicular: { prefix: 'GPS V-', label: 'GPS Vehicular' },
  'gps vehicular': { prefix: 'GPS V-', label: 'GPS Vehicular' },
  gps_v: { prefix: 'GPS V-', label: 'GPS Vehicular' },
  red: { prefix: 'RED-', label: 'Red' },
  redes: { prefix: 'RED-', label: 'Red' },
  video_portero: { prefix: 'VP-', label: 'Video Portero' },
  videoportero: { prefix: 'VP-', label: 'Video Portero' },
  'video portero': { prefix: 'VP-', label: 'Video Portero' },
  vp: { prefix: 'VP-', label: 'Video Portero' }
};

/**
 * Obtiene la configuración de prefijo para un tipo de sistema
 */
export function getSystemConfig(systemType?: string | null): SystemPrefixConfig {
  if (!systemType) return SYSTEM_ACCOUNT_CONFIG.alarma;
  const key = systemType.toLowerCase().trim();
  return SYSTEM_ACCOUNT_CONFIG[key] || { prefix: '', label: systemType, isNumericOnly: true };
}

/**
 * Formatea el número de cuenta con su prefijo progresivo correspondiente
 * Ejemplo:
 * - formatCustomerAccountNumber(1, 'cctv') => "CCTV-1"
 * - formatCustomerAccountNumber(5, 'control_acceso') => "ACC-5"
 * - formatCustomerAccountNumber(1002, 'alarma') => "1002"
 */
export function formatCustomerAccountNumber(
  accountNumber: number | string | null | undefined,
  systemType?: string | null
): string {
  if (accountNumber === null || accountNumber === undefined || accountNumber === '') {
    return 'S/N';
  }

  const str = String(accountNumber).trim();
  
  // Si ya contiene algún prefijo conocido, retornarlo tal cual
  const prefixes = ['CCTV-', 'ACC-', 'ASIST-', 'DOM-', 'GPS P-', 'GPS V-', 'RED-', 'VP-', 'GPSP-', 'GPSV-'];
  if (prefixes.some(p => str.toUpperCase().startsWith(p))) {
    return str.toUpperCase();
  }

  const config = getSystemConfig(systemType);
  if (config.isNumericOnly || !config.prefix) {
    return str;
  }

  return `${config.prefix}${str}`;
}

/**
 * Obtiene el siguiente número de cuenta progresivo para un tipo de sistema específico
 */
export async function getNextProgressiveAccountNumber(systemType: string): Promise<{
  nextSequence: number;
  formattedAccount: string;
}> {
  try {
    const config = getSystemConfig(systemType);
    const normalizedType = systemType.toLowerCase().trim();

    if (config.isNumericOnly) {
      // Para alarmas: buscar el máximo número de cuenta existente
      const { data } = await supabase
        .from('customers')
        .select('account_number')
        .order('account_number', { ascending: false })
        .limit(1);

      const maxAccount = data && data[0]?.account_number ? Number(data[0].account_number) : 1000;
      const nextSequence = maxAccount + 1;
      return {
        nextSequence,
        formattedAccount: String(nextSequence)
      };
    }

    // Para los tipos de sistema del 8 al 15: buscar clientes de ese tipo de sistema
    const { data: systemCustomers } = await supabase
      .from('customers')
      .select('account_number, system_type')
      .ilike('system_type', `%${normalizedType.replace('_', '%')}%`);

    let maxSequence = 0;
    if (systemCustomers && systemCustomers.length > 0) {
      systemCustomers.forEach(c => {
        const num = Number(c.account_number);
        if (!isNaN(num) && num > maxSequence && num < 100000) {
          maxSequence = num;
        }
      });
    }

    // Si no hay ninguno, comienza en 1
    const nextSequence = maxSequence + 1;
    const formattedAccount = `${config.prefix}${nextSequence}`;

    return {
      nextSequence,
      formattedAccount
    };
  } catch (error) {
    console.error('Error calculando siguiente número de cuenta:', error);
    const config = getSystemConfig(systemType);
    return {
      nextSequence: 1,
      formattedAccount: `${config.prefix}1`
    };
  }
}

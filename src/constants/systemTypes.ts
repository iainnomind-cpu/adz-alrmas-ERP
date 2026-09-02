export const SYSTEM_TYPES = [
  { value: 'alarma', label: 'Alarma' },
  { value: 'cctv', label: 'CCTV' },
  { value: 'control_acceso', label: 'Control de Acceso' },
  { value: 'control_asistencia', label: 'Control de Asistencia' },
  { value: 'domotica', label: 'Domótica' },
  { value: 'gps_personal', label: 'GPS Personal' },
  { value: 'gps_vehicular', label: 'GPS Vehicular' },
  { value: 'red', label: 'Red' },
  { value: 'video_portero', label: 'Video Portero' }
] as const;

export type SystemType = typeof SYSTEM_TYPES[number]['value'];

export const SYSTEM_TYPE_LABELS: Record<string, string> = 
  SYSTEM_TYPES.reduce((acc, curr) => ({
    ...acc,
    [curr.value]: curr.label
  }), {});

export const getSystemTypeLabel = (value: string | undefined): string => {
  if (!value) return 'Desc.';
  // Compatibilidad con los valores en mayúscula anteriores en caso que fallen en migrar
  const normalizedValue = value.toLowerCase().replace(/ /g, '_');
  return SYSTEM_TYPE_LABELS[normalizedValue] || SYSTEM_TYPE_LABELS[value] || value;
};

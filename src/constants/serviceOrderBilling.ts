export const SERVICE_TRAVEL_ZONES = [
  { value: 'zm_cd_guzman_50km', label: 'ZM Cd. Guzman hasta 50 km' },
  { value: 'zm_cd_guzman_plus_50km', label: 'ZM Cd. Guzman +50 km' },
  { value: 'colima', label: 'Colima' },
  { value: 'guadalajara', label: 'Guadalajara' },
  { value: 'otra_zona', label: 'Otra zona' }
];

export const SERVICE_DURATION_OPTIONS = [
  { value: 'local', label: 'Local — Visita Técnica Express 3.0 ($120 neto)', minutes: 0, cost: 120 },
  { value: '30', label: '30 minutos — Visita Express 3.0 ($140)', minutes: 30, cost: 140 },
  { value: '60', label: '60 minutos — Visita Express 6.0 ($280)', minutes: 60, cost: 280 },
  { value: '90', label: '90 minutos ($420)', minutes: 90, cost: 420 },
  { value: '120', label: '2 horas ($560)', minutes: 120, cost: 560 },
  { value: '180', label: '3 horas ($840)', minutes: 180, cost: 840 },
  { value: '240', label: '4 horas ($1,120)', minutes: 240, cost: 1120 },
  { value: '300', label: '5 horas ($1,400)', minutes: 300, cost: 1400 },
  { value: '360', label: '6 horas ($1,680)', minutes: 360, cost: 1680 },
];

export function getTravelZoneLabel(value?: string | null): string {
  return SERVICE_TRAVEL_ZONES.find((zone) => zone.value === value)?.label || 'No especificado';
}

export function calculateLaborCharge(totalMinutes: number, durationType?: string): { cost: number; label: string } {
  // Special case: Local visit
  if (durationType === 'local' || totalMinutes === 0) {
    return { cost: 120, label: 'Visita Técnica Express 3.0 (Local)' };
  }

  const billableMinutes = Math.max(1, Math.round(totalMinutes || 0));

  if (billableMinutes <= 30) {
    return { cost: 140, label: 'Visita Express 3.0' };
  }

  if (billableMinutes <= 60) {
    return { cost: 280, label: 'Visita Express 6.0' };
  }

  const cost = Number(((280 / 60) * billableMinutes).toFixed(2));
  return { cost, label: '$4.67/minuto' };
}


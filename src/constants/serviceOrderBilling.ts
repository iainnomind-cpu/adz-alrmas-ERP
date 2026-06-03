export const SERVICE_TRAVEL_ZONES = [
  { value: 'zm_cd_guzman_50km', label: 'ZM Cd. Guzman hasta 50 km' },
  { value: 'zm_cd_guzman_plus_50km', label: 'ZM Cd. Guzman +50 km' },
  { value: 'colima', label: 'Colima' },
  { value: 'guadalajara', label: 'Guadalajara' },
  { value: 'otra_zona', label: 'Otra zona' }
];

export function getTravelZoneLabel(value?: string | null): string {
  return SERVICE_TRAVEL_ZONES.find((zone) => zone.value === value)?.label || 'No especificado';
}

export function calculateLaborCharge(totalMinutes: number): { cost: number; label: string } {
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

export const CUSTOMER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  INACTIVE: 'inactive'
} as const;

export type CustomerStatus = typeof CUSTOMER_STATUS[keyof typeof CUSTOMER_STATUS];

export const getCustomerStatusLabel = (status: string | undefined): string => {
  if (!status) return 'Desconocido';
  switch (status.toLowerCase()) {
    case 'active':
    case 'activo':
      return 'Activo';
    case 'suspended':
    case 'suspendido':
      return 'Suspendido';
    case 'inactive':
    case 'inactivo':
      return 'Inactivo';
    default:
      return status;
  }
};

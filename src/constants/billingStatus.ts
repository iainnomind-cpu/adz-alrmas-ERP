export const BILLING_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const;

export type BillingStatus = typeof BILLING_STATUS[keyof typeof BILLING_STATUS];

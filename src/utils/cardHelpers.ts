// src/utils/cardHelpers.ts

export const relationshipOptions = [
  { value: 'spouse', label: 'Esposo/a' },
  { value: 'child', label: 'Hijo/a' },
  { value: 'parent', label: 'Padre/Madre' },
  { value: 'sibling', label: 'Hermano/a' },
  { value: 'other', label: 'Otro' },
];

export function generateCardNumber(accountNumber: number, sequence: number): string {
  return `CARD-${String(accountNumber).padStart(5, '0')}-${String(sequence).padStart(3, '0')}`;
}

export function createQRCodeData(
  cardNumber: string,
  customerId: string,
  accountNumber: number,
  cardType: 'titular' | 'familiar',
  holderName: string,
  isActive: boolean
) {
  return {
    cardNumber,
    customerId,
    accountNumber,
    cardType,
    holderName,
    validUntil: isActive ? null : new Date().toISOString(),
  };
}

export function getCardGradient(cardType: 'titular' | 'familiar'): string {
  return cardType === 'titular'
    ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800'
    : 'bg-gradient-to-br from-emerald-600 via-green-700 to-teal-800';
}
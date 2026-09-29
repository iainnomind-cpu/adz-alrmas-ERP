import { useState, useEffect, useCallback } from 'react';
import {
  getTaxRate,
  getTaxRateSync,
  updateTaxRate as updateTaxRateService,
  subscribeToTaxRateChanges,
  calculateTax,
  calculateSubtotalFromNet,
  calculateTaxFromNet,
  calculateTotalWithTax,
  formatTaxLabel,
  DEFAULT_TAX_RATE
} from '../services/taxService';

export function useTaxRate() {
  const [taxRate, setTaxRate] = useState<number>(() => getTaxRateSync());
  const [loading, setLoading] = useState(true);

  const refreshTaxRate = useCallback(async () => {
    try {
      const rate = await getTaxRate();
      setTaxRate(rate);
    } catch (err) {
      console.error('Error al recargar tasa de IVA:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTaxRate();
    const unsubscribe = subscribeToTaxRateChanges((newRate) => {
      setTaxRate(newRate);
    });
    return () => {
      unsubscribe();
    };
  }, [refreshTaxRate]);

  const taxDecimal = taxRate / 100;
  const taxMultiplier = 1 + taxDecimal;

  const updateRate = useCallback(async (newRate: number) => {
    const result = await updateTaxRateService(newRate);
    if (result.success) {
      setTaxRate(newRate);
    }
    return result;
  }, []);

  return {
    taxRate,
    taxDecimal,
    taxMultiplier,
    loading,
    refreshTaxRate,
    updateTaxRate: updateRate,
    calculateTax: (subtotal: number, customRate?: number) =>
      calculateTax(subtotal, customRate ?? taxRate),
    calculateSubtotalFromNet: (netPrice: number, customRate?: number) =>
      calculateSubtotalFromNet(netPrice, customRate ?? taxRate),
    calculateTaxFromNet: (netPrice: number, customRate?: number) =>
      calculateTaxFromNet(netPrice, customRate ?? taxRate),
    calculateTotalWithTax: (subtotal: number, customRate?: number) =>
      calculateTotalWithTax(subtotal, customRate ?? taxRate),
    formatTaxLabel: (customRate?: number) =>
      formatTaxLabel(customRate ?? taxRate),
    DEFAULT_TAX_RATE
  };
}

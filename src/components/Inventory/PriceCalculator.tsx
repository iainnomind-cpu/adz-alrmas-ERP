import { useMemo } from 'react';
import { Calculator, DollarSign, Percent, ArrowRight } from 'lucide-react';
import type { PriceListItem } from '../../lib/supabase';

interface PriceCalculatorProps {
    item: PriceListItem;
    discountPercentage?: number;
    showDetails?: boolean;
    compact?: boolean;
}

/**
 * Widget reutilizable para calcular y mostrar precios con descuento
 * Muestra conversión detallada para items en USD
 */
export function PriceCalculator({
    item,
    discountPercentage = 0,
    showDetails = true,
    compact = false
}: PriceCalculatorProps) {
    // Calcular precio final
    const calculations = useMemo(() => {
        const basePrice = item.base_price_mxn || 0;
        const discount = Math.min(Math.max(discountPercentage, 0), 30); // Limitar 0-30%
        const discountAmount = basePrice * (discount / 100);
        const finalPrice = basePrice - discountAmount;

        return {
            basePrice,
            discount,
            discountAmount,
            finalPrice
        };
    }, [item.base_price_mxn, discountPercentage]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const formatUSD = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    };

    if (compact) {
        return (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Precio Final:</span>
                    <span className="text-lg font-bold text-green-700">
                        {formatCurrency(calculations.finalPrice)}
                    </span>
                </div>
                {calculations.discount > 0 && (
                    <div className="text-xs text-gray-500 text-right mt-1">
                        -{calculations.discount}% aplicado
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-white" />
                <h3 className="text-white font-semibold">Calculadora de Precio</h3>
            </div>

            <div className="p-4 space-y-4">
                {/* Información del item */}
                {showDetails && (
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Producto</p>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.code}</p>
                    </div>
                )}

                {/* Conversión USD si aplica */}
                {item.currency === 'USD' && item.cost_price_usd && showDetails && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">Conversión USD → MXN</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-blue-700 font-semibold">
                                {formatUSD(item.cost_price_usd)}
                            </span>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">×</span>
                            <span className="text-gray-700">${item.exchange_rate}</span>
                            <span className="text-gray-600">=</span>
                            <span className="text-blue-700 font-semibold">
                                {formatCurrency(item.cost_price_usd * item.exchange_rate)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Desglose de precio */}
                <div className="space-y-3">
                    {/* Precio base */}
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Precio base:</span>
                        <span className="font-semibold text-gray-900 text-lg">
                            {formatCurrency(calculations.basePrice)}
                        </span>
                    </div>

                    {/* Descuento */}
                    {calculations.discount > 0 && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <Percent className="w-4 h-4 text-orange-500" />
                                <span className="text-gray-600">Descuento ({calculations.discount}%):</span>
                            </div>
                            <span className="font-semibold text-orange-600">
                                -{formatCurrency(calculations.discountAmount)}
                            </span>
                        </div>
                    )}

                    {/* Precio final */}
                    <div className="flex justify-between items-center py-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg px-3 -mx-1">
                        <span className="text-green-800 font-semibold">PRECIO FINAL:</span>
                        <span className="text-2xl font-bold text-green-700">
                            {formatCurrency(calculations.finalPrice)}
                        </span>
                    </div>
                </div>

                {/* Niveles de descuento disponibles */}
                {showDetails && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">Precios por nivel de descuento:</p>
                        <div className="grid grid-cols-5 gap-2 text-center">
                            {[
                                { tier: 1, discount: item.discount_tier_1 },
                                { tier: 2, discount: item.discount_tier_2 },
                                { tier: 3, discount: item.discount_tier_3 },
                                { tier: 4, discount: item.discount_tier_4 },
                                { tier: 5, discount: item.discount_tier_5 },
                            ].map(({ tier, discount }) => {
                                const price = calculations.basePrice * (1 - discount / 100);
                                return (
                                    <div
                                        key={tier}
                                        className={`p-2 rounded-lg text-xs ${discount === calculations.discount
                                                ? 'bg-blue-100 border-2 border-blue-400'
                                                : 'bg-gray-50 border border-gray-200'
                                            }`}
                                    >
                                        <p className="font-medium text-gray-700">Nivel {tier}</p>
                                        <p className="text-gray-500">{discount}%</p>
                                        <p className="font-semibold text-gray-900 mt-1">
                                            {formatCurrency(price).replace('MXN', '').replace('$', '$')}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

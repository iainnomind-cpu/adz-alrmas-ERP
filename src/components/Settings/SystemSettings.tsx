import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings as SettingsIcon, Save, Loader2, CheckCircle2, AlertCircle, Percent, Calculator } from 'lucide-react';
import { updateTaxRate, DEFAULT_TAX_RATE } from '../../services/taxService';

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string;
  category: string;
}

export function SystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category, setting_key');

      if (error) {
        console.error('Error loading settings:', error);
      }

      let currentSettings = data || [];

      // Si no existe la configuración de IVA, insertarla automáticamente
      const hasTaxRate = currentSettings.some(s => s.setting_key === 'tax_rate');
      if (!hasTaxRate) {
        const { data: newSetting, error: insertError } = await supabase
          .from('system_settings')
          .insert({
            setting_key: 'tax_rate',
            setting_value: DEFAULT_TAX_RATE,
            description: 'Tasa general del Impuesto al Valor Agregado (IVA) en porcentaje (%)',
            category: 'Impuestos'
          })
          .select()
          .maybeSingle();

        if (!insertError && newSetting) {
          currentSettings = [...currentSettings, newSetting];
        } else {
          // Si falló por RLS o conexión, mantenerlo en estado local para permitir edición
          currentSettings.push({
            id: 'local-tax-rate',
            setting_key: 'tax_rate',
            setting_value: DEFAULT_TAX_RATE,
            description: 'Tasa general del Impuesto al Valor Agregado (IVA) en porcentaje (%)',
            category: 'Impuestos'
          });
        }
      }

      setSettings(currentSettings);
      
      const initialValues: Record<string, any> = {};
      currentSettings.forEach(s => {
        initialValues[s.setting_key] = s.setting_value;
      });
      setFormValues(initialValues);
    } catch (e: any) {
      console.error('Error in loadSettings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSetting = async (setting: SystemSetting) => {
    const valueToSave = formValues[setting.setting_key];
    setSavingKey(setting.setting_key);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      if (setting.setting_key === 'tax_rate') {
        const numValue = parseFloat(valueToSave);
        if (isNaN(numValue) || numValue < 0) {
          setErrorMessage('La tasa de IVA debe ser un número mayor o igual a 0');
          setSavingKey(null);
          return;
        }

        const result = await updateTaxRate(numValue);
        if (!result.success) {
          throw new Error(result.error || 'Error al guardar la tasa de IVA');
        }

        setSettings(prev =>
          prev.map(s => s.setting_key === 'tax_rate' ? { ...s, setting_value: numValue } : s)
        );
        setSuccessMessage(`Tasa de IVA actualizada exitosamente a ${numValue}%`);
      } else {
        const { error } = await supabase
          .from('system_settings')
          .update({
            setting_value: valueToSave,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', setting.setting_key);

        if (error) throw error;

        setSettings(prev =>
          prev.map(s => s.setting_key === setting.setting_key ? { ...s, setting_value: valueToSave } : s)
        );
        setSuccessMessage('Configuración guardada exitosamente');
      }

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Error guardando configuración:', err);
      setErrorMessage(err.message || 'Error al guardar la configuración');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const settingsByCategory = settings.reduce((acc, setting) => {
    const cat = setting.category || 'General';
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(setting);
    return acc;
  }, {} as Record<string, SystemSetting[]>);

  const currentTaxRate = parseFloat(formValues['tax_rate']) || 0;
  const sampleAmount = 1000;
  const sampleTax = Number((sampleAmount * (currentTaxRate / 100)).toFixed(2));
  const sampleTotal = Number((sampleAmount + sampleTax).toFixed(2));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-8 h-8" />
          <h3 className="text-xl font-semibold">Parámetros del Sistema</h3>
        </div>
        <p className="text-blue-100">
          Personalice las tasas impositivas, cálculos de facturación y parámetros globales del ERP
        </p>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2 shadow-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(settingsByCategory).map(([category, categorySettings]) => (
          <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
              <span className="font-bold text-gray-900 capitalize text-lg">
                {category}
              </span>
            </div>

            <div className="p-6 space-y-6">
              {categorySettings.map((setting) => {
                const isTaxRate = setting.setting_key === 'tax_rate';
                const isSaving = savingKey === setting.setting_key;
                const currentValue = formValues[setting.setting_key] ?? setting.setting_value;
                const hasChanged = currentValue !== setting.setting_value;

                return (
                  <div
                    key={setting.id || setting.setting_key}
                    className={`p-5 rounded-xl border transition-all ${
                      isTaxRate ? 'bg-gradient-to-br from-blue-50/50 to-white border-blue-200' : 'bg-gray-50/50 border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {isTaxRate && <Percent className="w-5 h-5 text-blue-600" />}
                          <label className="text-base font-semibold text-gray-900">
                            {isTaxRate ? 'Tasa General de IVA (%)' : setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </label>
                        </div>
                        {setting.description && (
                          <p className="text-sm text-gray-600">{setting.description}</p>
                        )}
                      </div>

                      <div className="w-full md:w-80 space-y-3">
                        {isTaxRate ? (
                          <div className="space-y-2">
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={currentValue}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                  setFormValues({ ...formValues, [setting.setting_key]: val });
                                }}
                                className="w-full pl-4 pr-10 py-2.5 border-2 border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-bold text-gray-900"
                                placeholder="16.00"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-base">
                                %
                              </span>
                            </div>

                            {/* Simulador rápido en vivo */}
                            <div className="bg-white p-3 rounded-lg border border-blue-100 text-xs space-y-1 text-gray-600">
                              <div className="flex items-center gap-1 font-semibold text-blue-900 mb-1">
                                <Calculator className="w-3.5 h-3.5" />
                                <span>Ejemplo de cálculo automático:</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span className="font-mono">${sampleAmount.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-blue-700 font-medium">
                                <span>IVA ({currentTaxRate}%):</span>
                                <span className="font-mono">+${sampleTax.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
                                <span>Total con IVA:</span>
                                <span className="font-mono text-blue-600">${sampleTotal.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        ) : typeof setting.setting_value === 'boolean' ? (
                          <label className="flex items-center gap-2 cursor-pointer pt-2">
                            <input
                              type="checkbox"
                              checked={Boolean(currentValue)}
                              onChange={(e) => setFormValues({ ...formValues, [setting.setting_key]: e.target.checked })}
                              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              {currentValue ? 'Habilitado' : 'Deshabilitado'}
                            </span>
                          </label>
                        ) : typeof setting.setting_value === 'number' ? (
                          <input
                            type="number"
                            value={currentValue}
                            onChange={(e) => setFormValues({ ...formValues, [setting.setting_key]: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <input
                            type="text"
                            value={String(currentValue ?? '')}
                            onChange={(e) => setFormValues({ ...formValues, [setting.setting_key]: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        )}

                        <button
                          onClick={() => handleSaveSetting(setting)}
                          disabled={isSaving || !hasChanged}
                          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            hasChanged
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Guardando...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              {hasChanged ? 'Guardar Cambios' : 'Actualizado'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

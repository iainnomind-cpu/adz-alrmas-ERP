import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings as SettingsIcon, Save, Loader2 } from 'lucide-react';

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('category, setting_key');

    if (error) {
      console.error('Error loading settings:', error);
    } else {
      setSettings(data || []);
    }
    setLoading(false);
  };

  const updateSetting = async (settingId: string, newValue: any) => {
    setSaving(true);
    const { error } = await supabase
      .from('system_settings')
      .update({
        setting_value: newValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', settingId);

    if (!error) {
      setSettings(prev =>
        prev.map(s => s.id === settingId ? { ...s, setting_value: newValue } : s)
      );
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const settingsByCategory = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, SystemSetting[]>);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-8 h-8" />
          <h3 className="text-xl font-semibold">Configuración del Sistema</h3>
        </div>
        <p className="text-blue-100">
          Personalice los parámetros generales de funcionamiento
        </p>
      </div>

      {saving && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Guardando cambios...
        </div>
      )}

      {Object.keys(settingsByCategory).length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <SettingsIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay configuraciones disponibles
            </h3>
            <p className="text-gray-600">
              Las configuraciones del sistema se mostrarán aquí cuando estén disponibles.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(settingsByCategory).map(([category, categorySettings]) => (
            <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {category}
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {categorySettings.map((setting) => (
                  <div key={setting.id} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                    {setting.description && (
                      <p className="text-sm text-gray-600">{setting.description}</p>
                    )}

                    {typeof setting.setting_value === 'boolean' ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={setting.setting_value}
                          onChange={(e) => updateSetting(setting.id, e.target.checked)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {setting.setting_value ? 'Habilitado' : 'Deshabilitado'}
                        </span>
                      </label>
                    ) : typeof setting.setting_value === 'number' ? (
                      <input
                        type="number"
                        value={setting.setting_value}
                        onChange={(e) => updateSetting(setting.id, parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <input
                        type="text"
                        value={String(setting.setting_value)}
                        onChange={(e) => updateSetting(setting.id, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface VisibleFields {
  startTime: boolean;
  endTime: boolean;
  technicianName: boolean;
  customerName: boolean;
  estimatedAmount: boolean;
  materials: boolean;
  customerAcceptance: boolean;
  paymentStatus: boolean;
  address: boolean;
  internalNotes: boolean;
}

export interface ActiveFilters {
  technicians: string[];
  serviceTypes: string[];
  statuses: string[];
  priorities: string[];
  customers: string[];
  priceRange: [number, number];
}

export interface ColorScheme {
  critical: string;
  urgent: string;
  high: string;
  medium: string;
  low: string;
}

export interface SavedView {
  id: string;
  name: string;
  filters: ActiveFilters;
  visibleFields: VisibleFields;
  colorScheme: ColorScheme;
  createdAt: string;
}

export interface CalendarSettings {
  visibleFields: VisibleFields;
  activeFilters: ActiveFilters;
  savedViews: SavedView[];
  colorScheme: ColorScheme;
  theme: 'light' | 'dark';
  activeViewId: string | null;
}

const DEFAULT_SETTINGS: CalendarSettings = {
  visibleFields: {
    startTime: true,
    endTime: true,
    technicianName: true,
    customerName: true,
    estimatedAmount: false,
    materials: false,
    customerAcceptance: false,
    paymentStatus: false,
    address: false,
    internalNotes: false
  },
  activeFilters: {
    technicians: [],
    serviceTypes: [],
    statuses: [],
    priorities: [],
    customers: [],
    priceRange: [0, 999999]
  },
  savedViews: [],
  colorScheme: {
    critical: '#DC2626',
    urgent: '#F97316',
    high: '#EAB308',
    medium: '#3B82F6',
    low: '#10B981'
  },
  theme: 'light',
  activeViewId: null
};

export function useCalendarSettings() {
  const [settings, setSettings] = useState<CalendarSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        const localSettings = localStorage.getItem('calendarSettings');
        if (localSettings) {
          const parsed = JSON.parse(localSettings);
          // Migrar configuraciones antiguas
          setSettings({
            ...DEFAULT_SETTINGS,
            ...parsed,
            savedViews: parsed.savedViews?.map((view: any) => ({
              ...view,
              visibleFields: view.visibleFields || DEFAULT_SETTINGS.visibleFields,
              colorScheme: view.colorScheme || DEFAULT_SETTINGS.colorScheme,
              createdAt: view.createdAt || new Date().toISOString()
            })) || []
          });
        }
        setLoading(false);
        return;
      }

      const { data, error: dbError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (dbError) throw dbError;

      if (data) {
        const loadedSettings: CalendarSettings = {
          visibleFields: data.visible_fields || DEFAULT_SETTINGS.visibleFields,
          activeFilters: data.active_filters || DEFAULT_SETTINGS.activeFilters,
          savedViews: (data.saved_views || []).map((view: any) => ({
            ...view,
            visibleFields: view.visibleFields || DEFAULT_SETTINGS.visibleFields,
            colorScheme: view.colorScheme || DEFAULT_SETTINGS.colorScheme,
            createdAt: view.createdAt || new Date().toISOString()
          })),
          colorScheme: data.color_scheme || DEFAULT_SETTINGS.colorScheme,
          theme: data.theme || DEFAULT_SETTINGS.theme,
          activeViewId: data.active_view_id || null
        };
        setSettings(loadedSettings);
        localStorage.setItem('calendarSettings', JSON.stringify(loadedSettings));
      } else {
        await initializeUserPreferences(session.user.id);
        localStorage.setItem('calendarSettings', JSON.stringify(DEFAULT_SETTINGS));
      }
    } catch (err) {
      console.error('Error loading calendar settings:', err);
      setError('Error loading settings');
      const localSettings = localStorage.getItem('calendarSettings');
      if (localSettings) {
        try {
          const parsed = JSON.parse(localSettings);
          setSettings({
            ...DEFAULT_SETTINGS,
            ...parsed,
            savedViews: parsed.savedViews?.map((view: any) => ({
              ...view,
              visibleFields: view.visibleFields || DEFAULT_SETTINGS.visibleFields,
              colorScheme: view.colorScheme || DEFAULT_SETTINGS.colorScheme,
              createdAt: view.createdAt || new Date().toISOString()
            })) || []
          });
        } catch {
          setSettings(DEFAULT_SETTINGS);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeUserPreferences = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          visible_fields: DEFAULT_SETTINGS.visibleFields,
          active_filters: DEFAULT_SETTINGS.activeFilters,
          saved_views: DEFAULT_SETTINGS.savedViews,
          color_scheme: DEFAULT_SETTINGS.colorScheme,
          theme: DEFAULT_SETTINGS.theme,
          active_view_id: null
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error initializing user preferences:', err);
    }
  };

  const saveSettingsToDatabase = async (newSettings: CalendarSettings) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { error: dbError } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: session.user.id,
            visible_fields: newSettings.visibleFields,
            active_filters: newSettings.activeFilters,
            saved_views: newSettings.savedViews,
            color_scheme: newSettings.colorScheme,
            theme: newSettings.theme,
            active_view_id: newSettings.activeViewId,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (dbError) throw dbError;
      }

      localStorage.setItem('calendarSettings', JSON.stringify(newSettings));
    } catch (err) {
      console.error('Error saving to database:', err);
      // Aún guardamos en localStorage como fallback
      localStorage.setItem('calendarSettings', JSON.stringify(newSettings));
      throw err;
    }
  };

  const updateVisibleFields = async (fields: Partial<VisibleFields>) => {
    try {
      const newSettings = {
        ...settings,
        visibleFields: { ...settings.visibleFields, ...fields },
        activeViewId: null // Limpiar vista activa al hacer cambios manuales
      };

      await saveSettingsToDatabase(newSettings);
      setSettings(newSettings);
    } catch (err) {
      console.error('Error updating visible fields:', err);
      setError('Error updating settings');
    }
  };

  const updateActiveFilters = async (filters: Partial<ActiveFilters>) => {
    try {
      const newSettings = {
        ...settings,
        activeFilters: { ...settings.activeFilters, ...filters },
        activeViewId: null // Limpiar vista activa al hacer cambios manuales
      };

      await saveSettingsToDatabase(newSettings);
      setSettings(newSettings);
    } catch (err) {
      console.error('Error updating filters:', err);
      setError('Error updating filters');
    }
  };

  const updateColorScheme = async (colors: Partial<ColorScheme>) => {
    try {
      const newSettings = {
        ...settings,
        colorScheme: { ...settings.colorScheme, ...colors },
        activeViewId: null // Limpiar vista activa al hacer cambios manuales
      };

      await saveSettingsToDatabase(newSettings);
      setSettings(newSettings);
    } catch (err) {
      console.error('Error updating color scheme:', err);
      setError('Error updating colors');
    }
  };

  const saveView = async (name: string) => {
    try {
      const newView: SavedView = {
        id: `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        filters: { ...settings.activeFilters },
        visibleFields: { ...settings.visibleFields },
        colorScheme: { ...settings.colorScheme },
        createdAt: new Date().toISOString()
      };

      const newSettings = {
        ...settings,
        savedViews: [...settings.savedViews, newView]
      };

      await saveSettingsToDatabase(newSettings);
      setSettings(newSettings);
      return newView;
    } catch (err) {
      console.error('Error saving view:', err);
      setError('Error saving view');
      return null;
    }
  };

  const loadView = async (viewId: string) => {
    try {
      const view = settings.savedViews.find(v => v.id === viewId);
      if (!view) {
        throw new Error('Vista no encontrada');
      }

      const newSettings = {
        ...settings,
        activeFilters: { ...view.filters },
        visibleFields: { ...view.visibleFields },
        colorScheme: { ...view.colorScheme },
        activeViewId: viewId
      };

      await saveSettingsToDatabase(newSettings);
      setSettings(newSettings);

      // Retornar datos de la vista para confirmación
      return {
        success: true,
        view,
        message: `Vista "${view.name}" cargada correctamente`
      };
    } catch (err) {
      console.error('Error loading view:', err);
      setError('Error loading view');
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error desconocido'
      };
    }
  };

  const deleteView = async (viewId: string) => {
    try {
      const viewToDelete = settings.savedViews.find(v => v.id === viewId);
      if (!viewToDelete) {
        throw new Error('Vista no encontrada');
      }

      const newSettings = {
        ...settings,
        savedViews: settings.savedViews.filter(v => v.id !== viewId),
        activeViewId: settings.activeViewId === viewId ? null : settings.activeViewId
      };

      await saveSettingsToDatabase(newSettings);
      setSettings(newSettings);

      return {
        success: true,
        message: `Vista "${viewToDelete.name}" eliminada correctamente`
      };
    } catch (err) {
      console.error('Error deleting view:', err);
      setError('Error deleting view');
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error desconocido'
      };
    }
  };

  const clearAllFilters = async () => {
    await updateActiveFilters({
      technicians: [],
      serviceTypes: [],
      statuses: [],
      priorities: [],
      customers: [],
      priceRange: [0, 999999]
    });
  };

  const resetToDefaults = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const defaultSettings = {
        ...DEFAULT_SETTINGS,
        savedViews: [] // Mantener vistas guardadas al resetear
      };

      if (session?.user) {
        const { error: dbError } = await supabase
          .from('user_preferences')
          .update({
            visible_fields: defaultSettings.visibleFields,
            active_filters: defaultSettings.activeFilters,
            color_scheme: defaultSettings.colorScheme,
            theme: defaultSettings.theme,
            active_view_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', session.user.id);

        if (dbError) throw dbError;
      }

      const newSettings = {
        ...settings,
        ...defaultSettings
      };

      setSettings(newSettings);
      localStorage.setItem('calendarSettings', JSON.stringify(newSettings));

      return {
        success: true,
        message: 'Configuración restaurada a valores por defecto'
      };
    } catch (err) {
      console.error('Error resetting settings:', err);
      setError('Error resetting settings');
      return {
        success: false,
        error: 'Error al restaurar configuración'
      };
    }
  };

  const getActiveView = () => {
    if (!settings.activeViewId) return null;
    return settings.savedViews.find(v => v.id === settings.activeViewId) || null;
  };

  const hasUnsavedChanges = () => {
    const activeView = getActiveView();
    if (!activeView) return false;

    // Comparar configuración actual con la vista activa
    const currentConfig = {
      filters: settings.activeFilters,
      visibleFields: settings.visibleFields,
      colorScheme: settings.colorScheme
    };

    const viewConfig = {
      filters: activeView.filters,
      visibleFields: activeView.visibleFields,
      colorScheme: activeView.colorScheme
    };

    return JSON.stringify(currentConfig) !== JSON.stringify(viewConfig);
  };

  return {
    settings,
    loading,
    error,
    updateVisibleFields,
    updateActiveFilters,
    updateColorScheme,
    saveView,
    loadView,
    deleteView,
    clearAllFilters,
    resetToDefaults,
    getActiveView,
    hasUnsavedChanges,
    clearError: () => setError(null)
  };
}
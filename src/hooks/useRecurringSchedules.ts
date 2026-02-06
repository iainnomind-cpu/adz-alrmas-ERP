import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type RecurringSchedule = Database['public']['Tables']['recurring_schedules']['Row'];
type RecurringScheduleInsert = Database['public']['Tables']['recurring_schedules']['Insert'];
type RecurringScheduleUpdate = Database['public']['Tables']['recurring_schedules']['Update'];

interface UseRecurringSchedulesReturn {
  schedules: RecurringSchedule[];
  loading: boolean;
  error: string | null;
  loadRecurringSchedules: (filters?: {
    customerId?: string;
    isActive?: boolean;
  }) => Promise<void>;
  createRecurringSchedule: (data: RecurringScheduleInsert) => Promise<boolean>;
  updateRecurringSchedule: (id: string, data: RecurringScheduleUpdate) => Promise<boolean>;
  deleteRecurringSchedule: (id: string) => Promise<boolean>;
}

export function useRecurringSchedules(): UseRecurringSchedulesReturn {
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecurringSchedules = useCallback(
    async (filters?: { customerId?: string; isActive?: boolean }) => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('recurring_schedules')
          .select('*')
          .order('next_date', { ascending: true });

        if (filters?.customerId) {
          query = query.eq('customer_id', filters.customerId);
        }

        if (filters?.isActive !== undefined) {
          query = query.eq('is_active', filters.isActive);
        }

        const { data, error: queryError } = await query;

        if (queryError) {
          throw queryError;
        }

        setSchedules(data || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar horarios recurrentes';
        setError(errorMessage);
        console.error('Error loading recurring schedules:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createRecurringSchedule = useCallback(async (data: RecurringScheduleInsert): Promise<boolean> => {
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('recurring_schedules')
        .insert([data]);

      if (insertError) {
        throw insertError;
      }

      await loadRecurringSchedules();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear horario recurrente';
      setError(errorMessage);
      console.error('Error creating recurring schedule:', err);
      return false;
    }
  }, [loadRecurringSchedules]);

  const updateRecurringSchedule = useCallback(
    async (id: string, data: RecurringScheduleUpdate): Promise<boolean> => {
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('recurring_schedules')
          .update(data)
          .eq('id', id);

        if (updateError) {
          throw updateError;
        }

        await loadRecurringSchedules();
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al actualizar horario recurrente';
        setError(errorMessage);
        console.error('Error updating recurring schedule:', err);
        return false;
      }
    },
    [loadRecurringSchedules]
  );

  const deleteRecurringSchedule = useCallback(async (id: string): Promise<boolean> => {
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('recurring_schedules')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      await loadRecurringSchedules();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar horario recurrente';
      setError(errorMessage);
      console.error('Error deleting recurring schedule:', err);
      return false;
    }
  }, [loadRecurringSchedules]);

  return {
    schedules,
    loading,
    error,
    loadRecurringSchedules,
    createRecurringSchedule,
    updateRecurringSchedule,
    deleteRecurringSchedule,
  };
}

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { CalendarEvent } from '../types/calendar.types';

interface RescheduleResult {
  success: boolean;
  movedCount: number;
  errors: string[];
}

export function useBulkReschedule() {
  const [undoHistory, setUndoHistory] = useState<Array<{ events: CalendarEvent[]; timestamp: Date }>>([]);

  const validateTechnicianCapacity = async (technicianId: string, date: Date): Promise<boolean> => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: orders, error } = await supabase
      .from('service_orders')
      .select('id, estimated_duration_minutes')
      .eq('technician_id', technicianId)
      .gte('scheduled_date', startOfDay.toISOString())
      .lte('scheduled_date', endOfDay.toISOString());

    if (error) {
      console.error('Error validating capacity:', error);
      return false;
    }

    const totalMinutes = (orders || []).reduce((sum, order) => sum + (order.estimated_duration_minutes || 120), 0);
    const maxMinutesPerDay = 8 * 60;

    return totalMinutes < maxMinutesPerDay;
  };

  const calculateOptimalTime = (technicianId: string, date: Date, index: number): Date => {
    const optimalTime = new Date(date);
    optimalTime.setHours(8 + index * 2, 0, 0, 0);
    return optimalTime;
  };

  const rescheduleEvents = async (
    events: CalendarEvent[],
    newDate: Date,
    mode: 'same-time' | 'by-technician' | 'distribute',
    timeOffset: number = 0
  ): Promise<RescheduleResult> => {
    const result: RescheduleResult = {
      success: true,
      movedCount: 0,
      errors: []
    };

    try {
      const movedEvents: CalendarEvent[] = [];

      if (mode === 'same-time') {
        for (const event of events) {
          try {
            const newDateTime = new Date(newDate);
            const originalTime = new Date(event.start);
            newDateTime.setHours(originalTime.getHours() + timeOffset, originalTime.getMinutes());

            const { error } = await supabase
              .from('service_orders')
              .update({
                scheduled_date: newDateTime.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', event.id);

            if (error) {
              result.errors.push(`${event.title}: ${error.message}`);
            } else {
              movedEvents.push(event);
              result.movedCount++;
            }
          } catch (err) {
            result.errors.push(`${event.title}: Error desconocido`);
          }
        }
      } else if (mode === 'by-technician') {
        const groupedByTech = events.reduce((acc, event) => {
          const techId = event.technicianId || 'unassigned';
          if (!acc[techId]) acc[techId] = [];
          acc[techId].push(event);
          return acc;
        }, {} as Record<string, CalendarEvent[]>);

        for (const [techId, techEvents] of Object.entries(groupedByTech)) {
          const canMove = await validateTechnicianCapacity(techId, newDate);

          if (!canMove) {
            result.errors.push(`Técnico ${techId}: Supera carga de trabajo diaria`);
            continue;
          }

          for (let i = 0; i < techEvents.length; i++) {
            const event = techEvents[i];
            try {
              const optimalTime = calculateOptimalTime(techId, newDate, i);

              const { error } = await supabase
                .from('service_orders')
                .update({
                  scheduled_date: optimalTime.toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', event.id);

              if (error) {
                result.errors.push(`${event.title}: ${error.message}`);
              } else {
                movedEvents.push(event);
                result.movedCount++;
              }
            } catch (err) {
              result.errors.push(`${event.title}: Error desconocido`);
            }
          }
        }
      } else if (mode === 'distribute') {
        const sortedByPriority = [...events].sort((a, b) => {
          const priorityOrder = { critical: 0, urgent: 1, high: 2, medium: 3, low: 4 };
          return (priorityOrder[a.priority as keyof typeof priorityOrder] || 5) -
                 (priorityOrder[b.priority as keyof typeof priorityOrder] || 5);
        });

        for (let i = 0; i < sortedByPriority.length; i++) {
          const event = sortedByPriority[i];
          const dayOffset = Math.floor(i / 3);
          const eventDate = new Date(newDate);
          eventDate.setDate(eventDate.getDate() + dayOffset);

          try {
            const newDateTime = new Date(eventDate);
            const hour = 8 + ((i % 3) * 2);
            newDateTime.setHours(hour, 0, 0, 0);

            const { error } = await supabase
              .from('service_orders')
              .update({
                scheduled_date: newDateTime.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', event.id);

            if (error) {
              result.errors.push(`${event.title}: ${error.message}`);
            } else {
              movedEvents.push(event);
              result.movedCount++;
            }
          } catch (err) {
            result.errors.push(`${event.title}: Error desconocido`);
          }
        }
      }

      if (movedEvents.length > 0) {
        await logBulkChange('reschedule', movedEvents, newDate, mode);
        setUndoHistory(prev => [...prev.slice(-9), { events: movedEvents, timestamp: new Date() }]);
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.success = false;
      result.errors.push('Error general en el proceso de reagendamiento');
    }

    return result;
  };

  const logBulkChange = async (
    action: string,
    events: CalendarEvent[],
    targetDate: Date,
    mode: string
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('bulk_change_log')
        .insert({
          action,
          event_ids: events.map(e => e.id),
          event_count: events.length,
          target_date: targetDate.toISOString(),
          mode,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging bulk change:', error);
      }
    } catch (err) {
      console.error('Error in logBulkChange:', err);
    }
  };

  const undoLastChange = async (): Promise<boolean> => {
    if (undoHistory.length === 0) return false;

    const lastChange = undoHistory[undoHistory.length - 1];

    try {
      for (const event of lastChange.events) {
        await supabase
          .from('service_orders')
          .update({
            scheduled_date: event.start.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id);
      }

      setUndoHistory(prev => prev.slice(0, -1));
      return true;
    } catch (error) {
      console.error('Error undoing changes:', error);
      return false;
    }
  };

  return {
    rescheduleEvents,
    undoLastChange,
    canUndo: undoHistory.length > 0,
    undoCount: undoHistory.length
  };
}

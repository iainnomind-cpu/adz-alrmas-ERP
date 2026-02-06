import { supabase } from './supabase';
import type { CalendarEvent, EventPriority, EventStatus } from '../types/calendar.types';
import type { Database } from './database.types';

type RecurringSchedule = Database['public']['Tables']['recurring_schedules']['Row'] & {
  customers?: {
    id: string;
    name: string;
    phone?: string;
    address?: string;
  };
};

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function getNextOccurrence(
  lastDate: Date,
  frequency: 'monthly' | 'quarterly' | 'semiannual' | 'annual'
): Date {
  switch (frequency) {
    case 'monthly':
      return addMonths(lastDate, 1);
    case 'quarterly':
      return addMonths(lastDate, 3);
    case 'semiannual':
      return addMonths(lastDate, 6);
    case 'annual':
      return addMonths(lastDate, 12);
    default:
      return lastDate;
  }
}

export async function generateRecurringEvents(
  scheduleId: string,
  monthsAhead: number = 12
): Promise<CalendarEvent[]> {
  try {
    const { data: schedule, error } = await supabase
      .from('recurring_schedules')
      .select(`
        *,
        customers (
          id,
          name,
          phone,
          address
        )
      `)
      .eq('id', scheduleId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching recurring schedule:', error);
      return [];
    }

    if (!schedule) {
      return [];
    }

    const events: CalendarEvent[] = [];
    let currentDate = new Date(schedule.next_date);
    const endDate = addMonths(new Date(), monthsAhead);

    while (currentDate <= endDate) {
      const eventId = `recurring-${schedule.id}-${currentDate.toISOString().split('T')[0]}`;

      events.push({
        id: eventId,
        title: `${schedule.service_type} - ${schedule.customers?.name || 'Cliente'}`,
        description: schedule.notes || `Mantenimiento programado: ${schedule.service_type}`,
        start: new Date(currentDate),
        end: new Date(currentDate),
        type: 'maintenance',
        priority: 'medium' as EventPriority,
        status: 'requested' as EventStatus,
        customerId: schedule.customer_id,
        customerName: schedule.customers?.name,
        color: 'bg-blue-500',
        isRecurring: true,
        recurringScheduleId: schedule.id,
      });

      currentDate = getNextOccurrence(currentDate, schedule.frequency);
    }

    return events;
  } catch (error) {
    console.error('Error generating recurring events:', error);
    return [];
  }
}

export async function generateAllRecurringEvents(
  customerId?: string,
  monthsAhead: number = 12
): Promise<CalendarEvent[]> {
  try {
    let query = supabase
      .from('recurring_schedules')
      .select(`
        *,
        customers (
          id,
          name,
          phone,
          address
        )
      `)
      .eq('is_active', true);

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data: schedules, error } = await query;

    if (error) {
      console.error('Error fetching recurring schedules:', error);
      return [];
    }

    if (!schedules || schedules.length === 0) {
      return [];
    }

    const allEvents: CalendarEvent[] = [];

    for (const schedule of schedules) {
      const events = await generateRecurringEvents(schedule.id, monthsAhead);
      allEvents.push(...events);
    }

    return allEvents;
  } catch (error) {
    console.error('Error generating all recurring events:', error);
    return [];
  }
}

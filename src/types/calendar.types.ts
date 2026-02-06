export type EventPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';

export type EventType = 'service_order' | 'maintenance' | 'installation' | 'inspection' | 'meeting' | 'other';

export type EventStatus = 'requested' | 'assigned' | 'in_progress' | 'paused' | 'completed' | 'paid' | 'invoiced';

export type CalendarViewMode = 'month' | 'week' | 'day';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  type: EventType;
  priority: EventPriority;
  status: EventStatus;
  relatedServiceOrder?: string;
  customerId?: string;
  customerName?: string;
  technicianId?: string;
  technicianName?: string;
  color?: string;
  rescheduleCount?: number;
  daysOverdue?: number;
  originalScheduledDate?: Date;
  lastRescheduledAt?: Date;
  isRecurring?: boolean;
  recurringScheduleId?: string;
  recurringSchedule?: {
    frequency: 'monthly' | 'quarterly' | 'semiannual' | 'annual';
    service_type: string;
  };
  isModifiedFromSeries?: boolean;
  estimatedAmount?: number;
  address?: string;
  materials?: string[];
  customerAcceptance?: boolean;
  paymentStatus?: 'pending' | 'partial' | 'completed';
  internalNotes?: string;
}

export interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

export interface CalendarFilters {
  priority?: EventPriority[];
  status?: EventStatus[];
  type?: EventType[];
  technicianId?: string;
}

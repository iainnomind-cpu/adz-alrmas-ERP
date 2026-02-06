import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { generateAllRecurringEvents } from '../../lib/recurringEvents';
import toast, { Toaster } from 'react-hot-toast';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Filter,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Repeat,
  Settings,
  Plus
} from 'lucide-react';
import type { CalendarEvent, CalendarFilters, DayCell, EventPriority, EventStatus, CalendarViewMode } from '../../types/calendar.types';
import { RecurringEvents } from './RecurringEvents';
import { RecurringEventTooltip } from './RecurringEventTooltip';
import { EditRecurringEventModal } from './EditRecurringEventModal';
import { EventCard } from './EventCard';
import { EventDetailModal } from './EventDetailModal';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarDayView } from './CalendarDayView';
import { BulkReschedule } from './BulkReschedule';
import { CriticalPriorityModal } from './CriticalPriorityModal';
import { CalendarSettings } from './CalendarSettings';
import { FilterBar } from './FilterBar';
import type { CalendarConcept } from './ConceptsManager';
import { ConceptsSidebar } from './ConceptsSidebar';
import { useBulkReschedule } from '../../hooks/useBulkReschedule';
import { useCalendarSettings } from '../../hooks/useCalendarSettings';
import { NewServiceOrderForm } from '../FSM/NewServiceOrderForm';

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CalendarFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringEvents, setRecurringEvents] = useState<CalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedEventDetail, setSelectedEventDetail] = useState<CalendarEvent | null>(null);

  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ event: CalendarEvent; newDate: Date } | null>(null);
  const [validationError, setValidationError] = useState<string>('');

  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showEditRecurringModal, setShowEditRecurringModal] = useState(false);
  const [recurringEventToEdit, setRecurringEventToEdit] = useState<{ event: CalendarEvent; newDate: Date } | null>(null);

  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [showBulkReschedule, setShowBulkReschedule] = useState(false);
  const [showCriticalModal, setShowCriticalModal] = useState(false);
  const [criticalEvent, setCriticalEvent] = useState<CalendarEvent | null>(null);

  const [showCalendarSettings, setShowCalendarSettings] = useState(false);
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const { settings: calendarSettings } = useCalendarSettings();

  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);

  const [draggedConcept, setDraggedConcept] = useState<CalendarConcept | null>(null);
  const [conceptsRefreshTrigger, setConceptsRefreshTrigger] = useState(0);
  const [showConceptsSidebar, setShowConceptsSidebar] = useState(true);

  const { rescheduleEvents, undoLastChange, canUndo, undoCount } = useBulkReschedule();

  useEffect(() => {
    loadEvents();
    loadRecurringEvents();
  }, [currentDate]);

  useEffect(() => {
    applyFilters();
  }, [events, calendarSettings.activeFilters]);

  const loadRecurringEvents = async () => {
    try {
      const generatedRecurringEvents = await generateAllRecurringEvents();
      setRecurringEvents(generatedRecurringEvents);
    } catch (error) {
      console.error('Error loading recurring events:', error);
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const extendedStart = new Date(startOfMonth);
      extendedStart.setMonth(extendedStart.getMonth() - 2);

      const extendedEnd = new Date(endOfMonth);
      extendedEnd.setMonth(extendedEnd.getMonth() + 2);

      const { data: serviceOrders, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          customers (name, address),
          technicians (full_name)
        `)
        .or(`and(scheduled_date.gte.${startOfMonth.toISOString()},scheduled_date.lte.${endOfMonth.toISOString()}),and(scheduled_date.is.null,created_at.gte.${startOfMonth.toISOString()},created_at.lte.${endOfMonth.toISOString()})`)
        .order('scheduled_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const { data: scheduledConcepts, error: conceptsError } = await supabase
        .from('calendar_concepts')
        .select(`
          *,
          customers!left (name, address)
        `)
        .eq('is_scheduled', true)
        .gte('scheduled_date', extendedStart.toISOString())
        .lte('scheduled_date', extendedEnd.toISOString())
        .order('scheduled_date', { ascending: true });

      if (conceptsError) {
        console.error('Error loading scheduled concepts:', conceptsError);
        console.error('Error details:', conceptsError.message);
      } else {
        const conceptsArr = (scheduledConcepts as any[]) || [];
        console.log('DEBUG: Loaded scheduled concepts from DB count:', conceptsArr.length);
      }

      const mappedServiceOrders: CalendarEvent[] = ((serviceOrders as any[]) || []).map(order => {
        const scheduledDate = order.scheduled_date ? new Date(order.scheduled_date) : new Date(order.created_at);

        return {
          id: order.id,
          title: `${order.order_number} - ${order.customers?.name || 'Cliente'}`,
          description: order.description,
          start: scheduledDate,
          end: order.completed_at ? new Date(order.completed_at) : scheduledDate,
          type: mapServiceTypeToEventType(order.service_type),
          priority: order.priority as EventPriority,
          status: order.status as EventStatus,
          relatedServiceOrder: order.id,
          customerId: order.customer_id,
          customerName: order.customers?.name,
          technicianId: order.technician_id,
          technicianName: order.technicians?.full_name,
          color: getEventColor(order.priority, order.status),
          rescheduleCount: order.reschedule_count || 0,
          daysOverdue: order.days_overdue || 0,
          originalScheduledDate: order.original_scheduled_date ? new Date(order.original_scheduled_date) : undefined,
          lastRescheduledAt: order.last_rescheduled_at ? new Date(order.last_rescheduled_at) : undefined
        };
      });

      const mappedConcepts: CalendarEvent[] = ((scheduledConcepts as any[]) || []).map(concept => {
        const scheduledDate = new Date(concept.scheduled_date);
        const endDate = new Date(scheduledDate);
        endDate.setMinutes(endDate.getMinutes() + concept.duration_minutes);

        const conceptTitle = concept.title || concept.customers?.name || 'Concepto sin título';

        return {
          id: `concept-${concept.id}`,
          title: conceptTitle,
          description: concept.description,
          start: scheduledDate,
          end: endDate,
          type: 'other',
          priority: concept.priority as EventPriority,
          status: 'requested' as EventStatus,
          customerId: concept.customer_id,
          customerName: concept.customers?.name,
          technicianId: concept.assigned_to,
          color: getEventColor(concept.priority, 'requested'),
          estimatedAmount: concept.estimated_amount,
          internalNotes: concept.notes
        };
      });

      console.log('DEBUG: Final combined events for state:', [...mappedServiceOrders, ...mappedConcepts].map(e => ({ id: e.id, title: e.title, start: e.start })));
      setEvents([...mappedServiceOrders, ...mappedConcepts]);
    } catch (error) {
      console.error('Error loading calendar events:', error);
      toast.error('Error al cargar los eventos del calendario');
    } finally {
      setLoading(false);
    }
  };

  const mapServiceTypeToEventType = (serviceType: string) => {
    switch (serviceType) {
      case 'installation': return 'installation';
      case 'preventive': return 'maintenance';
      case 'corrective': return 'maintenance';
      default: return 'service_order';
    }
  };

  const getEventColor = (priority: string, status: string) => {
    if (status === 'completed' || status === 'paid') return '#10B981'; // emerald-500
    if (status === 'paused') return '#F97316'; // orange-500

    // Usar colores del esquema (siempre HEX en el hook)
    const colorScheme = calendarSettings.colorScheme;
    switch (priority) {
      case 'critical': return colorScheme.critical;
      case 'urgent': return colorScheme.urgent;
      case 'high': return colorScheme.high;
      case 'medium': return colorScheme.medium;
      case 'low': return colorScheme.low;
      default: return '#6B7280'; // gray-500
    }
  };

  const validateDrop = async (event: CalendarEvent, targetDate: Date): Promise<{ valid: boolean; error?: string }> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    if (target < today) {
      return { valid: false, error: 'No se puede mover a fechas pasadas' };
    }

    if (event.technicianId) {
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: conflictingOrders, error: queryError } = await supabase
        .from('service_orders')
        .select('id, order_number, scheduled_date, created_at')
        .eq('technician_id', event.technicianId)
        .neq('id', event.id)
        .or(`and(scheduled_date.gte.${startOfDay.toISOString()},scheduled_date.lte.${endOfDay.toISOString()}),and(scheduled_date.is.null,created_at.gte.${startOfDay.toISOString()},created_at.lte.${endOfDay.toISOString()})`);

      if (queryError) {
        console.error('Error checking technician availability:', queryError);
      }

      if (conflictingOrders && conflictingOrders.length > 0) {
        return {
          valid: false,
          error: `El técnico ya tiene ${conflictingOrders.length} orden(es) programada(s) ese día`
        };
      }
    }

    return { valid: true };
  };

  const updateEventSchedule = async (eventId: string, newDate: Date) => {
    try {
      const scheduledDateTime = new Date(newDate);
      scheduledDateTime.setHours(8, 0, 0, 0);

      const isConcept = eventId.startsWith('concept-');

      if (isConcept) {
        const conceptId = eventId.replace('concept-', '');

        const { error } = await supabase
          .from('calendar_concepts')
          .update({
            scheduled_date: scheduledDateTime.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', conceptId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('service_orders')
          .update({
            scheduled_date: scheduledDateTime.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', eventId);

        if (error) throw error;
      }

      await loadEvents();

      return { success: true };
    } catch (error) {
      console.error('Error updating schedule:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar la fecha'
      };
    }
  };

  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    setDraggedEvent(event);
    setIsDragging(true);

    (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setIsDragging(false);
    setDragOverDate(null);
  };

  const handleDragOver = (e: React.DragEvent, date: Date, hour?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(date);
    // hour parameter can be used for more precise preview logic if needed in the future
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverDate(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date, hour?: number) => {
    e.preventDefault();
    setDragOverDate(null);

    if (draggedConcept) {
      await handleConceptDrop(draggedConcept, targetDate, hour);
      return;
    }

    if (!draggedEvent) return;

    setValidationError('');

    const validation = await validateDrop(draggedEvent, targetDate);

    if (!validation.valid) {
      setValidationError(validation.error || 'Movimiento no válido');
      setDraggedEvent(null);
      toast.error(validation.error || 'Movimiento no válido');
      setTimeout(() => setValidationError(''), 5000);
      return;
    }

    if (draggedEvent.isRecurring) {
      setRecurringEventToEdit({ event: draggedEvent, newDate: targetDate });
      setShowEditRecurringModal(true);
      return;
    }

    if (draggedEvent.status === 'in_progress') {
      setPendingMove({ event: draggedEvent, newDate: targetDate });
      setShowConfirmDialog(true);
      return;
    }

    await performMove(draggedEvent, targetDate);
    setDraggedEvent(null);
  };

  const performMove = async (event: CalendarEvent, newDate: Date) => {
    const result = await updateEventSchedule(event.id, newDate);

    if (!result.success) {
      setValidationError(result.error || 'Error al mover el evento');
      toast.error(result.error || 'Error al mover el evento');
      setTimeout(() => setValidationError(''), 5000);
    } else {
      toast.success(`Evento movido al ${newDate.toLocaleDateString('es-ES')}`);
    }
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar "${event.title}"?`)) {
      return;
    }

    try {
      if (event.id.startsWith('concept-')) {
        const conceptId = event.id.replace('concept-', '');

        const { error } = await supabase
          .from('calendar_concepts')
          .delete()
          .eq('id', conceptId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('service_orders')
          .delete()
          .eq('id', event.id);

        if (error) throw error;
      }

      setSelectedEventDetail(null);
      await loadEvents();
      setConceptsRefreshTrigger(prev => prev + 1);
      toast.success('Evento eliminado correctamente');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Error al eliminar el evento');
    }
  };

  const handleConfirmMove = async () => {
    if (pendingMove) {
      await performMove(pendingMove.event, pendingMove.newDate);
      setPendingMove(null);
      setShowConfirmDialog(false);
      setDraggedEvent(null);
    }
  };

  const handleCancelMove = () => {
    setPendingMove(null);
    setShowConfirmDialog(false);
    setDraggedEvent(null);
  };

  const handleEditRecurringEvent = async (option: 'single' | 'future' | 'all') => {
    if (!recurringEventToEdit) return;

    const { event, newDate } = recurringEventToEdit;

    try {
      if (option === 'single') {
        await createSingleServiceOrder(event, newDate);
      } else if (option === 'future') {
        await updateRecurringScheduleNextDate(event.recurringScheduleId!, newDate);
      } else if (option === 'all') {
        await updateRecurringScheduleBaseDate(event.recurringScheduleId!, newDate);
      }

      await loadEvents();
      await loadRecurringEvents();
      setRecurringEventToEdit(null);
      setShowEditRecurringModal(false);
      setDraggedEvent(null);
      toast.success('Evento recurrente actualizado');
    } catch (error) {
      console.error('Error editing recurring event:', error);
      setValidationError('Error al modificar el evento recurrente');
      toast.error('Error al modificar el evento recurrente');
      setTimeout(() => setValidationError(''), 5000);
    }
  };

  const createSingleServiceOrder = async (event: CalendarEvent, newDate: Date) => {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', event.customerId)
      .maybeSingle();

    if (customerError || !customer) {
      throw new Error('Cliente no encontrado');
    }

    const orderNumber = `SO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const scheduledDateTime = new Date(newDate);
    scheduledDateTime.setHours(8, 0, 0, 0);

    const { error } = await supabase
      .from('service_orders')
      .insert({
        customer_id: event.customerId!,
        technician_id: event.technicianId!,
        order_number: orderNumber,
        description: `${event.description} (Modificado de serie recurrente)`,
        priority: event.priority,
        service_type: event.recurringSchedule?.service_type || 'preventive',
        status: 'assigned',
        scheduled_date: scheduledDateTime.toISOString(),
        estimated_duration_minutes: 120,
        labor_cost: 0,
        materials_cost: 0,
        total_cost: 0
      });

    if (error) throw error;
  };

  const updateRecurringScheduleNextDate = async (scheduleId: string, newDate: Date) => {
    const { error } = await (supabase as any)
      .from('recurring_schedules')
      .update({
        next_date: newDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId);

    if (error) throw error;
  };

  const updateRecurringScheduleBaseDate = async (scheduleId: string, newDate: Date) => {
    const { error } = await (supabase as any)
      .from('recurring_schedules')
      .update({
        next_date: newDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId);

    if (error) throw error;
  };

  const handleEventHover = (e: React.MouseEvent, event: CalendarEvent) => {
    if (!event.isRecurring) return;

    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }

    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
    setHoveredEvent(event);
  };

  const handleEventLeave = () => {
    const timeout = setTimeout(() => {
      setHoveredEvent(null);
    }, 300);

    setTooltipTimeout(timeout);
  };

  const handleTooltipMouseEnter = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
  };

  const handleTooltipMouseLeave = () => {
    setHoveredEvent(null);
  };

  const getUpcomingRecurringEvents = (event: CalendarEvent): CalendarEvent[] => {
    if (!event.recurringScheduleId) return [];

    return recurringEvents
      .filter(e =>
        e.recurringScheduleId === event.recurringScheduleId &&
        new Date(e.start) >= new Date(event.start)
      )
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(1, 4);
  };

  const toggleEventSelection = (eventId: string) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEvents(newSelected);
  };

  const applyFilters = () => {
    let allEvents = [...events, ...recurringEvents];
    const filters = calendarSettings.activeFilters;

    const filtered = allEvents.filter(event => {
      if (filters.technicians.length > 0 && event.technicianId && !filters.technicians.includes(event.technicianId)) {
        return false;
      }

      if (filters.customers.length > 0 && event.customerId && !filters.customers.includes(event.customerId)) {
        return false;
      }

      if (filters.serviceTypes.length > 0 && !filters.serviceTypes.includes(event.type)) {
        return false;
      }

      if (filters.statuses.length > 0 && !filters.statuses.includes(event.status)) {
        return false;
      }

      if (filters.priorities.length > 0 && !filters.priorities.includes(event.priority)) {
        return false;
      }

      if (event.estimatedAmount !== undefined) {
        if (event.estimatedAmount < filters.priceRange[0] || event.estimatedAmount > filters.priceRange[1]) {
          return false;
        }
      }

      return true;
    });

    setFilteredEvents(filtered);
  };

  const handleBulkReschedule = async (newDate: Date, timeOffset: number, mode: 'same-time' | 'by-technician' | 'distribute' = 'same-time') => {
    const eventsToMove = [...events, ...recurringEvents].filter(e => selectedEvents.has(e.id));
    const result = await rescheduleEvents(eventsToMove, newDate, mode, timeOffset);

    if (result.success) {
      await loadEvents();
      setSelectedEvents(new Set());
      setShowBulkReschedule(false);
      setValidationError('');
      toast.success(`${result.movedCount} eventos movidos exitosamente`);
    } else {
      setValidationError(`Se movieron ${result.movedCount} eventos. Errores: ${result.errors.join(', ')}`);
      toast.error(`Error moviendo algunos eventos`);
    }
  };

  const getSuggestedEventsForCritical = (criticalEvent: CalendarEvent): CalendarEvent[] => {
    const allEvents = [...events, ...recurringEvents];
    const onSameDay = allEvents.filter(e => {
      const eventDate = new Date(e.start);
      const criticalDate = new Date(criticalEvent.start);
      return (
        eventDate.getDate() === criticalDate.getDate() &&
        eventDate.getMonth() === criticalDate.getMonth() &&
        eventDate.getFullYear() === criticalDate.getFullYear() &&
        e.id !== criticalEvent.id
      );
    });

    return onSameDay.sort((a, b) => {
      const priorityOrder = { critical: 0, urgent: 1, high: 2, medium: 3, low: 4 };
      return (priorityOrder[b.priority as keyof typeof priorityOrder] || 5) -
        (priorityOrder[a.priority as keyof typeof priorityOrder] || 5);
    });
  };

  const getAvailableTechnicians = (targetDate: Date): Array<{ id: string; name: string; count: number }> => {
    const allEvents = [...events, ...recurringEvents];
    const techMap = new Map<string, { name: string; count: number }>();

    allEvents.forEach(event => {
      const eventDate = new Date(event.start);
      if (eventDate.getDate() === targetDate.getDate() &&
        eventDate.getMonth() === targetDate.getMonth() &&
        eventDate.getFullYear() === targetDate.getFullYear()) {
        const techId = event.technicianId || 'unassigned';
        const existing = techMap.get(techId);
        techMap.set(techId, {
          name: event.technicianName || 'Sin Asignar',
          count: (existing?.count || 0) + 1
        });
      }
    });

    return Array.from(techMap.entries()).map(([id, data]) => ({ id, ...data }));
  };

  const handleConceptDrop = async (concept: CalendarConcept, targetDate: Date, hour?: number) => {
    try {
      const scheduledDate = new Date(targetDate);
      if (hour !== undefined) {
        scheduledDate.setHours(hour, 0, 0, 0);
      } else {
        scheduledDate.setHours(9, 0, 0, 0);
      }

      console.log('Creating new concept instance:', {
        originalConceptId: concept.id,
        conceptTitle: concept.title,
        scheduledDate: scheduledDate.toISOString()
      });

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setValidationError('Usuario no autenticado. Por favor, inicie sesión.');
        toast.error('Usuario no autenticado. Por favor, inicie sesión.');
        setDraggedConcept(null);
        return;
      }

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('calendar_concepts')
        .insert({
          concept_type: concept.concept_type,
          title: concept.title,
          description: concept.description,
          duration_minutes: concept.duration_minutes,
          customer_id: concept.customer_id,
          assigned_to: concept.assigned_to,
          estimated_amount: concept.estimated_amount,
          priority: concept.priority,
          notes: concept.notes,
          is_scheduled: true,
          scheduled_date: scheduledDate.toISOString(),
          created_by: user.id,
          created_at: now,
          updated_at: now
        })
        .select();

      if (error) throw error;

      console.log('Concept instance created successfully:', data);

      setDraggedConcept(null);
      await loadEvents();
      toast.success('Concepto programado exitosamente');
    } catch (error) {
      console.error('Error scheduling concept:', error);
      setValidationError('Error al programar el concepto. Intente nuevamente.');
      toast.error('Error al programar el concepto');
      setDraggedConcept(null);
    }
  };

  const handleViewLoaded = (viewName: string) => {
    // Recargar eventos para aplicar los filtros de la vista cargada
    setTimeout(() => {
      applyFilters();
    }, 100);
  };

  const generateCalendarDays = (): DayCell[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayWeekday = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    // Usar eventos filtrados en lugar de todos los eventos
    const allEvents = [...filteredEvents];

    console.log('=== DEBUGGING CALENDAR DAYS ===');
    console.log('Current date:', currentDate);
    console.log('Total service orders/concepts:', events.length);
    console.log('Total recurring events:', recurringEvents.length);
    console.log('Filtered events:', filteredEvents.length);
    console.log('Combined filtered events:', allEvents.length);

    const days: DayCell[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstDayWeekday; i++) {
      const date = new Date(year, month, -firstDayWeekday + i + 1);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: []
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toDateString();
      const dayEvents = allEvents.filter(event => {
        const eventDate = new Date(event.start);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.toDateString() === dateStr;
      });

      if (dayEvents.length > 0) {
        console.log(`Day ${day}: ${dayEvents.length} events`, dayEvents.map(e => ({
          id: e.id,
          title: e.title,
          isRecurring: e.isRecurring,
          color: e.color
        })));
      }

      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        events: dayEvents
      });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: []
      });
    }

    return days;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isValidDropZone = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return target >= today;
  };

  const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const calendarDays = generateCalendarDays();

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical': return 'Crítico';
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'requested': return 'Solicitado';
      case 'assigned': return 'Asignado';
      case 'in_progress': return 'En Progreso';
      case 'paused': return 'Pausado';
      case 'completed': return 'Completado';
      case 'paid': return 'Pagado';
      case 'invoiced': return 'Facturado';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#333',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          },
        }}
      />

      {validationError && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800 font-medium">{validationError}</p>
          <button
            onClick={() => setValidationError('')}
            className="ml-auto p-1 hover:bg-red-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
      )}

      {showConfirmDialog && pendingMove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Confirmar Movimiento</h3>
            </div>

            <div className="mb-6 space-y-3">
              <p className="text-gray-700">
                Este servicio está <span className="font-semibold text-yellow-600">en progreso</span>.
              </p>
              <p className="text-gray-600">
                ¿Está seguro de mover la orden <span className="font-semibold">{pendingMove.event.title}</span> al <span className="font-semibold">{pendingMove.newDate.toLocaleDateString('es-ES')}</span>?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelMove}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmMove}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              <button
                onClick={previousMonth}
                className="p-1.5 hover:bg-gray-50 rounded-md transition-colors text-gray-600"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-4 py-1 border-x border-gray-100 min-w-[140px] text-center">
                <span className="text-lg font-semibold text-gray-900 capitalize block leading-none">
                  {monthName.split(' ')[0]}
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  {monthName.split(' ')[2]}
                </span>
              </div>
              <button
                onClick={nextMonth}
                className="p-1.5 hover:bg-gray-50 rounded-md transition-colors text-gray-600"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={goToToday}
              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
            >
              Hoy
            </button>
          </div>

          <div className="flex items-center gap-2 bg-gray-100/50 p-1 rounded-lg">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === mode
                  ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                  }`}
              >
                {mode === 'month' ? 'Mes' : mode === 'week' ? 'Semana' : 'Día'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => setShowNewOrderForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Evento</span>
            </button>

            <div className="h-6 w-px bg-gray-300 mx-1"></div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors relative ${showFilters ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
                }`}
              title="Filtros"
            >
              <Filter className="w-5 h-5" />
              {Object.keys(filters).length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full border border-white"></span>
              )}
            </button>

            <button
              onClick={() => setShowRecurringModal(true)}
              className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
              title="Programar Recurrente"
            >
              <Repeat className="w-5 h-5" />
            </button>

            <button
              onClick={() => setMultiSelectMode(!multiSelectMode)}
              className={`p-2 rounded-lg transition-colors ${multiSelectMode ? 'bg-purple-50 text-purple-600' : 'hover:bg-gray-100 text-gray-600'
                }`}
              title="Selección Múltiple"
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowCalendarSettings(true)}
              className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
              title="Configuración"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showFilters && (
          <FilterBar
            technicians={Array.from(
              new Map(
                [...events, ...recurringEvents]
                  .filter(e => e.technicianId && e.technicianName)
                  .map(e => [e.technicianId, { id: e.technicianId!, name: e.technicianName! }])
              ).values()
            )}
            customers={Array.from(
              new Map(
                [...events, ...recurringEvents]
                  .filter(e => e.customerId && e.customerName)
                  .map(e => [e.customerId, { id: e.customerId!, name: e.customerName! }])
              ).values()
            )}
            serviceTypes={Array.from(new Set([...events, ...recurringEvents].map(e => e.type)))}
            statuses={Array.from(new Set([...events, ...recurringEvents].map(e => e.status)))}
            priorities={Array.from(new Set([...events, ...recurringEvents].map(e => e.priority)))}
            onFilterChange={() => applyFilters()}
          />
        )}

        {multiSelectMode && selectedEvents.size > 0 && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-xl shadow-2xl z-[60] flex items-center gap-4 flex-wrap justify-center">
            <span className="font-semibold">{selectedEvents.size} evento(s) seleccionado(s)</span>
            <button
              onClick={() => setShowBulkReschedule(true)}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
            >
              Mover Todos
            </button>
            <button
              onClick={() => setSelectedEvents(new Set())}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors font-medium text-sm"
            >
              Limpiar
            </button>
          </div>
        )}

        {isDragging && (
          <div className="mt-4 bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">
                Arrastra el evento a una nueva fecha para reprogramarlo
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex">
          {showConceptsSidebar && (
            <ConceptsSidebar
              onConceptDragStart={(concept) => {
                setDraggedConcept(concept);
                setIsDragging(true);
              }}
              refreshTrigger={conceptsRefreshTrigger}
            />
          )}

          <div className="flex-1">
            {viewMode === 'month' ? (
              <div className="p-6">
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                    <div key={day} className="text-center font-semibold text-gray-700 py-2 text-sm">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((dayCell, index) => {
                    const isDropZone = dragOverDate?.toDateString() === dayCell.date.toDateString();
                    const isValidZone = isValidDropZone(dayCell.date);
                    const showPreview = isDropZone && (draggedEvent || draggedConcept) && isValidZone;

                    return (
                      <div
                        key={index}
                        onDragOver={(e) => handleDragOver(e, dayCell.date)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, dayCell.date)}
                        className={`min-h-[120px] border rounded-lg p-2 transition-all ${dayCell.isCurrentMonth
                          ? 'bg-white border-gray-200'
                          : 'bg-gray-50 border-gray-100'
                          } ${dayCell.isToday
                            ? 'ring-2 ring-blue-500 border-blue-500'
                            : ''
                          } ${(isDropZone && (isDragging || draggedConcept))
                            ? isValidZone
                              ? 'bg-green-50 border-2 border-green-400 shadow-lg scale-105'
                              : 'bg-red-50 border-2 border-red-400'
                            : 'hover:shadow-md'
                          }`}
                      >
                        <div className={`text-sm font-semibold mb-2 ${dayCell.isToday
                          ? 'text-blue-600'
                          : dayCell.isCurrentMonth
                            ? 'text-gray-900'
                            : 'text-gray-400'
                          }`}>
                          {dayCell.date.getDate()}
                        </div>

                        <div className="space-y-1">
                          {showPreview && (
                            <div
                              className={`opacity-50 text-white text-xs px-2 py-1 rounded border-2 border-white animate-pulse`}
                              style={{ backgroundColor: draggedEvent ? draggedEvent.color : '#10B981' }} // Use green for concept preview
                            >
                              <div className="flex items-center gap-1 truncate">
                                <Clock className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">
                                  {(draggedEvent?.id.startsWith('concept-') || !draggedEvent)
                                    ? (draggedEvent?.title || draggedConcept?.title || 'Concepto sin título')
                                    : draggedEvent.title.split(' - ')[0]}
                                </span>
                              </div>
                            </div>
                          )}

                          {dayCell.events.slice(0, 3).map((event) => {
                            const isBeingDragged = draggedEvent?.id === event.id;

                            return (
                              <EventCard
                                key={event.id}
                                event={event}
                                size="small"
                                onClick={() => setSelectedEventDetail(event)}
                                onDragStart={(e) => handleDragStart(e, event)}
                                onDragEnd={handleDragEnd}
                                onMouseEnter={(e) => handleEventHover(e, event)}
                                onMouseLeave={handleEventLeave}
                                isBeingDragged={isBeingDragged}
                                selectable={multiSelectMode}
                                isSelected={selectedEvents.has(event.id)}
                                onSelect={() => toggleEventSelection(event.id)}
                                visibleFields={calendarSettings.visibleFields}
                              />
                            );
                          })}

                          {dayCell.events.length > 3 && (
                            <div className="text-xs text-gray-600 font-medium px-2">
                              +{dayCell.events.length - 3} más
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : viewMode === 'week' ? (
              <CalendarWeekView
                events={filteredEvents}
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                onEventHover={handleEventHover}
                onEventLeave={handleEventLeave}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                dragOverDate={dragOverDate}
                draggedEvent={draggedEvent}
                draggedConcept={draggedConcept}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragLeave={handleDragLeave}
              />
            ) : (
              <CalendarDayView
                events={filteredEvents}
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                onEventHover={handleEventHover}
                onEventLeave={handleEventLeave}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                dragOverDate={dragOverDate}
                draggedEvent={draggedEvent}
                draggedConcept={draggedConcept}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragLeave={handleDragLeave}
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Resumen de Eventos
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Total de Eventos', value: filteredEvents.length, color: 'text-blue-600' },
              { label: 'En Progreso', value: events.filter(e => e.status === 'in_progress').length, color: 'text-yellow-600' },
              { label: 'Completados', value: events.filter(e => e.status === 'completed').length, color: 'text-green-600' },
              { label: 'Recurrentes', value: recurringEvents.filter(e => filteredEvents.some(fe => fe.id === e.id)).length, color: 'text-purple-600' }
            ].map((stat) => (
              <div key={stat.label} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700 font-medium">{stat.label}</span>
                <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Próximos Eventos
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {filteredEvents
              .filter(e => new Date(e.start) >= new Date())
              .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
              .slice(0, 5)
              .map((event) => (
                <div key={event.id} className={`p-3 rounded-lg hover:bg-gray-100 transition-colors ${event.isRecurring ? 'bg-blue-50 border-l-2 border-blue-500' :
                  event.rescheduleCount && event.rescheduleCount > 0 ? 'bg-purple-50 border-l-2 border-purple-500' : 'bg-gray-50'
                  }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0`} style={{ backgroundColor: event.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{event.title}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.start.toLocaleDateString('es-ES')}
                        </span>
                        {event.technicianName && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {event.technicianName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${event.priority === 'critical' ? 'bg-red-100 text-red-800' :
                          event.priority === 'urgent' ? 'bg-orange-100 text-orange-800' :
                            event.priority === 'high' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                          }`}>
                          {getPriorityLabel(event.priority)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${event.status === 'completed' ? 'bg-green-100 text-green-800' :
                          event.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                          {getStatusLabel(event.status)}
                        </span>
                        {event.isRecurring && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
                            <Repeat className="w-3 h-3" />
                            Recurrente
                          </span>
                        )}
                        {event.rescheduleCount && event.rescheduleCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            {event.rescheduleCount} reprogramado(s)
                          </span>
                        )}
                        {event.daysOverdue && event.daysOverdue > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {event.daysOverdue}d retraso
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            {filteredEvents.filter(e => new Date(e.start) >= new Date()).length === 0 && (
              <p className="text-gray-500 text-center py-4">No hay eventos próximos</p>
            )}
          </div>
        </div>
      </div>

      {
        showRecurringModal && (
          <RecurringEvents
            onClose={() => setShowRecurringModal(false)}
            onSuccess={() => {
              loadRecurringEvents();
              setShowRecurringModal(false);
            }}
          />
        )
      }

      {
        hoveredEvent && hoveredEvent.isRecurring && (
          <RecurringEventTooltip
            event={hoveredEvent}
            position={tooltipPosition}
            upcomingEvents={getUpcomingRecurringEvents(hoveredEvent)}
            onViewSeries={() => {
              setHoveredEvent(null);
              setShowRecurringModal(true);
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          />
        )
      }

      {
        showEditRecurringModal && recurringEventToEdit && (
          <EditRecurringEventModal
            event={recurringEventToEdit.event}
            newDate={recurringEventToEdit.newDate}
            onClose={() => {
              setShowEditRecurringModal(false);
              setRecurringEventToEdit(null);
              setDraggedEvent(null);
            }}
            onConfirm={handleEditRecurringEvent}
          />
        )
      }

      {
        selectedEventDetail && (
          <EventDetailModal
            event={selectedEventDetail}
            onClose={() => setSelectedEventDetail(null)}
            onDelete={handleDeleteEvent}
          />
        )
      }

      {
        showBulkReschedule && selectedEvents.size > 0 && (
          <BulkReschedule
            selectedEvents={filteredEvents.filter(e => selectedEvents.has(e.id))}
            onClose={() => setShowBulkReschedule(false)}
            onApply={handleBulkReschedule}
          />
        )
      }

      {
        showCriticalModal && criticalEvent && (
          <CriticalPriorityModal
            criticalEvent={criticalEvent}
            suggestedEvents={getSuggestedEventsForCritical(criticalEvent)}
            availableTechs={getAvailableTechnicians(new Date(criticalEvent.start))}
            onClose={() => {
              setShowCriticalModal(false);
              setCriticalEvent(null);
            }}
            onApply={async (eventsToMove) => {
              const targetDate = new Date(criticalEvent.start);
              await handleBulkReschedule(targetDate, 0, 'by-technician');
            }}
          />
        )
      }

      <CalendarSettings
        isOpen={showCalendarSettings}
        onClose={() => setShowCalendarSettings(false)}
        onConceptCreated={() => setConceptsRefreshTrigger(prev => prev + 1)}
        onViewLoaded={handleViewLoaded}
      />

      {
        showNewOrderForm && (
          <NewServiceOrderForm
            onClose={() => setShowNewOrderForm(false)}
            onSuccess={() => {
              setShowNewOrderForm(false);
              loadEvents();
              toast.success('Evento creado correctamente');
            }}
          />
        )
      }
    </div >
  );
}
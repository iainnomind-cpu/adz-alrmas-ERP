import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface ReschedulingStatus {
  isChecking: boolean;
  lastCheckTime: Date | null;
  totalRescheduled: number;
  errors: string[];
}

interface PriorityRule {
  priority: string;
  max_hours_before_reschedule: number;
  auto_reschedule_enabled: boolean;
  notification_enabled: boolean;
}

export function useAutoRescheduling(enableAutoCheck = true) {
  const [status, setStatus] = useState<ReschedulingStatus>({
    isChecking: false,
    lastCheckTime: null,
    totalRescheduled: 0,
    errors: []
  });

  const findNextAvailableDate = useCallback((currentDate: Date): Date => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    nextDate.setHours(8, 0, 0, 0);

    const dayOfWeek = nextDate.getDay();
    if (dayOfWeek === 0) {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (dayOfWeek === 6) {
      nextDate.setDate(nextDate.getDate() + 2);
    }

    return nextDate;
  }, []);

  const checkAndRescheduleOrders = useCallback(async () => {
    if (status.isChecking) return;

    setStatus(prev => ({ ...prev, isChecking: true, errors: [] }));

    try {
      const { data: rules, error: rulesError } = await supabase
        .from('priority_rules')
        .select('*');

      if (rulesError) throw rulesError;
      if (!rules || rules.length === 0) {
        throw new Error('No se encontraron reglas de prioridad configuradas');
      }

      const rulesMap = new Map<string, PriorityRule>();
      rules.forEach((rule: any) => {
        rulesMap.set(rule.priority, rule);
      });

      const { data: orders, error: ordersError } = await supabase
        .from('service_orders')
        .select('*')
        .not('scheduled_date', 'is', null)
        .in('status', ['requested', 'assigned'])
        .order('scheduled_date');

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) {
        setStatus(prev => ({
          ...prev,
          isChecking: false,
          lastCheckTime: new Date()
        }));
        return;
      }

      const now = new Date();
      let rescheduledCount = 0;
      const errors: string[] = [];

      for (const order of orders) {
        try {
          const scheduledDate = new Date(order.scheduled_date!);
          const hoursElapsed = (now.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60);

          const rule = rulesMap.get(order.priority);
          if (!rule) {
            errors.push(`No se encontró regla para prioridad ${order.priority} en orden ${order.order_number}`);
            continue;
          }

          if (hoursElapsed > rule.max_hours_before_reschedule) {
            const daysOverdue = Math.floor(hoursElapsed / 24);

            if (rule.auto_reschedule_enabled) {
              const nextDate = findNextAvailableDate(now);

              const originalScheduledDate = order.original_scheduled_date || order.scheduled_date;

              const { error: updateError } = await supabase
                .from('service_orders')
                .update({
                  scheduled_date: nextDate.toISOString(),
                  status: 'assigned',
                  reschedule_count: (order.reschedule_count || 0) + 1,
                  last_rescheduled_at: now.toISOString(),
                  original_scheduled_date: originalScheduledDate,
                  days_overdue: daysOverdue,
                  updated_at: now.toISOString()
                })
                .eq('id', order.id);

              if (updateError) {
                errors.push(`Error al reprogramar orden ${order.order_number}: ${updateError.message}`);
                continue;
              }

              if (rule.notification_enabled && order.technician_id) {
                const notificationMessage = `La orden ${order.order_number} ha sido reprogramada automáticamente del ${scheduledDate.toLocaleDateString()} al ${nextDate.toLocaleDateString()} debido a que excedió el tiempo máximo de espera (${rule.max_hours_before_reschedule} horas). Días de retraso: ${daysOverdue}.`;

                await supabase
                  .from('technician_notifications')
                  .insert({
                    technician_id: order.technician_id,
                    service_order_id: order.id,
                    notification_type: 'reschedule',
                    message: notificationMessage,
                    priority: order.priority,
                    is_read: false
                  });
              }

              rescheduledCount++;
            } else {
              const { error: updateError } = await supabase
                .from('service_orders')
                .update({
                  status: 'assigned',
                  days_overdue: daysOverdue,
                  updated_at: now.toISOString()
                })
                .eq('id', order.id);

              if (updateError) {
                errors.push(`Error al marcar como atrasada orden ${order.order_number}: ${updateError.message}`);
              }
            }
          }
        } catch (orderError) {
          errors.push(`Error procesando orden ${order.order_number}: ${orderError instanceof Error ? orderError.message : 'Error desconocido'}`);
        }
      }

      setStatus(prev => ({
        isChecking: false,
        lastCheckTime: now,
        totalRescheduled: prev.totalRescheduled + rescheduledCount,
        errors
      }));

    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isChecking: false,
        lastCheckTime: new Date(),
        errors: [...prev.errors, error instanceof Error ? error.message : 'Error desconocido al verificar órdenes']
      }));
    }
  }, [status.isChecking, findNextAvailableDate]);

  useEffect(() => {
    if (!enableAutoCheck) return;

    checkAndRescheduleOrders();

    const intervalId = setInterval(() => {
      checkAndRescheduleOrders();
    }, 15 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [enableAutoCheck, checkAndRescheduleOrders]);

  return {
    status,
    manualCheck: checkAndRescheduleOrders
  };
}

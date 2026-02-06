import { Calendar, Clock, ExternalLink } from 'lucide-react';
import type { CalendarEvent } from '../../types/calendar.types';

interface RecurringEventTooltipProps {
  event: CalendarEvent;
  position: { x: number; y: number };
  upcomingEvents: CalendarEvent[];
  onViewSeries: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function RecurringEventTooltip({ event, position, upcomingEvents, onViewSeries, onMouseEnter, onMouseLeave }: RecurringEventTooltipProps) {
  const getFrequencyLabel = (event: CalendarEvent) => {
    if (!event.recurringScheduleId) return '';

    const schedule = event.recurringSchedule;
    if (!schedule) return '';

    switch (schedule.frequency) {
      case 'monthly': return 'Mensual';
      case 'quarterly': return 'Trimestral';
      case 'semiannual': return 'Semestral';
      case 'annual': return 'Anual';
      default: return '';
    }
  };

  return (
    <div
      className="fixed z-[100] bg-white rounded-lg shadow-2xl border-2 border-blue-500 p-4 w-80 animate-fade-in"
      style={{
        left: `${position.x}px`,
        top: `${position.y + 30}px`,
        transform: 'translate(-50%, 0)'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full">
        <div className="w-3 h-3 bg-white border-l-2 border-t-2 border-blue-500 transform rotate-45 translate-y-1.5"></div>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 text-sm mb-1">Serie: {event.title}</h4>
            <p className="text-xs text-blue-600 font-medium">
              {getFrequencyLabel(event)}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">Próximos 3 eventos:</p>
          <div className="space-y-2">
            {upcomingEvents.slice(0, 3).map((upcomingEvent, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded p-2"
              >
                <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
                <span className="font-medium">
                  {new Date(upcomingEvent.start).toLocaleDateString('es-ES', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewSeries();
          }}
          className="w-full mt-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-3 h-3" />
          Ver serie completa
        </button>
      </div>
    </div>
  );
}

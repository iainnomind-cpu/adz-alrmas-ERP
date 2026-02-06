import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarEvent } from '../../types/calendar.types';
import { EventCard } from './EventCard';
import { EventDetailModal } from './EventDetailModal';
import { useCalendarSettings } from '../../hooks/useCalendarSettings';

interface CalendarDayViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventHover: (e: React.MouseEvent, event: CalendarEvent) => void;
  onEventLeave: () => void;
  onDragStart: (e: React.DragEvent, event: CalendarEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  dragOverDate: Date | null;
  draggedEvent: CalendarEvent | null;
  draggedConcept: any | null; // Using any for concept as type is complex
  onDragOver: (e: React.DragEvent, date: Date, hour?: number) => void;
  onDrop: (e: React.DragEvent, date: Date, hour?: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
}

export function CalendarDayView({
  events,
  currentDate,
  onDateChange,
  onEventHover,
  onEventLeave,
  onDragStart,
  onDragEnd,
  dragOverDate,
  draggedEvent,
  draggedConcept,
  onDragOver,
  onDrop,
  onDragLeave
}: CalendarDayViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const { settings: calendarSettings } = useCalendarSettings();

  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

  const getEventsForDay = () => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getDate() === currentDate.getDate() &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const getEventsForHour = (hour: number) => {
    return dayEvents.filter(event => {
      const eventHour = event.start.getHours();
      return eventHour === hour;
    });
  };

  const previousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  const dayEvents = getEventsForDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = currentDate.toDateString() === today.toDateString();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className={`p-4 border-b border-gray-200 flex items-center justify-between ${isToday ? 'bg-blue-50' : ''
        }`}>
        <button
          onClick={previousDay}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="text-center">
          <h3 className={`text-2xl font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
            {currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}
          </h3>
          <p className="text-sm text-gray-600">
            {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}
          </p>
        </div>
        <button
          onClick={nextDay}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="overflow-y-auto max-h-[700px]">
        {hours.map((hour) => {
          const hourEvents = getEventsForHour(hour);

          return (
            <div
              key={hour}
              onDragOver={(e) => onDragOver(e, currentDate, hour)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, currentDate, hour)}
              className={`grid grid-cols-[80px_1fr] border-b border-gray-200 min-h-[100px] transition-colors ${dragOverDate?.toDateString() === currentDate.toDateString() && (draggedEvent || draggedConcept)
                ? 'bg-blue-50/50' : ''
                }`}
            >
              <div className="p-3 text-sm font-semibold text-gray-500 bg-gray-50 border-r border-gray-200 flex items-start justify-end">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="p-3 relative">
                {/* Drag Preview */}
                {dragOverDate?.toDateString() === currentDate.toDateString() && (draggedEvent || draggedConcept) && (
                  <div className="absolute inset-x-3 top-3 opacity-50 bg-green-100 border-2 border-green-500 border-dashed rounded-lg p-2 z-10 animate-pulse">
                    <p className="text-xs font-bold text-green-700">
                      Programar: {(draggedEvent?.id.startsWith('concept-') || !draggedEvent)
                        ? (draggedEvent?.title || draggedConcept?.title || 'Concepto sin título')
                        : draggedEvent.title}
                    </p>
                  </div>
                )}
                {hourEvents.length > 0 ? (
                  <div className="space-y-2">
                    {hourEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        size="large"
                        onClick={() => setSelectedEvent(event)}
                        onDragStart={(e) => onDragStart(e, event)}
                        onDragEnd={onDragEnd}
                        onMouseEnter={(e) => onEventHover(e, event)}
                        onMouseLeave={onEventLeave}
                        visibleFields={calendarSettings.visibleFields}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">Sin eventos programados</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

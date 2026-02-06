import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarEvent } from '../../types/calendar.types';
import { EventCard } from './EventCard';
import { EventDetailModal } from './EventDetailModal';
import { useCalendarSettings } from '../../hooks/useCalendarSettings';

interface CalendarWeekViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventHover: (e: React.MouseEvent, event: CalendarEvent) => void;
  onEventLeave: () => void;
  onDragStart: (e: React.DragEvent, event: CalendarEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  dragOverDate: Date | null;
  draggedEvent: CalendarEvent | null;
  draggedConcept: any | null;
  onDragOver: (e: React.DragEvent, date: Date, hour?: number) => void;
  onDrop: (e: React.DragEvent, date: Date, hour?: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
}

export function CalendarWeekView({
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
}: CalendarWeekViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const { settings: calendarSettings } = useCalendarSettings();

  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }

    return week;
  };

  const weekDays = getWeekDays(currentDate);
  const hours = Array.from({ length: 14 }, (_, i) => i + 6);

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getDate() === day.getDate() &&
        eventDate.getMonth() === day.getMonth() &&
        eventDate.getFullYear() === day.getFullYear()
      );
    });
  };

  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(newDate);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <button
          onClick={previousWeek}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h3 className="text-lg font-semibold text-gray-900">
          {weekDays[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {weekDays[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
        </h3>
        <button
          onClick={nextWeek}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="p-3 text-sm font-medium text-gray-500 bg-gray-50"></div>
            {weekDays.map((day, idx) => {
              const isToday = day.toDateString() === today.toDateString();
              return (
                <div
                  key={idx}
                  className={`p-3 text-center border-l border-gray-200 ${isToday ? 'bg-blue-50' : 'bg-gray-50'
                    }`}
                >
                  <div className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-gray-200 min-h-[80px]">
                <div className="p-2 text-xs font-medium text-gray-500 bg-gray-50 border-r border-gray-200 flex items-start justify-end">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {weekDays.map((day, idx) => {
                  const dayEvents = getEventsForDay(day);
                  const hourEvents = dayEvents.filter(event => {
                    const eventHour = new Date(event.start).getHours();
                    return eventHour === hour;
                  });
                  const isToday = day.toDateString() === today.toDateString();

                  return (
                    <div
                      key={idx}
                      onDragOver={(e) => onDragOver(e, day, hour)}
                      onDragLeave={onDragLeave}
                      onDrop={(e) => onDrop(e, day, hour)}
                      className={`p-2 border-l border-gray-200 relative transition-colors ${isToday ? 'bg-blue-50/30' : ''
                        } ${dragOverDate?.toDateString() === day.toDateString() && (draggedEvent || draggedConcept)
                          ? 'bg-blue-100/30' : ''
                        }`}
                    >
                      {/* Drag Preview */}
                      {dragOverDate?.toDateString() === day.toDateString() && (draggedEvent || draggedConcept) && (
                        <div className="absolute inset-x-1 top-1 opacity-50 bg-green-100 border border-green-500 border-dashed rounded px-1 py-0.5 z-10 animate-pulse">
                          <p className="text-[10px] font-bold text-green-700 truncate">
                            {(draggedEvent?.id.startsWith('concept-') || !draggedEvent)
                              ? (draggedEvent?.title || draggedConcept?.title || 'Concepto sin título')
                              : draggedEvent.title}
                          </p>
                        </div>
                      )}
                      <div className="space-y-1">
                        {hourEvents.map((event) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            size="small"
                            onClick={() => setSelectedEvent(event)}
                            onDragStart={(e) => onDragStart(e, event)}
                            onDragEnd={onDragEnd}
                            onMouseEnter={(e) => onEventHover(e, event)}
                            onMouseLeave={onEventLeave}
                            visibleFields={calendarSettings.visibleFields}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
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

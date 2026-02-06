import { Clock, User, Repeat, AlertCircle, RefreshCw, AlertTriangle, CheckCircle, MapPin, DollarSign } from 'lucide-react';
import type { CalendarEvent } from '../../types/calendar.types';
import type { VisibleFields } from '../../hooks/useCalendarSettings';

interface EventCardProps {
  event: CalendarEvent;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: () => void;
  isBeingDragged?: boolean;
  className?: string;
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  visibleFields?: VisibleFields;
}

export function EventCard({
  event,
  size = 'medium',
  onClick,
  onDragStart,
  onDragEnd,
  onMouseEnter,
  onMouseLeave,
  isBeingDragged = false,
  className = '',
  selectable = false,
  isSelected = false,
  onSelect,
  visibleFields = {
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
  }
}: EventCardProps) {
  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect();
    } else if (onClick) {
      onClick();
    }
  };

  const baseClasses = `bg-white border-l-[3px] shadow-sm rounded-r hover:shadow-md transition-all relative ${isBeingDragged ? 'opacity-50 scale-95' : ''
    } ${event.status === 'in_progress' ? 'ring-2 ring-yellow-300 ring-offset-1' : ''
    } ${event.rescheduleCount && event.rescheduleCount > 0 ? 'ring-2 ring-purple-400 ring-offset-1' : ''
    } ${event.isModifiedFromSeries ? 'ring-2 ring-orange-400 ring-offset-1' : ''
    } ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''
    } ${selectable ? 'cursor-pointer' : 'cursor-move'
    }`;

  if (size === 'small') {
    return (
      <div
        draggable={!selectable}
        onDragStart={!selectable ? onDragStart : undefined}
        onDragEnd={!selectable ? onDragEnd : undefined}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={handleClick}
        className={`${baseClasses} text-xs px-2 py-1 ${className}`}
        style={{ borderLeftColor: event.color }}
      >
        <div className="flex items-center gap-1.5">
          {selectable && (
            <div className={`w-3 h-3 flex-shrink-0 rounded-sm border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-gray-300'
              }`}>
              {isSelected && <CheckCircle className="w-2.5 h-2.5 text-white" />}
            </div>
          )}
          {!selectable && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />}
          <span className="truncate flex-1 font-medium text-gray-700">
            {event.id.startsWith('concept-') || event.type === 'other' ? (event.title || 'Concepto sin título') : event.title?.split(' - ')[0]}
          </span>
          {event.isRecurring && <Repeat className="w-3 h-3 flex-shrink-0 text-gray-400" />}
          {event.isModifiedFromSeries && <AlertCircle className="w-3 h-3 flex-shrink-0 text-orange-400" />}
        </div>
      </div>
    );
  }

  if (size === 'medium') {
    return (
      <div
        draggable={!selectable}
        onDragStart={!selectable ? onDragStart : undefined}
        onDragEnd={!selectable ? onDragEnd : undefined}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={handleClick}
        className={`${baseClasses} text-xs px-2 py-1.5 ${className}`}
        style={{ borderLeftColor: event.color }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          {selectable && (
            <div className={`w-3 h-3 flex-shrink-0 rounded-sm border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-gray-300'
              }`}>
              {isSelected && <CheckCircle className="w-2.5 h-2.5 text-white" />}
            </div>
          )}
          {!selectable && <Clock className="w-3 h-3 flex-shrink-0 text-gray-400" />}
          <span className="truncate flex-1 font-semibold text-gray-800">
            {event.id.startsWith('concept-') || event.type === 'other' ? (event.title || 'Concepto sin título') : event.title?.split(' - ')[0]}
          </span>
          {event.isRecurring && <Repeat className="w-3 h-3 flex-shrink-0 text-gray-400" />}
        </div>
        {visibleFields.technicianName && event.technicianName && (
          <div className="flex items-center gap-1.5 text-[10px] text-gray-600 pl-4">
            <User className="w-2.5 h-2.5 flex-shrink-0 text-gray-400" />
            <span className="truncate">{event.technicianName}</span>
          </div>
        )}
        {(event.rescheduleCount && event.rescheduleCount > 0) || (event.daysOverdue && event.daysOverdue > 0) ? (
          <div className="flex gap-1 mt-1.5 pl-4">
            {event.rescheduleCount && event.rescheduleCount > 0 && (
              <span className="bg-purple-50 text-purple-700 border border-purple-100 px-1 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5">
                <RefreshCw className="w-2 h-2" />
                {event.rescheduleCount}
              </span>
            )}
            {event.daysOverdue && event.daysOverdue > 0 && (
              <span className="bg-red-50 text-red-700 border border-red-100 px-1 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5">
                <AlertTriangle className="w-2 h-2" />
                {event.daysOverdue}d
              </span>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      draggable={!selectable}
      onDragStart={!selectable ? onDragStart : undefined}
      onDragEnd={!selectable ? onDragEnd : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={handleClick}
      className={`${baseClasses} text-sm px-3 py-2 ${className}`}
      style={{ borderLeftColor: event.color }}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {selectable && (
            <div className={`w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-gray-300'
              }`}>
              {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
          )}
          {!selectable && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />}
          <span className="truncate flex-1 font-bold text-gray-900">
            {event.id.startsWith('concept-') || event.type === 'other' ? (event.title || 'Concepto sin título') : event.title?.split(' - ')[0]}
          </span>
          {event.isRecurring && <Repeat className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />}
          {event.isModifiedFromSeries && <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-orange-500" />}
        </div>

        <div className="space-y-1 text-xs pl-4">
          {visibleFields.customerName && event.customerName && (
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
              <span className="truncate">{event.customerName}</span>
            </div>
          )}

          {visibleFields.technicianName && event.technicianName && (
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
              <span className="truncate">{event.technicianName}</span>
            </div>
          )}

          {visibleFields.address && event.address && (
            <div className="flex items-center gap-2 text-gray-500">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
              <span className="truncate">{event.address}</span>
            </div>
          )}

          {visibleFields.estimatedAmount && event.estimatedAmount && (
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <DollarSign className="w-3.5 h-3.5 flex-shrink-0 text-green-600" />
              <span className="truncate">${event.estimatedAmount.toLocaleString()}</span>
            </div>
          )}

          {visibleFields.startTime && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 mt-2">
              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">
                  {event.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  {visibleFields.endTime && event.end && ` - ${event.end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1 pl-4">
          {event.rescheduleCount && event.rescheduleCount > 0 && (
            <span className="bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              {event.rescheduleCount} reprog.
            </span>
          )}
          {event.daysOverdue && event.daysOverdue > 0 && (
            <span className="bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {event.daysOverdue}d retraso
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

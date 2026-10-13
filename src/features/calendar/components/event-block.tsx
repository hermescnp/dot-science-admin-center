'use client';

import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '../api/types';
import { eventColorStyles } from '../constants/colors';

interface EventBlockProps {
  event: CalendarEvent;
  onSelect: (event: CalendarEvent) => void;
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
}

export function EventBlock({ event, onSelect, className, style, compact }: EventBlockProps) {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);

  return (
    <button
      type='button'
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(event);
      }}
      className={cn(
        'focus-visible:ring-ring flex min-w-0 flex-col overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none',
        eventColorStyles[event.color],
        className
      )}
    >
      <span className='truncate font-medium'>{event.title}</span>
      {!compact && !event.allDay ? (
        <span className='truncate opacity-75'>
          {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
        </span>
      ) : null}
    </button>
  );
}

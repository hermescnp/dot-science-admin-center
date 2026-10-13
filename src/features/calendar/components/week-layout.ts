import { addDays, differenceInMinutes, startOfDay } from 'date-fns';
import type { CalendarEvent } from '../api/types';

const DAY_MINUTES = 24 * 60;
const MIN_DURATION = 20;

export interface PositionedEvent {
  event: CalendarEvent;
  /** Percentages of the day column. */
  top: number;
  height: number;
  left: number;
  width: number;
}

function overlapsDay(event: CalendarEvent, dayStart: Date, dayEnd: Date) {
  return new Date(event.startAt) < dayEnd && new Date(event.endAt) > dayStart;
}

export function allDayEventsFor(events: CalendarEvent[], day: Date) {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  return events.filter((event) => event.allDay && overlapsDay(event, dayStart, dayEnd));
}

/**
 * Places a day's timed events in its column. Events that overlap share the width, each one in the
 * first column that is free when it starts.
 */
export function layoutDay(events: CalendarEvent[], day: Date): PositionedEvent[] {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);

  const items = events
    .filter((event) => !event.allDay && overlapsDay(event, dayStart, dayEnd))
    .map((event) => {
      const start = Math.max(0, differenceInMinutes(new Date(event.startAt), dayStart));
      const end = Math.min(DAY_MINUTES, differenceInMinutes(new Date(event.endAt), dayStart));
      return { event, start, end: Math.max(end, start + MIN_DURATION), column: 0 };
    })
    .toSorted((a, b) => a.start - b.start || b.end - a.end);

  const positioned: PositionedEvent[] = [];
  let cluster: typeof items = [];
  let clusterEnd = -1;

  const flush = () => {
    const columns = Math.max(...cluster.map((item) => item.column)) + 1;
    for (const item of cluster) {
      positioned.push({
        event: item.event,
        top: (item.start / DAY_MINUTES) * 100,
        height: ((Math.min(item.end, DAY_MINUTES) - item.start) / DAY_MINUTES) * 100,
        left: (item.column / columns) * 100,
        width: 100 / columns
      });
    }
    cluster = [];
  };

  for (const item of items) {
    if (item.start >= clusterEnd && cluster.length) flush();
    const columnEnds: number[] = [];
    for (const placed of cluster) {
      columnEnds[placed.column] = Math.max(columnEnds[placed.column] ?? 0, placed.end);
    }
    const free = columnEnds.findIndex((end) => end <= item.start);
    item.column = free === -1 ? columnEnds.length : free;
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  if (cluster.length) flush();

  return positioned;
}

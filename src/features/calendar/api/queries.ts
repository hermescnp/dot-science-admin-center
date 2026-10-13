import { queryOptions } from '@tanstack/react-query';
import { format, isValid, parseISO, startOfWeek } from 'date-fns';
import { getEvents } from './service';
import type { EventRange } from './types';

export const calendarKeys = {
  all: ['calendar-events'] as const,
  week: (week: string) => [...calendarKeys.all, 'week', week] as const
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function weekStartOf(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/** The Monday (yyyy-MM-dd) of the week in the `week` URL param, or of `fallback` when missing or invalid. */
export function resolveWeek(param: string | null | undefined, fallback = new Date()) {
  const parsed = param ? parseISO(param) : null;
  return format(weekStartOf(parsed && isValid(parsed) ? parsed : fallback), 'yyyy-MM-dd');
}

/**
 * Range fetched for a week given as its Monday (yyyy-MM-dd). It is padded by a day on each side
 * so the server and every browser time zone resolve the same key to data covering the local week.
 */
export function weekFetchRange(week: string): EventRange {
  const monday = Date.parse(`${week}T00:00:00Z`);
  return {
    from: new Date(monday - DAY_MS).toISOString(),
    to: new Date(monday + 8 * DAY_MS).toISOString()
  };
}

export const eventsQueryOptions = (week: string) =>
  queryOptions({
    queryKey: calendarKeys.week(week),
    queryFn: () => getEvents(weekFetchRange(week))
  });

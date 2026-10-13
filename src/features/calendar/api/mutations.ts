import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { calendarKeys } from './queries';
import { createEvent, deleteEvent, updateEvent } from './service';
import type { CalendarEventPayload } from './types';

const invalidate = () => getQueryClient().invalidateQueries({ queryKey: calendarKeys.all });

export const createEventMutation = mutationOptions({
  mutationFn: (values: CalendarEventPayload) => createEvent(values),
  onSuccess: invalidate
});

export const updateEventMutation = mutationOptions({
  mutationFn: ({ id, values }: { id: string; values: CalendarEventPayload }) =>
    updateEvent(id, values),
  onSuccess: invalidate
});

export const deleteEventMutation = mutationOptions({
  mutationFn: (id: string) => deleteEvent(id),
  onSuccess: invalidate
});

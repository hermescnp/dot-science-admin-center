import { apiClient } from '@/lib/api-client';
import type { CalendarEvent, CalendarEventPayload, EventRange, EventsResponse } from './types';

export async function getEvents(range: EventRange): Promise<EventsResponse> {
  const params = new URLSearchParams({ from: range.from, to: range.to });
  return apiClient<EventsResponse>(`/calendar/events?${params}`, { cache: 'no-store' });
}

export async function createEvent(data: CalendarEventPayload) {
  return apiClient<CalendarEvent>('/calendar/events', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateEvent(id: string, data: CalendarEventPayload) {
  return apiClient<{ ok: true }>(`/calendar/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteEvent(id: string) {
  return apiClient<{ ok: true }>(`/calendar/events/${id}`, { method: 'DELETE' });
}

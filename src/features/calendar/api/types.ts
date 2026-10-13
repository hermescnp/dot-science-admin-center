export const eventColors = ['blue', 'green', 'amber', 'red', 'purple'] as const;
export type EventColor = (typeof eventColors)[number];

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  location: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  color: EventColor;
}

export type CalendarEventPayload = Omit<CalendarEvent, 'id'>;

/** ISO timestamps; events overlapping [from, to) are returned. */
export interface EventRange {
  from: string;
  to: string;
}

export interface EventsResponse {
  events: CalendarEvent[];
}

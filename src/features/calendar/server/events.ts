import 'server-only';

import type { Database } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CalendarEvent,
  CalendarEventPayload,
  EventColor,
  EventRange,
  EventsResponse
} from '../api/types';

type Client = SupabaseClient<Database>;
type EventRow = Omit<
  Database['public']['Tables']['calendar_events']['Row'],
  'created_at' | 'created_by' | 'updated_at'
>;

const COLUMNS = 'id, title, description, location, start_at, end_at, all_day, color';

function toEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: row.all_day,
    color: row.color as EventColor
  };
}

function toRow(payload: CalendarEventPayload) {
  return {
    title: payload.title,
    description: payload.description,
    location: payload.location,
    start_at: payload.startAt,
    end_at: payload.endAt,
    all_day: payload.allDay,
    color: payload.color
  };
}

export async function listEvents(supabase: Client, range: EventRange): Promise<EventsResponse> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select(COLUMNS)
    .lt('start_at', range.to)
    .gt('end_at', range.from)
    .order('start_at');
  if (error) throw new Error(error.message);
  return { events: data.map(toEvent) };
}

export async function createEvent(
  supabase: Client,
  payload: CalendarEventPayload
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert(toRow(payload))
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toEvent(data);
}

/** Returns false when no row matched, which RLS also produces for non-admins. */
export async function updateEvent(
  supabase: Client,
  id: string,
  payload: CalendarEventPayload
): Promise<boolean> {
  const { data, error } = await supabase
    .from('calendar_events')
    .update(toRow(payload))
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  return data.length > 0;
}

export async function deleteEvent(supabase: Client, id: string): Promise<boolean> {
  const { data, error } = await supabase.from('calendar_events').delete().eq('id', id).select('id');
  if (error) throw new Error(error.message);
  return data.length > 0;
}

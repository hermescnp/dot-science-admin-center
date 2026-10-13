import { addDays, startOfDay } from 'date-fns';
import { z } from 'zod';
import { eventColors, type CalendarEventPayload } from '../api/types';

const MAX_RANGE_MS = 42 * 24 * 60 * 60 * 1000;
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm');

export const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200, 'Up to 200 characters'),
    date: z.date({ error: 'Pick a date' }),
    allDay: z.boolean(),
    startTime: timeSchema,
    endTime: timeSchema,
    color: z.enum(eventColors),
    location: z.string().trim().max(200, 'Up to 200 characters'),
    description: z.string().max(5000, 'Up to 5000 characters')
  })
  .refine((values) => values.allDay || values.endTime > values.startTime, {
    message: 'End time must be after the start time',
    path: ['endTime']
  });

export type EventFormValues = z.input<typeof eventFormSchema>;

function atTime(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const result = startOfDay(date);
  result.setHours(hours, minutes);
  return result;
}

export function toEventPayload(values: EventFormValues): CalendarEventPayload {
  const day = startOfDay(values.date);
  const start = values.allDay ? day : atTime(day, values.startTime);
  const end = values.allDay ? addDays(day, 1) : atTime(day, values.endTime);
  return {
    title: values.title.trim(),
    description: values.description,
    location: values.location.trim() || null,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    allDay: values.allDay,
    color: values.color
  };
}

export const eventPayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(5000),
    location: z.string().trim().max(200).nullable(),
    startAt: z.iso.datetime({ offset: true }),
    endAt: z.iso.datetime({ offset: true }),
    allDay: z.boolean(),
    color: z.enum(eventColors)
  })
  .refine((event) => Date.parse(event.endAt) > Date.parse(event.startAt), {
    message: 'End must be after start',
    path: ['endAt']
  });

export const eventRangeQuerySchema = z
  .object({
    from: z.iso.datetime({ offset: true }),
    to: z.iso.datetime({ offset: true })
  })
  .refine(({ from, to }) => {
    const span = Date.parse(to) - Date.parse(from);
    return span > 0 && span <= MAX_RANGE_MS;
  });

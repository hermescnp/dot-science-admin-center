'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  isSameMonth,
  isSameYear,
  parseISO,
  startOfDay
} from 'date-fns';
import { parseAsString, useQueryState } from 'nuqs';
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { eventsQueryOptions, resolveWeek, weekStartOf } from '../api/queries';
import type { CalendarEvent } from '../api/types';
import { CalendarSkeleton } from './calendar-skeleton';
import { EventBlock } from './event-block';
import { EventSheet, type EventDraft } from './event-sheet';
import { allDayEventsFor, layoutDay } from './week-layout';

const HOUR_HEIGHT = 48;
const SCROLL_TO_HOUR = 8;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const GRID_COLUMNS = 'grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]';

const weekParser = parseAsString.withDefault('');
const noopSubscribe = () => () => {};

function weekTitle(start: Date) {
  const end = addDays(start, 6);
  if (!isSameYear(start, end))
    return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
  if (!isSameMonth(start, end)) return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
}

const pad = (value: number) => String(value).padStart(2, '0');

function hourDraft(date: Date, hour: number): EventDraft {
  return {
    date: startOfDay(date),
    startTime: `${pad(hour)}:00`,
    endTime: hour === 23 ? '23:59' : `${pad(hour + 1)}:00`
  };
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** The grid depends on the browser's time zone, so it renders only on the client. */
export function CalendarWeekView() {
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  return isClient ? <WeekView /> : <CalendarSkeleton />;
}

interface SheetState {
  open: boolean;
  event: CalendarEvent | null;
  draft: EventDraft;
  key: number;
}

function WeekView() {
  const [isNavigating, startTransition] = useTransition();
  const [weekParam, setWeekParam] = useQueryState(
    'week',
    weekParser.withOptions({ shallow: true, startTransition })
  );
  const now = useNow();
  const week = resolveWeek(weekParam, now);
  const weekStart = parseISO(week);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const { data } = useSuspenseQuery(eventsQueryOptions(week));

  const [pickerOpen, setPickerOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(() => ({
    open: false,
    event: null,
    draft: hourDraft(now, now.getHours()),
    key: 0
  }));

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: SCROLL_TO_HOUR * HOUR_HEIGHT });
  }, []);

  const goToWeek = (date: Date) => {
    const target = weekStartOf(date);
    setWeekParam(isSameDay(target, weekStartOf(new Date())) ? null : format(target, 'yyyy-MM-dd'));
  };

  const openSheet = (event: CalendarEvent | null, draft: EventDraft) =>
    setSheet((current) => ({ open: true, event, draft, key: current.key + 1 }));

  const openNewEvent = () => {
    const today = days.find((day) => isSameDay(day, now));
    openSheet(null, hourDraft(today ?? weekStart, today ? Math.min(now.getHours() + 1, 23) : 9));
  };

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={() => goToWeek(new Date())}>
            Today
          </Button>
          <div className='flex items-center'>
            <Button
              variant='ghost'
              size='icon'
              aria-label='Previous week'
              onClick={() => goToWeek(addWeeks(weekStart, -1))}
            >
              <Icons.chevronLeft className='size-4' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              aria-label='Next week'
              onClick={() => goToWeek(addWeeks(weekStart, 1))}
            >
              <Icons.chevronRight className='size-4' />
            </Button>
          </div>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger
              render={<Button variant='ghost' className='text-base font-semibold tracking-tight' />}
            >
              {weekTitle(weekStart)}
              <Icons.chevronDown className='text-muted-foreground size-4' />
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0' align='start'>
              <Calendar
                mode='single'
                weekStartsOn={1}
                selected={weekStart}
                defaultMonth={weekStart}
                onSelect={(date) => {
                  if (!date) return;
                  goToWeek(date);
                  setPickerOpen(false);
                }}
                autoFocus
              />
            </PopoverContent>
          </Popover>
          {isNavigating ? (
            <Icons.spinner className='text-muted-foreground size-4 animate-spin' />
          ) : null}
        </div>
        <Button onClick={openNewEvent}>
          <Icons.add className='mr-1 size-4' /> New event
        </Button>
      </div>

      <div className='bg-card flex h-[calc(100dvh-13rem)] min-h-[520px] flex-col overflow-hidden rounded-xl border'>
        <div className='flex min-h-0 flex-1 flex-col overflow-x-auto'>
          <div
            className={cn(
              'flex min-h-0 min-w-[720px] flex-1 flex-col transition-opacity',
              isNavigating && 'opacity-60'
            )}
          >
            <div
              className={cn(GRID_COLUMNS, 'overflow-y-hidden border-b [scrollbar-gutter:stable]')}
            >
              <div />
              {days.map((day) => {
                const isToday = isSameDay(day, now);
                return (
                  <div
                    key={day.toISOString()}
                    className='flex flex-col items-center gap-0.5 border-l py-2'
                  >
                    <span className='text-muted-foreground text-xs font-medium uppercase'>
                      {format(day, 'EEE')}
                    </span>
                    <span
                      className={cn(
                        'flex size-8 items-center justify-center rounded-full text-sm font-semibold',
                        isToday && 'bg-primary text-primary-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                );
              })}
            </div>

            <div
              className={cn(GRID_COLUMNS, 'overflow-y-hidden border-b [scrollbar-gutter:stable]')}
            >
              <div className='text-muted-foreground flex items-center justify-end pr-2 text-[11px]'>
                All day
              </div>
              {days.map((day) => (
                <div key={day.toISOString()} className='flex min-h-9 flex-col gap-1 border-l p-1'>
                  {allDayEventsFor(data.events, day).map((event) => (
                    <EventBlock
                      key={event.id}
                      event={event}
                      compact
                      onSelect={(selected) => openSheet(selected, hourDraft(day, 9))}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div
              ref={scrollRef}
              className='min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]'
            >
              <div className={cn(GRID_COLUMNS, 'relative')} style={{ height: 24 * HOUR_HEIGHT }}>
                <div className='relative'>
                  {HOURS.slice(1).map((hour) => (
                    <span
                      key={hour}
                      className='text-muted-foreground absolute right-2 -translate-y-1/2 text-[11px] tabular-nums'
                      style={{ top: hour * HOUR_HEIGHT }}
                    >
                      {pad(hour)}:00
                    </span>
                  ))}
                </div>
                {days.map((day) => {
                  const isToday = isSameDay(day, now);
                  const minutes = now.getHours() * 60 + now.getMinutes();
                  return (
                    <div key={day.toISOString()} className='relative border-l'>
                      {HOURS.map((hour) => (
                        <button
                          key={hour}
                          type='button'
                          aria-label={`New event on ${format(day, 'EEEE, MMM d')} at ${pad(hour)}:00`}
                          onClick={() => openSheet(null, hourDraft(day, hour))}
                          className='hover:bg-accent/50 focus-visible:bg-accent/50 block w-full border-b border-dashed last:border-b-0 focus-visible:outline-none'
                          style={{ height: HOUR_HEIGHT }}
                        />
                      ))}
                      {layoutDay(data.events, day).map((item) => (
                        <EventBlock
                          key={item.event.id}
                          event={item.event}
                          compact={item.height < (45 / (24 * 60)) * 100}
                          onSelect={(selected) => openSheet(selected, hourDraft(day, 9))}
                          className='absolute z-10 shadow-xs'
                          style={{
                            top: `${item.top}%`,
                            height: `${item.height}%`,
                            left: `calc(${item.left}% + 2px)`,
                            width: `calc(${item.width}% - 4px)`
                          }}
                        />
                      ))}
                      {isToday ? (
                        <div
                          aria-hidden
                          className='pointer-events-none absolute inset-x-0 z-20 flex items-center'
                          style={{ top: `${(minutes / (24 * 60)) * 100}%` }}
                        >
                          <span className='bg-primary -ml-1 size-2 rounded-full' />
                          <span className='bg-primary h-0.5 flex-1' />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <EventSheet
        key={sheet.key}
        event={sheet.event}
        draft={sheet.draft}
        open={sheet.open}
        onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
      />
    </div>
  );
}

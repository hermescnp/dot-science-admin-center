'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import {
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  eachMonthOfInterval,
  eachQuarterOfInterval,
  endOfMonth,
  format,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfDay,
  startOfMonth,
  subMonths
} from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PlatformFeatureStatus } from '@/features/platform-features/api/types';
import {
  FeatureIcon,
  FeatureStatusBadge
} from '@/features/platform-features/components/feature-display';
import { PlatformFeatureFormSheet } from '@/features/platform-features/components/platform-feature-form-sheet';
import {
  platformFeatureStatuses,
  platformNodes,
  platformNodesById
} from '@/features/platform-features/constants/options';
import { cn } from '@/lib/utils';
import { roadmapQueryOptions } from '../api/queries';
import type { RoadmapItem, RoadmapZoom } from '../api/types';

const LABEL_WIDTH = 260;
const DAY_WIDTH: Record<RoadmapZoom, number> = { month: 4, quarter: 1.5 };
const MIN_MONTHS = 6;

const barStyles: Record<PlatformFeatureStatus, { bar: string; fill: string }> = {
  planned: {
    bar: 'border-muted-foreground/40 bg-muted-foreground/15',
    fill: 'bg-muted-foreground/30'
  },
  designed: { bar: 'border-blue-500/50 bg-blue-500/15', fill: 'bg-blue-500/40' },
  in_development: { bar: 'border-amber-500/50 bg-amber-500/15', fill: 'bg-amber-500/40' },
  developed: { bar: 'border-emerald-500/50 bg-emerald-500/15', fill: 'bg-emerald-500/40' }
};

interface ScheduledItem {
  item: RoadmapItem;
  start: Date;
  end: Date;
  /** Only one of the two dates is set. */
  milestone: boolean;
}

function toScheduled(item: RoadmapItem): ScheduledItem | null {
  const start = item.startDate ? parseISO(item.startDate) : null;
  const end = item.targetDate ? parseISO(item.targetDate) : null;
  if (!start && !end) return null;
  return {
    item,
    start: start ?? end!,
    end: end ?? start!,
    milestone: !start || !end
  };
}

function isOverdue({ item, end }: ScheduledItem, today: Date) {
  return item.status !== 'developed' && end < today;
}

function platformLabel(platformId: string) {
  return platformNodesById.get(platformId)?.data.label ?? platformId;
}

function formatRange({ start, end, milestone }: ScheduledItem) {
  return milestone ? format(start, 'PP') : `${format(start, 'PP')} – ${format(end, 'PP')}`;
}

export function RoadmapView() {
  const { data } = useSuspenseQuery(roadmapQueryOptions());
  const [zoom, setZoom] = useState<RoadmapZoom>('month');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<RoadmapItem | null>(null);
  const [today] = useState(() => startOfDay(new Date()));

  const scheduled: ScheduledItem[] = [];
  const unscheduled: RoadmapItem[] = [];
  for (const item of data.items) {
    const entry = toScheduled(item);
    if (entry) scheduled.push(entry);
    else unscheduled.push(item);
  }

  const openFeature = (item: RoadmapItem) => {
    setEditing(item);
    setSheetOpen(true);
  };

  return (
    <div className='flex flex-col gap-4'>
      <Card className='gap-0 py-0'>
        <CardHeader className='flex flex-wrap items-center justify-between gap-3 border-b py-4'>
          <StatusLegend />
          <div className='flex items-center gap-1'>
            {(['month', 'quarter'] as const).map((value) => (
              <Button
                key={value}
                size='sm'
                variant={zoom === value ? 'secondary' : 'ghost'}
                onClick={() => setZoom(value)}
              >
                {value === 'month' ? 'Months' : 'Quarters'}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          {scheduled.length ? (
            <RoadmapTimeline items={scheduled} today={today} zoom={zoom} onOpen={openFeature} />
          ) : (
            <div className='text-muted-foreground flex flex-col items-center gap-2 px-6 py-16 text-center text-sm'>
              <Icons.timeline className='size-8' />
              No features have dates yet. Open one from the list below to schedule it.
            </div>
          )}
        </CardContent>
      </Card>

      <UnscheduledList items={unscheduled} onOpen={openFeature} />

      <PlatformFeatureFormSheet
        key={editing?.id}
        feature={editing ?? undefined}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}

function StatusLegend() {
  return (
    <div className='flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs'>
      {platformFeatureStatuses.map((status) => (
        <span key={status.value} className='flex items-center gap-1.5'>
          <span className={cn('size-3 rounded-sm border', barStyles[status.value].bar)} />
          {status.label}
        </span>
      ))}
      <span className='flex items-center gap-1.5'>
        <span className='ring-destructive size-3 rounded-sm ring-1' />
        Overdue
      </span>
    </div>
  );
}

interface RoadmapTimelineProps {
  items: ScheduledItem[];
  today: Date;
  zoom: RoadmapZoom;
  onOpen: (item: RoadmapItem) => void;
}

function RoadmapTimeline({ items, today, zoom, onOpen }: RoadmapTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayWidth = DAY_WIDTH[zoom];

  const rangeStart = startOfMonth(
    subMonths(minDate([today, ...items.map((entry) => entry.start)]), 1)
  );
  let rangeEnd = endOfMonth(addMonths(maxDate([today, ...items.map((entry) => entry.end)]), 1));
  if (differenceInCalendarMonths(rangeEnd, rangeStart) < MIN_MONTHS - 1) {
    rangeEnd = endOfMonth(addMonths(rangeStart, MIN_MONTHS - 1));
  }

  const x = (date: Date) => differenceInCalendarDays(date, rangeStart) * dayWidth;
  const totalWidth = x(rangeEnd) + dayWidth;
  const todayX = x(today);

  const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
  const periods =
    zoom === 'month'
      ? months.map((month) => ({ start: month, label: format(month, 'MMM yyyy') }))
      : eachQuarterOfInterval({ start: rangeStart, end: rangeEnd }).map((quarter) => ({
          start: maxDate([quarter, rangeStart]),
          label: format(quarter, 'QQQ yyyy')
        }));

  const lanes = platformNodes
    .map((platform) => ({
      id: platform.id,
      label: platform.data.label,
      items: items.filter((entry) => entry.item.platformId === platform.id)
    }))
    .filter((lane) => lane.items.length);
  const knownPlatforms = new Set(platformNodes.map((platform) => platform.id));
  const orphans = items.filter((entry) => !knownPlatforms.has(entry.item.platformId));
  if (orphans.length) lanes.push({ id: 'other', label: 'Other', items: orphans });

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollLeft = Math.max(0, todayX - 160);
  }, [todayX]);

  return (
    <div ref={scrollRef} className='max-h-[calc(100dvh-20rem)] min-h-[320px] overflow-auto'>
      <div className='relative' style={{ width: LABEL_WIDTH + totalWidth }}>
        <div
          aria-hidden
          className='pointer-events-none absolute inset-y-0'
          style={{ left: LABEL_WIDTH, width: totalWidth }}
        >
          {months.map((month) => (
            <div
              key={month.toISOString()}
              className={cn(
                'absolute inset-y-0 border-l',
                zoom === 'quarter' && month.getMonth() % 3 !== 0 && 'border-dashed opacity-50'
              )}
              style={{ left: x(month) }}
            />
          ))}
          <div className='bg-primary absolute inset-y-0 w-px' style={{ left: todayX }}>
            <span className='bg-primary text-primary-foreground absolute top-1 left-1 rounded px-1 text-[10px] font-medium'>
              Today
            </span>
          </div>
        </div>

        <div className='bg-background sticky top-0 z-30 flex h-9 border-b'>
          <div
            className='bg-background sticky left-0 z-10 flex shrink-0 items-center border-r px-4 text-xs font-medium'
            style={{ width: LABEL_WIDTH }}
          >
            Feature
          </div>
          <div className='relative' style={{ width: totalWidth }}>
            {periods.map((period) => (
              <span
                key={period.label}
                className='text-muted-foreground absolute top-0 flex h-full items-center pl-2 text-xs whitespace-nowrap'
                style={{ left: x(period.start) }}
              >
                {period.label}
              </span>
            ))}
          </div>
        </div>

        {lanes.map((lane) => (
          <div key={lane.id}>
            <div className='bg-muted/50 flex h-8 border-b'>
              <div
                className='bg-muted sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r px-4 text-xs font-semibold'
                style={{ width: LABEL_WIDTH }}
              >
                {lane.label}
                <span className='text-muted-foreground font-normal'>{lane.items.length}</span>
              </div>
            </div>
            {lane.items.map((entry) => (
              <div key={entry.item.id} className='flex h-11 border-b last:border-b-0'>
                <button
                  type='button'
                  onClick={() => onOpen(entry.item)}
                  className='bg-background hover:bg-muted sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r px-4 text-left text-sm'
                  style={{ width: LABEL_WIDTH }}
                >
                  <FeatureIcon icon={entry.item.icon} className='size-6 rounded-md' />
                  <span className='truncate'>{entry.item.name}</span>
                </button>
                <div className='relative' style={{ width: totalWidth }}>
                  <RoadmapBar
                    entry={entry}
                    left={x(entry.start)}
                    width={x(entry.end) + dayWidth - x(entry.start)}
                    overdue={isOverdue(entry, today)}
                    onOpen={onOpen}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface RoadmapBarProps {
  entry: ScheduledItem;
  left: number;
  width: number;
  overdue: boolean;
  onOpen: (item: RoadmapItem) => void;
}

function RoadmapBar({ entry, left, width, overdue, onOpen }: RoadmapBarProps) {
  const { item, milestone } = entry;
  const styles = barStyles[item.status];
  const progress = item.subtasksTotal ? item.subtasksDone / item.subtasksTotal : 0;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type='button'
            onClick={() => onOpen(item)}
            aria-label={`${item.name}, ${formatRange(entry)}`}
            className={cn(
              'absolute top-1/2 z-10 -translate-y-1/2 border transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:outline-none',
              styles.bar,
              overdue && 'ring-destructive ring-1',
              milestone
                ? 'size-3.5 -translate-x-1/2 rotate-45 rounded-[3px]'
                : 'flex h-7 items-center overflow-hidden rounded-md'
            )}
            style={milestone ? { left: left + width / 2 } : { left, width: Math.max(width, 10) }}
          />
        }
      >
        {milestone ? null : (
          <>
            <span
              className={cn('absolute inset-y-0 left-0', styles.fill)}
              style={{ width: `${progress * 100}%` }}
            />
            <span className='relative truncate px-2 text-xs font-medium'>{item.name}</span>
          </>
        )}
      </TooltipTrigger>
      <TooltipContent className='flex max-w-64 flex-col items-start gap-1'>
        <span className='font-medium'>{item.name}</span>
        <span>{platformLabel(item.platformId)}</span>
        <span>
          {milestone ? (item.targetDate ? 'Target ' : 'Starts ') : ''}
          {formatRange(entry)}
        </span>
        {item.subtasksTotal ? (
          <span>
            {item.subtasksDone}/{item.subtasksTotal} subtasks done
          </span>
        ) : null}
        {overdue ? <span className='font-medium'>Overdue</span> : null}
      </TooltipContent>
    </Tooltip>
  );
}

interface UnscheduledListProps {
  items: RoadmapItem[];
  onOpen: (item: RoadmapItem) => void;
}

function UnscheduledList({ items, onOpen }: UnscheduledListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Icons.calendarTime className='size-4' />
          Unscheduled
          <span className='text-muted-foreground text-sm font-normal'>{items.length}</span>
        </CardTitle>
        <CardDescription>
          Features without a start or target date. Open one to add it to the timeline.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <ul className='grid gap-2 sm:grid-cols-2 xl:grid-cols-3'>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type='button'
                  onClick={() => onOpen(item)}
                  className='hover:bg-muted flex w-full items-center gap-3 rounded-lg border p-3 text-left'
                >
                  <FeatureIcon icon={item.icon} />
                  <span className='flex min-w-0 flex-1 flex-col'>
                    <span className='truncate text-sm font-medium'>{item.name}</span>
                    <span className='text-muted-foreground truncate text-xs'>
                      {platformLabel(item.platformId)}
                    </span>
                  </span>
                  <FeatureStatusBadge status={item.status} className='shrink-0' />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-muted-foreground text-sm'>Every feature is on the timeline.</p>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, type Dispatch } from 'react';
import type { DateRange } from 'react-day-picker';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AgoraCategory } from '../data/agora-configs';
import {
  BAN_REASONS,
  DUMMY_USERS,
  EMPTY_FILTERS,
  MIN_REPORT_OPTIONS,
  MODERATION_STATUSES,
  SORT_OPTIONS,
  VISIBILITIES,
  activeFilterCount,
  reasonLabel,
  type ModeratedItem,
  type ModerationFilters,
  type ModerationSort
} from '../data/moderation';

export type AgoraLayout = 'categorized' | 'gallery' | 'list';

type ListKey = 'statuses' | 'reasons' | 'owners' | 'visibilities' | 'categories';

export type FiltersAction =
  | { type: 'set'; patch: Partial<ModerationFilters> }
  | { type: 'toggle'; key: ListKey; value: string }
  | { type: 'reset' };

export function filtersReducer(state: ModerationFilters, action: FiltersAction): ModerationFilters {
  switch (action.type) {
    case 'set':
      return { ...state, ...action.patch };
    case 'toggle': {
      const list = state[action.key] as string[];
      const next = list.includes(action.value)
        ? list.filter((v) => v !== action.value)
        : [...list, action.value];
      return { ...state, [action.key]: next };
    }
    case 'reset':
      return { ...EMPTY_FILTERS, sort: state.sort };
  }
}

const TRIGGER_CLASS =
  'h-8 border-dashed border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white';

const LAYOUTS: { id: AgoraLayout; label: string; icon: keyof typeof Icons }[] = [
  { id: 'categorized', label: 'Categorized', icon: 'layoutColumns' },
  { id: 'gallery', label: 'Gallery', icon: 'layoutGrid' },
  { id: 'list', label: 'List', icon: 'listDetails' }
];

interface FacetOption {
  value: string;
  label: string;
  count?: number;
  hint?: string;
  icon?: keyof typeof Icons;
}

interface FacetFilterProps {
  title: string;
  icon: keyof typeof Icons;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}

function FacetFilter({ title, icon, options, selected, onToggle, onClear }: FacetFilterProps) {
  const Icon = Icons[icon];
  const chosen = new Set(selected);
  return (
    <Popover>
      <PopoverTrigger render={<Button variant='outline' size='sm' className={TRIGGER_CLASS} />}>
        <Icon />
        {title}
        {chosen.size > 0 && (
          <span className='rounded-sm bg-[var(--agora-accent)] px-1 text-[0.65rem] font-semibold text-[#07111d] tabular-nums'>
            {chosen.size}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className='w-60 p-0' align='start'>
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup className='max-h-72 overflow-y-auto'>
              {options.map((option) => {
                const isSelected = chosen.has(option.value);
                const OptionIcon = option.icon ? Icons[option.icon] : null;
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.hint ?? ''}`}
                    onSelect={() => onToggle(option.value)}
                  >
                    <div
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-sm border border-primary',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <Icons.check className='size-3' />
                    </div>
                    {OptionIcon && <OptionIcon className='text-muted-foreground' />}
                    <span className='min-w-0 flex-1'>
                      <span className='block truncate'>{option.label}</span>
                      {option.hint && (
                        <span className='block truncate text-xs text-muted-foreground'>
                          {option.hint}
                        </span>
                      )}
                    </span>
                    {option.count !== undefined && (
                      <span className='ml-auto font-mono text-xs text-muted-foreground'>
                        {option.count}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {chosen.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={onClear} className='justify-center'>
                    Clear filter
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function UploadedFilter({
  from,
  to,
  onChange
}: {
  from?: number;
  to?: number;
  onChange: (range: { uploadedFrom?: number; uploadedTo?: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected: DateRange = {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined
  };
  const label =
    from || to
      ? `${from ? formatDate(from, { month: 'short' }) : '…'} – ${to ? formatDate(to, { month: 'short' }) : '…'}`
      : null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant='outline' size='sm' className={TRIGGER_CLASS} />}>
        <Icons.calendar />
        Uploaded
        {label && <span className='text-[var(--agora-accent)]'>{label}</span>}
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <Calendar
          autoFocus
          mode='range'
          numberOfMonths={2}
          defaultMonth={selected.from ?? new Date(2026, 8, 1)}
          selected={selected}
          onSelect={(range) =>
            onChange({ uploadedFrom: range?.from?.getTime(), uploadedTo: range?.to?.getTime() })
          }
        />
        {label && (
          <div className='border-t p-2'>
            <Button
              variant='ghost'
              size='sm'
              className='w-full'
              onClick={() => {
                onChange({ uploadedFrom: undefined, uploadedTo: undefined });
                setOpen(false);
              }}
            >
              Clear dates
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function countBy<T>(items: ModeratedItem[], key: (item: ModeratedItem) => T | T[]) {
  const counts = new Map<T, number>();
  for (const item of items) {
    const values = key(item);
    for (const value of Array.isArray(values) ? new Set(values) : [values]) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

interface ModerationFilterBarProps {
  filters: ModerationFilters;
  dispatch: Dispatch<FiltersAction>;
  items: ModeratedItem[];
  categories: AgoraCategory[];
  visibleIds: string[];
  selectedIds: ReadonlySet<string>;
  onSelectAll: (select: boolean) => void;
  layout: AgoraLayout;
  onLayoutChange: (layout: AgoraLayout) => void;
}

export function ModerationFilterBar({
  filters,
  dispatch,
  items,
  categories,
  visibleIds,
  selectedIds,
  onSelectAll,
  layout,
  onLayoutChange
}: ModerationFilterBarProps) {
  const statusCounts = countBy(items, (i) => i.status);
  const reasonCounts = countBy(items, (i) => [
    ...(i.ban ? [i.ban.reason] : []),
    ...i.reports.map((r) => r.reason)
  ]);
  const ownerCounts = countBy(items, (i) => i.owner.id);
  const visibilityCounts = countBy(items, (i) => i.visibility);
  const categoryCounts = countBy(items, (i) => i.categoryId);

  const selectedVisible = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = visibleIds.length > 0 && selectedVisible === visibleIds.length;
  const toggle = (key: ListKey) => (value: string) => dispatch({ type: 'toggle', key, value });
  const clear = (key: ListKey) => () => dispatch({ type: 'set', patch: { [key]: [] } });

  const chips: { key: string; label: string; onRemove: () => void }[] = [
    ...(filters.query.trim()
      ? [
          {
            key: 'query',
            label: `“${filters.query.trim()}”`,
            onRemove: () => dispatch({ type: 'set', patch: { query: '' } })
          }
        ]
      : []),
    ...filters.statuses.map((value) => ({
      key: `status-${value}`,
      label: `Status: ${MODERATION_STATUSES.find((s) => s.value === value)?.label}`,
      onRemove: () => toggle('statuses')(value)
    })),
    ...filters.reasons.map((value) => ({
      key: `reason-${value}`,
      label: `Reason: ${reasonLabel(value)}`,
      onRemove: () => toggle('reasons')(value)
    })),
    ...filters.owners.map((value) => ({
      key: `owner-${value}`,
      label: `Owner: ${DUMMY_USERS.find((u) => u.id === value)?.name}`,
      onRemove: () => toggle('owners')(value)
    })),
    ...filters.visibilities.map((value) => ({
      key: `visibility-${value}`,
      label: `Visibility: ${VISIBILITIES.find((v) => v.value === value)?.label}`,
      onRemove: () => toggle('visibilities')(value)
    })),
    ...filters.categories.map((value) => ({
      key: `category-${value}`,
      label: `Category: ${categories.find((c) => c.id === value)?.title}`,
      onRemove: () => toggle('categories')(value)
    })),
    ...(filters.minReports > 0
      ? [
          {
            key: 'reports',
            label: `${filters.minReports}+ reports`,
            onRemove: () => dispatch({ type: 'set', patch: { minReports: 0 } })
          }
        ]
      : []),
    ...(filters.uploadedFrom || filters.uploadedTo
      ? [
          {
            key: 'uploaded',
            label: `Uploaded ${filters.uploadedFrom ? formatDate(filters.uploadedFrom, { month: 'short' }) : '…'} – ${filters.uploadedTo ? formatDate(filters.uploadedTo, { month: 'short' }) : '…'}`,
            onRemove: () =>
              dispatch({
                type: 'set',
                patch: { uploadedFrom: undefined, uploadedTo: undefined }
              })
          }
        ]
      : [])
  ];

  return (
    <div className='sticky top-0 z-20 space-y-2.5 border-y border-white/10 bg-[#07111d]/90 px-4 py-3 backdrop-blur md:px-6'>
      <div className='flex flex-wrap items-center gap-2'>
        <label className='flex h-9 min-w-56 flex-1 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-white/60 focus-within:border-[var(--agora-accent)]/60'>
          <Icons.search className='size-4 shrink-0' />
          <input
            value={filters.query}
            onChange={(event) => dispatch({ type: 'set', patch: { query: event.target.value } })}
            placeholder='Search titles, descriptions, owners or emails'
            className='w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40'
          />
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant='outline'
                size='sm'
                className='h-9 rounded-full border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
              />
            }
          >
            <Icons.arrowsExchange />
            {SORT_OPTIONS.find((o) => o.value === filters.sort)?.label}
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-44'>
            <DropdownMenuRadioGroup
              value={filters.sort}
              onValueChange={(value) =>
                dispatch({ type: 'set', patch: { sort: value as ModerationSort } })
              }
            >
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className='flex gap-0.5 rounded-full border border-white/10 bg-white/5 p-0.5'>
          {LAYOUTS.map(({ id, label, icon }) => {
            const Icon = Icons[icon];
            return (
              <button
                key={id}
                type='button'
                title={label}
                aria-label={label}
                aria-pressed={id === layout}
                onClick={() => onLayoutChange(id)}
                className={cn(
                  'flex size-8 items-center justify-center rounded-full transition-colors',
                  id === layout
                    ? 'bg-[var(--agora-accent)] text-[#07111d]'
                    : 'text-white/60 hover:text-white'
                )}
              >
                <Icon className='size-4' />
              </button>
            );
          })}
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <label className='mr-1 flex items-center gap-2 text-xs text-white/60'>
          <Checkbox
            checked={allSelected}
            indeterminate={selectedVisible > 0 && !allSelected}
            disabled={visibleIds.length === 0}
            onCheckedChange={(checked) => onSelectAll(checked)}
            aria-label='Select all visible items'
          />
          <span className='tabular-nums'>
            {visibleIds.length} of {items.length}
          </span>
        </label>
        <FacetFilter
          title='Status'
          icon='circleDashed'
          options={MODERATION_STATUSES.map((s) => ({
            value: s.value,
            label: s.label,
            icon: s.icon,
            count: statusCounts.get(s.value) ?? 0
          }))}
          selected={filters.statuses}
          onToggle={toggle('statuses')}
          onClear={clear('statuses')}
        />
        <FacetFilter
          title='Reason'
          icon='flag'
          options={BAN_REASONS.map((r) => ({
            value: r.value,
            label: r.label,
            icon: r.icon,
            count: reasonCounts.get(r.value) ?? 0
          }))}
          selected={filters.reasons}
          onToggle={toggle('reasons')}
          onClear={clear('reasons')}
        />
        <FacetFilter
          title='Owner'
          icon='user'
          options={DUMMY_USERS.map((u) => ({
            value: u.id,
            label: u.name,
            hint: u.email,
            count: ownerCounts.get(u.id) ?? 0
          }))}
          selected={filters.owners}
          onToggle={toggle('owners')}
          onClear={clear('owners')}
        />
        <FacetFilter
          title='Visibility'
          icon='eye'
          options={VISIBILITIES.map((v) => ({
            value: v.value,
            label: v.label,
            icon: v.icon,
            count: visibilityCounts.get(v.value) ?? 0
          }))}
          selected={filters.visibilities}
          onToggle={toggle('visibilities')}
          onClear={clear('visibilities')}
        />
        <FacetFilter
          title='Category'
          icon='layoutGrid'
          options={categories.map((c) => ({
            value: c.id,
            label: c.title,
            count: categoryCounts.get(c.id) ?? 0
          }))}
          selected={filters.categories}
          onToggle={toggle('categories')}
          onClear={clear('categories')}
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant='outline' size='sm' className={TRIGGER_CLASS} />}
          >
            <Icons.alertCircle />
            Reports
            {filters.minReports > 0 && (
              <span className='text-[var(--agora-accent)]'>{filters.minReports}+</span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent className='w-40'>
            <DropdownMenuRadioGroup
              value={String(filters.minReports)}
              onValueChange={(value) =>
                dispatch({ type: 'set', patch: { minReports: Number(value) } })
              }
            >
              <DropdownMenuLabel>Minimum reports</DropdownMenuLabel>
              {MIN_REPORT_OPTIONS.map((min) => (
                <DropdownMenuRadioItem key={min} value={String(min)}>
                  {min === 0 ? 'Any' : `${min} or more`}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <UploadedFilter
          from={filters.uploadedFrom}
          to={filters.uploadedTo}
          onChange={(patch) => dispatch({ type: 'set', patch })}
        />
      </div>

      {chips.length > 0 && (
        <div className='flex flex-wrap items-center gap-1.5'>
          {chips.map((chip) => (
            <span
              key={chip.key}
              className='flex items-center gap-1 rounded-full border border-[var(--agora-accent)]/40 bg-[var(--agora-accent)]/10 py-0.5 pr-1 pl-2.5 text-xs text-white'
            >
              {chip.label}
              <button
                type='button'
                onClick={chip.onRemove}
                aria-label={`Remove ${chip.label}`}
                className='flex size-4 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white'
              >
                <Icons.close className='size-3' />
              </button>
            </span>
          ))}
          {activeFilterCount(filters) > 1 && (
            <button
              type='button'
              onClick={() => dispatch({ type: 'reset' })}
              className='ml-1 text-xs text-white/60 underline-offset-2 hover:text-white hover:underline'
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

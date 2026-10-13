import type { EventColor } from '../api/types';

export const eventColorLabels: Record<EventColor, string> = {
  blue: 'Blue',
  green: 'Green',
  amber: 'Amber',
  red: 'Red',
  purple: 'Purple'
};

export const eventColorStyles: Record<EventColor, string> = {
  blue: 'border-sky-500 bg-sky-500/15 text-sky-950 hover:bg-sky-500/25 dark:text-sky-100',
  green:
    'border-emerald-500 bg-emerald-500/15 text-emerald-950 hover:bg-emerald-500/25 dark:text-emerald-100',
  amber:
    'border-amber-500 bg-amber-500/15 text-amber-950 hover:bg-amber-500/25 dark:text-amber-100',
  red: 'border-rose-500 bg-rose-500/15 text-rose-950 hover:bg-rose-500/25 dark:text-rose-100',
  purple:
    'border-violet-500 bg-violet-500/15 text-violet-950 hover:bg-violet-500/25 dark:text-violet-100'
};

export const eventColorSwatches: Record<EventColor, string> = {
  blue: 'bg-sky-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
  purple: 'bg-violet-500'
};

'use client';

import type { ReactNode } from 'react';
import { Icons } from '@/components/icons';
import { CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface SectionRowProps {
  title: string;
  count: number;
  open: boolean;
  selected: boolean;
  onSelect: () => void;
  /** Trailing actions, e.g. a row menu. */
  children?: ReactNode;
}

/**
 * Header row of a collapsible section in a layers panel. The chevron expands or collapses the
 * section; the title selects the section itself. Must render inside a `Collapsible`.
 */
export function SectionRow({ title, count, open, selected, onSelect, children }: SectionRowProps) {
  return (
    <div
      className={cn(
        'group/section flex items-center rounded-md pr-1 transition-colors',
        selected ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted/50'
      )}
    >
      <CollapsibleTrigger
        aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
        className='hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-md'
      >
        <Icons.chevronRight
          className={cn('size-3.5 transition-transform duration-200', open && 'rotate-90')}
        />
      </CollapsibleTrigger>
      <button
        type='button'
        onClick={onSelect}
        aria-current={selected ? 'page' : undefined}
        className='hover:text-foreground flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-1 text-left text-xs font-semibold tracking-wider uppercase'
      >
        <span className='flex-1 truncate'>{title}</span>
        <span className='bg-muted rounded-full px-1.5 text-[10px] font-medium tabular-nums'>
          {count}
        </span>
      </button>
      {children}
    </div>
  );
}

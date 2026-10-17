'use client';

import { Icons, type Icon } from '@/components/icons';
import { HeaderPortal } from '@/components/layout/header-portal';
import { HEADER_TITLE_SLOT_ID } from '@/components/layout/header-slot';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { SaveState } from '../lib/use-debounced-save';

interface SaveStatusDisplay {
  icon: Icon;
  label: string;
  className: string;
  spin?: boolean;
}

function describe(state: SaveState): SaveStatusDisplay {
  switch (state.status) {
    case 'saving':
      return {
        icon: Icons.spinner,
        label: 'Saving to cloud...',
        className: 'text-primary',
        spin: true
      };
    case 'error':
      return {
        icon: Icons.cloudAlert,
        label: `Could not save to the cloud: ${state.message}`,
        className: 'text-destructive'
      };
    case 'pending':
      return {
        icon: Icons.cloud,
        label: 'Changes pending save',
        className: 'text-muted-foreground'
      };
    case 'saved':
      return {
        icon: Icons.cloudCheck,
        label: state.at
          ? `Saved to the cloud. Last saved: ${new Date(state.at).toLocaleTimeString()}`
          : 'Saved to the cloud',
        className: 'text-emerald-600'
      };
  }
}

/** Cloud save status shown next to the page title in the app header. */
export function SaveIndicator({ state }: { state: SaveState }) {
  const { icon: StatusIcon, label, className, spin } = describe(state);
  return (
    <HeaderPortal slotId={HEADER_TITLE_SLOT_ID}>
      <Tooltip>
        <TooltipTrigger
          render={<span role='status' aria-label={label} className='flex shrink-0' />}
        >
          <StatusIcon className={cn('size-4 shrink-0', className, spin && 'animate-spin')} />
        </TooltipTrigger>
        <TooltipContent side='bottom'>{label}</TooltipContent>
      </Tooltip>
    </HeaderPortal>
  );
}

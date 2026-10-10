'use client';

import type { Column, ColumnDef } from '@tanstack/react-table';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BrandLogo } from '@/features/architecture/components/brand-logo';
import { platformNodesById } from '@/features/platform-features/constants/options';
import { relativeTime } from '@/lib/relative-time';
import type { Lead } from '../../api/types';
import {
  leadEmailStatusOptions,
  leadSourceLabels,
  leadSourceOptions,
  leadStatusOptions
} from '../../constants/options';
import {
  LeadEmailStatusIcon,
  leadEmailStatusDescription,
  LeadSessionList,
  LeadStatusBadge
} from '../lead-display';
import { CellAction } from './cell-action';

type Header = { column: Column<Lead, unknown> };

const dateTimeFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });
const iateneo = platformNodesById.get('iateneo');

function CapturedAt({ iso }: { iso: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span suppressHydrationWarning className='cursor-help text-sm whitespace-nowrap' />}
      >
        {relativeTime(iso)}
      </TooltipTrigger>
      <TooltipContent side='top'>{dateTimeFormat.format(new Date(iso))}</TooltipContent>
    </Tooltip>
  );
}

export const columns: ColumnDef<Lead>[] = [
  {
    id: 'lead',
    accessorFn: (row) => row.name ?? row.email,
    header: ({ column }: Header) => <DataTableColumnHeader column={column} title='Lead' />,
    size: 180,
    cell: ({ row }) =>
      row.original.name ? (
        <span className='font-medium'>{row.original.name}</span>
      ) : (
        <span className='text-muted-foreground'>No name</span>
      ),
    meta: {
      label: 'Lead',
      placeholder: 'Search name or email...',
      variant: 'text' as const,
      icon: Icons.text
    },
    enableColumnFilter: true
  },
  {
    id: 'email',
    accessorFn: (row) => row.emailStatus,
    enableSorting: false,
    header: ({ column }: Header) => <DataTableColumnHeader column={column} title='Email' />,
    size: 280,
    cell: ({ row }) => (
      <span className='inline-flex items-center gap-2'>
        <Tooltip>
          <TooltipTrigger render={<span className='inline-flex cursor-help' />}>
            <LeadEmailStatusIcon status={row.original.emailStatus} />
          </TooltipTrigger>
          <TooltipContent side='top'>{leadEmailStatusDescription(row.original)}</TooltipContent>
        </Tooltip>
        <a href={`mailto:${row.original.email}`} className='text-sm hover:underline'>
          {row.original.email}
        </a>
      </span>
    ),
    meta: {
      label: 'Email status',
      variant: 'multiSelect' as const,
      options: leadEmailStatusOptions.map(({ value, label }) => ({ value, label }))
    },
    enableColumnFilter: true
  },
  {
    id: 'source',
    accessorKey: 'source',
    enableSorting: false,
    header: ({ column }: Header) => <DataTableColumnHeader column={column} title='Source' />,
    cell: ({ row }) => (
      <Badge variant='secondary' className='whitespace-nowrap'>
        {leadSourceLabels.get(row.original.source) ?? row.original.source}
      </Badge>
    ),
    meta: {
      label: 'Source',
      variant: 'multiSelect' as const,
      options: leadSourceOptions
    },
    enableColumnFilter: true
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }: Header) => <DataTableColumnHeader column={column} title='Status' />,
    cell: ({ row }) => <LeadStatusBadge status={row.original.status} />,
    meta: {
      label: 'Status',
      variant: 'multiSelect' as const,
      options: leadStatusOptions.map(({ value, label }) => ({ value, label }))
    },
    enableColumnFilter: true
  },
  {
    id: 'sessions',
    header: 'SESSIONS',
    enableSorting: false,
    cell: ({ row }) => (
      <Tooltip>
        <TooltipTrigger
          render={<span className='inline-flex cursor-help items-center gap-1.5 text-sm' />}
        >
          {iateneo?.data.logo ? (
            <BrandLogo logo={iateneo.data.logo} logoDark={iateneo.data.logoDark} size={16} />
          ) : null}
          <span className='tabular-nums'>{row.original.sessions.length}</span>
        </TooltipTrigger>
        <TooltipContent side='top' className='max-w-sm'>
          {row.original.sessions.length ? (
            <LeadSessionList sessions={row.original.sessions} />
          ) : (
            'No sessions found'
          )}
        </TooltipContent>
      </Tooltip>
    )
  },
  {
    id: 'firstCaptured',
    accessorKey: 'firstCapturedAt',
    header: ({ column }: Header) => (
      <DataTableColumnHeader column={column} title='First captured' />
    ),
    cell: ({ row }) => <CapturedAt iso={row.original.firstCapturedAt} />
  },
  {
    id: 'lastCaptured',
    accessorKey: 'lastCapturedAt',
    header: ({ column }: Header) => <DataTableColumnHeader column={column} title='Last captured' />,
    cell: ({ row }) => <CapturedAt iso={row.original.lastCapturedAt} />
  },
  {
    id: 'notes',
    header: 'NOTES',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.notes ? (
        <p className='text-muted-foreground line-clamp-2 max-w-xs text-sm whitespace-normal'>
          {row.original.notes}
        </p>
      ) : (
        <span className='text-muted-foreground text-sm'>—</span>
      )
  },
  {
    id: 'actions',
    size: 48,
    cell: ({ row }) => <CellAction data={row.original} />
  }
];

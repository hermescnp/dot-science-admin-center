'use client';

import type { Column, ColumnDef } from '@tanstack/react-table';
import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BrandLogo } from '@/features/architecture/components/brand-logo';
import { platformNodesById } from '@/features/platform-features/constants/options';
import { relativeTime } from '@/lib/relative-time';
import { cn } from '@/lib/utils';
import type { PlatformUser, UserActivity } from '../../api/types';
import { CellAction } from './cell-action';
import { ACCESS_OPTIONS, providerLabel } from './options';

type Header = { column: Column<PlatformUser, unknown> };

const dateTimeFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });
function initials(user: PlatformUser) {
  const source = user.displayName ?? user.email ?? '?';
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const activityPlatforms: {
  platformId: string;
  rows: { key: keyof UserActivity; label: string }[];
}[] = [
  { platformId: 'golden-papers', rows: [{ key: 'documents', label: 'Documents created' }] },
  {
    platformId: 'iateneo',
    rows: [
      { key: 'sessionsHosted', label: 'Sessions hosted' },
      { key: 'sessionsJoined', label: 'Sessions joined' }
    ]
  },
  { platformId: 'workspace', rows: [{ key: 'projects', label: 'Projects created' }] }
];

function PlatformLogo({ platformId, size }: { platformId: string; size: number }) {
  const platform = platformNodesById.get(platformId);
  return platform?.data.logo ? (
    <BrandLogo logo={platform.data.logo} logoDark={platform.data.logoDark} size={size} />
  ) : null;
}

function ActivitySummary({ activity }: { activity: UserActivity }) {
  return (
    <div className='flex items-center gap-4 text-sm'>
      {activityPlatforms.map(({ platformId, rows }) => {
        const label = platformNodesById.get(platformId)?.data.label ?? platformId;
        const empty = rows.every((row) => activity[row.key] === 0);
        return (
          <Tooltip key={platformId}>
            <TooltipTrigger
              render={
                <span
                  className={cn(
                    'inline-flex cursor-help items-center gap-1.5 tabular-nums',
                    empty && 'opacity-40'
                  )}
                />
              }
            >
              <PlatformLogo platformId={platformId} size={16} />
              {rows.map((row) => activity[row.key]).join(' / ')}
            </TooltipTrigger>
            <TooltipContent side='top'>
              <div className='flex flex-col gap-0.5'>
                <span className='font-medium'>{label}</span>
                {rows.map((row) => (
                  <span key={row.key} className='flex justify-between gap-4'>
                    {row.label}
                    <span className='tabular-nums'>{activity[row.key]}</span>
                  </span>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function getColumns(planOptions: { value: string; label: string }[]) {
  const columns: ColumnDef<PlatformUser>[] = [
    {
      id: 'user',
      accessorFn: (row) => row.displayName ?? row.email ?? '',
      header: ({ column }: Header) => <DataTableColumnHeader column={column} title='User' />,
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
          <Avatar className='h-8 w-8'>
            {row.original.avatarUrl ? <AvatarImage src={row.original.avatarUrl} alt='' /> : null}
            <AvatarFallback>{initials(row.original)}</AvatarFallback>
          </Avatar>
          <div className='flex min-w-0 flex-col'>
            <span className='truncate font-medium'>
              {row.original.displayName ?? 'Unnamed user'}
              {row.original.isSelf ? (
                <span className='text-muted-foreground font-normal'> (you)</span>
              ) : null}
            </span>
            <span className='text-muted-foreground truncate text-xs'>{row.original.email}</span>
          </div>
        </div>
      ),
      meta: {
        label: 'User',
        placeholder: 'Search name or email...',
        variant: 'text' as const,
        icon: Icons.text
      },
      enableColumnFilter: true
    },
    {
      id: 'admin',
      accessorKey: 'isPlatformAdmin',
      enableSorting: false,
      header: ({ column }: Header) => <DataTableColumnHeader column={column} title='Access' />,
      cell: ({ row }) =>
        row.original.isPlatformAdmin ? (
          <Badge>
            <Icons.shieldLock className='h-3 w-3' /> Admin
          </Badge>
        ) : (
          <Badge variant='outline'>Member</Badge>
        ),
      meta: {
        label: 'Access',
        variant: 'select' as const,
        options: ACCESS_OPTIONS
      },
      enableColumnFilter: true
    },
    {
      id: 'signIn',
      header: 'SIGN-IN',
      enableSorting: false,
      cell: ({ row }) => (
        <div className='flex flex-wrap items-center gap-1'>
          {row.original.providers.map((provider) => (
            <Badge key={provider} variant='secondary'>
              {providerLabel(provider)}
            </Badge>
          ))}
          {row.original.emailVerified ? (
            <Tooltip>
              <TooltipTrigger render={<span aria-label='Email verified' />}>
                <Icons.badgeCheck className='h-4 w-4 text-emerald-600' />
              </TooltipTrigger>
              <TooltipContent side='top'>Email verified</TooltipContent>
            </Tooltip>
          ) : (
            <Badge variant='outline'>Unverified</Badge>
          )}
        </div>
      )
    },
    {
      id: 'plan',
      accessorFn: (row) => row.billingPlan?.id ?? '',
      enableSorting: false,
      header: ({ column }: Header) => <DataTableColumnHeader column={column} title='Plan' />,
      cell: ({ row }) =>
        row.original.billingPlan ? (
          <Badge variant='outline'>{row.original.billingPlan.name}</Badge>
        ) : (
          <span className='text-muted-foreground text-sm'>No plan</span>
        ),
      meta: {
        label: 'Plan',
        variant: 'select' as const,
        options: planOptions
      },
      enableColumnFilter: true
    },
    {
      id: 'workspaces',
      header: 'WORKSPACES',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.workspaces.length ? (
          <div className='flex max-w-xs flex-col gap-1'>
            {row.original.workspaces.map((workspace) => (
              <div key={workspace.id} className='flex items-center gap-2 text-sm'>
                <span className='truncate'>{workspace.name}</span>
                <Badge variant='secondary' className='capitalize'>
                  {workspace.role}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <span className='text-muted-foreground text-sm'>None</span>
        )
    },
    {
      id: 'activity',
      header: 'ACTIVITY',
      size: 260,
      enableSorting: false,
      cell: ({ row }) => <ActivitySummary activity={row.original.activity} />
    },
    {
      id: 'lastSignIn',
      accessorKey: 'lastSignInAt',
      header: ({ column }: Header) => (
        <DataTableColumnHeader column={column} title='Last sign-in' />
      ),
      cell: ({ row }) => (
        <span className='text-sm whitespace-nowrap'>
          {row.original.lastSignInAt
            ? dateTimeFormat.format(new Date(row.original.lastSignInAt))
            : 'Never'}
        </span>
      )
    },
    {
      id: 'lastSeen',
      accessorKey: 'lastSeenAt',
      header: ({ column }: Header) => <DataTableColumnHeader column={column} title='Last seen' />,
      cell: ({ row }) =>
        row.original.lastSeenAt ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span suppressHydrationWarning className='cursor-help text-sm whitespace-nowrap' />
              }
            >
              {relativeTime(row.original.lastSeenAt)}
            </TooltipTrigger>
            <TooltipContent side='top'>
              {dateTimeFormat.format(new Date(row.original.lastSeenAt))}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className='text-muted-foreground text-sm'>Never</span>
        )
    },
    {
      id: 'actions',
      size: 48,
      cell: ({ row }) => <CellAction data={row.original} />
    }
  ];
  return columns;
}

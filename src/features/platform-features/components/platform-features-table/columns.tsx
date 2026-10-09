'use client';

import type { Column, ColumnDef } from '@tanstack/react-table';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { BrandLogo } from '@/features/architecture/components/brand-logo';
import type { PlatformFeature } from '../../api/types';
import {
  platformFeatureSections,
  platformNodesById,
  platformOptions,
  sectionLabels,
  statusOptions
} from '../../constants/options';
import { FeatureCost, FeatureIcon, FeatureStatusBadge, ServiceBadges } from '../feature-display';
import { CellAction } from './cell-action';

export const columns: ColumnDef<PlatformFeature>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }: { column: Column<PlatformFeature, unknown> }) => (
      <DataTableColumnHeader column={column} title='Functionality' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-3'>
        <FeatureIcon icon={row.original.icon} />
        <span className='font-medium'>{row.original.name}</span>
      </div>
    ),
    meta: {
      label: 'Functionality',
      placeholder: 'Search features...',
      variant: 'text' as const,
      icon: Icons.text
    },
    enableColumnFilter: true
  },
  {
    id: 'platform',
    accessorKey: 'platformId',
    header: ({ column }: { column: Column<PlatformFeature, unknown> }) => (
      <DataTableColumnHeader column={column} title='Platform' />
    ),
    cell: ({ row }) => {
      const platform = platformNodesById.get(row.original.platformId);
      return (
        <div className='flex items-center gap-2 whitespace-nowrap'>
          {platform?.data.logo ? (
            <BrandLogo logo={platform.data.logo} logoDark={platform.data.logoDark} size={18} />
          ) : null}
          {platform?.data.label ?? row.original.platformId}
        </div>
      );
    },
    meta: {
      label: 'Platform',
      variant: 'multiSelect' as const,
      options: platformOptions
    },
    enableColumnFilter: true
  },
  {
    id: 'section',
    accessorKey: 'section',
    header: ({ column }: { column: Column<PlatformFeature, unknown> }) => (
      <DataTableColumnHeader column={column} title='Section' />
    ),
    cell: ({ row }) => (
      <Badge variant='outline'>
        {sectionLabels.get(row.original.section) ?? row.original.section}
      </Badge>
    ),
    meta: {
      label: 'Section',
      variant: 'multiSelect' as const,
      options: platformFeatureSections
    },
    enableColumnFilter: true
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }: { column: Column<PlatformFeature, unknown> }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => <FeatureStatusBadge status={row.original.status} />,
    meta: {
      label: 'Status',
      variant: 'multiSelect' as const,
      options: statusOptions
    },
    enableColumnFilter: true
  },
  {
    id: 'description',
    accessorKey: 'description',
    header: 'DESCRIPTION',
    enableSorting: false,
    cell: ({ row }) => (
      <p className='text-muted-foreground max-w-md text-sm whitespace-normal'>
        {row.original.description}
      </p>
    )
  },
  {
    id: 'services',
    accessorKey: 'services',
    header: 'SERVICES',
    enableSorting: false,
    cell: ({ row }) => <ServiceBadges services={row.original.services} className='max-w-xs' />
  },
  {
    id: 'cost',
    header: 'ESTIMATED COST',
    enableSorting: false,
    cell: ({ row }) => (
      <div className='whitespace-nowrap'>
        <FeatureCost services={row.original.services} />
      </div>
    )
  },
  {
    id: 'actions',
    cell: ({ row }) => <CellAction data={row.original} />
  }
];

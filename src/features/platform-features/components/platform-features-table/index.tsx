'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useQueryStates } from 'nuqs';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { platformFeaturesQueryOptions, toPlatformFeatureFilters } from '../../api/queries';
import {
  platformFeaturesPageSize,
  platformFeaturesPageSizeOptions
} from '../../constants/pagination';
import { platformFeaturesSearchParams } from '../../constants/search-params';
import { columns } from './columns';

export function PlatformFeaturesTable() {
  const [params] = useQueryStates(platformFeaturesSearchParams);

  const { data } = useSuspenseQuery(platformFeaturesQueryOptions(toPlatformFeatureFilters(params)));

  const { table } = useDataTable({
    data: data.features,
    columns,
    pageCount: Math.ceil(data.total / params.perPage),
    shallow: true,
    debounceMs: 500,
    initialState: {
      pagination: { pageIndex: 0, pageSize: platformFeaturesPageSize },
      columnPinning: { right: ['actions'] }
    }
  });

  return (
    <DataTable table={table} pageSizeOptions={platformFeaturesPageSizeOptions}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}

export function PlatformFeaturesTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='bg-muted h-10 w-full rounded' />
      <div className='bg-muted h-96 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}

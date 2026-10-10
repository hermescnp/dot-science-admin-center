'use client';

import { useMemo } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useQueryStates } from 'nuqs';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { billingPlansQueryOptions } from '@/features/billing-plans/api/queries';
import { useDataTable } from '@/hooks/use-data-table';
import { toUserFilters, usersQueryOptions } from '../../api/queries';
import { usersSearchParams } from '../../constants/search-params';
import { getColumns } from './columns';

export function UsersTable() {
  const [params] = useQueryStates(usersSearchParams);

  const { data } = useSuspenseQuery(usersQueryOptions(toUserFilters(params)));
  const { data: billing } = useSuspenseQuery(billingPlansQueryOptions());

  const columns = useMemo(
    () => getColumns(billing.plans.map((plan) => ({ value: plan.id, label: plan.name }))),
    [billing.plans]
  );

  const { table } = useDataTable({
    data: data.users,
    columns,
    pageCount: Math.ceil(data.total / params.perPage),
    shallow: true,
    debounceMs: 500,
    initialState: {
      columnPinning: { right: ['actions'] }
    }
  });

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}

export function UsersTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='bg-muted h-10 w-full rounded' />
      <div className='bg-muted h-96 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}

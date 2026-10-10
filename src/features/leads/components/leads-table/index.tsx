'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useQueryStates } from 'nuqs';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { leadsQueryOptions, toLeadFilters } from '../../api/queries';
import { leadsSearchParams } from '../../constants/search-params';
import { columns } from './columns';

export function LeadsTable() {
  const [params] = useQueryStates(leadsSearchParams);

  const { data } = useSuspenseQuery(leadsQueryOptions(toLeadFilters(params)));

  const { table } = useDataTable({
    data: data.leads,
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

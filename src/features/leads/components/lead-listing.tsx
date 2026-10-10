import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getSupabaseServerClient } from '@/lib/auth-server';
import { getQueryClient } from '@/lib/query-client';
import { leadKeys, toLeadFilters } from '../api/queries';
import { leadsSearchParamsCache } from '../constants/search-params';
import { listLeads } from '../server/leads';
import { LeadsTable } from './leads-table';

export default function LeadListing() {
  const filters = toLeadFilters({
    page: leadsSearchParamsCache.get('page'),
    perPage: leadsSearchParamsCache.get('perPage'),
    lead: leadsSearchParamsCache.get('lead'),
    email: leadsSearchParamsCache.get('email'),
    status: leadsSearchParamsCache.get('status'),
    source: leadsSearchParamsCache.get('source'),
    sort: leadsSearchParamsCache.get('sort')
  });

  const queryClient = getQueryClient();

  // The client's queryFn goes through /api, which a server component can't call with a relative URL.
  void queryClient.prefetchQuery({
    queryKey: leadKeys.list(filters),
    queryFn: async () => listLeads(await getSupabaseServerClient(), filters)
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LeadsTable />
    </HydrationBoundary>
  );
}

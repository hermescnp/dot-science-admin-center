import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getSupabaseServerClient } from '@/lib/auth-server';
import { getQueryClient } from '@/lib/query-client';
import { externalServiceKeys } from '../api/queries';
import { listExternalServices } from '../server/external-services';
import { MaintenanceTable } from './maintenance-table';

export default function MaintenanceListing() {
  const queryClient = getQueryClient();

  // The client's queryFn goes through /api, which a server component can't call with a relative URL.
  void queryClient.prefetchQuery({
    queryKey: externalServiceKeys.list(),
    queryFn: async () => listExternalServices(await getSupabaseServerClient())
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<Skeleton className='h-[600px] w-full rounded-lg' />}>
        <MaintenanceTable />
      </Suspense>
    </HydrationBoundary>
  );
}

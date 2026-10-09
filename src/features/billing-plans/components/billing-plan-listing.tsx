import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { externalServiceKeys } from '@/features/external-services/api/queries';
import { listExternalServices } from '@/features/external-services/server/external-services';
import { getSupabaseServerClient } from '@/lib/auth-server';
import { getQueryClient } from '@/lib/query-client';
import { billingPlanKeys } from '../api/queries';
import { listBillingPlans } from '../server/billing-plans';
import { BillingPlanGrid } from './billing-plan-grid';

function BillingPlanGridSkeleton() {
  return (
    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className='h-[28rem] rounded-xl' />
      ))}
    </div>
  );
}

export default function BillingPlanListing() {
  const queryClient = getQueryClient();

  // The client's queryFns go through /api, which a server component can't call with a relative URL.
  void queryClient.prefetchQuery({
    queryKey: billingPlanKeys.list(),
    queryFn: async () => listBillingPlans(await getSupabaseServerClient())
  });
  void queryClient.prefetchQuery({
    queryKey: externalServiceKeys.list(),
    queryFn: async () => listExternalServices(await getSupabaseServerClient())
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<BillingPlanGridSkeleton />}>
        <BillingPlanGrid />
      </Suspense>
    </HydrationBoundary>
  );
}

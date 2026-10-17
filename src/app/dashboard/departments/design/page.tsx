import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { designKeys } from '@/features/design-board/api/queries';
import { DesignView } from '@/features/design-board/components/design-view';
import { getDesignSections } from '@/features/design-board/server/design-board';
import { getDesignComponents } from '@/features/design-board/server/design-components';
import { getSupabaseServerClient } from '@/lib/auth-server';
import { getQueryClient } from '@/lib/query-client';

export const metadata = {
  title: 'Dashboard: Design Department'
};

export default function DesignDepartmentPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery({
    queryKey: designKeys.sections(),
    queryFn: async () => getDesignSections(await getSupabaseServerClient())
  });
  void queryClient.prefetchQuery({
    queryKey: designKeys.components(),
    queryFn: async () => getDesignComponents(await getSupabaseServerClient())
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense
        fallback={
          <Skeleton className='h-[calc(100svh-4rem)] w-full rounded-none md:h-[calc(100svh-3.5rem)]' />
        }
      >
        <DesignView />
      </Suspense>
    </HydrationBoundary>
  );
}

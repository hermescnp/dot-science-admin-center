import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { designBoardKeys } from '@/features/design-board/api/queries';
import { DesignBoardView } from '@/features/design-board/components/design-board';
import { getDesignBoard } from '@/features/design-board/server/design-board';
import { getSupabaseServerClient } from '@/lib/auth-server';
import { getQueryClient } from '@/lib/query-client';

export const metadata = {
  title: 'Dashboard: Design Department'
};

export default function DesignDepartmentPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery({
    queryKey: designBoardKeys.main(),
    queryFn: async () => getDesignBoard(await getSupabaseServerClient())
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense
        fallback={
          <Skeleton className='h-[calc(100svh-4rem)] w-full rounded-none md:h-[calc(100svh-3.5rem)]' />
        }
      >
        <DesignBoardView />
      </Suspense>
    </HydrationBoundary>
  );
}

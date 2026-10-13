import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { knowledgeBaseKeys } from '@/features/knowledge-base/api/queries';
import { KnowledgeManagementView } from '@/features/knowledge-base/components/knowledge-management-view';
import { getKnowledgeBase } from '@/features/knowledge-base/server/knowledge-base';
import { starmapKeys } from '@/features/starmap/api/queries';
import { getLatestStarmapSnapshot } from '@/features/starmap/server/snapshots';
import { getSupabaseServerClient } from '@/lib/auth-server';
import { getQueryClient } from '@/lib/query-client';

export const metadata = {
  title: 'Dashboard: Knowledge Management'
};

export default function KnowledgeManagementPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery({
    queryKey: starmapKeys.latest(),
    queryFn: async () => getLatestStarmapSnapshot(await getSupabaseServerClient())
  });
  void queryClient.prefetchQuery({
    queryKey: knowledgeBaseKeys.base(),
    queryFn: async () => getKnowledgeBase(await getSupabaseServerClient())
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense
        fallback={
          <Skeleton className='h-[calc(100svh-4rem)] w-full rounded-none md:h-[calc(100svh-3.5rem)]' />
        }
      >
        <KnowledgeManagementView />
      </Suspense>
    </HydrationBoundary>
  );
}

import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Skeleton } from '@/components/ui/skeleton';
import { PlatformFeatureFormSheetTrigger } from '@/features/platform-features/components/platform-feature-form-sheet';
import { roadmapKeys } from '@/features/roadmap/api/queries';
import { RoadmapView } from '@/features/roadmap/components/roadmap-view';
import { getRoadmap } from '@/features/roadmap/server/roadmap';
import { getSupabaseServerClient } from '@/lib/auth-server';
import { getQueryClient } from '@/lib/query-client';

export const metadata = {
  title: 'Dashboard: Strategic Planning'
};

export default function StrategicPlanningPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery({
    queryKey: roadmapKeys.all,
    queryFn: async () => getRoadmap(await getSupabaseServerClient())
  });

  return (
    <PageContainer
      pageTitle='Strategic Planning'
      pageDescription='Roadmap of platform features by start and target date'
      pageHeaderAction={<PlatformFeatureFormSheetTrigger />}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<Skeleton className='h-[calc(100dvh-20rem)] min-h-[320px] w-full' />}>
          <RoadmapView />
        </Suspense>
      </HydrationBoundary>
    </PageContainer>
  );
}

import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';
import PageContainer from '@/components/layout/page-container';
import { kanbanInfoContent } from '@/config/infoconfig';
import { featureSubtaskKeys } from '@/features/feature-subtasks/api/queries';
import { listFeatureSubtasks } from '@/features/feature-subtasks/server/feature-subtasks';
import { platformFeatureKeys } from '@/features/platform-features/api/queries';
import { PlatformFeatureFormSheetTrigger } from '@/features/platform-features/components/platform-feature-form-sheet';
import { listPlatformFeatures } from '@/features/platform-features/server/platform-features';
import { getSupabaseServerClient } from '@/lib/auth-server';
import { getQueryClient } from '@/lib/query-client';
import { kanbanFeatureFilters } from '../constants/board';
import { KanbanBoard } from './kanban-board';
import { KanbanBoardSkeleton } from './kanban-board-skeleton';

export default function KanbanViewPage() {
  const queryClient = getQueryClient();

  // The client's queryFns go through /api, which a server component can't call with a relative URL.
  void queryClient.prefetchQuery({
    queryKey: platformFeatureKeys.list(kanbanFeatureFilters),
    queryFn: async () => listPlatformFeatures(await getSupabaseServerClient(), kanbanFeatureFilters)
  });
  void queryClient.prefetchQuery({
    queryKey: featureSubtaskKeys.list(),
    queryFn: async () => listFeatureSubtasks(await getSupabaseServerClient())
  });

  return (
    <PageContainer
      pageTitle='Kanban'
      pageDescription='Platform features by development status'
      infoContent={kanbanInfoContent}
      pageHeaderAction={<PlatformFeatureFormSheetTrigger />}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<KanbanBoardSkeleton />}>
          <KanbanBoard />
        </Suspense>
      </HydrationBoundary>
    </PageContainer>
  );
}

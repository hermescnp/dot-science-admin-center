import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '@/lib/auth-server';
import { getQueryClient } from '@/lib/query-client';
import { platformAgentKeys } from '../api/queries';
import { listPlatformAgents } from '../server/platform-agents';
import { AgentGrid } from './agent-grid';
import { AgentGridSkeleton } from './agent-grid-skeleton';

export default function AgentListing() {
  const queryClient = getQueryClient();

  // The client's queryFn goes through /api, which a server component can't call with a relative URL.
  void queryClient.prefetchQuery({
    queryKey: platformAgentKeys.list(),
    queryFn: async () => listPlatformAgents(await getSupabaseServerClient())
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<AgentGridSkeleton />}>
        <AgentGrid />
      </Suspense>
    </HydrationBoundary>
  );
}

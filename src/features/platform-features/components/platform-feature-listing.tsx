import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getSupabaseServerClient } from '@/lib/auth-server';
import { getQueryClient } from '@/lib/query-client';
import { platformFeaturesSearchParamsCache } from '@/features/platform-features/constants/search-params';
import { platformFeatureKeys, toPlatformFeatureFilters } from '../api/queries';
import { listPlatformFeatures } from '../server/platform-features';
import { PlatformFeaturesTable } from './platform-features-table';

export default function PlatformFeatureListing() {
  const filters = toPlatformFeatureFilters({
    page: platformFeaturesSearchParamsCache.get('page'),
    perPage: platformFeaturesSearchParamsCache.get('perPage'),
    name: platformFeaturesSearchParamsCache.get('name'),
    platform: platformFeaturesSearchParamsCache.get('platform'),
    section: platformFeaturesSearchParamsCache.get('section'),
    status: platformFeaturesSearchParamsCache.get('status'),
    sort: platformFeaturesSearchParamsCache.get('sort')
  });

  const queryClient = getQueryClient();

  // The client's queryFn goes through /api, which a server component can't call with a relative URL.
  void queryClient.prefetchQuery({
    queryKey: platformFeatureKeys.list(filters),
    queryFn: async () => listPlatformFeatures(await getSupabaseServerClient(), filters)
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PlatformFeaturesTable />
    </HydrationBoundary>
  );
}

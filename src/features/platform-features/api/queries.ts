import { queryOptions } from '@tanstack/react-query';
import { getFeaturesForPlatform, getPlatformFeatures } from './service';
import type { PlatformFeatureFilters } from './types';

export const platformFeatureKeys = {
  all: ['platform-features'] as const,
  list: (filters: PlatformFeatureFilters) => [...platformFeatureKeys.all, 'list', filters] as const,
  byPlatform: (platformId: string) => [...platformFeatureKeys.all, 'platform', platformId] as const
};

/** Builds table filters from URL params; shared by the server prefetch and the client table. */
export function toPlatformFeatureFilters(params: {
  page: number;
  perPage: number;
  name: string | null;
  platform: string[];
  section: string[];
  status: string[];
  sort: { id: string; desc: boolean }[];
}): PlatformFeatureFilters {
  return {
    page: params.page,
    limit: params.perPage,
    ...(params.name && { search: params.name }),
    ...(params.platform.length > 0 && { platforms: params.platform }),
    ...(params.section.length > 0 && { sections: params.section }),
    ...(params.status.length > 0 && { statuses: params.status }),
    ...(params.sort.length > 0 && { sort: JSON.stringify(params.sort) })
  };
}

export const platformFeaturesQueryOptions = (filters: PlatformFeatureFilters) =>
  queryOptions({
    queryKey: platformFeatureKeys.list(filters),
    queryFn: () => getPlatformFeatures(filters)
  });

export const platformFeaturesByPlatformQueryOptions = (platformId: string) =>
  queryOptions({
    queryKey: platformFeatureKeys.byPlatform(platformId),
    queryFn: () => getFeaturesForPlatform(platformId)
  });

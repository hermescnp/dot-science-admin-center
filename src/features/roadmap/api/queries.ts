import { queryOptions } from '@tanstack/react-query';
import { platformFeatureKeys } from '@/features/platform-features/api/queries';
import { getRoadmap } from './service';

// Nested under the platform feature keys so feature mutations refresh the roadmap.
export const roadmapKeys = {
  all: [...platformFeatureKeys.all, 'roadmap'] as const
};

export const roadmapQueryOptions = () =>
  queryOptions({
    queryKey: roadmapKeys.all,
    queryFn: getRoadmap
  });

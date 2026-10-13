import { queryOptions } from '@tanstack/react-query';
import { getLatestStarmap } from './service';

export const starmapKeys = {
  all: ['starmap'] as const,
  latest: () => [...starmapKeys.all, 'latest'] as const
};

export const starmapQueryOptions = () =>
  queryOptions({
    queryKey: starmapKeys.latest(),
    queryFn: getLatestStarmap
  });

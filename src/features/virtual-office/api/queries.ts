import { queryOptions } from '@tanstack/react-query';
import { getSpaceMap } from './service';

export const virtualOfficeKeys = {
  all: ['virtual-office'] as const,
  spaceMap: () => [...virtualOfficeKeys.all, 'space-map'] as const
};

export const spaceMapQueryOptions = () =>
  queryOptions({
    queryKey: virtualOfficeKeys.spaceMap(),
    queryFn: getSpaceMap,
    staleTime: 5 * 60 * 1000,
    // Swapping zone data under a running scene would reset navigation.
    refetchOnWindowFocus: false
  });

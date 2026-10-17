import { queryOptions } from '@tanstack/react-query';
import { getDesignComponents, getDesignSections } from './service';

export const designKeys = {
  all: ['design'] as const,
  sections: () => [...designKeys.all, 'sections'] as const,
  components: () => [...designKeys.all, 'components'] as const
};

export const designSectionsQueryOptions = () =>
  queryOptions({
    queryKey: designKeys.sections(),
    queryFn: getDesignSections,
    // The canvases are the source of truth while open; refetching would reset them.
    staleTime: Infinity,
    refetchOnWindowFocus: false
  });

export const designComponentsQueryOptions = () =>
  queryOptions({
    queryKey: designKeys.components(),
    queryFn: getDesignComponents,
    staleTime: Infinity,
    refetchOnWindowFocus: false
  });

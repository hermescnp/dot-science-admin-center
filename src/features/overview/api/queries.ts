import { queryOptions } from '@tanstack/react-query';
import { getOverviewIndicators } from './service';

export const overviewKeys = {
  all: ['overview'] as const,
  indicators: () => [...overviewKeys.all, 'indicators'] as const
};

export const overviewIndicatorsQueryOptions = () =>
  queryOptions({
    queryKey: overviewKeys.indicators(),
    queryFn: getOverviewIndicators
  });

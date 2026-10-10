import { queryOptions } from '@tanstack/react-query';
import { getFeatureSubtasks } from './service';

export const featureSubtaskKeys = {
  all: ['feature-subtasks'] as const,
  list: () => [...featureSubtaskKeys.all, 'list'] as const
};

export const featureSubtasksQueryOptions = () =>
  queryOptions({
    queryKey: featureSubtaskKeys.list(),
    queryFn: getFeatureSubtasks
  });

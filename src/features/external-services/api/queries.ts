import { queryOptions } from '@tanstack/react-query';
import { getExternalServices } from './service';

export const externalServiceKeys = {
  all: ['external-services'] as const,
  list: () => [...externalServiceKeys.all, 'list'] as const
};

export const externalServicesQueryOptions = () =>
  queryOptions({
    queryKey: externalServiceKeys.list(),
    queryFn: getExternalServices
  });

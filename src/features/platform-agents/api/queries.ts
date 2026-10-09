import { queryOptions } from '@tanstack/react-query';
import { getPlatformAgents } from './service';

export const platformAgentKeys = {
  all: ['platform-agents'] as const,
  list: () => [...platformAgentKeys.all, 'list'] as const,
  detail: (id: string) => [...platformAgentKeys.all, 'detail', id] as const
};

export const platformAgentsQueryOptions = () =>
  queryOptions({
    queryKey: platformAgentKeys.list(),
    queryFn: getPlatformAgents
  });

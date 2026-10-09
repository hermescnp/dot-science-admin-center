import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { platformAgentKeys } from './queries';
import { createPlatformAgent, deletePlatformAgent, updatePlatformAgent } from './service';
import type { PlatformAgentMutationPayload } from './types';

export const createPlatformAgentMutation = mutationOptions({
  mutationFn: (data: PlatformAgentMutationPayload) => createPlatformAgent(data),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: platformAgentKeys.all });
  }
});

export const updatePlatformAgentMutation = mutationOptions({
  mutationFn: ({ id, values }: { id: string; values: PlatformAgentMutationPayload }) =>
    updatePlatformAgent(id, values),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: platformAgentKeys.all });
  }
});

export const deletePlatformAgentMutation = mutationOptions({
  mutationFn: (id: string) => deletePlatformAgent(id),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: platformAgentKeys.all });
  }
});

import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { platformFeatureKeys } from './queries';
import { createPlatformFeature, deletePlatformFeature, updatePlatformFeature } from './service';
import type { PlatformFeatureMutationPayload } from './types';

export const createPlatformFeatureMutation = mutationOptions({
  mutationFn: (data: PlatformFeatureMutationPayload) => createPlatformFeature(data),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: platformFeatureKeys.all });
  }
});

export const updatePlatformFeatureMutation = mutationOptions({
  mutationFn: ({ id, values }: { id: string; values: PlatformFeatureMutationPayload }) =>
    updatePlatformFeature(id, values),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: platformFeatureKeys.all });
  }
});

export const deletePlatformFeatureMutation = mutationOptions({
  mutationFn: (id: string) => deletePlatformFeature(id),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: platformFeatureKeys.all });
  }
});

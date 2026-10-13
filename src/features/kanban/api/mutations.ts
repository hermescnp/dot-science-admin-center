import { mutationOptions } from '@tanstack/react-query';
import { platformFeatureKeys } from '@/features/platform-features/api/queries';
import { updatePlatformFeature } from '@/features/platform-features/api/service';
import type {
  PlatformFeature,
  PlatformFeatureStatus,
  PlatformFeaturesResponse
} from '@/features/platform-features/api/types';
import { getQueryClient } from '@/lib/query-client';
import { kanbanFeatureFilters } from '../constants/board';

const boardKey = platformFeatureKeys.list(kanbanFeatureFilters);

export const moveFeatureMutation = mutationOptions({
  mutationFn: ({ feature, status }: { feature: PlatformFeature; status: PlatformFeatureStatus }) =>
    updatePlatformFeature(feature.id, {
      platformId: feature.platformId,
      section: feature.section,
      name: feature.name,
      description: feature.description,
      icon: feature.icon,
      services: feature.services,
      status,
      startDate: feature.startDate,
      targetDate: feature.targetDate
    }),
  onMutate: async ({ feature, status }) => {
    const queryClient = getQueryClient();
    await queryClient.cancelQueries({ queryKey: boardKey });
    const previous = queryClient.getQueryData<PlatformFeaturesResponse>(boardKey);
    if (previous) {
      queryClient.setQueryData<PlatformFeaturesResponse>(boardKey, {
        ...previous,
        features: previous.features.map((item) =>
          item.id === feature.id ? { ...item, status } : item
        )
      });
    }
    return { previous };
  },
  onError: (_error, _variables, context) => {
    if (context?.previous) getQueryClient().setQueryData(boardKey, context.previous);
  },
  onSettled: () => getQueryClient().invalidateQueries({ queryKey: platformFeatureKeys.all })
});

import type { PlatformFeatureFilters } from '@/features/platform-features/api/types';
import { platformFeaturesPageSizeOptions } from '@/features/platform-features/constants/pagination';

/** One list query for every feature; the board filters by platform on the client. */
export const kanbanFeatureFilters: PlatformFeatureFilters = {
  page: 1,
  limit: Math.max(...platformFeaturesPageSizeOptions)
};

export const ALL_PLATFORMS = 'all';

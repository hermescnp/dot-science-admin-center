import { apiClient } from '@/lib/api-client';
import type {
  PlatformFeature,
  PlatformFeatureFilters,
  PlatformFeatureMutationPayload,
  PlatformFeaturesResponse
} from './types';

export async function getPlatformFeatures(
  filters: PlatformFeatureFilters
): Promise<PlatformFeaturesResponse> {
  const params = new URLSearchParams({ page: String(filters.page), limit: String(filters.limit) });
  if (filters.search) params.set('search', filters.search);
  if (filters.platforms?.length) params.set('platforms', filters.platforms.join(','));
  if (filters.sections?.length) params.set('sections', filters.sections.join(','));
  if (filters.statuses?.length) params.set('statuses', filters.statuses.join(','));
  if (filters.sort) params.set('sort', filters.sort);
  return apiClient<PlatformFeaturesResponse>(`/platform-features?${params}`, { cache: 'no-store' });
}

export async function getFeaturesForPlatform(platformId: string): Promise<PlatformFeature[]> {
  const { features } = await apiClient<{ features: PlatformFeature[] }>(
    `/platform-features?platform=${encodeURIComponent(platformId)}`,
    { cache: 'no-store' }
  );
  return features;
}

export async function createPlatformFeature(data: PlatformFeatureMutationPayload) {
  return apiClient<PlatformFeature>('/platform-features', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updatePlatformFeature(id: string, data: PlatformFeatureMutationPayload) {
  return apiClient<PlatformFeature>(`/platform-features/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deletePlatformFeature(id: string) {
  return apiClient<{ ok: true }>(`/platform-features/${id}`, { method: 'DELETE' });
}

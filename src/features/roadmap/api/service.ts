import { apiClient } from '@/lib/api-client';
import type { RoadmapResponse } from './types';

export async function getRoadmap(): Promise<RoadmapResponse> {
  return apiClient<RoadmapResponse>('/roadmap', { cache: 'no-store' });
}

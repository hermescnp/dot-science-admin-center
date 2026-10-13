import { apiClient } from '@/lib/api-client';
import type { StarmapSnapshotResponse } from './types';

export async function getLatestStarmap(): Promise<StarmapSnapshotResponse> {
  return apiClient<StarmapSnapshotResponse>('/knowledge/starmap', { cache: 'no-store' });
}

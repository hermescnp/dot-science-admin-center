import { apiClient } from '@/lib/api-client';
import type {
  FeatureSubtask,
  FeatureSubtaskCreatePayload,
  FeatureSubtaskUpdatePayload
} from './types';

export async function getFeatureSubtasks(): Promise<FeatureSubtask[]> {
  const { subtasks } = await apiClient<{ subtasks: FeatureSubtask[] }>(
    '/platform-feature-subtasks',
    { cache: 'no-store' }
  );
  return subtasks;
}

export async function createFeatureSubtask(data: FeatureSubtaskCreatePayload) {
  return apiClient<FeatureSubtask>('/platform-feature-subtasks', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateFeatureSubtask(id: string, data: FeatureSubtaskUpdatePayload) {
  return apiClient<FeatureSubtask>(`/platform-feature-subtasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteFeatureSubtask(id: string) {
  return apiClient<{ ok: true }>(`/platform-feature-subtasks/${id}`, {
    method: 'DELETE'
  });
}

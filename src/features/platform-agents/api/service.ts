import { apiClient } from '@/lib/api-client';
import type { PlatformAgent, PlatformAgentMutationPayload } from './types';

export async function getPlatformAgents(): Promise<PlatformAgent[]> {
  const { agents } = await apiClient<{ agents: PlatformAgent[] }>('/platform-agents', {
    cache: 'no-store'
  });
  return agents;
}

export async function createPlatformAgent(data: PlatformAgentMutationPayload) {
  return apiClient<PlatformAgent>('/platform-agents', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updatePlatformAgent(id: string, data: PlatformAgentMutationPayload) {
  return apiClient<PlatformAgent>(`/platform-agents/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deletePlatformAgent(id: string) {
  return apiClient<{ ok: true }>(`/platform-agents/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

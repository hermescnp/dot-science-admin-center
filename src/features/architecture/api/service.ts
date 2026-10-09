import { apiClient } from '@/lib/api-client';
import type {
  ArchitectureGraphResponse,
  ArchitectureGraphSnapshot,
  ModelPricingResponse,
  ServiceHealthResponse,
  ServicePlansResponse
} from './types';

export async function getServiceHealth(): Promise<ServiceHealthResponse> {
  return apiClient<ServiceHealthResponse>('/architecture/health', { cache: 'no-store' });
}

export async function getServicePlans(): Promise<ServicePlansResponse> {
  return apiClient<ServicePlansResponse>('/architecture/plans', { cache: 'no-store' });
}

export async function getModelPricing(): Promise<ModelPricingResponse> {
  return apiClient<ModelPricingResponse>('/architecture/models', { cache: 'no-store' });
}

export async function getArchitectureGraph(): Promise<ArchitectureGraphResponse> {
  return apiClient<ArchitectureGraphResponse>('/architecture/graph', { cache: 'no-store' });
}

export async function saveArchitectureGraph(snapshot: ArchitectureGraphSnapshot) {
  return apiClient<{ ok: true }>('/architecture/graph', {
    method: 'PUT',
    body: JSON.stringify(snapshot)
  });
}

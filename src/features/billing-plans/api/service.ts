import { apiClient } from '@/lib/api-client';
import type { BillingPlan, BillingPlanMutationPayload, BillingPlansResponse } from './types';

export async function getBillingPlans(): Promise<BillingPlansResponse> {
  return apiClient<BillingPlansResponse>('/billing-plans', { cache: 'no-store' });
}

export async function createBillingPlan(data: BillingPlanMutationPayload) {
  return apiClient<BillingPlan>('/billing-plans', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateBillingPlan(id: string, data: BillingPlanMutationPayload) {
  return apiClient<BillingPlan>(`/billing-plans/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteBillingPlan(id: string) {
  return apiClient<{ ok: true }>(`/billing-plans/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

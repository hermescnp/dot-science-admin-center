import { apiClient } from '@/lib/api-client';
import type { LeadFilters, LeadUpdatePayload, LeadsResponse } from './types';

export async function getLeads(filters: LeadFilters): Promise<LeadsResponse> {
  const params = new URLSearchParams({ page: String(filters.page), limit: String(filters.limit) });
  if (filters.search) params.set('search', filters.search);
  if (filters.statuses?.length) params.set('statuses', filters.statuses.join(','));
  if (filters.sources?.length) params.set('sources', filters.sources.join(','));
  if (filters.emailStatuses?.length) params.set('emailStatuses', filters.emailStatuses.join(','));
  if (filters.sort) params.set('sort', filters.sort);
  return apiClient<LeadsResponse>(`/leads?${params}`, { cache: 'no-store' });
}

export async function updateLead(id: string, data: LeadUpdatePayload) {
  return apiClient<{ ok: true }>(`/leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

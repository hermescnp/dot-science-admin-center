import { apiClient } from '@/lib/api-client';
import type {
  Currency,
  CurrencyRateMutationPayload,
  ExternalService,
  ExternalServiceItem,
  ExternalServiceItemMutationPayload,
  ExternalServiceMutationPayload,
  ExternalServicesResponse
} from './types';

export async function getExternalServices(): Promise<ExternalServicesResponse> {
  return apiClient<ExternalServicesResponse>('/external-services', { cache: 'no-store' });
}

export async function updateExternalService(id: string, data: ExternalServiceMutationPayload) {
  return apiClient<ExternalService>(`/external-services/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function createExternalServiceItem(
  serviceId: string,
  data: ExternalServiceItemMutationPayload
) {
  return apiClient<ExternalServiceItem>(
    `/external-services/${encodeURIComponent(serviceId)}/items`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function updateExternalServiceItem(
  id: string,
  data: ExternalServiceItemMutationPayload
) {
  return apiClient<ExternalServiceItem>(`/external-service-items/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteExternalServiceItem(id: string) {
  return apiClient<{ success: true }>(`/external-service-items/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

export async function updateCurrencyRate(currency: Currency, data: CurrencyRateMutationPayload) {
  return apiClient<{ currency: Currency; usdRate: number }>(
    `/currency-rates/${encodeURIComponent(currency)}`,
    { method: 'PATCH', body: JSON.stringify(data) }
  );
}

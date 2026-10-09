import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { externalServiceKeys } from './queries';
import {
  createExternalServiceItem,
  deleteExternalServiceItem,
  updateCurrencyRate,
  updateExternalService,
  updateExternalServiceItem
} from './service';
import type {
  Currency,
  ExternalServiceItemMutationPayload,
  ExternalServiceMutationPayload
} from './types';

function invalidateExternalServices() {
  getQueryClient().invalidateQueries({ queryKey: externalServiceKeys.all });
}

export const updateExternalServiceMutation = mutationOptions({
  mutationFn: ({ id, values }: { id: string; values: ExternalServiceMutationPayload }) =>
    updateExternalService(id, values),
  onSuccess: invalidateExternalServices
});

export const createExternalServiceItemMutation = mutationOptions({
  mutationFn: ({
    serviceId,
    values
  }: {
    serviceId: string;
    values: ExternalServiceItemMutationPayload;
  }) => createExternalServiceItem(serviceId, values),
  onSuccess: invalidateExternalServices
});

export const updateExternalServiceItemMutation = mutationOptions({
  mutationFn: ({ id, values }: { id: string; values: ExternalServiceItemMutationPayload }) =>
    updateExternalServiceItem(id, values),
  onSuccess: invalidateExternalServices
});

export const deleteExternalServiceItemMutation = mutationOptions({
  mutationFn: (id: string) => deleteExternalServiceItem(id),
  onSuccess: invalidateExternalServices
});

export const updateCurrencyRateMutation = mutationOptions({
  mutationFn: ({ currency, usdRate }: { currency: Currency; usdRate: number }) =>
    updateCurrencyRate(currency, { usdRate }),
  onSuccess: invalidateExternalServices
});

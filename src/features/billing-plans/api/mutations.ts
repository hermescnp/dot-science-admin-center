import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { billingPlanKeys } from './queries';
import { createBillingPlan, deleteBillingPlan, updateBillingPlan } from './service';
import type { BillingPlanMutationPayload } from './types';

function invalidateBillingPlans() {
  getQueryClient().invalidateQueries({ queryKey: billingPlanKeys.all });
}

export const createBillingPlanMutation = mutationOptions({
  mutationFn: (values: BillingPlanMutationPayload) => createBillingPlan(values),
  onSuccess: invalidateBillingPlans
});

export const updateBillingPlanMutation = mutationOptions({
  mutationFn: ({ id, values }: { id: string; values: BillingPlanMutationPayload }) =>
    updateBillingPlan(id, values),
  onSuccess: invalidateBillingPlans
});

export const deleteBillingPlanMutation = mutationOptions({
  mutationFn: (id: string) => deleteBillingPlan(id),
  onSuccess: invalidateBillingPlans
});

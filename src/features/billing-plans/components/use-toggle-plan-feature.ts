'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { billingPlanKeys } from '../api/queries';
import { updateBillingPlan } from '../api/service';
import type { BillingPlan, BillingPlansResponse } from '../api/types';

const mutationKey = [...billingPlanKeys.all, 'toggle-feature'];

interface ToggleVariables {
  planId: string;
  featureId: string;
  include: boolean;
}

function withFeature(plan: BillingPlan, featureId: string, include: boolean): BillingPlan {
  const rest = plan.featureIds.filter((id) => id !== featureId);
  return { ...plan, featureIds: include ? [...rest, featureId] : rest };
}

/** Adds or removes one feature from a plan, updating the cached list optimistically. */
export function useTogglePlanFeature() {
  const queryClient = useQueryClient();
  const queryKey = billingPlanKeys.list();

  const mutation = useMutation({
    mutationKey,
    mutationFn: async ({ planId }: ToggleVariables) => {
      // Sends the cached plan, which already holds this and any earlier pending toggles.
      const plan = queryClient
        .getQueryData<BillingPlansResponse>(queryKey)
        ?.plans.find((item) => item.id === planId);
      if (!plan) throw new Error('Plan not found');
      return updateBillingPlan(plan.id, {
        name: plan.name,
        description: plan.description,
        status: plan.status,
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice ?? undefined,
        expectedSubscribers: plan.expectedSubscribers,
        usagePct: plan.usagePct,
        limits: plan.limits,
        customLimits: plan.customLimits,
        featureIds: plan.featureIds
      });
    },
    onMutate: async ({ planId, featureId, include }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<BillingPlansResponse>(queryKey);
      queryClient.setQueryData<BillingPlansResponse>(queryKey, (data) =>
        data
          ? {
              ...data,
              plans: data.plans.map((plan) =>
                plan.id === planId ? withFeature(plan, featureId, include) : plan
              )
            }
          : data
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast.error("Couldn't update the plan's features. Try again.");
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) === 1) {
        void queryClient.invalidateQueries({ queryKey: billingPlanKeys.all });
      }
    }
  });

  return (plan: BillingPlan, featureId: string) =>
    mutation.mutate({
      planId: plan.id,
      featureId,
      include: !plan.featureIds.includes(featureId)
    });
}

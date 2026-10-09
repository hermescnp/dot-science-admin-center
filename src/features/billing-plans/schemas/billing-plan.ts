import * as z from 'zod';
import type { BillingPlanMutationPayload } from '../api/types';
import { planLimitIds, type PlanLimitId } from '../constants/limits';

const price = z.number('Enter a price').min(0, 'Must be 0 or more').max(100_000);
const limitValue = z.number().min(0, 'Must be 0 or more').max(10_000_000).optional();

const limits = z.object(
  Object.fromEntries(planLimitIds.map((id) => [id, limitValue])) as Record<
    PlanLimitId,
    typeof limitValue
  >
);

export const billingPlanSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(80, 'Keep it under 80 characters'),
  description: z.string().trim().max(500, 'Keep it under 500 characters'),
  status: z.enum(['draft', 'active', 'archived'], 'Select a status'),
  monthlyPrice: price,
  annualPrice: price.optional(),
  expectedSubscribers: z
    .number('Enter a number')
    .int('Use a whole number')
    .min(1, 'At least 1')
    .max(10_000_000),
  usagePct: z.number('Enter a percentage').min(0).max(100, 'At most 100'),
  limits,
  customLimits: z
    .array(
      z.object({
        label: z.string().trim().min(1, 'Enter a label').max(80),
        value: z.string().trim().min(1, 'Enter a value').max(80)
      })
    )
    .max(30),
  featureIds: z.array(z.uuid()).max(1_000)
});

export type BillingPlanFormValues = z.infer<typeof billingPlanSchema>;

export function toBillingPlanPayload(values: BillingPlanFormValues): BillingPlanMutationPayload {
  const limitEntries = Object.entries(values.limits).filter(
    (entry): entry is [PlanLimitId, number] => entry[1] !== undefined
  );
  return { ...values, limits: Object.fromEntries(limitEntries) };
}

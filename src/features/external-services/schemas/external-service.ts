import * as z from 'zod';
import { servicePlans } from '@/features/architecture/data/service-plans';
import type {
  ExternalServiceItemMutationPayload,
  ExternalServiceMutationPayload
} from '../api/types';

export const AUTO_PLAN = 'auto';

const billingCycle = z.enum(['monthly', 'annual', 'usage'], 'Select a billing cycle');
const itemBillingCycle = z.enum(['monthly', 'annual'], 'Select a billing cycle');
export const currency = z.enum(['USD', 'CAD'], 'Select a currency');
const cost = z.number('Enter an amount').min(0, 'Must be 0 or more').max(1_000_000).optional();
const notes = z.string().trim().max(500, 'Keep notes under 500 characters');

export const externalServiceFormSchema = z.object({
  planId: z.string().min(1),
  billingCycle,
  monthlyCost: cost,
  annualCost: cost,
  currency,
  renewsOn: z.date().optional(),
  notes
});

export type ExternalServiceFormValues = z.infer<typeof externalServiceFormSchema>;

export const externalServicePayloadSchema = z.object({
  planId: z.string().min(1).nullable(),
  billingCycle,
  monthlyCost: cost,
  annualCost: cost,
  currency,
  renewsOn: z.iso.date().optional(),
  notes
});

const itemFields = {
  label: z.string().trim().min(1, 'Enter a name').max(200, 'Keep it under 200 characters'),
  kind: z.enum(['domain', 'mailbox', 'seat'], 'Select a kind'),
  billingCycle: itemBillingCycle,
  amount: z.number('Enter an amount').min(0, 'Must be 0 or more').max(1_000_000),
  currency,
  notes
};

export const externalServiceItemFormSchema = z.object({
  ...itemFields,
  renewsOn: z.date().optional()
});

export type ExternalServiceItemFormValues = z.infer<typeof externalServiceItemFormSchema>;

export const externalServiceItemPayloadSchema = z.object({
  ...itemFields,
  renewsOn: z.iso.date().optional()
});

export const currencyRatePayloadSchema = z.object({
  usdRate: z.number().positive().max(1000)
});

export function isKnownPlan(serviceId: string, planId: string | null): boolean {
  return planId === null || Boolean(servicePlans[serviceId]?.plans.some((p) => p.id === planId));
}

function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function toExternalServicePayload(
  values: ExternalServiceFormValues
): ExternalServiceMutationPayload {
  return {
    planId: values.planId === AUTO_PLAN ? null : values.planId,
    billingCycle: values.billingCycle,
    monthlyCost: values.monthlyCost,
    annualCost: values.annualCost,
    currency: values.currency,
    renewsOn: values.renewsOn ? toIsoDate(values.renewsOn) : undefined,
    notes: values.notes
  };
}

export function toExternalServiceItemPayload(
  values: ExternalServiceItemFormValues
): ExternalServiceItemMutationPayload {
  return {
    label: values.label,
    kind: values.kind,
    billingCycle: values.billingCycle,
    amount: values.amount,
    currency: values.currency,
    renewsOn: values.renewsOn ? toIsoDate(values.renewsOn) : undefined,
    notes: values.notes
  };
}

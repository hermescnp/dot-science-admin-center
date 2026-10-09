import type { ServicePlanStatus } from '@/features/architecture/api/types';
import { servicePlans, type ServicePlan } from '@/features/architecture/data/service-plans';
import type {
  BillingCycle,
  Currency,
  CurrencyRates,
  ExternalService,
  ExternalServiceItemKind,
  ItemBillingCycle
} from '../api/types';

export const billingCycleOptions: { value: BillingCycle; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
  { value: 'usage', label: 'Usage-based' }
];

export const billingCycleLabels = new Map(
  billingCycleOptions.map((option) => [option.value, option.label])
);

/** The `ServicePlanStatus.usage` entry that reports spend, for providers whose API exposes it. */
export const spendUsageKeys: Partial<Record<string, string>> = {
  openai: 'usageLimit',
  openrouter: 'credits',
  deepgram: 'credit'
};

export type PlanSource = 'detected' | 'manual' | 'default';

export interface ResolvedPlan {
  plan: ServicePlan;
  source: PlanSource;
}

/** Detected plan wins, then the manually set plan, then the catalog default. */
export function resolvePlan(
  serviceId: string,
  manualPlanId: string | null | undefined,
  status: ServicePlanStatus | undefined
): ResolvedPlan | null {
  const catalog = servicePlans[serviceId];
  if (!catalog) return null;
  const find = (id: string | null | undefined) => catalog.plans.find((plan) => plan.id === id);

  const detected = status?.source === 'detected' ? find(status.planId) : undefined;
  if (detected) return { plan: detected, source: 'detected' };
  const manual = find(manualPlanId);
  if (manual) return { plan: manual, source: 'manual' };
  const fallback = find(catalog.fallbackPlanId);
  return fallback ? { plan: fallback, source: 'default' } : null;
}

export const currencyOptions: { value: Currency; label: string }[] = [
  { value: 'USD', label: 'USD (US$)' },
  { value: 'CAD', label: 'CAD (CA$)' }
];

export const itemBillingCycleOptions: { value: ItemBillingCycle; label: string }[] = [
  { value: 'annual', label: 'Annual' },
  { value: 'monthly', label: 'Monthly' }
];

export const itemKindOptions: { value: ExternalServiceItemKind; label: string }[] = [
  { value: 'domain', label: 'Domain' },
  { value: 'mailbox', label: 'Mailbox' },
  { value: 'seat', label: 'Seat' }
];

export const itemKindLabels = new Map(
  itemKindOptions.map((option) => [option.value, option.label])
);

export type CostPeriod = 'monthly' | 'annual';

export interface Cost {
  usd: number;
  /** The amount as billed, when every part of it is in one non-USD currency. */
  native: { value: number; currency: Currency } | null;
}

interface Amount {
  value: number;
  currency: Currency;
}

function inPeriod(value: number, cycle: CostPeriod, period: CostPeriod) {
  if (cycle === period) return value;
  return period === 'monthly' ? value / 12 : value * 12;
}

function serviceAmounts(service: ExternalService, period: CostPeriod): Amount[] | null {
  if (service.items.length) {
    return service.items.map((item) => ({
      value: inPeriod(item.amount, item.billingCycle, period),
      currency: item.currency
    }));
  }
  const { monthlyCost, annualCost } = service;
  const own = period === 'monthly' ? monthlyCost : annualCost;
  const other = period === 'monthly' ? annualCost : monthlyCost;
  if (own !== null) return [{ value: own, currency: service.currency }];
  if (other === null) return null;
  const otherPeriod = period === 'monthly' ? 'annual' : 'monthly';
  return [{ value: inPeriod(other, otherPeriod, period), currency: service.currency }];
}

/** Items win over the service's own cost; null when no cost is set. */
export function costOf(
  service: ExternalService,
  period: CostPeriod,
  rates: CurrencyRates
): Cost | null {
  const amounts = serviceAmounts(service, period);
  if (!amounts) return null;
  const usd = amounts.reduce((sum, amount) => sum + amount.value * rates[amount.currency], 0);
  const currencies = new Set(amounts.map((amount) => amount.currency));
  const [only] = currencies;
  const native =
    currencies.size === 1 && only !== 'USD'
      ? { value: amounts.reduce((sum, amount) => sum + amount.value, 0), currency: only }
      : null;
  return { usd, native };
}

export function toUsd(value: number, currency: Currency, rates: CurrencyRates): number {
  return value * rates[currency];
}

const formatters: Record<Currency, Intl.NumberFormat> = {
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
  CAD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD' })
};

export function formatMoney(value: number, currency: Currency): string {
  return formatters[currency].format(value);
}

export function formatUsd(value: number): string {
  return formatMoney(value, 'USD');
}

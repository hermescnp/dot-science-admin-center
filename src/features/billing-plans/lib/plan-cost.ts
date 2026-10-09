import { planQuotas, type MetricId } from '@/features/external-services/projection/plan-quotas';
import { usageRates } from '@/features/external-services/projection/projection';
import { planLimits, type PlanLimitValues } from '../constants/limits';

interface UnitPrice {
  serviceId: string;
  metric: MetricId;
  /** USD per single unit of the metric. */
  price: number;
}

/**
 * Per-unit price of each metric, taken from the cheapest plan that bills overage. Free plans
 * stop at their quota, so paid-tier rates are the conservative cost of serving more usage.
 */
const unitPrices: UnitPrice[] = (() => {
  const prices: UnitPrice[] = [];
  for (const [serviceId, plans] of Object.entries(planQuotas)) {
    const seen = new Set<MetricId>();
    for (const plan of plans ?? []) {
      for (const [id, quota] of Object.entries(plan.metrics)) {
        const metric = id as MetricId;
        if (seen.has(metric) || quota.overagePrice === undefined || !quota.overageUnit) continue;
        seen.add(metric);
        prices.push({ serviceId, metric, price: quota.overagePrice / quota.overageUnit });
      }
    }
  }
  for (const [serviceId, rate] of Object.entries(usageRates)) {
    if (rate) prices.push({ serviceId, metric: rate.metric, price: rate.price });
  }
  return prices;
})();

export interface PlanCostInput {
  limits: PlanLimitValues;
  usagePct: number;
  averageCompensation: boolean;
  expectedSubscribers: number;
  monthlyPrice: number;
}

/** Share of the limits each subscriber is priced at: the average with compensation, else all. */
export function pricedUsageShare(input: Pick<PlanCostInput, 'usagePct' | 'averageCompensation'>) {
  return input.averageCompensation ? input.usagePct / 100 : 1;
}

/** How many times larger the limits can be, at the same cost, with average compensation on. */
export function compensationMultiplier(usagePct: number): number | null {
  return usagePct > 0 && usagePct < 100 ? 100 / usagePct : null;
}

export interface PlanCost {
  /** Monthly USD per subscriber, by service id, at the priced share of the limits. */
  byService: { serviceId: string; cost: number }[];
  usageCost: number;
  fixedShare: number;
  totalCost: number;
  margin: number;
  /** Margin as a share of the price; null when the plan is free. */
  marginPct: number | null;
}

export function planCost(input: PlanCostInput, baselineMonthly: number): PlanCost {
  const share = pricedUsageShare(input);
  const usage: Partial<Record<MetricId, number>> = {};
  for (const limit of planLimits) {
    const value = (input.limits[limit.id] ?? 0) * share;
    for (const [metric, perUnit] of Object.entries(limit.usage)) {
      const id = metric as MetricId;
      usage[id] = (usage[id] ?? 0) + value * perUnit;
    }
  }

  const costs = new Map<string, number>();
  for (const { serviceId, metric, price } of unitPrices) {
    const amount = (usage[metric] ?? 0) * price;
    if (amount > 0) costs.set(serviceId, (costs.get(serviceId) ?? 0) + amount);
  }
  const byService = [...costs]
    .map(([serviceId, cost]) => ({ serviceId, cost }))
    .sort((a, b) => b.cost - a.cost);

  const usageCost = byService.reduce((sum, item) => sum + item.cost, 0);
  const fixedShare = baselineMonthly / Math.max(1, input.expectedSubscribers);
  const totalCost = usageCost + fixedShare;
  const margin = input.monthlyPrice - totalCost;
  return {
    byService,
    usageCost,
    fixedShare,
    totalCost,
    margin,
    marginPct: input.monthlyPrice > 0 ? margin / input.monthlyPrice : null
  };
}

/** Monthly price that leaves the given margin (0 to 1) over the total cost. */
export function priceForMargin(totalCost: number, margin: number): number {
  return totalCost / (1 - margin);
}

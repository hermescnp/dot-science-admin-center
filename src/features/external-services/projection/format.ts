import { servicePlans } from '@/features/architecture/data/service-plans';
import { metricInfo, type MetricId } from './plan-quotas';

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const small = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 2 });

export function formatCount(value: number): string {
  if (value === Infinity) return 'Unlimited';
  return value !== 0 && Math.abs(value) < 1 ? small.format(value) : compact.format(value);
}

export function formatMetric(metric: MetricId, value: number): string {
  const { unit } = metricInfo[metric];
  const count = formatCount(value);
  return value === Infinity || unit === 'MAU' ? count : `${count} ${unit}`;
}

export function planName(serviceId: string, planId: string | null): string {
  if (!planId) return 'Pay per use';
  return servicePlans[serviceId]?.plans.find((plan) => plan.id === planId)?.name ?? planId;
}

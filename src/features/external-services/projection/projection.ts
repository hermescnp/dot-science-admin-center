import type { ServicePlanStatus } from '@/features/architecture/api/types';
import { serviceNodesById } from '@/features/platform-features/constants/options';
import { serviceUsageCosts } from '@/features/platform-features/constants/usage-costs';
import type { CurrencyRates, ExternalService } from '../api/types';
import { costOf, resolvePlan } from '../constants/billing';
import { planQuotas, type MetricId, type PlanQuota } from './plan-quotas';

export interface ProjectionDrivers {
  mau: number;
  sessionsPerUser: number;
  voiceMinutesPerSession: number;
  interviewMinutesPerUser: number;
  aiCallsPerSession: number;
  emailsPerUser: number;
  storageMbPerUser: number;
  databaseKbPerUser: number;
  egressMbPerSession: number;
  errorsPer1kSessions: number;
  pageViewsPerSession: number;
}

export const defaultDrivers: ProjectionDrivers = {
  mau: 200,
  sessionsPerUser: 4,
  voiceMinutesPerSession: 3,
  interviewMinutesPerUser: 0.05,
  aiCallsPerSession: 5,
  emailsPerUser: 3,
  storageMbPerUser: 2,
  databaseKbPerUser: 200,
  egressMbPerSession: 5,
  errorsPer1kSessions: 5,
  pageViewsPerSession: 6
};

/** Fixed ratios behind the derived usage, shown in the playground so they can be judged. */
export const assumptions = {
  pageWeightMb: 1.5,
  requestsPerPageView: 25,
  webrtcParticipantsPerVoiceMinute: 2,
  speechCreditsPerInterviewMinute: 500
};

export type Usage = Record<MetricId, number>;

export function usageFromDrivers(drivers: ProjectionDrivers): Usage {
  const sessions = drivers.mau * drivers.sessionsPerUser;
  const voiceMinutes = sessions * drivers.voiceMinutesPerSession;
  const aiCalls = sessions * drivers.aiCallsPerSession;
  const pageViews = sessions * drivers.pageViewsPerSession;
  return {
    mau: drivers.mau,
    dbGb: (drivers.mau * drivers.databaseKbPerUser) / 1_000_000,
    storageGb: (drivers.mau * drivers.storageMbPerUser) / 1_000,
    egressGb: (sessions * drivers.egressMbPerSession) / 1_000,
    edgeInvocations: aiCalls,
    bandwidthGb: (pageViews * assumptions.pageWeightMb) / 1_000,
    cdnRequests: pageViews * assumptions.requestsPerPageView,
    errors: (sessions * drivers.errorsPer1kSessions) / 1_000,
    emails: drivers.mau * drivers.emailsPerUser,
    agentMinutes: voiceMinutes,
    webrtcMinutes: voiceMinutes * assumptions.webrtcParticipantsPerVoiceMinute,
    ttsChars:
      drivers.mau * drivers.interviewMinutesPerUser * assumptions.speechCreditsPerInterviewMinute,
    traces: aiCalls,
    sttMinutes: voiceMinutes,
    llmCalls: aiCalls
  };
}

/**
 * Pay-per-use services with no plan quota. Gemini, OpenAI and the models routed through
 * OpenRouter would double count the same calls, so LLM calls are priced on OpenRouter only.
 */
export const usageRates: Partial<Record<string, { metric: MetricId; price: number }>> = {
  openrouter: { metric: 'llmCalls', price: serviceUsageCosts.openrouter?.cost ?? 0 },
  deepgram: { metric: 'sttMinutes', price: serviceUsageCosts.deepgram?.cost ?? 0 }
};

export interface MetricEvaluation {
  metric: MetricId;
  usage: number;
  included: number;
  /** Share of the included quota in use; above 1 means over. */
  ratio: number;
  overageCost: number;
  /** Over the quota on a plan that stops instead of billing overage. */
  overCap: boolean;
}

export interface ServiceEvaluation {
  serviceId: string;
  planId: string | null;
  baseMonthly: number;
  metrics: MetricEvaluation[];
  monthlyCost: number;
  overCap: boolean;
}

function evaluatePlan(serviceId: string, plan: PlanQuota, usage: Usage): ServiceEvaluation {
  const metrics = Object.entries(plan.metrics).map(([id, quota]): MetricEvaluation => {
    const metric = id as MetricId;
    const value = usage[metric];
    const over = Math.max(0, value - quota.included);
    const billable = quota.overagePrice !== undefined && quota.overageUnit !== undefined;
    return {
      metric,
      usage: value,
      included: quota.included,
      ratio: quota.included > 0 ? value / quota.included : value > 0 ? Infinity : 0,
      overageCost: billable ? Math.ceil(over / quota.overageUnit!) * quota.overagePrice! : 0,
      overCap: !billable && over > 0
    };
  });
  const overageCost = metrics.reduce((sum, metric) => sum + metric.overageCost, 0);
  return {
    serviceId,
    planId: plan.planId,
    baseMonthly: plan.baseMonthly,
    metrics,
    monthlyCost: plan.baseMonthly + overageCost,
    overCap: metrics.some((metric) => metric.overCap)
  };
}

function evaluateUsageOnly(serviceId: string, usage: Usage): ServiceEvaluation | null {
  const rate = usageRates[serviceId];
  if (!rate) return null;
  const value = usage[rate.metric];
  return {
    serviceId,
    planId: null,
    baseMonthly: 0,
    metrics: [
      {
        metric: rate.metric,
        usage: value,
        included: Infinity,
        ratio: 0,
        overageCost: value * rate.price,
        overCap: false
      }
    ],
    monthlyCost: value * rate.price,
    overCap: false
  };
}

function findPlan(serviceId: string, planId: string) {
  return planQuotas[serviceId]?.find((plan) => plan.planId === planId);
}

export function evaluateService(
  serviceId: string,
  planId: string,
  usage: Usage
): ServiceEvaluation | null {
  const plan = findPlan(serviceId, planId);
  return plan ? evaluatePlan(serviceId, plan, usage) : evaluateUsageOnly(serviceId, usage);
}

/** Lowest-cost plan that doesn't hit a hard cap; the largest plan when none fits. */
export function cheapestFittingPlan(serviceId: string, usage: Usage): ServiceEvaluation | null {
  const plans = planQuotas[serviceId];
  if (!plans?.length) return evaluateUsageOnly(serviceId, usage);
  const evaluations = plans.map((plan) => evaluatePlan(serviceId, plan, usage));
  let best: ServiceEvaluation | null = null;
  for (const evaluation of evaluations) {
    if (evaluation.overCap) continue;
    if (!best || evaluation.monthlyCost < best.monthlyCost) best = evaluation;
  }
  return best ?? evaluations[evaluations.length - 1];
}

export interface MetricCapacity {
  metric: MetricId;
  included: number;
  perUser: number;
  maxMau: number;
  hardCap: boolean;
}

export interface ServiceCapacity {
  serviceId: string;
  planId: string;
  metrics: MetricCapacity[];
  /** The metric that runs out first, i.e. the lowest `maxMau`. */
  bottleneck: MetricCapacity | null;
}

/** Usage grows linearly with MAU, so each quota divides into a maximum MAU. */
export function capacity(
  serviceId: string,
  planId: string,
  drivers: ProjectionDrivers
): ServiceCapacity | null {
  const plan = findPlan(serviceId, planId);
  if (!plan) return null;
  const perUser = usageFromDrivers({ ...drivers, mau: 1 });
  const metrics = Object.entries(plan.metrics).map(([id, quota]): MetricCapacity => {
    const metric = id as MetricId;
    const rate = perUser[metric];
    return {
      metric,
      included: quota.included,
      perUser: rate,
      maxMau: rate > 0 ? Math.floor(quota.included / rate) : Infinity,
      hardCap: quota.overagePrice === undefined
    };
  });
  let bottleneck: MetricCapacity | null = null;
  for (const metric of metrics) {
    if (metric.maxMau === Infinity) continue;
    if (!bottleneck || metric.maxMau < bottleneck.maxMau) bottleneck = metric;
  }
  return { serviceId, planId, metrics, bottleneck };
}

export interface ServiceProjection {
  service: ExternalService;
  current: ServiceEvaluation;
  suggested: ServiceEvaluation;
  capacity: ServiceCapacity | null;
}

export interface StackLimit {
  serviceId: string;
  metric: MetricCapacity;
}

export interface StackProjection {
  rows: ServiceProjection[];
  /** Monthly USD of subscriptions and domains that don't scale with users. */
  fixedMonthly: number;
  currentMonthly: number;
  suggestedMonthly: number;
  /** Lowest MAU at which any included quota runs out and overage starts. */
  includedLimit: StackLimit | null;
  /** Lowest MAU at which a plan stops serving instead of billing overage. */
  hardLimit: StackLimit | null;
}

function lowest(current: StackLimit | null, serviceId: string, metric: MetricCapacity) {
  if (metric.maxMau === Infinity) return current;
  return !current || metric.maxMau < current.metric.maxMau ? { serviceId, metric } : current;
}

export function projectStack(
  services: ExternalService[],
  rates: CurrencyRates,
  drivers: ProjectionDrivers,
  /** Detected plans; missing ones fall back to the manual plan, then the catalog default. */
  statuses: ServicePlanStatus[] | undefined
): StackProjection {
  const statusById = new Map(statuses?.map((status) => [status.id, status]));
  const planIdOf = (service: ExternalService) =>
    resolvePlan(service.id, service.planId, statusById.get(service.id))?.plan.id ?? null;
  const usage = usageFromDrivers(drivers);
  const rows: ServiceProjection[] = [];
  let fixedMonthly = 0;
  let includedLimit: StackLimit | null = null;
  let hardLimit: StackLimit | null = null;

  for (const service of services) {
    if (isExcluded(service)) continue;
    const planId = planIdOf(service);
    const current = planId ? evaluateService(service.id, planId, usage) : null;
    const usageOnly = evaluateUsageOnly(service.id, usage);
    const evaluation = current ?? usageOnly;
    if (!evaluation) {
      fixedMonthly += costOf(service, 'monthly', rates)?.usd ?? 0;
      continue;
    }
    const serviceCapacity = planId ? capacity(service.id, planId, drivers) : null;
    for (const metric of serviceCapacity?.metrics ?? []) {
      includedLimit = lowest(includedLimit, service.id, metric);
      if (metric.hardCap) hardLimit = lowest(hardLimit, service.id, metric);
    }
    rows.push({
      service,
      current: evaluation,
      suggested: cheapestFittingPlan(service.id, usage) ?? evaluation,
      capacity: serviceCapacity
    });
  }

  const sum = (pick: (row: ServiceProjection) => number) =>
    rows.reduce((total, row) => total + pick(row), fixedMonthly);
  return {
    rows,
    fixedMonthly,
    currentMonthly: sum((row) => row.current.monthlyCost),
    suggestedMonthly: sum((row) => row.suggested.monthlyCost),
    includedLimit,
    hardLimit
  };
}

/** Left out of the totals: models billed through OpenRouter and services not on the canvas. */
function isExcluded(service: ExternalService) {
  const node = serviceNodesById.get(service.id);
  return !node || Boolean(node.data.via);
}

const noUsage = Object.fromEntries(
  Object.keys(defaultDrivers).map((key) => [key, 0])
) as unknown as ProjectionDrivers;

/** Monthly USD the stack costs with no usage: subscriptions, domains and plan base fees. */
export function stackBaseline(
  services: ExternalService[],
  rates: CurrencyRates,
  statuses: ServicePlanStatus[] | undefined
): number {
  return projectStack(services, rates, noUsage, statuses).currentMonthly;
}

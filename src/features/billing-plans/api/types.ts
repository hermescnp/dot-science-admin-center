import type { PlatformFeatureSection } from '@/features/platform-features/api/types';
import type { PlanLimitValues } from '../constants/limits';

export type BillingPlanStatus = 'draft' | 'active' | 'archived';

/** A limit shown on the plan that carries no maintenance cost, e.g. "Projects: 3". */
export interface CustomLimit {
  label: string;
  value: string;
}

/** An ecosystem subscription plan; prices are USD per month unless noted. */
export interface BillingPlan {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: BillingPlanStatus;
  monthlyPrice: number;
  /** Per year; null means monthlyPrice * 12. */
  annualPrice: number | null;
  /** Subscribers the fixed stack cost is spread over. */
  expectedSubscribers: number;
  /** Share of the limits (0 to 100) an average subscriber uses; priced with average compensation. */
  usagePct: number;
  /** Cost-bearing limits per subscriber per month. */
  limits: PlanLimitValues;
  customLimits: CustomLimit[];
  /** `platform_features` ids included in the plan. */
  featureIds: string[];
  position: number;
  updatedAt: string;
}

/** A platform feature that can be included in a plan. */
export interface BillingFeatureOption {
  id: string;
  platformId: string;
  section: PlatformFeatureSection;
  name: string;
  icon: string;
  services: string[];
}

export interface BillingPlansResponse {
  plans: BillingPlan[];
  features: BillingFeatureOption[];
}

export interface BillingPlanMutationPayload {
  name: string;
  description: string;
  status: BillingPlanStatus;
  monthlyPrice: number;
  annualPrice?: number;
  expectedSubscribers: number;
  usagePct: number;
  limits: PlanLimitValues;
  customLimits: CustomLimit[];
  featureIds: string[];
}

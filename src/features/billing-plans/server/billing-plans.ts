import 'server-only';

import type { Database } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlatformFeatureSection } from '@/features/platform-features/api/types';
import type {
  BillingPlan,
  BillingPlanMutationPayload,
  BillingPlansResponse,
  BillingPlanStatus,
  CustomLimit
} from '../api/types';
import type { PlanLimitValues } from '../constants/limits';

type Client = SupabaseClient<Database>;
type Json = Database['public']['Tables']['billing_plans']['Row']['limits'];
type BillingPlanRow = Omit<
  Database['public']['Tables']['billing_plans']['Row'],
  'created_at' | 'updated_by'
> & { billing_plan_features: { feature_id: string }[] };

const COLUMNS =
  'id, slug, name, description, status, monthly_price, annual_price, expected_subscribers, usage_pct, limits, custom_limits, position, updated_at, billing_plan_features(feature_id)';

export class BillingPlanConflictError extends Error {}

function toBillingPlan(row: BillingPlanRow): BillingPlan {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: row.status as BillingPlanStatus,
    monthlyPrice: Number(row.monthly_price),
    annualPrice: row.annual_price === null ? null : Number(row.annual_price),
    expectedSubscribers: row.expected_subscribers,
    usagePct: row.usage_pct,
    limits: row.limits as PlanLimitValues,
    customLimits: row.custom_limits as unknown as CustomLimit[],
    featureIds: row.billing_plan_features.map((link) => link.feature_id),
    position: row.position,
    updatedAt: row.updated_at
  };
}

function toColumns(payload: BillingPlanMutationPayload) {
  return {
    name: payload.name,
    slug: slugify(payload.name),
    description: payload.description,
    status: payload.status,
    monthly_price: payload.monthlyPrice,
    annual_price: payload.annualPrice ?? null,
    expected_subscribers: payload.expectedSubscribers,
    usage_pct: payload.usagePct,
    limits: payload.limits as Json,
    custom_limits: payload.customLimits as unknown as Json
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function conflictOr(error: { code?: string; message: string }): Error {
  return error.code === '23505'
    ? new BillingPlanConflictError('A plan with that name already exists')
    : new Error(error.message);
}

async function replaceFeatures(supabase: Client, planId: string, featureIds: string[]) {
  const { error: deleteError } = await supabase
    .from('billing_plan_features')
    .delete()
    .eq('plan_id', planId);
  if (deleteError) throw new Error(deleteError.message);
  if (!featureIds.length) return;
  const { error } = await supabase
    .from('billing_plan_features')
    .insert(featureIds.map((featureId) => ({ plan_id: planId, feature_id: featureId })));
  if (error) throw new Error(error.message);
}

async function getBillingPlan(supabase: Client, id: string): Promise<BillingPlan | null> {
  const { data, error } = await supabase
    .from('billing_plans')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toBillingPlan(data) : null;
}

export async function listBillingPlans(supabase: Client): Promise<BillingPlansResponse> {
  const [plans, features] = await Promise.all([
    supabase.from('billing_plans').select(COLUMNS).order('position').order('monthly_price'),
    supabase
      .from('platform_features')
      .select('id, platform_id, section, name, icon, services')
      .order('platform_id')
      .order('section')
      .order('position')
  ]);
  if (plans.error) throw new Error(plans.error.message);
  if (features.error) throw new Error(features.error.message);
  return {
    plans: plans.data.map(toBillingPlan),
    features: features.data.map((row) => ({
      id: row.id,
      platformId: row.platform_id,
      section: row.section as PlatformFeatureSection,
      name: row.name,
      icon: row.icon,
      services: row.services
    }))
  };
}

export async function createBillingPlan(
  supabase: Client,
  payload: BillingPlanMutationPayload
): Promise<BillingPlan> {
  const { data: last, error: positionError } = await supabase
    .from('billing_plans')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (positionError) throw new Error(positionError.message);

  const { data, error } = await supabase
    .from('billing_plans')
    .insert({ ...toColumns(payload), position: last ? last.position + 1 : 0 })
    .select('id')
    .single();
  if (error) throw conflictOr(error);

  await replaceFeatures(supabase, data.id, payload.featureIds);
  const plan = await getBillingPlan(supabase, data.id);
  if (!plan) throw new Error('Plan not found after insert');
  return plan;
}

export async function updateBillingPlan(
  supabase: Client,
  id: string,
  payload: BillingPlanMutationPayload
): Promise<BillingPlan | null> {
  const { data, error } = await supabase
    .from('billing_plans')
    .update(toColumns(payload))
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw conflictOr(error);
  if (!data) return null;

  await replaceFeatures(supabase, id, payload.featureIds);
  return getBillingPlan(supabase, id);
}

export async function deleteBillingPlan(supabase: Client, id: string): Promise<boolean> {
  const { data, error } = await supabase.from('billing_plans').delete().eq('id', id).select('id');
  if (error) throw new Error(error.message);
  return data.length > 0;
}

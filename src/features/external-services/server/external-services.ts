import 'server-only';

import type { Database } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceNodes } from '@/features/platform-features/constants/options';
import type {
  BillingCycle,
  Currency,
  CurrencyRates,
  ExternalService,
  ExternalServiceItem,
  ExternalServiceItemKind,
  ExternalServiceItemMutationPayload,
  ExternalServiceMutationPayload,
  ExternalServicesResponse,
  ItemBillingCycle
} from '../api/types';

type Client = SupabaseClient<Database>;
type Tables = Database['public']['Tables'];
type ExternalServiceRow = Omit<Tables['external_services']['Row'], 'created_at' | 'updated_by'>;
type ExternalServiceItemRow = Omit<
  Tables['external_service_items']['Row'],
  'created_at' | 'updated_at' | 'updated_by'
>;

const COLUMNS =
  'id, plan_id, billing_cycle, monthly_cost, annual_cost, currency, renews_on, notes, updated_at';
const ITEM_COLUMNS =
  'id, service_id, label, kind, billing_cycle, amount, currency, renews_on, notes';

const DEFAULT_RATES: CurrencyRates = { USD: 1, CAD: 0.72 };

function toNumber(value: number | null) {
  return value === null ? null : Number(value);
}

function toExternalServiceItem(row: ExternalServiceItemRow): ExternalServiceItem {
  return {
    id: row.id,
    serviceId: row.service_id,
    label: row.label,
    kind: row.kind as ExternalServiceItemKind,
    billingCycle: row.billing_cycle as ItemBillingCycle,
    amount: Number(row.amount),
    currency: row.currency as Currency,
    renewsOn: row.renews_on,
    notes: row.notes
  };
}

function toExternalService(
  row: ExternalServiceRow,
  items: ExternalServiceItem[] = []
): ExternalService {
  return {
    id: row.id,
    planId: row.plan_id,
    billingCycle: row.billing_cycle as BillingCycle,
    monthlyCost: toNumber(row.monthly_cost),
    annualCost: toNumber(row.annual_cost),
    currency: row.currency as Currency,
    renewsOn: row.renews_on,
    notes: row.notes,
    updatedAt: row.updated_at,
    items
  };
}

function emptyService(id: string): ExternalService {
  return {
    id,
    planId: null,
    billingCycle: 'monthly',
    monthlyCost: null,
    annualCost: null,
    currency: 'USD',
    renewsOn: null,
    notes: '',
    updatedAt: null,
    items: []
  };
}

export function isServiceNode(id: string): boolean {
  return serviceNodes.some((node) => node.id === id);
}

/** One entry per architecture service node, in canvas order; rows for unknown ids are ignored. */
export async function listExternalServices(supabase: Client): Promise<ExternalServicesResponse> {
  const [services, items, rates] = await Promise.all([
    supabase.from('external_services').select(COLUMNS),
    supabase.from('external_service_items').select(ITEM_COLUMNS).order('label'),
    supabase.from('currency_rates').select('currency, usd_rate')
  ]);
  for (const { error } of [services, items, rates]) {
    if (error) throw new Error(error.message);
  }

  const itemsByService = new Map<string, ExternalServiceItem[]>();
  for (const row of items.data ?? []) {
    const item = toExternalServiceItem(row);
    itemsByService.set(item.serviceId, [...(itemsByService.get(item.serviceId) ?? []), item]);
  }
  const rowsById = new Map(
    (services.data ?? []).map((row) => [row.id, toExternalService(row, itemsByService.get(row.id))])
  );
  const currencyRates = { ...DEFAULT_RATES };
  for (const rate of rates.data ?? []) {
    currencyRates[rate.currency as Currency] = Number(rate.usd_rate);
  }

  return {
    services: serviceNodes.map((node) => rowsById.get(node.id) ?? emptyService(node.id)),
    rates: currencyRates
  };
}

export async function upsertExternalService(
  supabase: Client,
  id: string,
  payload: ExternalServiceMutationPayload
): Promise<ExternalService> {
  const { data, error } = await supabase
    .from('external_services')
    .upsert({
      id,
      plan_id: payload.planId,
      billing_cycle: payload.billingCycle,
      monthly_cost: payload.monthlyCost ?? null,
      annual_cost: payload.annualCost ?? null,
      currency: payload.currency,
      renews_on: payload.renewsOn ?? null,
      notes: payload.notes
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toExternalService(data);
}

function toItemColumns(payload: ExternalServiceItemMutationPayload) {
  return {
    label: payload.label,
    kind: payload.kind,
    billing_cycle: payload.billingCycle,
    amount: payload.amount,
    currency: payload.currency,
    renews_on: payload.renewsOn ?? null,
    notes: payload.notes
  };
}

export async function insertExternalServiceItem(
  supabase: Client,
  serviceId: string,
  payload: ExternalServiceItemMutationPayload
): Promise<ExternalServiceItem> {
  // Items reference the service row, which only exists once its billing has been saved.
  const { error: serviceError } = await supabase
    .from('external_services')
    .upsert({ id: serviceId }, { onConflict: 'id', ignoreDuplicates: true });
  if (serviceError) throw new Error(serviceError.message);

  const { data, error } = await supabase
    .from('external_service_items')
    .insert({ service_id: serviceId, ...toItemColumns(payload) })
    .select(ITEM_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toExternalServiceItem(data);
}

/** Returns null when no item has that id. */
export async function updateExternalServiceItem(
  supabase: Client,
  id: string,
  payload: ExternalServiceItemMutationPayload
): Promise<ExternalServiceItem | null> {
  const { data, error } = await supabase
    .from('external_service_items')
    .update(toItemColumns(payload))
    .eq('id', id)
    .select(ITEM_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toExternalServiceItem(data) : null;
}

/** Returns false when no item has that id. */
export async function deleteExternalServiceItem(supabase: Client, id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('external_service_items')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  return data.length > 0;
}

export async function updateCurrencyRate(
  supabase: Client,
  currency: Currency,
  usdRate: number
): Promise<number> {
  const { data, error } = await supabase
    .from('currency_rates')
    .upsert({ currency, usd_rate: usdRate })
    .select('usd_rate')
    .single();
  if (error) throw new Error(error.message);
  return Number(data.usd_rate);
}

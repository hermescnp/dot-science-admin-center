export type BillingCycle = 'monthly' | 'annual' | 'usage';
export type ItemBillingCycle = Exclude<BillingCycle, 'usage'>;
export type Currency = 'USD' | 'CAD';
export type ExternalServiceItemKind = 'domain' | 'mailbox' | 'seat';

/** A domain, mailbox or seat billed under a service; amounts are in the item's own currency. */
export interface ExternalServiceItem {
  id: string;
  serviceId: string;
  label: string;
  kind: ExternalServiceItemKind;
  billingCycle: ItemBillingCycle;
  amount: number;
  currency: Currency;
  /** ISO date (YYYY-MM-DD). */
  renewsOn: string | null;
  notes: string;
}

export interface ExternalService {
  /** Architecture service node id, e.g. `supabase`. */
  id: string;
  /** Manually set plan id from the plan catalog; null uses the detected or default plan. */
  planId: string | null;
  billingCycle: BillingCycle;
  /** Per month, in `currency`. Ignored when the service has items. */
  monthlyCost: number | null;
  /** Per year, in `currency`; null means monthlyCost * 12. Ignored when the service has items. */
  annualCost: number | null;
  currency: Currency;
  /** ISO date (YYYY-MM-DD). */
  renewsOn: string | null;
  notes: string;
  updatedAt: string | null;
  items: ExternalServiceItem[];
}

/** USD value of one unit of each currency. */
export type CurrencyRates = Record<Currency, number>;

export interface ExternalServicesResponse {
  services: ExternalService[];
  rates: CurrencyRates;
}

export interface ExternalServiceMutationPayload {
  planId: string | null;
  billingCycle: BillingCycle;
  monthlyCost?: number;
  annualCost?: number;
  currency: Currency;
  renewsOn?: string;
  notes: string;
}

export interface ExternalServiceItemMutationPayload {
  label: string;
  kind: ExternalServiceItemKind;
  billingCycle: ItemBillingCycle;
  amount: number;
  currency: Currency;
  renewsOn?: string;
  notes: string;
}

export interface CurrencyRateMutationPayload {
  usdRate: number;
}

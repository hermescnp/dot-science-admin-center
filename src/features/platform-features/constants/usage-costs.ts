export type CostUnit = 'use' | 'minute';

export interface ServiceUsageCost {
  unit: CostUnit;
  usage: string;
  cost: number;
}

export interface FeatureCostEstimate {
  totals: Partial<Record<CostUnit, number>>;
  items: (ServiceUsageCost & { serviceId: string })[];
}

export const costUnits: CostUnit[] = ['use', 'minute'];
export const costUnitLabels: Record<CostUnit, string> = { use: 'use', minute: 'min' };

const OPENROUTER_FEE = 1.055;

// Typical consumption of each usage-billed service, at Oct 2026 list prices.
// Streaming services bill per minute; everything else per single use.
// Services missing here (Supabase, Vercel, Sentry) are flat-rate and add no marginal cost.
export const serviceUsageCosts: Partial<Record<string, ServiceUsageCost>> = {
  openrouter: {
    unit: 'use',
    usage: '4k input + 1k output tokens on Gemini Flash, plus 5.5% fee',
    cost: ((4_000 * 0.3 + 1_000 * 2.5) / 1_000_000) * OPENROUTER_FEE
  },
  gemini: {
    unit: 'use',
    usage: '4k input + 1k output tokens on Gemini Flash',
    cost: (4_000 * 0.3 + 1_000 * 2.5) / 1_000_000
  },
  openai: {
    unit: 'use',
    usage: '4k input + 1k output tokens on a GPT-5 class model',
    cost: (4_000 * 1.25 + 1_000 * 10) / 1_000_000
  },
  langgraph: {
    unit: 'use',
    usage: '1 traced run with ~5 node executions',
    cost: 0.0005 + 5 * 0.001
  },
  livekit: {
    unit: 'minute',
    usage: 'Agent session minute plus WebRTC participant minute',
    cost: 0.01 + 0.0005
  },
  deepgram: {
    unit: 'minute',
    usage: 'Nova-3 streaming transcription minute',
    cost: 0.0048
  },
  elevenlabs: {
    unit: 'use',
    usage: '1,000 characters of speech',
    cost: 99 / 600
  },
  resend: {
    unit: 'use',
    usage: '1 email beyond the plan quota',
    cost: 0.9 / 1_000
  }
};

export function estimateFeatureCost(services: string[]): FeatureCostEstimate | null {
  const items = services.flatMap((serviceId) => {
    const cost = serviceUsageCosts[serviceId];
    return cost ? [{ serviceId, ...cost }] : [];
  });
  if (!items.length) return null;

  const totals: FeatureCostEstimate['totals'] = {};
  for (const item of items) totals[item.unit] = (totals[item.unit] ?? 0) + item.cost;
  return { totals, items };
}

const costFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumSignificantDigits: 2
});

export function formatCost(cost: number, unit: CostUnit): string {
  return `${costFormatter.format(cost)} / ${costUnitLabels[unit]}`;
}

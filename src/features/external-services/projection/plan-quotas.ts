export type MetricId =
  | 'mau'
  | 'dbGb'
  | 'storageGb'
  | 'egressGb'
  | 'edgeInvocations'
  | 'bandwidthGb'
  | 'cdnRequests'
  | 'errors'
  | 'emails'
  | 'agentMinutes'
  | 'webrtcMinutes'
  | 'ttsChars'
  | 'traces'
  | 'sttMinutes'
  | 'llmCalls';

export interface MetricQuota {
  included: number;
  /** Size of one billed overage block, e.g. 1,000 emails. */
  overageUnit?: number;
  /** USD per overage block; undefined means the plan stops at `included`. */
  overagePrice?: number;
}

export interface PlanQuota {
  planId: string;
  baseMonthly: number;
  metrics: Partial<Record<MetricId, MetricQuota>>;
}

export interface MetricInfo {
  label: string;
  unit: string;
}

export const metricInfo: Record<MetricId, MetricInfo> = {
  mau: { label: 'Monthly active users', unit: 'MAU' },
  dbGb: { label: 'Database size', unit: 'GB' },
  storageGb: { label: 'File storage', unit: 'GB' },
  egressGb: { label: 'Egress', unit: 'GB' },
  edgeInvocations: { label: 'Edge Function invocations', unit: 'calls' },
  bandwidthGb: { label: 'Data transfer', unit: 'GB' },
  cdnRequests: { label: 'CDN requests', unit: 'requests' },
  errors: { label: 'Errors', unit: 'errors' },
  emails: { label: 'Emails', unit: 'emails' },
  agentMinutes: { label: 'Agent session minutes', unit: 'min' },
  webrtcMinutes: { label: 'WebRTC minutes', unit: 'min' },
  ttsChars: { label: 'Speech credits', unit: 'credits' },
  traces: { label: 'Base traces', unit: 'traces' },
  sttMinutes: { label: 'Transcription minutes', unit: 'min' },
  llmCalls: { label: 'LLM calls', unit: 'calls' }
};

const supabasePaidMetrics = (
  included: Record<'mau' | 'dbGb' | 'storageGb' | 'egressGb' | 'edgeInvocations', number>
): PlanQuota['metrics'] => ({
  mau: { included: included.mau, overageUnit: 1, overagePrice: 0.00325 },
  dbGb: { included: included.dbGb, overageUnit: 1, overagePrice: 0.125 },
  storageGb: { included: included.storageGb, overageUnit: 1, overagePrice: 0.021 },
  egressGb: { included: included.egressGb, overageUnit: 1, overagePrice: 0.09 },
  edgeInvocations: {
    included: included.edgeInvocations,
    overageUnit: 1_000_000,
    overagePrice: 2
  }
});

const supabasePaidIncluded = {
  mau: 100_000,
  dbGb: 8,
  storageGb: 100,
  egressGb: 250,
  edgeInvocations: 2_000_000
};

/**
 * Numeric limits behind the display catalog in `service-plans.ts`, at Oct 2026 list prices.
 * Plans run cheapest first; Enterprise and custom-priced plans are left out.
 */
export const planQuotas: Partial<Record<string, PlanQuota[]>> = {
  supabase: [
    {
      planId: 'free',
      baseMonthly: 0,
      metrics: {
        mau: { included: 50_000 },
        dbGb: { included: 0.5 },
        storageGb: { included: 1 },
        egressGb: { included: 5 },
        edgeInvocations: { included: 500_000 }
      }
    },
    { planId: 'pro', baseMonthly: 25, metrics: supabasePaidMetrics(supabasePaidIncluded) },
    { planId: 'team', baseMonthly: 599, metrics: supabasePaidMetrics(supabasePaidIncluded) }
  ],
  vercel: [
    {
      planId: 'hobby',
      baseMonthly: 0,
      metrics: {
        bandwidthGb: { included: 100 },
        cdnRequests: { included: 1_000_000 }
      }
    },
    {
      planId: 'pro',
      baseMonthly: 20,
      metrics: {
        bandwidthGb: { included: 1_000, overageUnit: 1, overagePrice: 0.15 },
        cdnRequests: { included: 10_000_000, overageUnit: 1_000_000, overagePrice: 2 }
      }
    }
  ],
  sentry: [
    { planId: 'developer', baseMonthly: 0, metrics: { errors: { included: 5_000 } } },
    {
      planId: 'team',
      baseMonthly: 26,
      metrics: { errors: { included: 50_000, overageUnit: 1, overagePrice: 0.00029 } }
    },
    {
      planId: 'business',
      baseMonthly: 80,
      metrics: { errors: { included: 50_000, overageUnit: 1, overagePrice: 0.00029 } }
    }
  ],
  resend: [
    { planId: 'free', baseMonthly: 0, metrics: { emails: { included: 3_000 } } },
    {
      planId: 'pro',
      baseMonthly: 20,
      metrics: { emails: { included: 50_000, overageUnit: 1_000, overagePrice: 0.9 } }
    },
    {
      planId: 'scale',
      baseMonthly: 90,
      metrics: { emails: { included: 100_000, overageUnit: 1_000, overagePrice: 0.9 } }
    }
  ],
  livekit: [
    {
      planId: 'build',
      baseMonthly: 0,
      metrics: { agentMinutes: { included: 1_000 }, webrtcMinutes: { included: 5_000 } }
    },
    {
      planId: 'ship',
      baseMonthly: 50,
      metrics: {
        agentMinutes: { included: 5_000, overageUnit: 1, overagePrice: 0.01 },
        webrtcMinutes: { included: 150_000, overageUnit: 1, overagePrice: 0.0005 }
      }
    },
    {
      planId: 'scale',
      baseMonthly: 500,
      metrics: {
        agentMinutes: { included: 50_000, overageUnit: 1, overagePrice: 0.01 },
        webrtcMinutes: { included: 1_500_000, overageUnit: 1, overagePrice: 0.0004 }
      }
    }
  ],
  elevenlabs: [
    { planId: 'free', baseMonthly: 0, metrics: { ttsChars: { included: 10_000 } } },
    { planId: 'starter', baseMonthly: 6, metrics: { ttsChars: { included: 30_000 } } },
    {
      planId: 'creator',
      baseMonthly: 22,
      metrics: { ttsChars: { included: 121_000, overageUnit: 1_000, overagePrice: 0.3 } }
    },
    {
      planId: 'pro',
      baseMonthly: 99,
      metrics: { ttsChars: { included: 600_000, overageUnit: 1_000, overagePrice: 0.24 } }
    },
    {
      planId: 'scale',
      baseMonthly: 299,
      metrics: { ttsChars: { included: 1_800_000, overageUnit: 1_000, overagePrice: 0.18 } }
    },
    {
      planId: 'business',
      baseMonthly: 990,
      metrics: { ttsChars: { included: 6_000_000, overageUnit: 1_000, overagePrice: 0.12 } }
    }
  ],
  langgraph: [
    {
      planId: 'developer',
      baseMonthly: 0,
      metrics: { traces: { included: 5_000, overageUnit: 1_000, overagePrice: 2.5 } }
    },
    {
      planId: 'plus',
      baseMonthly: 39,
      metrics: { traces: { included: 10_000, overageUnit: 1_000, overagePrice: 2.5 } }
    }
  ]
};

import type { MetricId } from '@/features/external-services/projection/plan-quotas';
import { assumptions } from '@/features/external-services/projection/projection';

export const planLimitIds = [
  'voiceMinutes',
  'interviewMinutes',
  'aiCalls',
  'storageMb',
  'emails'
] as const;

export type PlanLimitId = (typeof planLimitIds)[number];

export interface PlanLimit {
  id: PlanLimitId;
  label: string;
  unit: string;
  description: string;
  step: number;
  /** Service usage one unit of this limit generates. */
  usage: Partial<Record<MetricId, number>>;
}

/** Cost-bearing limits, all per subscriber per month. */
export const planLimits: PlanLimit[] = [
  {
    id: 'voiceMinutes',
    label: 'Voice minutes',
    unit: 'min',
    description: 'IAteneo live voice: LiveKit agent and WebRTC minutes plus Deepgram transcription',
    step: 10,
    usage: {
      agentMinutes: 1,
      webrtcMinutes: assumptions.webrtcParticipantsPerVoiceMinute,
      sttMinutes: 1
    }
  },
  {
    id: 'interviewMinutes',
    label: 'Interview minutes',
    unit: 'min',
    description: 'Golden Papers Resonance voice interviews on ElevenLabs',
    step: 5,
    usage: { ttsChars: assumptions.speechCreditsPerInterviewMinute }
  },
  {
    id: 'aiCalls',
    label: 'AI calls',
    unit: 'calls',
    description:
      'LLM calls through OpenRouter, with LangGraph traces and Edge Function invocations',
    step: 10,
    usage: { llmCalls: 1, traces: 1, edgeInvocations: 1 }
  },
  {
    id: 'storageMb',
    label: 'File storage',
    unit: 'MB',
    description: 'Files and assets in Supabase Storage',
    step: 50,
    usage: { storageGb: 1 / 1_000 }
  },
  {
    id: 'emails',
    label: 'Emails',
    unit: 'emails',
    description: 'Transactional email through Resend',
    step: 5,
    usage: { emails: 1 }
  }
];

export const planLimitsById = new Map(planLimits.map((limit) => [limit.id, limit]));

export type PlanLimitValues = Partial<Record<PlanLimitId, number>>;

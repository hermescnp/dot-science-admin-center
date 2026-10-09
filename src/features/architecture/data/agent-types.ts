import type { Icons } from '@/components/icons';

type IconKey = keyof typeof Icons;

export type ToolEffect = 'read' | 'propose' | 'write';
export type GuardrailKind = 'access' | 'validation' | 'limit' | 'prompt' | 'fallback';
export type ModelRole = 'primary' | 'fallback' | 'delivery' | 'stt' | 'downstream';

export interface AgentModel {
  nodeId?: string;
  slug: string;
  role: ModelRole;
}

export interface AgentContextItem {
  icon: IconKey;
  label: string;
  detail: string;
  limit?: string;
}

export interface AgentTool {
  name: string;
  description: string;
  effect: ToolEffect;
}

export interface AgentGuardrail {
  kind: GuardrailKind;
  label: string;
  detail: string;
}

export interface AgentCheckpoint {
  label: string;
  detail: string;
}

export interface AgentOutput {
  icon: IconKey;
  label: string;
  detail: string;
}

export interface AgentArchetype {
  title: string;
  icon: IconKey;
}

export interface AgentProfile {
  archetype: AgentArchetype;
  purpose: string;
  runtime: string;
  entry?: string;
  repo: string;
  models: AgentModel[];
  modelNote?: string;
  temperature?: number;
  context: AgentContextItem[];
  tools: AgentTool[];
  guardrails: AgentGuardrail[];
  humanCheckpoints: AgentCheckpoint[];
  outputs: AgentOutput[];
  memory: string;
  watchOuts?: string[];
}

export const toolRarity: Record<ToolEffect, { name: string; meaning: string }> = {
  read: { name: 'Read', meaning: 'Reads or highlights' },
  propose: { name: 'Propose', meaning: 'Proposes, needs your OK' },
  write: { name: 'Write', meaning: 'Writes immediately' }
};

export const guardrailKindLabels: Record<GuardrailKind, string> = {
  access: 'Access',
  validation: 'Validation',
  limit: 'Limits',
  prompt: 'Prompt rules',
  fallback: 'Fallbacks'
};

export const modelRoleLabels: Record<ModelRole, string> = {
  primary: 'Primary',
  fallback: 'Fallback',
  delivery: 'Delivery',
  stt: 'Speech-to-text',
  downstream: 'Downstream'
};

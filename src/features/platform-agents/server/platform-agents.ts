import 'server-only';

import type { Database } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentProfile } from '@/features/architecture/data/agent-types';
import type {
  PlatformAgent,
  PlatformAgentKind,
  PlatformAgentMutationPayload,
  PlatformAgentStatus
} from '../api/types';

type Client = SupabaseClient<Database>;
type PlatformAgentRow = Omit<
  Database['public']['Tables']['platform_agents']['Row'],
  'created_at' | 'updated_by'
>;
type PlatformAgentUpdate = Database['public']['Tables']['platform_agents']['Update'];

const COLUMNS =
  'id, platform_id, kind, name, archetype_title, archetype_icon, purpose, runtime, entry, repo, models, model_note, temperature, context, tools, guardrails, human_checkpoints, outputs, memory, watch_outs, status, position, updated_at';

export class PlatformAgentConflictError extends Error {}

function toPlatformAgent(row: PlatformAgentRow): PlatformAgent {
  return {
    id: row.id,
    platformId: row.platform_id,
    kind: row.kind as PlatformAgentKind,
    name: row.name,
    archetype: {
      title: row.archetype_title,
      icon: row.archetype_icon as AgentProfile['archetype']['icon']
    },
    purpose: row.purpose,
    runtime: row.runtime,
    entry: row.entry ?? undefined,
    repo: row.repo,
    models: row.models as unknown as AgentProfile['models'],
    modelNote: row.model_note ?? undefined,
    temperature: row.temperature ?? undefined,
    context: row.context as unknown as AgentProfile['context'],
    tools: row.tools as unknown as AgentProfile['tools'],
    guardrails: row.guardrails as unknown as AgentProfile['guardrails'],
    humanCheckpoints: row.human_checkpoints as unknown as AgentProfile['humanCheckpoints'],
    outputs: row.outputs as unknown as AgentProfile['outputs'],
    memory: row.memory,
    watchOuts: row.watch_outs.length ? row.watch_outs : undefined,
    status: row.status as PlatformAgentStatus,
    position: row.position,
    updatedAt: row.updated_at
  };
}

function toSummaryColumns(payload: PlatformAgentMutationPayload) {
  return {
    platform_id: payload.platformId,
    kind: payload.kind,
    status: payload.status,
    name: payload.name,
    archetype_title: payload.archetypeTitle,
    archetype_icon: payload.archetypeIcon,
    purpose: payload.purpose,
    runtime: payload.runtime,
    entry: payload.entry || null,
    repo: payload.repo,
    models: payload.models.map(({ nodeId, ...model }) => (nodeId ? { nodeId, ...model } : model)),
    model_note: payload.modelNote || null,
    temperature: payload.temperature ?? null,
    memory: payload.memory
  } satisfies PlatformAgentUpdate;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function listPlatformAgents(supabase: Client): Promise<PlatformAgent[]> {
  const { data, error } = await supabase
    .from('platform_agents')
    .select(COLUMNS)
    .order('platform_id')
    .order('position')
    .order('name');
  if (error) throw new Error(error.message);
  return data.map(toPlatformAgent);
}

export async function getPlatformAgent(
  supabase: Client,
  id: string
): Promise<PlatformAgent | null> {
  const { data, error } = await supabase
    .from('platform_agents')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toPlatformAgent(data) : null;
}

export async function createPlatformAgent(
  supabase: Client,
  payload: PlatformAgentMutationPayload
): Promise<PlatformAgent> {
  const { data: last, error: positionError } = await supabase
    .from('platform_agents')
    .select('position')
    .eq('platform_id', payload.platformId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (positionError) throw new Error(positionError.message);

  const { data, error } = await supabase
    .from('platform_agents')
    .insert({
      id: slugify(payload.name),
      ...toSummaryColumns(payload),
      position: last ? last.position + 1 : 0
    })
    .select(COLUMNS)
    .single();
  if (error?.code === '23505') {
    throw new PlatformAgentConflictError('An agent with that name already exists');
  }
  if (error) throw new Error(error.message);
  return toPlatformAgent(data);
}

export async function updatePlatformAgent(
  supabase: Client,
  id: string,
  payload: PlatformAgentMutationPayload
): Promise<PlatformAgent | null> {
  const { data, error } = await supabase
    .from('platform_agents')
    .update(toSummaryColumns(payload))
    .eq('id', id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toPlatformAgent(data) : null;
}

export async function deletePlatformAgent(supabase: Client, id: string): Promise<boolean> {
  const { data, error } = await supabase.from('platform_agents').delete().eq('id', id).select('id');
  if (error) throw new Error(error.message);
  return data.length > 0;
}

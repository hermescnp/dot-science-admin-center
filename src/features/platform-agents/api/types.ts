import type { AgentModel, AgentProfile } from '@/features/architecture/data/agent-types';
import type { PlatformFeatureStatus } from '@/features/platform-features/api/types';

export type PlatformAgentKind = 'agent' | 'subagent' | 'orchestrator';

export type PlatformAgentStatus = PlatformFeatureStatus;

export interface PlatformAgent extends AgentProfile {
  /** Architecture canvas node id when the agent is on the canvas, otherwise a slug. */
  id: string;
  /** Architecture app node id, e.g. `golden-papers`. */
  platformId: string;
  kind: PlatformAgentKind;
  name: string;
  status: PlatformAgentStatus;
  position: number;
  updatedAt: string;
}

export interface PlatformAgentMutationPayload {
  platformId: string;
  kind: PlatformAgentKind;
  status: PlatformAgentStatus;
  name: string;
  archetypeTitle: string;
  /** Key of `Icons`. */
  archetypeIcon: string;
  purpose: string;
  runtime: string;
  entry: string;
  repo: string;
  models: AgentModel[];
  modelNote: string;
  temperature?: number;
  memory: string;
}

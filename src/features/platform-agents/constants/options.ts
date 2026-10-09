import { modelRoleLabels, type ModelRole } from '@/features/architecture/data/agent-types';
import type { PlatformAgentKind } from '../api/types';

export const agentKindOptions: { value: PlatformAgentKind; label: string }[] = [
  { value: 'agent', label: 'Agent' },
  { value: 'orchestrator', label: 'Orchestrator' },
  { value: 'subagent', label: 'Sub-agent' }
];

export const agentKindLabels = new Map(agentKindOptions.map((kind) => [kind.value, kind.label]));

export const modelRoleOptions = (Object.keys(modelRoleLabels) as ModelRole[]).map((role) => ({
  value: role,
  label: modelRoleLabels[role]
}));

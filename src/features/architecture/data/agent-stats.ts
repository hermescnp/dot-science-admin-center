import type { Icons } from '@/components/icons';
import type { AgentProfile } from './agent-types';
import { orchestrationRules, orchestrationTargets } from './orchestration';

export interface AgentStat {
  key: string;
  label: string;
  icon: keyof typeof Icons;
  value: number;
  display: string;
}

function ratio(count: number, max: number): number {
  return Math.round(Math.min(count / max, 1) * 100);
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export function orchestratorStats(profile: AgentProfile): AgentStat[] {
  const gates = profile.humanCheckpoints.length;
  return [
    {
      key: 'routes',
      label: 'Routes',
      icon: 'route',
      value: ratio(orchestrationTargets.length, 10),
      display: plural(orchestrationTargets.length, 'target')
    },
    {
      key: 'rules',
      label: 'Routing rules',
      icon: 'checks',
      value: ratio(orchestrationRules.length, 10),
      display: `${plural(orchestrationRules.length, 'rule')} · first match`
    },
    {
      key: 'parallel',
      label: 'Parallel fan-out',
      icon: 'sitemap',
      value: 100,
      display: 'Send per approved task'
    },
    {
      key: 'human',
      label: 'Human-in-the-loop',
      icon: 'flag',
      value: ratio(gates, 4),
      display: plural(gates, 'interrupt')
    },
    {
      key: 'guardrails',
      label: 'Guardrails',
      icon: 'shield',
      value: ratio(profile.guardrails.length, 8),
      display: plural(profile.guardrails.length, 'guardrail')
    }
  ];
}

export function agentStats(profile: AgentProfile): AgentStat[] {
  const gates = profile.humanCheckpoints.length;
  return [
    {
      key: 'context',
      label: 'Context',
      icon: 'eye',
      value: ratio(profile.context.length, 6),
      display: plural(profile.context.length, 'source')
    },
    {
      key: 'models',
      label: 'Models',
      icon: 'brain',
      value: ratio(profile.models.length, 3),
      display: profile.models.length ? plural(profile.models.length, 'model') : 'No LLM'
    },
    {
      key: 'tools',
      label: 'Tools',
      icon: 'sword',
      value: ratio(profile.tools.length, 12),
      display: plural(profile.tools.length, 'tool')
    },
    {
      key: 'guardrails',
      label: 'Guardrails',
      icon: 'shield',
      value: ratio(profile.guardrails.length, 8),
      display: plural(profile.guardrails.length, 'guardrail')
    },
    {
      key: 'autonomy',
      label: 'Autonomy',
      icon: 'flag',
      value: Math.max(100 - gates * 25, 20),
      display: gates ? `Human-in-the-loop · ${plural(gates, 'checkpoint')}` : 'Fully autonomous'
    }
  ];
}

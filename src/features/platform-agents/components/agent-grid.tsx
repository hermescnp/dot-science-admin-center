'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Icons } from '@/components/icons';
import { AgentProfileDialog } from '@/features/architecture/components/agent-profile-dialog';
import { BrandLogo } from '@/features/architecture/components/brand-logo';
import { platformNodes, platformNodesById } from '@/features/platform-features/constants/options';
import { platformAgentsQueryOptions } from '../api/queries';
import { AgentCard } from './agent-card';

const platformOrder = new Map(platformNodes.map((node, index) => [node.id, index]));

export function AgentGrid() {
  const { data: agents } = useSuspenseQuery(platformAgentsQueryOptions());
  const [selected, setSelected] = useState<{
    id: string;
    open: boolean;
  } | null>(null);

  const groups = Object.entries(Object.groupBy(agents, (agent) => agent.platformId)).toSorted(
    ([a], [b]) => (platformOrder.get(a) ?? Infinity) - (platformOrder.get(b) ?? Infinity)
  );

  if (!agents.length) {
    return (
      <div className='text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-sm'>
        <Icons.robot className='size-8' stroke={1.25} />
        No agents yet. Use “Add agent” to create the first one.
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-8'>
      {groups.map(([platformId, platformAgents = []]) => {
        const platform = platformNodesById.get(platformId);
        return (
          <section key={platformId} className='flex flex-col gap-3'>
            <h2 className='flex items-center gap-2 text-sm font-medium'>
              {platform?.data.logo ? (
                <BrandLogo logo={platform.data.logo} logoDark={platform.data.logoDark} size={18} />
              ) : null}
              {platform?.data.label ?? platformId}
              <span className='text-muted-foreground font-normal tabular-nums'>
                {platformAgents.length}
              </span>
            </h2>
            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
              {platformAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onOpen={(id) => setSelected({ id, open: true })}
                />
              ))}
            </div>
          </section>
        );
      })}
      <AgentProfileDialog
        agentId={selected?.id ?? null}
        open={selected?.open ?? false}
        onOpenChange={(open) => setSelected((current) => (current ? { ...current, open } : null))}
      />
    </div>
  );
}

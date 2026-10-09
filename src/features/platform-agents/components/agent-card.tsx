'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AbilityGem,
  PortraitMedallion,
  RealmLine,
  SheetFrame,
  StatBar,
  smallCaps
} from '@/features/architecture/components/agent-sheet-parts';
import { BrandLogo } from '@/features/architecture/components/brand-logo';
import { agentStats, orchestratorStats } from '@/features/architecture/data/agent-stats';
import { modelRoleLabels } from '@/features/architecture/data/agent-types';
import { FeatureStatusBadge } from '@/features/platform-features/components/feature-display';
import { serviceNodesById } from '@/features/platform-features/constants/options';
import { cn } from '@/lib/utils';
import { deletePlatformAgentMutation } from '../api/mutations';
import type { PlatformAgent } from '../api/types';
import { agentKindLabels } from '../constants/options';
import { AgentFormSheet } from './agent-form-sheet';

interface AgentCardProps {
  agent: PlatformAgent;
  onOpen: (id: string) => void;
}

export function AgentCard({ agent, onOpen }: AgentCardProps) {
  const isOrchestrator = agent.kind === 'orchestrator';
  const stats = isOrchestrator ? orchestratorStats(agent) : agentStats(agent);

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={() => onOpen(agent.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(agent.id);
        }
      }}
      className='group focus-visible:ring-ring h-full cursor-pointer rounded-xl outline-none focus-visible:ring-2'
    >
      <SheetFrame className='group-hover:border-primary/40 flex h-full flex-col gap-4 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_60%)] p-4 motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-300 group-hover:shadow-lg motion-safe:group-hover:-translate-y-0.5'>
        <div className='flex items-start gap-3.5 pt-1 pl-1'>
          <PortraitMedallion
            size='sm'
            archetypeIcon={agent.archetype.icon}
            coreIcon={isOrchestrator ? 'sitemap' : 'robot'}
          />
          <div className='min-w-0 flex-1'>
            <div className='flex items-start gap-2'>
              <h3 className='min-w-0 flex-1 truncate font-serif text-lg leading-tight tracking-wide'>
                {agent.name}
              </h3>
              <AgentActions agent={agent} />
            </div>
            <div className='mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400'>
              <span className={cn(smallCaps, 'text-muted-foreground text-[9px]')}>Pattern</span>
              <span className='truncate font-serif'>{agent.archetype.title}</span>
            </div>
            <div className='mt-2 flex flex-wrap items-center gap-1.5'>
              <span
                className={cn(
                  smallCaps,
                  'border-primary/40 text-primary rounded-full border px-2 py-0.5 text-[9px]'
                )}
              >
                {agentKindLabels.get(agent.kind)}
              </span>
              <FeatureStatusBadge status={agent.status} className='h-5 px-1.5 text-[10px]' />
            </div>
          </div>
        </div>

        <p className='text-foreground/75 line-clamp-3 font-serif text-[13px] leading-snug italic'>
          “{agent.purpose}”
        </p>

        <div className='flex flex-col gap-2.5'>
          <Divider label='Capabilities' />
          {stats.map((stat, index) => (
            <StatBar key={stat.key} stat={stat} index={index} size='sm' />
          ))}
        </div>

        <div className='flex flex-col gap-2.5'>
          <Divider label='Loadout' />
          <div className='flex flex-wrap gap-1.5'>
            {agent.models.length ? (
              agent.models.map((model, index) => {
                const provider = model.nodeId ? serviceNodesById.get(model.nodeId) : undefined;
                return (
                  <span
                    key={`${model.role}-${model.slug}`}
                    title={`${modelRoleLabels[model.role]}: ${model.slug}`}
                    className={cn(
                      'bg-background/40 flex max-w-full items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-mono text-[10px]',
                      index === 0 ? 'border-violet-500/40 shadow-sm shadow-violet-500/10' : ''
                    )}
                  >
                    {provider?.data.logo ? (
                      <BrandLogo
                        logo={provider.data.logo}
                        logoDark={provider.data.logoDark}
                        size={12}
                      />
                    ) : (
                      <Icons.sparkles className='text-muted-foreground size-3' stroke={1.5} />
                    )}
                    <span className='truncate'>{model.slug}</span>
                  </span>
                );
              })
            ) : (
              <span className='text-muted-foreground flex items-center gap-1.5 rounded-md border border-dashed px-1.5 py-0.5 font-serif text-[11px] italic'>
                <Icons.scale className='size-3' stroke={1.5} />
                Deterministic
              </span>
            )}
          </div>
          <div className='flex min-h-4 flex-wrap items-center gap-0.5'>
            {agent.tools.length ? (
              agent.tools.map((tool) => <AbilityGem key={tool.name} tool={tool} />)
            ) : (
              <span className='text-muted-foreground font-serif text-[11px] italic'>
                No tools: structured output only
              </span>
            )}
          </div>
        </div>

        <div className='mt-auto flex flex-col gap-1 border-t pt-3'>
          <RealmLine label='Runtime'>{agent.runtime}</RealmLine>
          <RealmLine label='Repo' mono>
            {agent.repo}
          </RealmLine>
        </div>
      </SheetFrame>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className={cn(smallCaps, 'text-muted-foreground flex items-center gap-2 text-[9px]')}>
      {label}
      <span className='from-border h-px flex-1 bg-gradient-to-r to-transparent' />
    </div>
  );
}

function AgentActions({ agent }: { agent: PlatformAgent }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const deleteMutation = useMutation({
    ...deletePlatformAgentMutation,
    onSuccess: (...args) => {
      deletePlatformAgentMutation.onSuccess?.(...args);
      toast.success('Agent deleted');
      setDeleteOpen(false);
    },
    onError: () => toast.error("Couldn't delete the agent")
  });

  // Portaled menus and dialogs still bubble React events to the card's click handler.
  return (
    <div
      className='-mt-1 -mr-1'
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate(agent.id)}
        loading={deleteMutation.isPending}
      />
      <AgentFormSheet agent={agent} open={editOpen} onOpenChange={setEditOpen} />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger render={<Button variant='ghost' className='h-7 w-7 p-0' />}>
          <span className='sr-only'>Open menu</span>
          <Icons.ellipsis className='h-4 w-4' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Icons.edit className='mr-2 h-4 w-4' /> Update
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
              <Icons.trash className='mr-2 h-4 w-4' /> Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

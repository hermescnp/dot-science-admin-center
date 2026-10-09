'use client';

import { useQuery } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { platformAgentsQueryOptions } from '@/features/platform-agents/api/queries';
import type { PlatformAgent } from '@/features/platform-agents/api/types';
import { cn } from '@/lib/utils';
import type { AgentProfile, GuardrailKind } from '../data/agent-types';
import { agentStats, orchestratorStats, type AgentStat } from '../data/agent-stats';
import { architectureNodes, type ArchitectureNode } from '../data/architecture-graph';
import { ORCHESTRATOR_ID } from '../data/orchestration';
import {
  AbilityCard,
  CheckpointBanner,
  DefenseGroup,
  EmptyNote,
  EquipmentSlot,
  FocusDial,
  InventorySlot,
  LootRow,
  PortraitMedallion,
  QuestLine,
  RarityLegend,
  RealmLine,
  SectionTitle,
  SheetFrame,
  StatBar,
  smallCaps
} from './agent-sheet-parts';
import { ControlFlow, FanOut, RoutingRules } from './orchestrator-sheet-parts';

const nodesById = new Map(architectureNodes.map((node) => [node.id, node]));
const orchestrationSteps = architectureNodes.filter((node) => node.kind === 'subagent');
const guardrailKindOrder: GuardrailKind[] = ['access', 'validation', 'limit', 'prompt', 'fallback'];

interface AgentProfileDialogProps {
  agentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentProfileDialog({ agentId, open, onOpenChange }: AgentProfileDialogProps) {
  const {
    data: agents,
    isPending,
    isError
  } = useQuery({
    ...platformAgentsQueryOptions(),
    enabled: open
  });

  return (
    <Dialog open={open && !!agentId} onOpenChange={onOpenChange}>
      {agentId ? (
        <DialogContent className='flex h-[90vh] w-[95vw] max-w-[1400px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1400px]'>
          {agents ? (
            <AgentSheet key={agentId} initialId={agentId} agents={agents} />
          ) : (
            <SheetStatus
              icon={isPending ? undefined : 'warning'}
              title={isPending ? 'Loading agent' : "Couldn't load the agent"}
              detail={isError ? 'Check your connection and try again.' : undefined}
            />
          )}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function SheetStatus({
  icon,
  title,
  detail
}: {
  icon?: keyof typeof Icons;
  title: string;
  detail?: string;
}) {
  const StatusIcon = icon ? Icons[icon] : null;
  return (
    <div className='flex flex-1 flex-col items-center justify-center gap-3 text-center'>
      {StatusIcon ? (
        <StatusIcon className='text-muted-foreground size-8' stroke={1.25} />
      ) : (
        <Spinner className='size-6' />
      )}
      <DialogTitle className='font-serif text-lg font-normal'>{title}</DialogTitle>
      {detail ? <DialogDescription>{detail}</DialogDescription> : null}
    </div>
  );
}

function AgentSheet({ initialId, agents }: { initialId: string; agents: PlatformAgent[] }) {
  const [currentId, setCurrentId] = useState(initialId);
  const agent = agents.find((item) => item.id === currentId);
  if (!agent) {
    return (
      <SheetStatus
        icon='robot'
        title='No profile for this agent'
        detail='Add it on the Agents page to describe its models, tools and guardrails.'
      />
    );
  }

  const node = nodesById.get(currentId);
  const isOrchestrator = currentId === ORCHESTRATOR_ID;

  return (
    <ScrollArea className='min-h-0 flex-1'>
      <div className='flex flex-col gap-5 p-5'>
        <HeroBanner
          key={currentId}
          node={node}
          agent={agent}
          stats={isOrchestrator ? orchestratorStats(agent) : agentStats(agent)}
          onBack={
            currentId !== initialId && initialId === ORCHESTRATOR_ID
              ? () => setCurrentId(ORCHESTRATOR_ID)
              : undefined
          }
        />
        {isOrchestrator ? (
          <OrchestratorBody profile={agent} onSelect={setCurrentId} />
        ) : (
          <AgentBody profile={agent} node={node} currentId={currentId} onSelect={setCurrentId} />
        )}
      </div>
    </ScrollArea>
  );
}

interface SheetBodyProps {
  profile: AgentProfile;
  onSelect: (id: string) => void;
}

function OrchestratorBody({ profile, onSelect }: SheetBodyProps) {
  return (
    <>
      <SheetFrame>
        <SectionTitle
          icon='sitemap'
          title='Control flow'
          aside={
            <span className='text-muted-foreground font-mono text-[11px]'>document-edit-graph</span>
          }
        />
        <ControlFlow onSelect={onSelect} />
      </SheetFrame>
      <div className='grid items-start gap-5 lg:grid-cols-[1.45fr_1fr]'>
        <SheetFrame>
          <SectionTitle
            icon='route'
            title='Routing rules'
            aside={
              <span className='text-muted-foreground font-mono text-[11px]'>
                resolveOrchestratorNext · first match wins
              </span>
            }
          />
          <RoutingRules onSelect={onSelect} />
        </SheetFrame>
        <div className='flex flex-col gap-5'>
          <SheetFrame>
            <SectionTitle icon='sitemap' title='Parallel fan-out' />
            <FanOut onSelect={onSelect} />
          </SheetFrame>
          <CheckpointsPanel profile={profile} />
        </div>
      </div>
      <div className='grid gap-5 lg:grid-cols-[1fr_1.4fr_1fr]'>
        <InventoryPanel profile={profile} title='Graph state' />
        <DefensesPanel profile={profile} />
        <div className='flex flex-col gap-5'>
          <LootPanel profile={profile} />
          {profile.watchOuts?.length ? <WeaknessesPanel items={profile.watchOuts} /> : null}
        </div>
      </div>
    </>
  );
}

function AgentBody({
  profile,
  node,
  currentId,
  onSelect
}: SheetBodyProps & { node?: ArchitectureNode; currentId: string }) {
  return (
    <>
      {node?.kind === 'subagent' ? (
        <SheetFrame className='py-4'>
          <SectionTitle
            icon='sitemap'
            title='Orchestration'
            aside={
              <span className='text-muted-foreground text-[11px]'>
                Each node returns control to the supervisor
              </span>
            }
          />
          <QuestLine
            orchestratorId={ORCHESTRATOR_ID}
            steps={orchestrationSteps}
            currentId={currentId}
            onSelect={onSelect}
          />
        </SheetFrame>
      ) : null}
      <div className='grid items-stretch gap-5 lg:grid-cols-[1fr_minmax(280px,0.85fr)_1.15fr]'>
        <InventoryPanel profile={profile} />
        <MindPanel profile={profile} />
        <AbilitiesPanel profile={profile} />
      </div>
      <div className='grid gap-5 lg:grid-cols-[1.5fr_1fr]'>
        <DefensesPanel profile={profile} />
        <div className='flex flex-col gap-5'>
          <CheckpointsPanel profile={profile} />
          <LootPanel profile={profile} />
          {profile.watchOuts?.length ? <WeaknessesPanel items={profile.watchOuts} /> : null}
        </div>
      </div>
    </>
  );
}

interface HeroBannerProps {
  node?: ArchitectureNode;
  agent: PlatformAgent;
  stats: AgentStat[];
  onBack?: () => void;
}

function HeroBanner({ node, agent: profile, stats, onBack }: HeroBannerProps) {
  const badge = node?.data.badge ?? (node?.data.step ? `Step ${node.data.step}` : undefined);

  return (
    <SheetFrame className='overflow-hidden bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_60%)] p-6'>
      <div className='grid gap-8 pr-8 lg:grid-cols-[1.2fr_1fr]'>
        <DialogHeader className='flex-row items-start gap-5 space-y-0 text-left'>
          <PortraitMedallion
            archetypeIcon={profile.archetype.icon}
            coreIcon={profile.kind === 'orchestrator' ? 'sitemap' : 'robot'}
          />
          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <DialogTitle className='font-serif text-2xl font-normal tracking-wide'>
                {profile.name}
              </DialogTitle>
              {badge ? (
                <span
                  className={cn(
                    smallCaps,
                    'border-primary/40 text-primary rounded-full border px-2 py-0.5 text-[9px]'
                  )}
                >
                  {badge}
                </span>
              ) : null}
              {node?.data.human ? (
                <span
                  className={cn(
                    smallCaps,
                    'flex items-center gap-1 rounded-full border border-amber-500/40 px-2 py-0.5 text-[9px] text-amber-700 dark:text-amber-400'
                  )}
                >
                  <Icons.flag className='size-3' stroke={1.75} />
                  Interrupt
                </span>
              ) : null}
            </div>
            <div className='mt-1 flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400'>
              <span className={cn(smallCaps, 'text-muted-foreground')}>Pattern</span>
              <span className='font-serif'>{profile.archetype.title}</span>
            </div>
            <DialogDescription className='text-foreground/75 mt-3 font-serif text-[15px] leading-relaxed italic'>
              “{profile.purpose}”
            </DialogDescription>
            <div className='mt-4 flex flex-col gap-1.5'>
              <RealmLine label='Runtime'>{profile.runtime}</RealmLine>
              {profile.entry ? (
                <RealmLine label='Entry' mono>
                  {profile.entry}
                </RealmLine>
              ) : null}
              <RealmLine label='Repo' mono>
                {profile.repo}
              </RealmLine>
            </div>
            {onBack ? (
              <Button variant='outline' size='xs' className='mt-4' onClick={onBack}>
                <Icons.chevronLeft />
                Back to orchestrator
              </Button>
            ) : null}
          </div>
        </DialogHeader>
        <div className='flex flex-col justify-center gap-3.5'>
          <div className={cn(smallCaps, 'text-muted-foreground mb-1 flex items-center gap-2')}>
            Capabilities
            <span className='from-border h-px flex-1 bg-gradient-to-r to-transparent' />
          </div>
          {stats.map((stat, index) => (
            <StatBar key={stat.key} stat={stat} index={index} />
          ))}
        </div>
      </div>
    </SheetFrame>
  );
}

function InventoryPanel({ profile, title = 'Context' }: { profile: AgentProfile; title?: string }) {
  return (
    <SheetFrame>
      <SectionTitle icon='box' title={title} />
      <div className='grid grid-cols-2 gap-2.5 xl:grid-cols-3'>
        {profile.context.map((item) => (
          <InventorySlot key={item.label} item={item} />
        ))}
      </div>
      <p className='text-muted-foreground mt-3 text-center text-[11px]'>
        Hover a source for details
      </p>
    </SheetFrame>
  );
}

function MindPanel({ profile }: { profile: AgentProfile }) {
  return (
    <SheetFrame>
      <SectionTitle icon='brain' title='Models' />
      {profile.models.length ? (
        <div className='flex flex-col gap-1'>
          {profile.models.map((model, index) => (
            <Fragment key={`${model.role}-${model.slug}`}>
              {index > 0 ? (
                <div className='text-muted-foreground flex items-center justify-center gap-2 py-1 text-[10px]'>
                  <span className='bg-border h-3 w-px' />
                  {model.role === 'fallback'
                    ? 'on error'
                    : model.role === 'delivery'
                      ? 'delivery'
                      : 'then'}
                  <span className='bg-border h-3 w-px' />
                </div>
              ) : null}
              <EquipmentSlot
                model={model}
                provider={model.nodeId ? nodesById.get(model.nodeId) : undefined}
                primary={index === 0}
              />
            </Fragment>
          ))}
          {profile.temperature !== undefined ? (
            <div className='mt-4'>
              <FocusDial value={profile.temperature} />
            </div>
          ) : null}
          {profile.modelNote ? (
            <p className='text-muted-foreground mt-3 text-center text-[11px] leading-snug'>
              {profile.modelNote}
            </p>
          ) : null}
        </div>
      ) : (
        <div className='flex flex-col items-center gap-3 py-6 text-center'>
          <span className='flex size-16 items-center justify-center rounded-full border border-dashed'>
            <Icons.scale className='text-muted-foreground size-7' stroke={1.25} />
          </span>
          <div className='font-serif text-base'>Deterministic</div>
          <p className='text-muted-foreground text-xs leading-snug'>{profile.modelNote}</p>
        </div>
      )}
    </SheetFrame>
  );
}

function AbilitiesPanel({ profile }: { profile: AgentProfile }) {
  return (
    <SheetFrame className='flex flex-col'>
      <SectionTitle
        icon='sword'
        title='Tools'
        aside={
          <span className='text-muted-foreground font-mono text-[11px]'>
            {profile.tools.length}
          </span>
        }
      />
      <div className='flex-1'>
        {profile.tools.length ? (
          <ul className='flex flex-col gap-2'>
            {profile.tools.map((tool) => (
              <AbilityCard key={tool.name} tool={tool} />
            ))}
          </ul>
        ) : (
          <EmptyNote icon='brain'>No tools: structured output only</EmptyNote>
        )}
      </div>
      <div className='mt-4 border-t pt-3'>
        <RarityLegend />
      </div>
    </SheetFrame>
  );
}

function DefensesPanel({ profile }: { profile: AgentProfile }) {
  const groups = guardrailKindOrder
    .map((kind) => ({
      kind,
      items: profile.guardrails.filter((item) => item.kind === kind)
    }))
    .filter((group) => group.items.length);

  return (
    <SheetFrame>
      <SectionTitle
        icon='shield'
        title='Guardrails'
        aside={
          <span className='text-muted-foreground font-mono text-[11px]'>
            {profile.guardrails.length}
          </span>
        }
      />
      <div className='flex flex-col gap-5'>
        {groups.map((group) => (
          <DefenseGroup key={group.kind} kind={group.kind} items={group.items} />
        ))}
      </div>
    </SheetFrame>
  );
}

function CheckpointsPanel({ profile }: { profile: AgentProfile }) {
  const checkpoints = profile.humanCheckpoints;
  return (
    <SheetFrame>
      <SectionTitle icon='flag' title='Human-in-the-loop' />
      {checkpoints.length ? (
        <ol className='flex flex-col gap-3'>
          {checkpoints.map((checkpoint, index) => (
            <CheckpointBanner
              key={checkpoint.label}
              checkpoint={checkpoint}
              index={index}
              last={index === checkpoints.length - 1}
            />
          ))}
        </ol>
      ) : (
        <EmptyNote icon='playerPlay'>No human checkpoints</EmptyNote>
      )}
    </SheetFrame>
  );
}

function LootPanel({ profile }: { profile: AgentProfile }) {
  return (
    <SheetFrame>
      <SectionTitle icon='diamond' title='Outputs' />
      <ul className='flex flex-col gap-3'>
        {profile.outputs.map((output) => (
          <LootRow key={output.label} output={output} />
        ))}
      </ul>
      <div className='mt-4 rounded-lg border border-amber-500/15 bg-gradient-to-br from-amber-500/[0.06] to-transparent p-3'>
        <div className='mb-1 flex items-center gap-1.5'>
          <Icons.book className='size-3.5 text-amber-700 dark:text-amber-400' stroke={1.5} />
          <span className={cn(smallCaps, 'text-amber-700 dark:text-amber-400')}>Memory</span>
        </div>
        <p className='text-foreground/80 font-serif text-[13px] leading-snug italic'>
          {profile.memory}
        </p>
      </div>
    </SheetFrame>
  );
}

function WeaknessesPanel({ items }: { items: string[] }) {
  return (
    <SheetFrame className='border-amber-500/30 bg-amber-500/[0.04]'>
      <SectionTitle icon='warning' title='Known gaps' />
      <ul className='flex flex-col gap-2'>
        {items.map((item) => (
          <li key={item} className='text-muted-foreground flex gap-2.5 text-xs leading-snug'>
            <span className='mt-1 size-1.5 shrink-0 rotate-45 bg-amber-500/70' />
            {item}
          </li>
        ))}
      </ul>
    </SheetFrame>
  );
}

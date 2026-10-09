'use client';

import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Icons } from '@/components/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  guardrailKindLabels,
  modelRoleLabels,
  toolRarity,
  type AgentCheckpoint,
  type AgentContextItem,
  type AgentGuardrail,
  type AgentModel,
  type AgentOutput,
  type AgentTool,
  type GuardrailKind,
  type ToolEffect
} from '../data/agent-types';
import type { AgentStat } from '../data/agent-stats';
import type { ArchitectureNode } from '../data/architecture-graph';
import { BrandLogo } from './brand-logo';

type IconKey = keyof typeof Icons;

export const smallCaps = 'text-[10px] font-medium uppercase tracking-[0.2em]';

const rarityStyles: Record<ToolEffect, { card: string; gem: string; tag: string }> = {
  read: {
    card: 'border-zinc-400/30 hover:shadow-zinc-400/10',
    gem: 'bg-zinc-400',
    tag: 'text-zinc-500 dark:text-zinc-400'
  },
  propose: {
    card: 'border-primary/40 hover:shadow-primary/20',
    gem: 'bg-primary shadow-[0_0_6px_var(--primary)]',
    tag: 'text-primary'
  },
  write: {
    card: 'border-amber-500/50 shadow-amber-500/10 shadow-md hover:shadow-amber-500/25',
    gem: 'bg-amber-500 shadow-[0_0_8px_var(--color-amber-500)]',
    tag: 'text-amber-600 dark:text-amber-400'
  }
};

const defenseIcons: Record<GuardrailKind, IconKey> = {
  access: 'key',
  validation: 'checks',
  limit: 'gauge',
  prompt: 'message',
  fallback: 'refresh'
};

const hoverLift =
  'motion-safe:transition-[transform,box-shadow] motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 hover:shadow-lg';

function Corners() {
  const base = 'pointer-events-none absolute size-2.5 border-primary/40';
  return (
    <>
      <span className={cn(base, 'top-1.5 left-1.5 rounded-tl-sm border-t border-l')} />
      <span className={cn(base, 'top-1.5 right-1.5 rounded-tr-sm border-t border-r')} />
      <span className={cn(base, 'bottom-1.5 left-1.5 rounded-bl-sm border-b border-l')} />
      <span className={cn(base, 'right-1.5 bottom-1.5 rounded-br-sm border-r border-b')} />
    </>
  );
}

export function SheetFrame({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        'bg-card/50 ring-foreground/[0.04] relative rounded-xl border p-5 ring-1 ring-inset',
        className
      )}
    >
      <Corners />
      {children}
    </section>
  );
}

interface SectionTitleProps {
  icon: IconKey;
  title: string;
  aside?: ReactNode;
}

export function SectionTitle({ icon, title, aside }: SectionTitleProps) {
  const Icon = Icons[icon];
  return (
    <div className='mb-4 flex items-center gap-2'>
      <Icon className='text-primary/80 size-4 shrink-0' stroke={1.5} />
      <h3 className='font-serif text-[15px] tracking-wide'>{title}</h3>
      <span className='from-border ml-1 h-px flex-1 bg-gradient-to-r to-transparent' />
      {aside}
    </div>
  );
}

const medallionSizes = {
  default: {
    root: 'size-24',
    ring: 'ring-4 ring-offset-2',
    inner: 'inset-2',
    core: 'size-10',
    emblem: 'size-8',
    emblemIcon: 'size-4'
  },
  sm: {
    root: 'size-14',
    ring: 'ring-2 ring-offset-1',
    inner: 'inset-1.5',
    core: 'size-6',
    emblem: 'size-6',
    emblemIcon: 'size-3'
  }
};

export function PortraitMedallion({
  archetypeIcon,
  coreIcon = 'robot',
  size = 'default'
}: {
  archetypeIcon: IconKey;
  coreIcon?: IconKey;
  size?: keyof typeof medallionSizes;
}) {
  const Emblem = Icons[archetypeIcon] ?? Icons.sparkles;
  const Core = Icons[coreIcon];
  const sizes = medallionSizes[size];
  return (
    <div className={cn('relative shrink-0', sizes.root)}>
      <div className='bg-primary/25 absolute inset-1 rounded-full blur-xl motion-safe:animate-pulse motion-safe:[animation-duration:4s]' />
      <div
        className={cn(
          'border-primary/40 from-card to-background ring-primary/10 ring-offset-background relative flex size-full items-center justify-center rounded-full border bg-gradient-to-b',
          sizes.ring
        )}
      >
        <div
          className={cn(
            'border-primary/20 absolute rounded-full border border-dashed',
            sizes.inner
          )}
        />
        <Core className={cn('text-primary', sizes.core)} stroke={1.25} />
      </div>
      <span
        className={cn(
          'bg-background absolute -right-1 -bottom-1 flex items-center justify-center rounded-full border border-amber-500/50 text-amber-600 shadow-md dark:text-amber-400',
          sizes.emblem
        )}
      >
        <Emblem className={sizes.emblemIcon} stroke={1.5} />
      </span>
    </div>
  );
}

export function RealmLine({
  label,
  mono,
  children
}: {
  label: string;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <div className='flex items-baseline gap-3 text-xs'>
      <span className={cn(smallCaps, 'text-muted-foreground w-14 shrink-0')}>{label}</span>
      <span className={cn('text-foreground/80 truncate', mono && 'font-mono')}>{children}</span>
    </div>
  );
}

const statTicks = {
  backgroundImage:
    'repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), var(--background) calc(10% - 1px) 10%)'
};

export function StatBar({
  stat,
  index,
  size = 'default'
}: {
  stat: AgentStat;
  index: number;
  size?: 'default' | 'sm';
}) {
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const Icon = Icons[stat.icon];
  const sm = size === 'sm';

  return (
    <div>
      <div className={cn('flex items-center gap-2', sm ? 'mb-1' : 'mb-1.5')}>
        <Icon className={cn('text-muted-foreground', sm ? 'size-3' : 'size-3.5')} stroke={1.5} />
        <span className={cn(smallCaps, sm && 'text-[9px] tracking-[0.15em]')}>{stat.label}</span>
        <span
          className={cn(
            'text-muted-foreground ml-auto truncate',
            sm ? 'text-[10px]' : 'text-[11px]'
          )}
        >
          {stat.display}
        </span>
      </div>
      <div className={cn('bg-muted relative overflow-hidden rounded-full', sm ? 'h-1.5' : 'h-2')}>
        <div
          className='from-primary/50 to-primary h-full rounded-full bg-gradient-to-r shadow-[0_0_10px_var(--primary)] motion-safe:transition-[width] motion-safe:duration-1000 motion-safe:ease-out'
          style={{
            width: `${filled ? stat.value : 0}%`,
            transitionDelay: `${index * 90}ms`
          }}
        />
        <div className='absolute inset-0' style={statTicks} />
      </div>
    </div>
  );
}

interface QuestLineProps {
  orchestratorId: string;
  steps: ArchitectureNode[];
  currentId: string;
  onSelect: (id: string) => void;
}

export function QuestLine({ orchestratorId, steps, currentId, onSelect }: QuestLineProps) {
  return (
    <div className='flex items-start overflow-x-auto px-1 pt-1 pb-2'>
      <QuestGem
        active={currentId === orchestratorId}
        marker={<Icons.pro className='size-3.5' stroke={1.75} />}
        label='Orchestrator'
        onClick={() => onSelect(orchestratorId)}
      />
      {steps.map((step) => (
        <Fragment key={step.id}>
          <span className='via-border mt-[22px] h-px min-w-3 flex-1 bg-gradient-to-r from-transparent to-transparent' />
          <QuestGem
            active={currentId === step.id}
            human={step.data.human}
            marker={step.data.step}
            label={step.data.label}
            onClick={() => onSelect(step.id)}
          />
        </Fragment>
      ))}
    </div>
  );
}

interface QuestGemProps {
  active: boolean;
  human?: boolean;
  marker: ReactNode;
  label: string;
  onClick: () => void;
}

function QuestGem({ active, human, marker, label, onClick }: QuestGemProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      className='group flex w-[84px] shrink-0 flex-col items-center gap-2 text-center outline-none'
    >
      <span className='relative flex h-11 items-center'>
        {human ? (
          <Icons.flag
            className='absolute -top-1 -right-3 size-3.5 text-amber-500'
            stroke={1.75}
            aria-label='Waits for a human'
          />
        ) : null}
        <span
          className={cn(
            'flex size-7 rotate-45 items-center justify-center rounded-[5px] border transition-all duration-300',
            active
              ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_14px_var(--primary)]'
              : human
                ? 'border-amber-500/60 bg-amber-500/10 text-amber-700 group-hover:border-amber-500 dark:text-amber-400'
                : 'border-border bg-background group-hover:border-primary/60'
          )}
        >
          <span className='-rotate-45 text-[11px] font-semibold'>{marker}</span>
        </span>
      </span>
      <span
        className={cn(
          'text-[11px] leading-tight',
          active ? 'text-foreground font-serif' : 'text-muted-foreground'
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function InventorySlot({ item }: { item: AgentContextItem }) {
  const Icon = Icons[item.icon];
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              'group bg-background/40 flex cursor-help flex-col items-center gap-2 rounded-lg border p-3 text-center',
              hoverLift,
              'hover:border-sky-500/40 hover:shadow-sky-500/10'
            )}
          />
        }
      >
        <span className='relative flex size-12 items-center justify-center rounded-lg border border-sky-500/25 bg-gradient-to-b from-sky-500/15 to-sky-500/5 text-sky-600 shadow-inner dark:text-sky-400'>
          <Icon className='size-5' stroke={1.5} />
        </span>
        <span className='text-xs leading-tight font-medium'>{item.label}</span>
        {item.limit ? (
          <span className='bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 font-mono text-[9px] leading-none'>
            {item.limit}
          </span>
        ) : null}
      </TooltipTrigger>
      <TooltipContent side='top'>{item.detail}</TooltipContent>
    </Tooltip>
  );
}

export function EquipmentSlot({
  model,
  provider,
  primary
}: {
  model: AgentModel;
  provider?: ArchitectureNode;
  primary?: boolean;
}) {
  return (
    <div
      className={cn(
        'bg-background/40 flex items-center gap-3 rounded-lg border',
        primary ? 'border-violet-500/40 p-3 shadow-md shadow-violet-500/10' : 'p-2.5'
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-lg border bg-gradient-to-b from-violet-500/10 to-transparent',
          primary ? 'size-11 border-violet-500/30' : 'size-9'
        )}
      >
        {provider?.data.logo ? (
          <BrandLogo
            logo={provider.data.logo}
            logoDark={provider.data.logoDark}
            size={primary ? 24 : 18}
          />
        ) : (
          <Icons.sparkles className='text-muted-foreground size-4' stroke={1.5} />
        )}
      </span>
      <div className='min-w-0 flex-1'>
        <div className={cn(smallCaps, 'text-muted-foreground')}>
          {modelRoleLabels[model.role]}
          {provider ? ` · ${provider.data.label}` : ''}
        </div>
        <div
          className={cn('truncate font-mono', primary ? 'text-[13px]' : 'text-xs')}
          title={model.slug}
        >
          {model.slug}
        </div>
      </div>
    </div>
  );
}

export function FocusDial({ value }: { value: number }) {
  return (
    <div className='w-full'>
      <div className='text-muted-foreground mb-1.5 flex items-center justify-between'>
        <span className='font-mono text-[10px]'>0</span>
        <span className='font-mono text-[10px]'>temperature {value}</span>
        <span className='font-mono text-[10px]'>1</span>
      </div>
      <div className='relative h-1.5 rounded-full bg-gradient-to-r from-sky-500/50 via-violet-500/50 to-amber-500/50'>
        <span
          className='bg-background absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] border-2 border-violet-500 shadow-[0_0_8px_var(--color-violet-500)]'
          style={{ left: `${Math.min(value, 1) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function AbilityCard({ tool }: { tool: AgentTool }) {
  const style = rarityStyles[tool.effect];
  return (
    <li className={cn('bg-background/40 relative rounded-lg border p-3', style.card, hoverLift)}>
      <div className='flex items-center gap-2 pr-14'>
        <span className={cn('size-2 shrink-0 rotate-45 rounded-[1px]', style.gem)} />
        <span className='truncate font-mono text-xs font-medium' title={tool.name}>
          {tool.name}
        </span>
      </div>
      <span className={cn(smallCaps, 'absolute top-3 right-3 text-[9px]', style.tag)}>
        {toolRarity[tool.effect].name}
      </span>
      <p className='text-muted-foreground mt-1 pl-4 text-xs leading-snug'>{tool.description}</p>
    </li>
  );
}

export function AbilityGem({ tool }: { tool: AgentTool }) {
  const style = rarityStyles[tool.effect];
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className='flex size-4 cursor-help items-center justify-center' />}
      >
        <span className={cn('size-2.5 rotate-45 rounded-[2px]', style.gem)} />
      </TooltipTrigger>
      <TooltipContent side='top'>
        <span className='font-mono'>{tool.name}</span>
        <span className='opacity-70'> · {toolRarity[tool.effect].name}</span>
      </TooltipContent>
    </Tooltip>
  );
}

export function RarityLegend() {
  return (
    <div className='text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-[11px]'>
      {(Object.keys(toolRarity) as ToolEffect[]).map((effect) => (
        <span key={effect} className='flex items-center gap-1.5'>
          <span className={cn('size-2 rotate-45 rounded-[1px]', rarityStyles[effect].gem)} />
          <span className={cn(smallCaps, 'text-[9px]', rarityStyles[effect].tag)}>
            {toolRarity[effect].name}
          </span>
          {toolRarity[effect].meaning}
        </span>
      ))}
    </div>
  );
}

export function DefenseGroup({ kind, items }: { kind: GuardrailKind; items: AgentGuardrail[] }) {
  const KindIcon = Icons[defenseIcons[kind]];
  return (
    <div>
      <div className='text-muted-foreground mb-2 flex items-center gap-1.5'>
        <KindIcon className='size-3.5' stroke={1.5} />
        <span className={smallCaps}>{guardrailKindLabels[kind]}</span>
        <span className='font-mono text-[10px]'>×{items.length}</span>
      </div>
      <ul className='grid gap-2 sm:grid-cols-2'>
        {items.map((item) => (
          <DefenseEmblem key={item.label} item={item} />
        ))}
      </ul>
    </div>
  );
}

function DefenseEmblem({ item }: { item: AgentGuardrail }) {
  return (
    <li
      className={cn(
        'flex gap-3 rounded-lg border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.07] to-transparent p-3',
        hoverLift,
        'hover:shadow-emerald-500/10'
      )}
    >
      <span className='flex size-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
        <Icons.shield className='size-4' stroke={1.5} />
      </span>
      <div className='min-w-0'>
        <div className='text-sm font-medium'>{item.label}</div>
        <p className='text-muted-foreground text-xs leading-snug'>{item.detail}</p>
      </div>
    </li>
  );
}

export function CheckpointBanner({
  checkpoint,
  index,
  last
}: {
  checkpoint: AgentCheckpoint;
  index: number;
  last: boolean;
}) {
  return (
    <li className='relative flex gap-3'>
      {last ? null : (
        <span className='absolute top-9 bottom-[-12px] left-[15px] w-px bg-gradient-to-b from-amber-500/40 to-amber-500/10' />
      )}
      <span className='relative flex h-9 w-8 shrink-0 items-start justify-center'>
        <span className='flex h-8 w-7 items-center justify-center border border-amber-500/50 bg-gradient-to-b from-amber-500/20 to-amber-500/5 font-serif text-xs text-amber-700 [clip-path:polygon(0_0,100%_0,100%_100%,50%_80%,0_100%)] dark:text-amber-400'>
          {index + 1}
        </span>
      </span>
      <div className='min-w-0 pt-0.5'>
        <div className='text-sm font-medium'>{checkpoint.label}</div>
        <p className='text-muted-foreground text-xs leading-snug'>{checkpoint.detail}</p>
      </div>
    </li>
  );
}

export function LootRow({ output }: { output: AgentOutput }) {
  const Icon = Icons[output.icon];
  return (
    <li className='flex gap-3'>
      <span className='bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md border border-primary/20'>
        <Icon className='size-4' stroke={1.5} />
      </span>
      <div className='min-w-0'>
        <div className='text-sm font-medium'>{output.label}</div>
        <p className='text-muted-foreground text-xs leading-snug'>{output.detail}</p>
      </div>
    </li>
  );
}

export function EmptyNote({ icon, children }: { icon: IconKey; children: ReactNode }) {
  const Icon = Icons[icon];
  return (
    <div className='text-muted-foreground flex items-center gap-2.5 rounded-lg border border-dashed p-3 font-serif text-xs italic'>
      <Icon className='size-4 shrink-0' stroke={1.5} />
      {children}
    </div>
  );
}

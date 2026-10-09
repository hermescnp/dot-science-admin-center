'use client';

import type { ReactNode } from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { architectureNodes } from '../data/architecture-graph';
import {
  executionStateFields,
  orchestrationEntry,
  orchestrationRules,
  type OrchestrationRule,
  type OrchestrationTarget
} from '../data/orchestration';
import { smallCaps } from './agent-sheet-parts';

const nodesById = new Map(architectureNodes.map((node) => [node.id, node]));
const returningSteps = orchestrationRules
  .flatMap((rule) => rule.targets)
  .filter((target) => target.graphNode !== 'presentResults');
const reviewTarget = orchestrationRules
  .flatMap((rule) => rule.targets)
  .find((target) => target.graphNode === 'presentResults');
const fanOutRule = orchestrationRules.find((rule) => rule.parallel);

const teal = {
  text: 'text-[var(--chart-2)]',
  border: 'border-[color-mix(in_oklch,var(--chart-2)_45%,transparent)]',
  fill: 'bg-[color-mix(in_oklch,var(--chart-2)_12%,transparent)]'
};

type SelectAgent = (id: string) => void;

function Connector({ className }: { className?: string }) {
  return (
    <span className={cn('relative flex h-px min-w-6 flex-1 items-center', className)}>
      <span className='h-px w-full bg-gradient-to-r from-[var(--chart-2)]/20 to-[var(--chart-2)]/70' />
      <Icons.chevronRight
        className='absolute -right-1.5 size-3 text-[var(--chart-2)]/80'
        stroke={2}
      />
    </span>
  );
}

function Terminal({ children }: { children: ReactNode }) {
  return (
    <span
      className={cn(
        smallCaps,
        'bg-muted text-muted-foreground shrink-0 rounded-full border px-2.5 py-1 font-mono text-[9px]'
      )}
    >
      {children}
    </span>
  );
}

function StepButton({
  target,
  onSelect,
  loop
}: {
  target: OrchestrationTarget;
  onSelect: SelectAgent;
  loop?: boolean;
}) {
  const node = nodesById.get(target.nodeId);
  return (
    <button
      type='button'
      onClick={() => onSelect(target.nodeId)}
      className={cn(
        'bg-background/50 hover:border-primary/60 flex shrink-0 flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors',
        node?.data.human && 'border-amber-500/40'
      )}
    >
      <span className='flex items-center gap-1.5 font-mono text-xs'>
        {target.graphNode}
        {loop ? <Icons.refresh className='size-3 text-amber-500' stroke={1.75} /> : null}
      </span>
      <span className='text-muted-foreground text-[10px]'>{node?.data.label}</span>
    </button>
  );
}

export function ControlFlow({ onSelect }: { onSelect: SelectAgent }) {
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center gap-3 overflow-x-auto pb-1'>
        <Terminal>START</Terminal>
        <Connector />
        <StepButton target={orchestrationEntry} onSelect={onSelect} />
        <Connector />
        <div className='flex shrink-0 flex-col items-center gap-2 px-2'>
          <span
            className={cn(
              'flex size-14 rotate-45 items-center justify-center rounded-xl border-2 border-[var(--chart-2)] shadow-[0_0_22px_-4px_var(--chart-2)]',
              teal.fill
            )}
          >
            <Icons.sitemap className={cn('size-6 -rotate-45', teal.text)} stroke={1.5} />
          </span>
          <span className='mt-1 font-mono text-xs'>orchestrateRouting</span>
        </div>
        <Connector />
        {reviewTarget ? <StepButton target={reviewTarget} onSelect={onSelect} loop /> : null}
        <Connector />
        <Terminal>END</Terminal>
      </div>
      <div className={cn('rounded-lg border border-dashed p-3', teal.border)}>
        <div className='mb-2 flex items-center gap-2'>
          <Icons.refresh className={cn('size-3.5', teal.text)} stroke={1.75} />
          <span className={cn(smallCaps, teal.text)}>Returns control to orchestrateRouting</span>
        </div>
        <div className='flex flex-wrap gap-1.5'>
          {returningSteps.map((target) => (
            <button
              key={target.nodeId}
              type='button'
              onClick={() => onSelect(target.nodeId)}
              className='bg-background/60 hover:border-primary/60 rounded-md border px-2 py-1 font-mono text-[11px] transition-colors'
            >
              {target.graphNode}
              {target.graphNode === 'executeRoute' ? (
                <span className='text-muted-foreground'>
                  {' '}
                  · {nodesById.get(target.nodeId)?.data.label}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TargetPill({ target, onSelect }: { target: OrchestrationTarget; onSelect: SelectAgent }) {
  const node = nodesById.get(target.nodeId);
  const human = node?.data.human;
  return (
    <button
      type='button'
      onClick={() => onSelect(target.nodeId)}
      className={cn(
        'bg-background/60 flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-left transition-colors',
        human
          ? 'border-amber-500/50 hover:border-amber-500'
          : cn(teal.border, 'hover:border-[var(--chart-2)]')
      )}
    >
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
          human ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : cn(teal.fill, teal.text)
        )}
      >
        {node?.data.step}
      </span>
      <span className='font-mono text-[11px]'>{target.graphNode}</span>
      {target.graphNode === 'executeRoute' ? (
        <span className='text-muted-foreground text-[10px]'>{node?.data.label}</span>
      ) : null}
      {human ? <Icons.flag className='size-3 text-amber-500' stroke={1.75} /> : null}
    </button>
  );
}

function RuleRow({
  rule,
  index,
  onSelect
}: {
  rule: OrchestrationRule;
  index: number;
  onSelect: SelectAgent;
}) {
  const ends = rule.targets.length === 0;
  return (
    <li className='grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 gap-y-2 py-3 sm:grid-cols-[28px_minmax(0,1fr)_minmax(0,auto)]'>
      <span
        className={cn(
          'mt-0.5 flex size-6 rotate-45 items-center justify-center rounded-[5px] border',
          ends ? 'border-border bg-muted' : cn(teal.border, teal.fill)
        )}
      >
        <span
          className={cn(
            '-rotate-45 text-[10px] font-semibold',
            ends ? 'text-muted-foreground' : teal.text
          )}
        >
          {index + 1}
        </span>
      </span>
      <div className='min-w-0'>
        <code className='bg-muted/70 rounded px-1.5 py-0.5 font-mono text-[11px] break-words'>
          {rule.condition}
        </code>
        {rule.note ? (
          <p className='text-muted-foreground mt-1.5 text-[11px] leading-snug'>{rule.note}</p>
        ) : null}
      </div>
      <div className='col-start-2 flex flex-col items-start gap-1.5 sm:col-start-3 sm:items-end'>
        <div className='flex flex-wrap items-center gap-1.5 sm:justify-end'>
          <Icons.arrowRight className='text-muted-foreground size-3.5' stroke={1.5} />
          {ends ? (
            <Terminal>END</Terminal>
          ) : (
            rule.targets.map((target) => (
              <TargetPill key={target.nodeId} target={target} onSelect={onSelect} />
            ))
          )}
        </div>
        <span className='text-muted-foreground font-mono text-[10px]'>
          phase: <span className='text-foreground/70'>{rule.phase}</span>
          {rule.parallel ? <span className={teal.text}> · parallel</span> : null}
        </span>
      </div>
    </li>
  );
}

export function RoutingRules({ onSelect }: { onSelect: SelectAgent }) {
  return (
    <ol className='divide-border/60 divide-y'>
      {orchestrationRules.map((rule, index) => (
        <RuleRow key={`${rule.next}-${index}`} rule={rule} index={index} onSelect={onSelect} />
      ))}
    </ol>
  );
}

export function FanOut({ onSelect }: { onSelect: SelectAgent }) {
  if (!fanOutRule) return null;
  return (
    <div>
      <div className='flex items-center gap-3'>
        <span
          className={cn(
            'flex size-9 shrink-0 rotate-45 items-center justify-center rounded-lg border-2 border-[var(--chart-2)]',
            teal.fill
          )}
        >
          <Icons.sitemap className={cn('size-4 -rotate-45', teal.text)} stroke={1.75} />
        </span>
        <div className='min-w-0'>
          <div className='font-mono text-xs'>Send(&quot;executeRoute&quot;)</div>
          <div className='text-muted-foreground text-[11px]'>One per approved task</div>
        </div>
      </div>
      <ul className={cn('mt-3 ml-[17px] flex flex-col gap-2.5 border-l pl-5', teal.border)}>
        {fanOutRule.targets.map((target) => {
          const node = nodesById.get(target.nodeId);
          return (
            <li key={target.nodeId} className='relative'>
              <span className={cn('absolute top-1/2 -left-5 h-px w-4', 'bg-[var(--chart-2)]/50')} />
              <button
                type='button'
                onClick={() => onSelect(target.nodeId)}
                className={cn(
                  'bg-background/50 flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:border-[var(--chart-2)]',
                  teal.border
                )}
              >
                <span className='min-w-0 flex-1'>
                  <span className='text-muted-foreground block font-mono text-[10px]'>
                    {target.when.replace('Send · ', 'intent: ')}
                  </span>
                  <span className='block text-xs font-medium'>{node?.data.label}</span>
                </span>
                <Icons.chevronRight className='text-muted-foreground size-3.5' stroke={1.5} />
              </button>
            </li>
          );
        })}
      </ul>
      <p className='text-muted-foreground mt-3 flex items-center gap-1.5 text-[11px]'>
        <Icons.refresh className='size-3' stroke={1.75} />
        Results merge into <code className='font-mono'>routeResults</code>, then back to
        orchestrateRouting
      </p>
      <div className='mt-4 border-t pt-3'>
        <div className={cn(smallCaps, 'text-muted-foreground mb-2')}>State each Send carries</div>
        <div className='flex flex-wrap gap-1'>
          {executionStateFields.map((field, index) => (
            <span
              key={field}
              className={cn(
                'rounded border px-1.5 py-0.5 font-mono text-[10px]',
                index < 2 ? cn(teal.border, teal.text) : 'text-muted-foreground'
              )}
            >
              {field}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

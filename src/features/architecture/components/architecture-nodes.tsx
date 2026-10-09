'use client';

import { Handle, Position, type HandleType, type Node, type NodeProps } from '@xyflow/react';
import { use, useRef, useState, type CSSProperties } from 'react';
import { Icons } from '@/components/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ServiceHealthState } from '../api/types';
import {
  APP_NODE_WIDTH,
  serviceNodeWidth,
  pinTones,
  usedProductIds,
  type ArchitectureNodeData,
  type ArchitectureOutput,
  type PinTone,
  type ServiceProduct
} from '../data/architecture-graph';
import { BrandLogo } from './brand-logo';
import { FittedPreview } from './fitted-preview';
import { ServiceHealthContext } from './service-health-context';

type ArchitectureFlowNode = Node<ArchitectureNodeData>;

const pinToneClassNames: Record<PinTone, string> = {
  primary: 'bg-primary!',
  orchestration: 'bg-[var(--chart-2)]!',
  muted: 'bg-muted-foreground!'
};

function Pin({
  nodeId,
  id,
  type,
  position,
  style
}: {
  nodeId: string;
  id: string;
  type: HandleType;
  position: Position;
  style?: CSSProperties;
}) {
  const tone = pinTones.get(`${nodeId}:${id}`);
  return (
    <Handle
      id={id}
      type={type}
      position={position}
      style={style}
      className={cn(
        'pointer-events-none! size-2! border-0!',
        tone ? pinToneClassNames[tone] : 'opacity-0!'
      )}
    />
  );
}

function TruncatedLabel({ label }: { label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <Tooltip
      open={open}
      onOpenChange={(nextOpen) => {
        const element = ref.current;
        setOpen(nextOpen && element !== null && element.scrollWidth > element.clientWidth);
      }}
    >
      <TooltipTrigger render={<span ref={ref} className='truncate' />}>{label}</TooltipTrigger>
      <TooltipContent side='bottom'>{label}</TooltipContent>
    </Tooltip>
  );
}

function OutputColumn({
  nodeId,
  outputs,
  side
}: {
  nodeId: string;
  outputs: ArchitectureOutput[];
  side: 'left' | 'right';
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col justify-center',
        side === 'left' ? '-ml-3' : '-mr-3'
      )}
    >
      {outputs.map((output) => (
        <div
          key={output.id}
          className={cn(
            'text-muted-foreground relative flex h-6 items-center text-xs',
            side === 'left' ? 'justify-start pl-4' : 'justify-end pr-4'
          )}
        >
          <span className='truncate'>{output.label}</span>
          <Pin
            nodeId={nodeId}
            id={output.id}
            type='source'
            position={side === 'left' ? Position.Left : Position.Right}
          />
        </div>
      ))}
    </div>
  );
}

export function AppNode({ id, data, selected }: NodeProps<ArchitectureFlowNode>) {
  const showPreview = Boolean(data.url) && !data.planned;
  const outputs = data.outputs ?? [];
  const leftOutputs = outputs.filter((output) => output.side === 'left');
  const rightOutputs = outputs.filter((output) => output.side === 'right');
  const bottomOutputs = outputs.filter((output) => output.side === 'bottom');

  return (
    <div
      style={{ width: APP_NODE_WIDTH }}
      className={cn(
        'bg-card/90 text-card-foreground relative cursor-pointer rounded-xl border p-3 shadow-sm backdrop-blur-sm transition-colors',
        selected ? 'border-primary' : 'border-border',
        data.planned && 'border-dashed opacity-60'
      )}
    >
      <Pin nodeId={id} id='top' type='target' position={Position.Top} />
      <div className='flex items-center gap-3'>
        {data.logo ? <BrandLogo logo={data.logo} logoDark={data.logoDark} size={36} /> : null}
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            {data.logo ? null : (
              <span
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  data.planned ? 'bg-muted-foreground' : 'bg-primary'
                )}
              />
            )}
            <span className='truncate text-sm font-semibold'>{data.label}</span>
          </div>
          <p className='text-muted-foreground mt-1 text-xs leading-snug'>{data.description}</p>
          {data.url ? (
            <p className='text-muted-foreground/80 mt-0.5 truncate font-mono text-[11px]'>
              {new URL(data.url).host}
            </p>
          ) : null}
        </div>
        {data.url ? (
          <a
            href={data.url}
            target='_blank'
            rel='noopener noreferrer'
            aria-label={`Open ${data.label} website`}
            title={data.url}
            onClick={(event) => event.stopPropagation()}
            className='nodrag text-muted-foreground hover:bg-accent/50 hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors'
          >
            <Icons.externalLink className='size-4' stroke={1.5} />
          </a>
        ) : null}
      </div>
      {showPreview || leftOutputs.length || rightOutputs.length ? (
        <div className='mt-3 flex gap-3'>
          {leftOutputs.length ? (
            <OutputColumn nodeId={id} outputs={leftOutputs} side='left' />
          ) : (
            <div className='flex-1' />
          )}
          {showPreview && data.url ? (
            <FittedPreview
              url={data.url}
              title={`${data.label} website preview`}
              className='border-border/60 h-[200px] w-[320px] shrink-0'
            />
          ) : null}
          {rightOutputs.length ? (
            <OutputColumn nodeId={id} outputs={rightOutputs} side='right' />
          ) : (
            <div className='flex-1' />
          )}
        </div>
      ) : null}
      {bottomOutputs.length ? (
        <div className='-mb-3 mt-3 flex justify-center gap-x-5'>
          {bottomOutputs.map((output) => (
            <div
              key={output.id}
              className={cn(
                'relative flex max-w-max min-w-0 flex-1 items-center pb-3 text-xs',
                output.kind === 'platform' ? 'text-primary font-medium' : 'text-muted-foreground'
              )}
            >
              <TruncatedLabel label={output.label} />
              <Pin nodeId={id} id={output.id} type='source' position={Position.Bottom} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AgentNode({ id, data, selected }: NodeProps<ArchitectureFlowNode>) {
  return (
    <div
      className={cn(
        'bg-card/90 text-card-foreground hover:border-primary w-[260px] cursor-pointer rounded-lg border border-dashed p-2.5 backdrop-blur-sm transition-colors',
        selected ? 'border-primary' : 'border-primary/50'
      )}
    >
      <Pin nodeId={id} id='left' type='target' position={Position.Left} />
      <div className='flex items-center gap-2'>
        <div className='bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-md'>
          <Icons.robot className='size-3.5' stroke={1.75} />
        </div>
        <span className='truncate text-sm font-semibold'>{data.label}</span>
        {data.badge ? (
          <span className='bg-primary/15 text-primary ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium'>
            {data.badge}
          </span>
        ) : null}
      </div>
      <p className='text-muted-foreground mt-1.5 line-clamp-2 text-xs leading-snug'>
        {data.description}
      </p>
      {data.stack ? (
        <p className='text-muted-foreground/80 mt-1 truncate font-mono text-[10px]'>{data.stack}</p>
      ) : null}
      <Pin
        nodeId={id}
        id='src-left'
        type='source'
        position={Position.Left}
        style={{ top: '75%' }}
      />
      <Pin nodeId={id} id='src-bottom' type='source' position={Position.Bottom} />
    </div>
  );
}

export function OrchestratorNode({ id, data, selected }: NodeProps<ArchitectureFlowNode>) {
  return (
    <div
      className={cn(
        'bg-card/95 text-card-foreground w-[340px] cursor-pointer rounded-xl border py-3 pl-3 backdrop-blur-sm transition-colors',
        selected
          ? 'border-[var(--chart-2)]'
          : 'border-[color-mix(in_oklch,var(--chart-2)_55%,transparent)]',
        'hover:border-[var(--chart-2)]'
      )}
    >
      <Pin nodeId={id} id='left' type='target' position={Position.Left} />
      <div className='flex items-center gap-2.5 pr-3'>
        <div className='flex size-8 shrink-0 rotate-45 items-center justify-center rounded-md border border-[var(--chart-2)] bg-[color-mix(in_oklch,var(--chart-2)_15%,transparent)]'>
          <Icons.sitemap className='size-4 -rotate-45 text-[var(--chart-2)]' stroke={1.75} />
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <span className='truncate text-sm font-semibold'>{data.label}</span>
            {data.badge ? (
              <span className='ml-auto shrink-0 rounded bg-[color-mix(in_oklch,var(--chart-2)_18%,transparent)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--chart-2)]'>
                {data.badge}
              </span>
            ) : null}
          </div>
          {data.stack ? (
            <p className='text-muted-foreground/80 truncate font-mono text-[10px]'>{data.stack}</p>
          ) : null}
        </div>
      </div>
      <p className='text-muted-foreground mt-2 pr-3 text-xs leading-snug'>{data.description}</p>
      <div className='text-muted-foreground mt-3 mb-1 flex items-center gap-2 pr-3 text-[10px] font-medium tracking-[0.15em] uppercase'>
        Routes · first match wins
        <span className='bg-border h-px flex-1' />
      </div>
      <div className='flex flex-col'>
        {data.outputs?.map((output) => (
          <div
            key={output.id}
            className={cn(
              'relative flex h-[26px] items-center gap-2 pr-4 text-[11px]',
              output.side === 'left' && '-ml-3 pl-3'
            )}
          >
            <span
              className={cn(
                'size-1.5 shrink-0 rotate-45',
                output.kind === 'orchestration'
                  ? output.human
                    ? 'bg-amber-500'
                    : 'bg-[var(--chart-2)]'
                  : 'bg-muted-foreground'
              )}
            />
            <span className='truncate font-mono'>{output.label}</span>
            {output.detail ? (
              <span className='text-muted-foreground ml-auto truncate font-mono text-[10px]'>
                {output.detail}
              </span>
            ) : null}
            <Pin
              nodeId={id}
              id={output.id}
              type='source'
              position={output.side === 'left' ? Position.Left : Position.Right}
            />
          </div>
        ))}
      </div>
      <p className='text-muted-foreground mt-2 flex items-center gap-1.5 pr-3 text-[10px]'>
        <Icons.refresh className='size-3' stroke={1.75} />
        Every step returns here, except presentResults, which ends the run
      </p>
    </div>
  );
}

export function SubAgentNode({ id, data, selected }: NodeProps<ArchitectureFlowNode>) {
  return (
    <div
      className={cn(
        'bg-card/90 text-card-foreground hover:border-primary/70 w-[250px] cursor-pointer rounded-lg border px-2.5 py-2 backdrop-blur-sm transition-colors',
        selected ? 'border-primary' : data.human ? 'border-amber-500/50' : 'border-border'
      )}
    >
      <Pin nodeId={id} id='left' type='target' position={Position.Left} />
      <div className='flex items-center gap-2'>
        <span className='bg-primary/15 text-primary flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold'>
          {data.step}
        </span>
        <span className='truncate text-xs font-semibold'>{data.label}</span>
        {data.human ? (
          <span className='ml-auto flex shrink-0 items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400'>
            <Icons.user className='size-3' stroke={1.75} />
            Human
          </span>
        ) : null}
      </div>
      <p className='text-muted-foreground mt-1 line-clamp-2 text-[11px] leading-snug'>
        {data.description}
      </p>
      <Pin
        nodeId={id}
        id='src-left'
        type='source'
        position={Position.Left}
        style={{ top: '75%' }}
      />
      <Pin nodeId={id} id='src-bottom' type='source' position={Position.Bottom} />
    </div>
  );
}

function ServiceLogo({ logo, logoDark }: { logo: string; logoDark?: string }) {
  return (
    <div className='border-border/60 bg-background/60 flex size-8 shrink-0 items-center justify-center rounded-md border'>
      <BrandLogo logo={logo} logoDark={logoDark} size={18} />
    </div>
  );
}

const healthLabels: Record<ServiceHealthState, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
  unconfigured: 'Not configured'
};

const healthDotClassNames: Record<ServiceHealthState, string> = {
  operational: 'bg-emerald-500 shadow-[0_0_6px_var(--color-emerald-500)]',
  degraded: 'bg-amber-500 shadow-[0_0_6px_var(--color-amber-500)]',
  down: 'bg-red-500 shadow-[0_0_6px_var(--color-red-500)]',
  unconfigured: 'border-muted-foreground border bg-transparent'
};

function formatCheckedAgo(checkedAt: string) {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(checkedAt)) / 1000));
  return seconds < 60 ? `${seconds}s ago` : `${Math.round(seconds / 60)}m ago`;
}

function ServiceHealthLight({ serviceId }: { serviceId: string }) {
  const { services, error } = use(ServiceHealthContext);
  const health = services?.get(serviceId);

  let dotClassName = 'bg-muted-foreground animate-pulse';
  let summary = error ? 'Health check unavailable' : 'Checking…';
  if (health) {
    dotClassName = healthDotClassNames[health.state];
    summary = [
      healthLabels[health.state],
      health.latencyMs !== null ? `${health.latencyMs} ms` : null,
      health.message
    ]
      .filter(Boolean)
      .join(' · ');
  } else if (error) {
    dotClassName = 'bg-muted-foreground';
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            role='status'
            aria-label={summary}
            className='nodrag ml-auto flex size-5 shrink-0 items-center justify-center'
          />
        }
      >
        <span className={cn('size-2 rounded-full', dotClassName)} />
      </TooltipTrigger>
      <TooltipContent side='top'>
        {health ? <HealthTooltipText summary={summary} checkedAt={health.checkedAt} /> : summary}
      </TooltipContent>
    </Tooltip>
  );
}

// Only mounts while the tooltip is open (client-side), so reading the clock can't cause a hydration mismatch.
function HealthTooltipText({ summary, checkedAt }: { summary: string; checkedAt: string }) {
  return (
    <>
      {summary} · checked {formatCheckedAgo(checkedAt)}
    </>
  );
}

function ProductRows({ nodeId, products }: { nodeId: string; products: ServiceProduct[] }) {
  return (
    <div className='-mr-3 mt-2 border-t pt-1.5'>
      {products.map((product) => {
        const used = usedProductIds.has(`${nodeId}#${product.id}`);
        return (
          <div
            key={product.id}
            className={cn(
              'relative flex h-6 items-center justify-end gap-2 pr-4 text-xs',
              used ? 'text-foreground' : 'text-muted-foreground opacity-40'
            )}
          >
            <span className='truncate'>{product.label}</span>
            <Pin
              nodeId={nodeId}
              id={`product-${product.id}`}
              type='target'
              position={Position.Right}
            />
          </div>
        );
      })}
    </div>
  );
}

function OwnedItems({ products }: { products: ServiceProduct[] }) {
  return (
    <div className='mt-2 flex flex-wrap gap-1.5 border-t pt-2'>
      {products.map((product) => (
        <span
          key={product.id}
          className='bg-background rounded-md border px-1.5 py-0.5 font-mono text-[11px]'
        >
          {product.label}
        </span>
      ))}
    </div>
  );
}

function ProductChips({ nodeId, products }: { nodeId: string; products: ServiceProduct[] }) {
  return (
    <div className='-mx-3 -mt-3 mb-2 flex justify-around border-b px-2'>
      {products.map((product) => {
        const used = usedProductIds.has(`${nodeId}#${product.id}`);
        return (
          <div
            key={product.id}
            className={cn(
              'relative flex items-center gap-1 pt-2 pb-1.5 text-[11px] whitespace-nowrap',
              used ? 'text-foreground' : 'text-muted-foreground opacity-40'
            )}
          >
            {product.label}
            <Pin
              nodeId={nodeId}
              id={`product-${product.id}`}
              type='target'
              position={Position.Top}
            />
          </div>
        );
      })}
    </div>
  );
}

export function ServiceNode({ id, data, selected }: NodeProps<ArchitectureFlowNode>) {
  const products = data.products ?? [];
  const isAddOn = data.layer === 'addon';
  const isOperations = data.layer === 'operations';

  return (
    <div
      style={{ width: serviceNodeWidth(data) }}
      className={cn(
        'bg-muted/80 text-foreground cursor-pointer rounded-lg border p-3 backdrop-blur-sm transition-colors',
        selected ? 'border-primary' : 'border-border'
      )}
    >
      <Pin nodeId={id} id='right' type='target' position={Position.Right} />
      <Pin nodeId={id} id='top' type='target' position={Position.Top} />
      {isAddOn && products.length ? <ProductChips nodeId={id} products={products} /> : null}
      <div className='flex items-center gap-2.5'>
        {data.logo ? <ServiceLogo logo={data.logo} logoDark={data.logoDark} /> : null}
        <span className='truncate text-sm font-semibold'>{data.label}</span>
        {data.via ? (
          <span className='text-muted-foreground ml-auto shrink-0 text-[11px]'>via gateway</span>
        ) : isOperations ? null : (
          <ServiceHealthLight serviceId={id} />
        )}
      </div>
      <p className='text-muted-foreground mt-2 line-clamp-2 text-xs leading-snug'>
        {data.description}
      </p>
      {isOperations && products.length ? <OwnedItems products={products} /> : null}
      {data.layer === 'core' && products.length ? (
        <ProductRows nodeId={id} products={products} />
      ) : null}
      <Pin nodeId={id} id='src-left' type='source' position={Position.Left} />
      <Pin nodeId={id} id='src-bottom' type='source' position={Position.Bottom} />
    </div>
  );
}

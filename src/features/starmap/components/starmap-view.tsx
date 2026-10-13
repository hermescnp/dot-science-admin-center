'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { useMemo, useState } from 'react';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';
import { starmapQueryOptions } from '../api/queries';
import type { StarmapGraph, StarmapMemoryCard, StarmapNode } from '../api/types';
import { StarMap } from './star-map';

const SYNC_COMMAND = 'python scripts/push_starmap_snapshot.py';

export function StarmapView() {
  const { data } = useSuspenseQuery(starmapQueryOptions());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!data.snapshot) return <StarmapEmpty />;

  const { graph, createdAt, profile, demo } = data.snapshot;

  return (
    <div className='relative flex h-[calc(100svh-4rem)] w-full overflow-hidden md:h-[calc(100svh-3.5rem)]'>
      <StarMap graph={graph} onSelectNode={setSelectedId} />
      <div className='pointer-events-none absolute top-16 right-3 bottom-3 flex w-[min(20rem,calc(100%-1.5rem))] flex-col gap-3 *:pointer-events-auto'>
        <Card className='bg-card/85 shrink-0 gap-3 backdrop-blur'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              Snapshot
              {demo && <Badge variant='outline'>Demo data</Badge>}
            </CardTitle>
            <CardDescription>
              {demo ? (
                <>
                  Example graph. Run{' '}
                  <code className='bg-muted rounded px-1 font-mono text-xs'>{SYNC_COMMAND}</code>{' '}
                  from hermes-agent to replace it with real data.
                </>
              ) : (
                <>
                  Synced{' '}
                  {formatDistanceToNow(new Date(createdAt), {
                    addSuffix: true
                  })}{' '}
                  from profile <span className='text-foreground font-medium'>{profile}</span>
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className='grid grid-cols-3 gap-2 text-center'>
            <Stat label='Skills' value={graph.nodes.filter((n) => n.kind === 'skill').length} />
            <Stat label='Memories' value={graph.memory.length} />
            <Stat label='Links' value={graph.edges.length} />
          </CardContent>
        </Card>
        <NodeDetails graph={graph} nodeId={selectedId} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className='bg-muted/50 rounded-md py-2'>
      <div className='text-lg font-semibold tabular-nums'>{value}</div>
      <div className='text-muted-foreground text-xs'>{label}</div>
    </div>
  );
}

/** Node ids for memories are `memory:<source>:<index>[:<fingerprint>]`, indexing into `graph.memory`. */
function findMemoryCard(graph: StarmapGraph, node: StarmapNode): StarmapMemoryCard | null {
  const index = Number(node.id.split(':')[2]);
  const card = Number.isInteger(index) ? graph.memory[index] : undefined;
  return card ?? null;
}

function NodeDetails({ graph, nodeId }: { graph: StarmapGraph; nodeId: string | null }) {
  const node = useMemo(
    () => (nodeId ? (graph.nodes.find((n) => n.id === nodeId) ?? null) : null),
    [graph.nodes, nodeId]
  );
  const related = useMemo(() => {
    if (!node) return [];
    const ids = new Set<string>();
    for (const edge of graph.edges) {
      if (edge.source === node.id) ids.add(edge.target);
      if (edge.target === node.id) ids.add(edge.source);
    }
    return graph.nodes.filter((n) => ids.has(n.id));
  }, [graph, node]);

  if (!node) {
    return (
      <Card className='bg-card/85 backdrop-blur'>
        <CardContent className='text-muted-foreground text-center text-sm'>
          Select a star to see its details. Drag to pan, scroll to zoom, double-click to reset.
        </CardContent>
      </Card>
    );
  }

  const memory = node.kind === 'memory' ? findMemoryCard(graph, node) : null;

  return (
    <Card className='bg-card/85 min-h-0 gap-3 backdrop-blur'>
      <CardHeader>
        <div className='flex flex-wrap gap-1.5'>
          <Badge variant='secondary'>{node.kind}</Badge>
          {node.kind === 'skill' && <Badge variant='outline'>{node.category}</Badge>}
          {node.pinned && <Badge variant='outline'>pinned</Badge>}
        </div>
        <CardTitle className='text-base leading-snug'>{memory?.title ?? node.label}</CardTitle>
        <CardDescription className='flex flex-wrap gap-x-3 gap-y-1'>
          {node.timestamp ? <span>{format(new Date(node.timestamp * 1000), 'PP')}</span> : null}
          {node.kind === 'skill' && <span>Used {node.useCount}×</span>}
          {node.createdBy && <span>Created by {node.createdBy}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className='min-h-0'>
        <ScrollArea className='max-h-72'>
          {memory?.body ? (
            <p className='text-muted-foreground text-sm whitespace-pre-wrap'>{memory.body}</p>
          ) : null}
          {related.length > 0 && (
            <div className='mt-3 space-y-1.5'>
              <div className='text-muted-foreground text-xs font-medium uppercase'>Connected</div>
              <div className='flex flex-wrap gap-1.5'>
                {related.map((n) => (
                  <Badge key={n.id} variant='outline' className='max-w-full truncate'>
                    {n.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function StarmapEmpty() {
  return (
    <Card className='m-4 md:mx-6'>
      <Empty className='min-h-[420px]'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <Icons.stars />
          </EmptyMedia>
          <EmptyTitle>No Star Map snapshot yet</EmptyTitle>
          <EmptyDescription>
            Push Hermes Agent&apos;s learning graph from the machine running Hermes. Set
            SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY there, then run this from the hermes-agent
            folder:
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <code className='bg-muted rounded-md px-3 py-1.5 font-mono text-xs'>{SYNC_COMMAND}</code>
        </EmptyContent>
      </Empty>
    </Card>
  );
}

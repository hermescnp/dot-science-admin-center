'use client';

import '@xyflow/react/dist/style.css';

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  PanOnScrollMode,
  SelectionMode,
  Panel,
  ReactFlow,
  useNodesState,
  type Edge,
  type Node,
  type NodeTypes
} from '@xyflow/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { architectureGraphQueryOptions, serviceHealthQueryOptions } from '../api/queries';
import { saveArchitectureGraph } from '../api/service';
import type { ArchitectureGraphSnapshot } from '../api/types';
import type {
  ArchitectureEdge,
  ArchitectureEdgeKind,
  ArchitectureNode,
  ArchitectureNodeData,
  ArchitectureNodeKind
} from '../data/architecture-graph';
import { resolveArchitectureGraph } from '../data/graph-snapshot';
import { AgentProfileDialog } from './agent-profile-dialog';
import {
  AgentNode,
  AppNode,
  OrchestratorNode,
  ServiceNode,
  SubAgentNode
} from './architecture-nodes';
import { ModelPricingDialog } from './model-pricing-dialog';
import { PlatformDetailDialog } from './platform-detail-dialog';
import { ServiceHealthContext } from './service-health-context';
import { ServicePlansDialog } from './service-plans-dialog';

const nodeTypes: NodeTypes = {
  app: AppNode,
  agent: AgentNode,
  orchestrator: OrchestratorNode,
  subagent: SubAgentNode,
  service: ServiceNode
};

const edgeStyles: Record<
  ArchitectureEdgeKind,
  { label: string; color: string; width: number; opacity: number; dash?: string; animated: boolean }
> = {
  platform: {
    label: 'Platform link',
    color: 'var(--primary)',
    width: 1.5,
    opacity: 0.9,
    animated: true
  },
  orchestration: {
    label: 'Orchestrator delegates',
    color: 'var(--chart-2)',
    width: 1.5,
    opacity: 0.85,
    dash: '4 3',
    animated: true
  },
  service: {
    label: 'Uses service',
    color: 'var(--muted-foreground)',
    width: 1,
    opacity: 0.55,
    animated: false
  }
};

const SAVE_DELAY_MS = 600;

function toFlowNode(node: ArchitectureNode): Node<ArchitectureNodeData> {
  return { id: node.id, type: node.kind, position: node.position, data: node.data };
}

function toArchitectureNode(node: Node<ArchitectureNodeData>): ArchitectureNode {
  return {
    id: node.id,
    kind: node.type as ArchitectureNodeKind,
    position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
    data: node.data
  };
}

// Focused links sit above every node; only the focused node and its neighbours sit above them.
const FOCUSED_EDGE_Z_INDEX = 1000;
const FOCUSED_NODE_Z_INDEX = 1001;

const PAN_KEYS = ['Meta', 'Control'];

function toFlowEdge(edge: ArchitectureEdge, focusIds: Set<string> | null): Edge {
  const style = edgeStyles[edge.kind];
  const focused = focusIds !== null && (focusIds.has(edge.source) || focusIds.has(edge.target));
  const dimmed = focusIds !== null && !focused;
  const opacity = edge.planned ? 0.5 : style.opacity;
  return {
    id: [edge.source, edge.sourceHandle, edge.target, edge.targetHandle].join('-'),
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle,
    animated: style.animated && !edge.planned,
    selectable: false,
    zIndex: focused ? FOCUSED_EDGE_Z_INDEX : 0,
    style: {
      stroke: style.color,
      strokeWidth: focused ? style.width + 0.75 : style.width,
      strokeDasharray: edge.planned ? '6 4' : style.dash,
      opacity: dimmed ? 0.08 : focused ? 1 : opacity,
      transition: 'opacity 150ms'
    }
  };
}

function neighbourIds(edges: ArchitectureEdge[], focusIds: Set<string>) {
  const ids = new Set(focusIds);
  for (const edge of edges) {
    if (focusIds.has(edge.source)) ids.add(edge.target);
    if (focusIds.has(edge.target)) ids.add(edge.source);
  }
  return ids;
}

function LegendPin({ className }: { className: string }) {
  return <span className={cn('absolute size-1.5 rounded-full', className)} />;
}

function NodeSidesLegend() {
  return (
    <div className='mt-2 border-t pt-2'>
      <p className='text-foreground mb-1.5 font-medium'>Connection sides</p>
      <div className='grid grid-cols-[auto_auto_auto] items-center gap-x-2 gap-y-1 text-[10px] leading-tight'>
        <span />
        <span className='text-center'>
          <span className='text-primary'>Platform</span>
          <br />
          shared packages
        </span>
        <span />
        <span className='text-right'>
          Core
          <br />
          services
        </span>
        <div className='bg-muted/60 relative mx-auto h-9 w-14 rounded border'>
          <LegendPin className='bg-primary top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' />
          <LegendPin className='bg-muted-foreground top-1/2 left-0 -translate-x-1/2 -translate-y-1/2' />
          <LegendPin className='bg-primary top-1/2 right-0 translate-x-1/2 -translate-y-1/2' />
          <LegendPin className='bg-muted-foreground bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' />
        </div>
        <span>
          <span className='text-primary'>AI</span>
          <br />
          <span className='text-primary'>agents</span>
        </span>
        <span />
        <span className='text-center'>
          Add-on services
          <br />
          and models
        </span>
        <span />
      </div>
    </div>
  );
}

function SaveStatus({ canSave, status }: { canSave: boolean; status: string }) {
  if (!canSave) {
    return (
      <span className='flex items-center gap-1.5 text-amber-600 dark:text-amber-400'>
        <Icons.warning className='size-3.5' stroke={1.75} />
        Saved layout unavailable; changes won't be saved
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className='flex items-center gap-1.5'>
        <Icons.spinner className='size-3.5 animate-spin' stroke={1.75} />
        Saving…
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className='text-destructive flex items-center gap-1.5'>
        <Icons.warning className='size-3.5' stroke={1.75} />
        Couldn't save the layout
      </span>
    );
  }
  if (status === 'success') {
    return (
      <span className='flex items-center gap-1.5'>
        <Icons.check className='size-3.5' stroke={1.75} />
        Layout saved
      </span>
    );
  }
  return <span>Moving a node saves the layout</span>;
}

export function ArchitectureCanvas() {
  const { data, isPending, isError } = useQuery(architectureGraphQueryOptions());
  const graph = useMemo(
    () => (isPending ? null : resolveArchitectureGraph(data?.graph ?? null)),
    [isPending, data]
  );

  if (!graph) {
    return (
      <div className='text-muted-foreground flex min-h-[400px] w-full flex-1 items-center justify-center gap-2 text-sm'>
        <Icons.spinner className='size-4 animate-spin' stroke={1.75} />
        Loading architecture…
      </div>
    );
  }
  // A failed load must not overwrite the saved graph with the code layout.
  return <ArchitectureFlow graph={graph} canSave={!isError} />;
}

function ArchitectureFlow({
  graph,
  canSave
}: {
  graph: ArchitectureGraphSnapshot;
  canSave: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const [initialNodes] = useState(() => graph.nodes.map(toFlowNode));
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(saveTimer.current), []);
  const save = useMutation({ mutationFn: saveArchitectureGraph });

  function scheduleSave() {
    if (!canSave) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      save.mutate({
        nodes: nodesRef.current.map(toArchitectureNode),
        edges: graph.edges,
        seedHash: graph.seedHash
      });
    }, SAVE_DELAY_MS);
  }

  // The server can't know the theme; React Flow's root class must match it on hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [selectedPlatform, setSelectedPlatform] = useState<{ id: string; open: boolean } | null>(
    null
  );
  const [selectedService, setSelectedService] = useState<{ id: string; open: boolean } | null>(
    null
  );
  const [selectedAgent, setSelectedAgent] = useState<{ id: string; open: boolean } | null>(null);
  const selectionKey = nodes
    .filter((node) => node.selected)
    .map((node) => node.id)
    .join(',');
  const focusIds = useMemo(
    () => (selectionKey ? new Set(selectionKey.split(',')) : null),
    [selectionKey]
  );
  const flowNodes = useMemo(() => {
    const neighbours = focusIds ? neighbourIds(graph.edges, focusIds) : null;
    return nodes.map((node) => {
      const inFocus = neighbours?.has(node.id) ?? false;
      return {
        ...node,
        zIndex: inFocus ? FOCUSED_NODE_Z_INDEX : 0,
        className: cn('transition-opacity duration-150', neighbours && !inFocus && 'opacity-25')
      };
    });
  }, [nodes, focusIds, graph.edges]);
  const flowEdges = useMemo(
    () => graph.edges.map((edge) => toFlowEdge(edge, focusIds)),
    [graph.edges, focusIds]
  );

  function openDetails(node: Node) {
    if (node.type === 'app') setSelectedPlatform({ id: node.id, open: true });
    if (node.type === 'agent' || node.type === 'orchestrator' || node.type === 'subagent') {
      setSelectedAgent({ id: node.id, open: true });
    }
    if (node.type === 'service') setSelectedService({ id: node.id, open: true });
  }
  const { data: health, isError } = useQuery(serviceHealthQueryOptions());
  const healthContext = useMemo(
    () => ({
      services: health ? new Map(health.services.map((service) => [service.id, service])) : null,
      error: isError
    }),
    [health, isError]
  );

  return (
    <ServiceHealthContext value={healthContext}>
      <div className='min-h-[400px] w-full flex-1 overflow-hidden'>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStop={scheduleSave}
          onNodeClick={(event, node) => {
            // nodesRef still holds the selection from before this click.
            const wasSelected = nodesRef.current.some(
              (item) => item.id === node.id && item.selected
            );
            if (wasSelected && !event.shiftKey) openDetails(node);
          }}
          selectNodesOnDrag={false}
          selectionOnDrag
          selectionMode={SelectionMode.Partial}
          selectionKeyCode={null}
          multiSelectionKeyCode='Shift'
          panOnDrag={false}
          panActivationKeyCode={PAN_KEYS}
          deleteKeyCode={null}
          colorMode={mounted && resolvedTheme === 'dark' ? 'dark' : 'light'}
          nodesConnectable={false}
          panOnScroll
          panOnScrollMode={PanOnScrollMode.Free}
          zoomOnScroll={false}
          zoomOnPinch
          minZoom={0.2}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
          style={{ '--xy-background-color': 'transparent' } as React.CSSProperties}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            bgColor='var(--card)'
            maskColor='color-mix(in oklch, var(--background) 60%, transparent)'
            nodeColor={(node) =>
              node.type === 'service' ? 'var(--muted-foreground)' : 'var(--primary)'
            }
            nodeBorderRadius={6}
          />
          <Panel
            position='top-left'
            className='bg-card/90 text-muted-foreground space-y-1.5 rounded-lg border px-3 py-2 text-[11px] backdrop-blur-sm'
          >
            {Object.values(edgeStyles).map((style) => (
              <div key={style.label} className='flex items-center gap-2'>
                <svg width='28' height='6' aria-hidden>
                  <line
                    x1='0'
                    y1='3'
                    x2='28'
                    y2='3'
                    stroke={style.color}
                    strokeWidth={style.width + 0.5}
                    strokeDasharray={style.dash}
                    opacity={style.opacity}
                  />
                </svg>
                {style.label}
              </div>
            ))}
            <div className='flex items-center gap-2'>
              <span className='flex w-7 justify-center text-amber-600 dark:text-amber-400'>
                <Icons.user className='size-3' stroke={1.75} />
              </span>
              Waits for a human
            </div>
            <NodeSidesLegend />
          </Panel>
          <Panel
            position='top-right'
            className='bg-card/90 text-muted-foreground rounded-lg border px-3 py-1.5 text-[11px] backdrop-blur-sm'
          >
            <SaveStatus canSave={canSave} status={save.status} />
          </Panel>
        </ReactFlow>
        <PlatformDetailDialog
          platformId={selectedPlatform?.id ?? null}
          open={selectedPlatform?.open ?? false}
          onOpenChange={(open) =>
            setSelectedPlatform((current) => (current ? { ...current, open } : null))
          }
        />
        <ServicePlansDialog
          serviceId={selectedService?.id ?? null}
          open={selectedService?.open ?? false}
          onOpenChange={(open) =>
            setSelectedService((current) => (current ? { ...current, open } : null))
          }
        />
        <ModelPricingDialog
          nodeId={selectedService?.id ?? null}
          open={selectedService?.open ?? false}
          onOpenChange={(open) =>
            setSelectedService((current) => (current ? { ...current, open } : null))
          }
          onOpenGateway={() => setSelectedService({ id: 'openrouter', open: true })}
        />
        <AgentProfileDialog
          agentId={selectedAgent?.id ?? null}
          open={selectedAgent?.open ?? false}
          onOpenChange={(open) =>
            setSelectedAgent((current) => (current ? { ...current, open } : null))
          }
        />
      </div>
    </ServiceHealthContext>
  );
}

'use client';

import '@xyflow/react/dist/style.css';

import {
  Background,
  BackgroundVariant,
  Controls,
  PanOnScrollMode,
  Panel,
  ReactFlow,
  useNodesState,
  type Edge,
  type Node,
  type NodeTypes
} from '@xyflow/react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { departmentsQueryOptions } from '../api/queries';
import type { Department } from '../api/types';
import { ROOT_NODE_ID, layoutOrgChart } from '../data/org-layout';
import { DepartmentSheet } from './department-sheet';
import { OrganizationSheet } from './organization-sheet';
import { DepartmentNode, RootNode, type OrgNodeData } from './org-nodes';

const nodeTypes: NodeTypes = {
  root: RootNode,
  department: DepartmentNode
};

const defaultEdgeOptions = {
  type: 'step',
  selectable: false,
  style: { stroke: 'var(--muted-foreground)', strokeWidth: 1.5, opacity: 0.7 }
} satisfies Partial<Edge>;

const PAN_KEYS = ['Meta', 'Control'];

const subscribeNoop = () => () => {};

type SheetState = { mode: 'create' } | { mode: 'edit'; id: string } | null;

function toFlowGraph(departments: Department[]) {
  const { nodes, edges } = layoutOrgChart(departments);
  const parents = new Set(edges.map((edge) => edge.source));
  const flowNodes: Node<OrgNodeData>[] = nodes.map((node) => ({
    id: node.id,
    type: node.id === ROOT_NODE_ID ? 'root' : 'department',
    position: node.position,
    draggable: false,
    data: { department: node.department, hasChildren: parents.has(node.id) }
  }));
  const flowEdges: Edge[] = edges.map((edge) => ({
    ...edge,
    sourceHandle: 'bottom',
    targetHandle: 'top'
  }));
  return { flowNodes, flowEdges };
}

export function OrgCanvas() {
  const { data: departments, isPending, isError } = useQuery(departmentsQueryOptions());

  if (isPending) {
    return (
      <div className='text-muted-foreground flex min-h-[400px] w-full flex-1 items-center justify-center gap-2 text-sm'>
        <Icons.spinner className='size-4 animate-spin' stroke={1.75} />
        Loading organizational structure…
      </div>
    );
  }
  if (isError) {
    return (
      <div className='text-destructive flex min-h-[400px] w-full flex-1 items-center justify-center gap-2 text-sm'>
        <Icons.warning className='size-4' stroke={1.75} />
        Couldn't load the organizational structure
      </div>
    );
  }
  return <OrgFlow departments={departments} />;
}

function OrgFlow({ departments }: { departments: Department[] }) {
  const { resolvedTheme } = useTheme();
  const { flowNodes, flowEdges } = useMemo(() => toFlowGraph(departments), [departments]);
  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  useEffect(() => setNodes(flowNodes), [flowNodes, setNodes]);

  // The server can't know the theme; React Flow's root class must match it on hydration.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  const [sheet, setSheet] = useState<SheetState>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [organizationOpen, setOrganizationOpen] = useState(false);
  const editing =
    sheet?.mode === 'edit' ? (departments.find((item) => item.id === sheet.id) ?? null) : null;

  function openSheet(next: Exclude<SheetState, null>) {
    setSheet(next);
    setSheetOpen(true);
  }

  return (
    <div className='min-h-[400px] w-full flex-1 overflow-hidden'>
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_event, node) => {
          if (node.id === ROOT_NODE_ID) setOrganizationOpen(true);
          else openSheet({ mode: 'edit', id: node.id });
        }}
        defaultEdgeOptions={defaultEdgeOptions}
        nodesDraggable={false}
        nodesConnectable={false}
        deleteKeyCode={null}
        panOnDrag={false}
        panActivationKeyCode={PAN_KEYS}
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        zoomOnScroll={false}
        zoomOnPinch
        minZoom={0.2}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        colorMode={mounted && resolvedTheme === 'dark' ? 'dark' : 'light'}
        proOptions={{ hideAttribution: true }}
        style={{ '--xy-background-color': 'transparent' } as React.CSSProperties}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls showInteractive={false} />
        <Panel position='top-right'>
          <Button size='sm' onClick={() => openSheet({ mode: 'create' })}>
            <Icons.add className='mr-1 h-4 w-4' /> New department
          </Button>
        </Panel>
      </ReactFlow>
      {sheet ? (
        <DepartmentSheet
          key={sheet.mode === 'edit' ? sheet.id : 'new'}
          department={editing}
          departments={departments}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      ) : null}
      <OrganizationSheet open={organizationOpen} onOpenChange={setOrganizationOpen} />
    </div>
  );
}

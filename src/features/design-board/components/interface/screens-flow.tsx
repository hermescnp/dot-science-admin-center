'use client';

import '@xyflow/react/dist/style.css';

import {
  applyNodeChanges,
  ReactFlow,
  type Node,
  type NodeChange,
  type NodeProps,
  type ReactFlowInstance
} from '@xyflow/react';
import { useTheme } from 'next-themes';
import {
  createContext,
  use,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode
} from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SCREEN_SIZES, type DesignLayer, type DesignSection } from '../../api/types';
import type { Viewport } from '../../store/camera-store';
import { CanvasNavigation, MAX_ZOOM, MIN_ZOOM } from './canvas-navigation';
import { SketchScreen } from './sketch';
import { ScreenFrame } from './wireframe';
import { WireframeContext, useWireframe, type WireframeContextValue } from './wireframe-context';

const subscribeNoop = () => () => {};

/** Kept out of node data so a fresh callback doesn't rebuild the flow's nodes every render. */
const ResizeScreenContext = createContext<((layerId: string, height: number) => void) | undefined>(
  undefined
);
const ToggleLayoutContext = createContext<(() => void) | undefined>(undefined);

/** The screen with drawings over it that can be drawn into its layout, and whether that runs. */
export interface DrawIntoLayoutState {
  layerId: string;
  busy: boolean;
}
const DrawIntoLayoutContext = createContext<DrawIntoLayoutState | null>(null);
const NO_LAYERS: ReadonlySet<string> = new Set();
/** Screens with drawings over them, which hide an empty screen's placeholder. */
const DrawnOverContext = createContext<ReadonlySet<string>>(NO_LAYERS);

type ScreenNodeData = {
  layer: DesignLayer;
  active: boolean;
  /** The active screen's mockup itself is selected: it scrolls and offers the layout editor. */
  selected: boolean;
  /** Faded behind the active layer's screen; false when the whole section is selected. */
  dimmed: boolean;
  interactive: boolean;
  layerTitles: ReadonlyMap<string, string>;
  variant: ScreenVariant;
  /** Element ringed in the sketch; only set on the active screen. */
  selectedNodeId: string | null;
  /** Component instance drawn with an editable preview; only set on the active screen. */
  editingPreviewId: string | null;
};

/** `notation` is the editable structural view; `sketch` previews each element as a UX sketch. */
type ScreenVariant = 'notation' | 'sketch';

export type ScreenNode = Node<ScreenNodeData, 'screen'>;

function ScreenNodeView({ data }: NodeProps<ScreenNode>) {
  const {
    layer,
    active,
    selected,
    dimmed,
    interactive,
    layerTitles,
    variant,
    selectedNodeId,
    editingPreviewId
  } = data;
  const editorContext = useWireframe();
  const resizeScreen = use(ResizeScreenContext);
  const toggleLayout = use(ToggleLayoutContext);
  const drawContext = use(DrawIntoLayoutContext);
  const drawIntoLayout = drawContext?.layerId === layer.id ? drawContext : null;
  const drawnOver = use(DrawnOverContext).has(layer.id);
  const screen = layer.screen!;
  const editing = active && interactive;

  const readOnlyContext = useMemo<WireframeContextValue>(
    () => ({
      ...editorContext,
      editable: false,
      selectedId: null,
      hoveredId: null,
      nodes: screen.nodes,
      layerTitles
    }),
    [editorContext, screen.nodes, layerTitles]
  );

  const DeviceIcon = screen.device === 'desktop' ? Icons.deviceDesktop : Icons.deviceMobile;
  const header = (
    <div
      data-screen-header=''
      className={cn(
        'flex min-h-6 items-center gap-1.5 px-1 text-sm font-medium',
        editing && 'screen-drag-handle cursor-grab active:cursor-grabbing'
      )}
    >
      {editing ? <Icons.gripVertical className='text-muted-foreground size-4' /> : null}
      <DeviceIcon className={cn('size-4', selected ? 'text-primary' : 'text-muted-foreground')} />
      <span className={cn('truncate', selected && 'text-primary')}>{layer.title}</span>
      <div className='nodrag ml-auto flex shrink-0 items-center gap-1'>
        {drawIntoLayout ? (
          <Button
            size='sm'
            variant='default'
            data-draw-into-layout-button=''
            disabled={drawIntoLayout.busy}
            className='h-6 gap-1 px-2 text-xs'
          >
            {drawIntoLayout.busy ? (
              <Icons.spinner className='size-3.5 animate-spin' />
            ) : (
              <Icons.sparkles className='size-3.5' />
            )}
            {drawIntoLayout.busy ? 'Drawing into layout…' : 'Draw into layout'}
          </Button>
        ) : null}
        {selected && toggleLayout ? (
          <Button
            size='sm'
            variant={variant === 'notation' ? 'default' : 'secondary'}
            data-layout-mode-button=''
            className='h-6 gap-1 px-2 text-xs'
            onClick={toggleLayout}
          >
            {variant === 'notation' ? (
              <Icons.check className='size-3.5' />
            ) : (
              <Icons.edit className='size-3.5' />
            )}
            {variant === 'notation' ? 'Edit done' : 'Edit layout'}
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div
      style={{ width: SCREEN_SIZES[screen.device].width }}
      className={cn(
        'transition-opacity',
        dimmed && 'opacity-40',
        dimmed && interactive && 'hover:opacity-60',
        !active && interactive && 'cursor-pointer'
      )}
      title={!active && interactive ? `Select ${layer.title}` : undefined}
    >
      <WireframeContext value={editing ? editorContext : readOnlyContext}>
        <div className={cn(!active && 'pointer-events-none', editing && 'nopan')}>
          {variant === 'sketch' ? (
            <SketchScreen
              title={layer.title}
              screen={screen}
              header={header}
              selectedId={selectedNodeId}
              editingPreviewId={editingPreviewId}
              scrollable={selected}
              drawnOver={drawnOver}
            />
          ) : (
            <ScreenFrame
              title={layer.title}
              screen={screen}
              scrollable={selected}
              onResize={
                editing && resizeScreen ? (height) => resizeScreen(layer.id, height) : undefined
              }
              header={header}
            />
          )}
        </div>
      </WireframeContext>
    </div>
  );
}

const nodeTypes = { screen: ScreenNodeView };

interface ScreensFlowProps {
  section: DesignSection;
  /** Null when the whole section is selected: every screen shows at full opacity. */
  activeLayerId: string | null;
  viewport: Viewport;
  onViewportChange?: (viewport: Viewport) => void;
  /** When false the flow is a passive, pointer-transparent underlay. */
  interactive: boolean;
  /** False when the active layer stays selected but its mockup was clicked away from. */
  activeScreenSelected?: boolean;
  /** The screen open in the layout editor, drawn as notation; every other one is a sketch. */
  notationLayerId?: string | null;
  /** Element of the active screen to ring in the sketch variant. */
  selectedNodeId?: string | null;
  /** Component instance of the active screen whose preview layout is edited in place. */
  editingPreviewId?: string | null;
  onMoveScreen?: (layerId: string, position: { x: number; y: number }) => void;
  /** A screen dragged from outside the flow, drawn at its preview position. */
  movingScreen?: { layerId: string; x: number; y: number } | null;
  onResizeScreen?: (layerId: string, height: number) => void;
  /** Shows the Edit layout / Edit done button in the active screen's title row. */
  onToggleLayout?: () => void;
  /** Shows the Draw into layout button in this screen's title row. */
  drawIntoLayout?: DrawIntoLayoutState | null;
  /** Screens with drawings over them. */
  drawnOverLayerIds?: ReadonlySet<string>;
  onActivateLayer?: (layerId: string) => void;
  onInit?: (instance: ReactFlowInstance<ScreenNode>) => void;
  onPaneClick?: () => void;
  className?: string;
  children?: ReactNode;
}

export function ScreensFlow({
  section,
  activeLayerId,
  viewport,
  onViewportChange,
  interactive,
  activeScreenSelected = true,
  notationLayerId = null,
  selectedNodeId = null,
  editingPreviewId = null,
  onMoveScreen,
  movingScreen = null,
  onResizeScreen,
  onToggleLayout,
  drawIntoLayout = null,
  drawnOverLayerIds = NO_LAYERS,
  onActivateLayer,
  onInit,
  onPaneClick,
  className,
  children
}: ScreensFlowProps) {
  const drawLayerId = drawIntoLayout?.layerId;
  const drawBusy = drawIntoLayout?.busy ?? false;
  const drawContext = useMemo(
    () => (drawLayerId ? { layerId: drawLayerId, busy: drawBusy } : null),
    [drawLayerId, drawBusy]
  );
  const { resolvedTheme } = useTheme();
  // The server can't know the theme; React Flow's root class must match it on hydration.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  const baseNodes = useMemo<ScreenNode[]>(() => {
    const layerTitles = new Map(section.layers.map((layer) => [layer.id, layer.title]));
    return section.layers
      .filter((layer) => layer.screen)
      .map((layer) => {
        const active = layer.id === activeLayerId;
        return {
          id: layer.id,
          type: 'screen',
          position: { x: layer.screen!.x, y: layer.screen!.y },
          draggable: interactive && active,
          selectable: false,
          dragHandle: '.screen-drag-handle',
          zIndex: active ? 1 : 0,
          data: {
            layer,
            active,
            selected: active && activeScreenSelected,
            dimmed: activeLayerId !== null && !active,
            interactive,
            layerTitles,
            variant: layer.id === notationLayerId ? 'notation' : 'sketch',
            selectedNodeId: active ? selectedNodeId : null,
            editingPreviewId: active ? editingPreviewId : null
          }
        };
      });
  }, [
    section.layers,
    activeLayerId,
    activeScreenSelected,
    interactive,
    notationLayerId,
    selectedNodeId,
    editingPreviewId
  ]);

  const [nodes, setNodes] = useState(baseNodes);
  const [syncedBase, setSyncedBase] = useState(baseNodes);
  if (syncedBase !== baseNodes) {
    setSyncedBase(baseNodes);
    setNodes((prev) =>
      baseNodes.map((node) => ({ ...node, measured: prev.find((p) => p.id === node.id)?.measured }))
    );
  }

  // Only the moved node gets a new object, so the other screens don't re-render while it moves.
  const shownNodes = useMemo(
    () =>
      movingScreen
        ? nodes.map((node) =>
            node.id === movingScreen.layerId
              ? { ...node, position: { x: movingScreen.x, y: movingScreen.y } }
              : node
          )
        : nodes,
    [nodes, movingScreen]
  );

  function handleNodesChange(changes: NodeChange<ScreenNode>[]) {
    setNodes((prev) => applyNodeChanges(changes, prev));
    for (const change of changes) {
      if (change.type === 'position' && change.dragging === false && change.position) {
        onMoveScreen?.(change.id, change.position);
      }
    }
  }

  return (
    <ResizeScreenContext value={onResizeScreen}>
      <ToggleLayoutContext value={onToggleLayout}>
        <DrawIntoLayoutContext value={drawContext}>
          <DrawnOverContext value={drawnOverLayerIds}>
            <ReactFlow<ScreenNode>
              nodes={shownNodes}
              edges={[]}
              nodeTypes={nodeTypes}
              onNodesChange={handleNodesChange}
              viewport={viewport}
              onViewportChange={onViewportChange}
              onInit={onInit}
              onPaneClick={onPaneClick}
              onNodeClick={
                interactive && onActivateLayer
                  ? (_event, node) => {
                      if (node.id !== activeLayerId) onActivateLayer(node.id);
                    }
                  : undefined
              }
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              panOnDrag={false}
              panOnScroll={false}
              zoomOnScroll={false}
              zoomOnPinch={false}
              zoomOnDoubleClick={false}
              panActivationKeyCode={null}
              zoomActivationKeyCode={null}
              nodesConnectable={false}
              elementsSelectable={false}
              colorMode={mounted && resolvedTheme === 'dark' ? 'dark' : 'light'}
              proOptions={{ hideAttribution: true }}
              className={cn(!interactive && 'pointer-events-none', className)}
              style={{ '--xy-background-color': 'transparent' } as CSSProperties}
            >
              {interactive ? <CanvasNavigation /> : null}
              {children}
            </ReactFlow>
          </DrawnOverContext>
        </DrawIntoLayoutContext>
      </ToggleLayoutContext>
    </ResizeScreenContext>
  );
}

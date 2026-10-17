'use client';

import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { Background, BackgroundVariant, type ReactFlowInstance } from '@xyflow/react';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { AlertModal } from '@/components/modal/alert-modal';
import { Whiteboard, type WhiteboardScene } from '@/components/whiteboard';
import { cn } from '@/lib/utils';
import type { DesignLayer, DesignSection, UiNode } from '../../api/types';
import { acceptsInstance, createInstance, NESTED_INSTANCE_ERROR } from '../../lib/components';
import { mergeLayers, SKIP_HISTORY, toDisplay } from '../../lib/layered-elements';
import {
  CONTAINER_TYPES,
  createNode,
  findNode,
  findParentId,
  insertNode,
  moveNode,
  removeNode,
  updateNodeProperties
} from '../../lib/node-tree';
import { flushDirtyPreviews, useDesignComponents } from '../../lib/use-components';
import { useScreenSave } from '../../lib/use-screen-save';
import { toWhiteboardCamera, useCameraStore, type Viewport } from '../../store/camera-store';
import { SaveIndicator } from '../save-indicator';
import { isTyping } from './canvas-navigation';
import { ComponentsPanel } from './components-panel';
import { ElementLibraryBar } from './element-library';
import { PropertiesPanel } from './properties-panel';
import { ScreensFlow, type ScreenNode } from './screens-flow';
import { StructureTree } from './structure-tree';
import {
  nodeDragValue,
  parseNodeDrag,
  WireframeContext,
  type WireframeContextValue
} from './wireframe-context';
import { ZoomPill } from './zoom-pill';

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };
/** Selection id for the screen itself; never collides with node ids. */
const SCREEN_SELECTION = '__screen__';

interface InterfaceDesignProps {
  section: DesignSection;
  /** The layer being edited; its screen is the one in notation. */
  activeLayer: DesignLayer;
  onSelectLayer: (layerId: string) => void;
  onDone: () => void;
  /** Element selected when the editor opens. */
  initialSelectedId?: string | null;
  /** Element under the active layer in the left panel that holds the structure tree. */
  structureSlot: HTMLElement | null;
}

/**
 * The active layer's screen in its editable notation, among the section's other screens drawn as
 * sketches. Only that screen is editable and draggable; the free-design drawings render
 * underneath, read-only.
 */
export function InterfaceDesign({
  section,
  activeLayer,
  onSelectLayer,
  onDone,
  initialSelectedId = null,
  structureSlot
}: InterfaceDesignProps) {
  const activeLayerId = activeLayer.id;
  const { resolvedTheme } = useTheme();
  const viewport = useCameraStore((state) => state.cameras[section.id]);
  const setCamera = useCameraStore((state) => state.setCamera);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const [shownLayerId, setShownLayerId] = useState(activeLayerId);
  if (shownLayerId !== activeLayerId) {
    setShownLayerId(activeLayerId);
    setSelectedId(null);
  }

  const screen = activeLayer.screen;
  const screens = section.layers.filter((layer) => layer.screen && layer.id !== activeLayerId);
  const selectedNode = screen && selectedId ? findNode(screen.nodes, selectedId) : null;
  const propertiesTarget = selectedNode
    ? ({ kind: 'node', node: selectedNode } as const)
    : selectedId === SCREEN_SELECTION
      ? ({ kind: 'screen' } as const)
      : null;

  const { state: saveState, writeScreen, editScreen, flush } = useScreenSave(section, activeLayer);
  const { byId: componentsById } = useDesignComponents();
  const [componentsOpen, setComponentsOpen] = useState(false);
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });
  // Leaving Edit layout (Done, or switching away) saves in the background and regenerates dirty
  // component previews; the sketches show a skeleton meanwhile.
  useEffect(
    () => () => {
      void flushDirtyPreviews(flushRef.current());
    },
    []
  );

  /** The node for a library drag payload placed under `parentId`; null when it can't go there. */
  function createFromDrag(value: string, parentId: string | null): UiNode | null {
    const drag = parseNodeDrag(value);
    if (!drag) return null;
    if ('type' in drag) return createNode(drag.type);
    const component = componentsById.get(drag.componentId);
    if (!component) return null;
    if (!acceptsInstance(screen?.nodes ?? [], parentId)) {
      toast.error(NESTED_INSTANCE_ERROR);
      return null;
    }
    return createInstance(component);
  }

  function insertCreated(parentId: string | null, value: string, index?: number) {
    if (!screen) return;
    const created = createFromDrag(value, parentId);
    if (!created) return;
    editScreen({ nodes: insertNode(screen.nodes, parentId, created, index) });
    setSelectedId(created.id);
  }

  /** Click-to-add goes into the selected container, or next to the selected element. */
  function addNode(value: string) {
    if (!screen) return;
    const selected = selectedId ? findNode(screen.nodes, selectedId) : null;
    const parentId = !selected
      ? null
      : CONTAINER_TYPES.has(selected.type)
        ? selected.id
        : (findParentId(screen.nodes, selected.id) ?? null);
    insertCreated(parentId, value);
  }

  const latest = useRef({ screen, selectedId, editScreen });
  useEffect(() => {
    latest.current = { screen, selectedId, editScreen };
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      if (isTyping(event.target)) return;
      const { screen: current, selectedId: id, editScreen: edit } = latest.current;
      if (!current || !id || !findNode(current.nodes, id)) return;
      event.preventDefault();
      edit({ nodes: removeNode(current.nodes, id) });
      setSelectedId(null);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const layerTitles = useMemo(
    () => new Map(section.layers.map((layer) => [layer.id, layer.title])),
    [section.layers]
  );

  const wireframe: WireframeContextValue = {
    editable: true,
    selectedId,
    hoveredId,
    nodes: screen?.nodes ?? [],
    layerTitles,
    select: setSelectedId,
    hover: setHoveredId,
    drop: insertCreated,
    updateProperties: (id, properties) => {
      if (screen) editScreen({ nodes: updateNodeProperties(screen.nodes, id, properties) });
    },
    updateLayout: (id, layout) => {
      const node = screen ? findNode(screen.nodes, id) : null;
      if (!screen || !node) return;
      editScreen({
        nodes: updateNodeProperties(screen.nodes, id, {
          layout: { ...node.properties?.layout, ...layout }
        })
      });
    },
    moveNode: (id, parentId, index) => {
      if (screen) editScreen({ nodes: moveNode(screen.nodes, id, parentId, index) });
    }
  };

  const [drawingsApi, setDrawingsApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [drawings] = useState<WhiteboardScene>(() => ({
    elements: toDisplay(mergeLayers(section.layers), activeLayerId),
    files: section.files as WhiteboardScene['files']
  }));
  const layersRef = useRef(section.layers);
  useEffect(() => {
    layersRef.current = section.layers;
  });
  const layerIdsKey = section.layers.map((layer) => layer.id).join(',');
  useEffect(() => {
    if (!drawingsApi) return;
    drawingsApi.updateScene({
      elements: toDisplay(mergeLayers(layersRef.current), activeLayerId),
      captureUpdate: SKIP_HISTORY
    });
  }, [drawingsApi, activeLayerId, layerIdsKey]);

  function handleInit(instance: ReactFlowInstance<ScreenNode>) {
    if (viewport) return;
    void instance.fitView({ padding: 0.2, maxZoom: 1 }).then(() => {
      setCamera(section.id, instance.getViewport());
    });
  }

  return (
    <div className='flex h-full w-full'>
      <div className='relative min-w-0 flex-1 overflow-hidden'>
        <div className='pointer-events-none absolute inset-0 z-0'>
          <Whiteboard
            initialScene={drawings}
            onApiReady={setDrawingsApi}
            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
            transparent
            viewModeEnabled
            camera={toWhiteboardCamera(viewport ?? DEFAULT_VIEWPORT)}
          />
        </div>

        <div className='absolute inset-0 z-10'>
          <WireframeContext value={wireframe}>
            <ScreensFlow
              section={section}
              activeLayerId={activeLayerId}
              viewport={viewport ?? DEFAULT_VIEWPORT}
              onViewportChange={(next) => setCamera(section.id, next)}
              interactive
              notationLayerId={activeLayerId}
              onToggleLayout={onDone}
              onMoveScreen={(layerId, position) => {
                if (layerId === activeLayerId) {
                  editScreen({ x: Math.round(position.x), y: Math.round(position.y) });
                }
              }}
              onResizeScreen={(layerId, height) => {
                if (layerId === activeLayerId) editScreen({ height });
              }}
              onActivateLayer={onSelectLayer}
              onInit={handleInit}
              onPaneClick={() => setSelectedId(null)}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
              <ZoomPill className='absolute bottom-4 left-4 z-5 max-md:bottom-14' />
            </ScreensFlow>
          </WireframeContext>
        </div>

        {screen ? (
          <ElementLibraryBar
            className='absolute bottom-0 left-1/2 z-20 -translate-x-1/2'
            onAdd={(type) => addNode(nodeDragValue({ type }))}
            onDragEnd={() => setHoveredId(null)}
            componentsOpen={componentsOpen}
            onToggleComponents={() => setComponentsOpen((open) => !open)}
          />
        ) : null}

        {screen && componentsOpen ? (
          <ComponentsPanel
            className='absolute top-3 right-3 z-20 max-h-[calc(100%-5rem)]'
            onAdd={(component) => addNode(nodeDragValue({ componentId: component.id }))}
            onDragEnd={() => setHoveredId(null)}
            onClose={() => setComponentsOpen(false)}
          />
        ) : null}

        {screen && propertiesTarget ? (
          <PropertiesPanel
            className={cn(
              'absolute top-3 z-20 max-h-[calc(100%-5rem)]',
              componentsOpen ? 'right-[19.5rem]' : 'right-3'
            )}
            target={propertiesTarget}
            layer={activeLayer}
            screen={screen}
            screens={screens}
            onScreenChange={editScreen}
            onRemoveScreen={() => setConfirmRemove(true)}
            onClose={() => setSelectedId(null)}
            componentView='editor'
            onFinishEditing={onDone}
          />
        ) : null}

        <SaveIndicator state={saveState} />
      </div>

      {screen && structureSlot
        ? createPortal(
            <>
              <button
                type='button'
                onClick={() => setSelectedId(SCREEN_SELECTION)}
                aria-pressed={selectedId === SCREEN_SELECTION}
                className={cn(
                  'flex h-7 w-full items-center gap-1.5 rounded-md pr-2 pl-1 text-left text-[13px]',
                  selectedId === SCREEN_SELECTION
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {screen.device === 'desktop' ? (
                  <Icons.deviceDesktop className='size-3.5 shrink-0' />
                ) : (
                  <Icons.deviceMobile className='size-3.5 shrink-0' />
                )}
                <span className='truncate'>
                  {screen.device === 'desktop' ? 'Desktop screen' : 'Phone screen'}
                </span>
              </button>
              <StructureTree
                nodes={screen.nodes}
                selectedId={selectedNode ? selectedNode.id : null}
                onSelect={setSelectedId}
                onChange={(nodes) => editScreen({ nodes })}
                createFromDrag={createFromDrag}
              />
            </>,
            structureSlot
          )
        : null}

      <AlertModal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          setSelectedId(null);
          writeScreen(null);
        }}
        loading={false}
        title='Remove this screen?'
        description='The screen mockup and all its elements are removed from the layer. Its drawings stay.'
        confirmLabel='Remove screen'
      />
    </div>
  );
}

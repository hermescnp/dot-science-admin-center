'use client';

import type { ExcalidrawElement, FileId } from '@excalidraw/excalidraw/element/types';
import type { DataURL, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from 'react';
import { toast } from 'sonner';
import { Icons, type Icon } from '@/components/icons';
import { HeaderPortal } from '@/components/layout/header-portal';
import { headerIconButtonClassName } from '@/components/layout/header-icon-button';
import { HEADER_ACTIONS_START_SLOT_ID } from '@/components/layout/header-slot';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Whiteboard, type WhiteboardHistory, type WhiteboardScene } from '@/components/whiteboard';
import { cn } from '@/lib/utils';
import { designSectionsQueryOptions } from '../api/queries';
import { generateDiagramFlow, saveSectionScene, updateLayer } from '../api/service';
import {
  SCREEN_SIZES,
  type DesignComponent,
  type DesignLayer,
  type DesignSection,
  type InterfaceScreen,
  type UiNode
} from '../api/types';
import { componentSvg } from '../lib/component-svg';
import {
  acceptsInstance,
  componentDevice,
  createInstance,
  enclosingInstance,
  isInstance,
  NESTED_INSTANCE_ERROR
} from '../lib/components';
import { updateLayerCache, updateSectionCache } from '../lib/design-cache';
import type { AiRenderData, FittedRender } from '../lib/frame-capture';
import {
  groupByLayer,
  layerOf,
  mergeLayers,
  SKIP_HISTORY,
  tagUntagged,
  toDisplay,
  undimmed
} from '../lib/layered-elements';
import { findNode, insertNode, removeNode } from '../lib/node-tree';
import { screenOutline } from '../lib/screen-outline';
import { useComponentPreviewSaves, useDesignComponents } from '../lib/use-components';
import { combineSaveStates, useDebouncedSave } from '../lib/use-debounced-save';
import { useScreenSave } from '../lib/use-screen-save';
import {
  fromWhiteboardCamera,
  registerCanvasCommit,
  toWhiteboardCamera,
  useCameraStore
} from '../store/camera-store';
import { screenAt, useBoardComponentDrop, type BoardDrop } from './board-component-drop';
import { CanvasExportMenu } from './canvas-export-menu';
import { CanvasShortcutsDialog } from './canvas-shortcuts-dialog';
import { useDrawIntoLayout } from './draw-into-layout-action';
import { FrameRenderPanel } from './frame-render-panel';
import { isTyping } from './interface/canvas-navigation';
import { ComponentsPanel, ComponentsToolbarButton } from './interface/components-panel';
import { PropertiesPanel } from './interface/properties-panel';
import { PreviewLayoutOverlay } from './interface/preview-layout-overlay';
import { ScreensFlow } from './interface/screens-flow';
import { useSketchHover } from './interface/sketch-hover';
import { parseNodeDrag } from './interface/wireframe-context';
import { useMockupTool } from './mockup-tool';
import { SaveIndicator } from './save-indicator';
import { useScreenMove } from './screen-move';

const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 };
/** A sketched screen's body padding on each side; images match the screen's content width. */
const SKETCH_PADDING = 16;

interface SceneSnapshot {
  layers: Record<string, ExcalidrawElement[]>;
  files: Record<string, unknown>;
}

interface FreeDesignCanvasProps {
  section: DesignSection;
  /** Null when the whole section is selected. */
  activeLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onEditLayout: () => void;
  /** Opens the layout editor with this component instance selected. */
  onEditComponent: (instanceId: string) => void;
}

const CLICK_SLOP = 4;

function generateMermaid(prompt: string) {
  return generateDiagramFlow({ prompt }).then((result) => result.mermaid);
}

/**
 * Every layer of the section drawn on one Excalidraw board. Only the active layer's elements are
 * editable; the rest are locked and faded. With the whole section selected every layer is shown
 * and editable, and new drawings go to the first layer. Interface screens show through underneath.
 */
export function FreeDesignCanvas({
  section,
  activeLayerId,
  onSelectLayer,
  onEditLayout,
  onEditComponent
}: FreeDesignCanvasProps) {
  const { resolvedTheme } = useTheme();
  const viewport = useCameraStore((state) => state.cameras[section.id]);
  const setCamera = useCameraStore((state) => state.setCamera);
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [history, setHistory] = useState<WhiteboardHistory | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const [initialScene] = useState<WhiteboardScene>(() => ({
    elements: toDisplay(mergeLayers(section.layers), activeLayerId),
    files: section.files as WhiteboardScene['files']
  }));

  const layerIds = section.layers.map((layer) => layer.id);
  const layerIdsKey = layerIds.join(',');
  const layerIdsRef = useRef(layerIds);
  const drawingLayerId = activeLayerId ?? layerIds[0] ?? null;
  const drawingLayerRef = useRef(drawingLayerId);
  const latestRef = useRef<SceneSnapshot | null>(null);
  const screensRef = useRef<HTMLDivElement>(null);
  const pressRef = useRef<{ x: number; y: number } | null>(null);
  const activeLayer = section.layers.find((layer) => layer.id === activeLayerId) ?? null;
  // The active layer's mockup can be deselected while the layer stays active for drawing; it then
  // stops taking the wheel and element clicks.
  const [mockupSelected, setMockupSelected] = useState(true);
  const hover = useSketchHover(screensRef, mockupSelected ? activeLayer : null);
  const screenSave = useScreenSave(section, activeLayer);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [shownLayerId, setShownLayerId] = useState(activeLayerId);
  if (shownLayerId !== activeLayerId) {
    setShownLayerId(activeLayerId);
    setSelectedNodeId(null);
    setMockupSelected(true);
  }
  const screen = activeLayer?.screen ?? null;
  const selectedNode = screen && selectedNodeId ? findNode(screen.nodes, selectedNodeId) : null;
  const otherScreens = section.layers.filter((layer) => layer.screen && layer.id !== activeLayerId);

  useEffect(() => {
    layerIdsRef.current = layerIds;
  });

  const { data: sections } = useSuspenseQuery(designSectionsQueryOptions());
  const { byId: componentsById } = useDesignComponents();
  const previewSaves = useComponentPreviewSaves();
  // The selected instance's preview is laid out for editing in place, like a cover.
  const editingComponentId =
    mockupSelected && selectedNode ? selectedNode.properties?.componentId : undefined;
  const editingComponent = editingComponentId ? componentsById.get(editingComponentId) : undefined;
  const editingPreview =
    selectedNode && editingComponent?.previewStatus === 'ready' && editingComponent.previewHtml
      ? {
          instanceId: selectedNode.id,
          componentId: editingComponent.id,
          html: editingComponent.previewHtml
        }
      : null;
  const previewSelectionRef = useRef(false);
  const handlePreviewSelection = useCallback((selected: boolean) => {
    previewSelectionRef.current = selected;
  }, []);
  const [componentsOpen, setComponentsOpen] = useState(false);
  const componentDrop = useBoardComponentDrop({
    section,
    activeLayerId,
    screensRef,
    onDrop: handleComponentDrop
  });

  const boardRef = useRef<HTMLDivElement>(null);
  const mockupTool = useMockupTool({
    section,
    boardRef,
    viewport: viewport ?? DEFAULT_VIEWPORT,
    onCreated: onSelectLayer
  });
  const screenMove = useScreenMove({
    api,
    screensRef,
    section,
    activeLayerId,
    zoom: (viewport ?? DEFAULT_VIEWPORT).zoom,
    onMove: moveScreen
  });
  const drawIntoLayout = useDrawIntoLayout({
    api,
    screensRef,
    activeLayer,
    setScreenNodes
  });
  const wheelRef = useRef({ activeLayerId, mockupSelected, clearHover: hover.clear });
  useEffect(() => {
    wheelRef.current = { activeLayerId, mockupSelected, clearHover: hover.clear };
  });

  // When the selected mockup has content to scroll, the wheel anywhere over that mockup
  // only scrolls its content, even at its ends, so the board never pans under the pointer. Listening natively in
  // the capture phase lets this run before the board's own wheel handling.
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    function handleWheel(event: WheelEvent) {
      if (event.ctrlKey || event.metaKey || event.shiftKey) return;
      const { activeLayerId: layerId, mockupSelected: selected, clearHover } = wheelRef.current;
      const node =
        layerId && selected
          ? screensRef.current?.querySelector<HTMLElement>(
              `.react-flow__node[data-id="${layerId}"]`
            )
          : null;
      const body = node?.querySelector<HTMLElement>('[data-sketch-body]');
      if (!node || !body || body.scrollHeight - body.clientHeight < 1) return;
      const rect = node.getBoundingClientRect();
      const { clientX: x, clientY: y } = event;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;
      event.preventDefault();
      event.stopPropagation();
      // The screen is drawn at the canvas zoom; move the content as far as the wheel moved.
      const scale = body.getBoundingClientRect().height / body.offsetHeight || 1;
      body.scrollTop += event.deltaY / scale;
      clearHover();
    }
    board.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    return () => board.removeEventListener('wheel', handleWheel, { capture: true });
  }, []);

  const deleteRef = useRef({ api, screen, selectedNodeId, editScreen: screenSave.editScreen });
  useEffect(() => {
    deleteRef.current = { api, screen, selectedNodeId, editScreen: screenSave.editScreen };
  });

  // Delete removes the selected mockup element, unless drawings are selected: those are the
  // board's to delete, or an element inside its preview is: that one is the preview editor's.
  // Captured before Excalidraw's document-level shortcuts swallow the key.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      if (isTyping(event.target) || previewSelectionRef.current) return;
      const { api: board, screen: current, selectedNodeId: id, editScreen } = deleteRef.current;
      if (!current || !id || !findNode(current.nodes, id)) return;
      if (board && Object.keys(board.getAppState().selectedElementIds).length) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      editScreen({ nodes: removeNode(current.nodes, id) });
      setSelectedNodeId(null);
    }
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const { state: saveState, schedule } = useDebouncedSave<SceneSnapshot>(
    (scene) => saveSectionScene(section.id, scene).then((result) => result.updatedAt),
    section.updatedAt
  );

  function handleSceneChange(scene: WhiteboardScene) {
    const snapshot: SceneSnapshot = {
      layers: groupByLayer(scene.elements, layerIdsRef.current, drawingLayerRef.current),
      files: scene.files as Record<string, unknown>
    };
    latestRef.current = snapshot;
    schedule(snapshot);
  }

  function handlePointerMove(event: ReactPointerEvent) {
    if (screenMove.pointerMove(event)) return;
    const onBoard = event.target instanceof HTMLCanvasElement;
    const selecting = api?.getAppState().activeTool.type === 'selection';
    const idle = onBoard && selecting && !event.buttons && !mockupTool.placing;
    if (idle) hover.update(event);
    else hover.clear();
    if (idle) screenMove.hover(event);
  }

  function handlePointerDown(event: ReactPointerEvent) {
    hover.clear();
    const onBoard =
      event.button === 0 && event.target instanceof HTMLCanvasElement && !mockupTool.placing;
    if (onBoard) screenMove.pointerDown(event);
    pressRef.current = onBoard ? { x: event.clientX, y: event.clientY } : null;
  }

  // The screens sit under the board, which takes every click; a click that selects no drawing
  // goes through to the screen beneath it instead: to an element of the selected mockup, to the
  // active layer's mockup to select it, or to another screen's layer. A click on empty canvas
  // deselects the mockup but keeps its layer active.
  function handlePointerUp(event: ReactPointerEvent) {
    const press = pressRef.current;
    pressRef.current = null;
    const screenPress = screenMove.pointerUp(event);
    if (screenPress === 'moved' || !press || !api) return;
    // The board never saw a press taken by a screen handle; clear its selection like its own
    // click on empty canvas would.
    if (screenPress === 'click') api.updateScene({ appState: { selectedElementIds: {} } });
    const { clientX, clientY } = event;
    if (Math.hypot(clientX - press.x, clientY - press.y) > CLICK_SLOP) return;
    // Let the board settle its own selection for this click first.
    requestAnimationFrame(() => {
      const state = api.getAppState();
      if (state.activeTool.type !== 'selection' || state.editingTextElement) return;
      if (layoutButtonAt(clientX, clientY)) {
        onEditLayout();
        return;
      }
      if (drawIntoLayout.buttonAt(clientX, clientY)) {
        void drawIntoLayout.run();
        return;
      }
      if (Object.keys(state.selectedElementIds).length) return;
      const node = hover.elementAt(clientX, clientY);
      if (node) {
        setSelectedNodeId(node.id);
        return;
      }
      const layerId = screenAt(screensRef.current, clientX, clientY, activeLayerId);
      if (layerId && layerId !== activeLayerId) {
        onSelectLayer(layerId);
        return;
      }
      setSelectedNodeId(null);
      setMockupSelected(Boolean(layerId));
    });
  }

  // A double click on a component instance opens it in the layout editor; captured so the board
  // doesn't start a text element there instead.
  function handleDoubleClick(event: ReactMouseEvent) {
    if (!api || !screen || !(event.target instanceof HTMLCanvasElement) || mockupTool.placing) {
      return;
    }
    const state = api.getAppState();
    if (state.activeTool.type !== 'selection' || Object.keys(state.selectedElementIds).length) {
      return;
    }
    const node = hover.elementAt(event.clientX, event.clientY);
    const instance = node && (isInstance(node) ? node : enclosingInstance(screen.nodes, node.id));
    if (!instance) return;
    event.preventDefault();
    event.stopPropagation();
    onEditComponent(instance.id);
  }

  function layoutButtonAt(x: number, y: number) {
    const rect = screensRef.current
      ?.querySelector('[data-layout-mode-button]')
      ?.getBoundingClientRect();
    return Boolean(rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
  }

  /** A new instance of `component` in `layer`'s screen; any screen on the board takes one. */
  function insertComponent(
    layer: DesignLayer,
    component: DesignComponent,
    parentId: string | null,
    index?: number
  ) {
    const screen = layer.screen;
    if (!screen) return;
    if (!acceptsInstance(screen.nodes, parentId)) {
      toast.error(NESTED_INSTANCE_ERROR);
      return;
    }
    const created = createInstance(component);
    const nodes = insertNode(screen.nodes, parentId, created, index);
    if (layer.id === activeLayerId) {
      screenSave.editScreen({ nodes });
      setMockupSelected(true);
      setSelectedNodeId(created.id);
      return;
    }
    saveInactiveScreen(layer.id, { ...screen, nodes });
    onSelectLayer(layer.id);
  }

  /** Saves the screen of a layer other than the active one, whose saves go through `screenSave`. */
  function saveInactiveScreen(layerId: string, next: InterfaceScreen) {
    updateLayerCache(layerId, (current) => ({ ...current, screen: next }));
    updateLayer(layerId, { screen: next }).catch(() => toast.error("Couldn't save the screen"));
  }

  function setScreenNodes(layerId: string, nodes: UiNode[]) {
    if (layerId === activeLayerId) {
      screenSave.editScreen({ nodes });
      return;
    }
    const screen = section.layers.find((layer) => layer.id === layerId)?.screen;
    if (screen) saveInactiveScreen(layerId, { ...screen, nodes });
  }

  /** A screen dropped at a new place on the board; moving another layer's screen selects it. */
  function moveScreen(layerId: string, position: { x: number; y: number }) {
    if (layerId === activeLayerId) {
      screenSave.editScreen(position);
      return;
    }
    const screen = section.layers.find((layer) => layer.id === layerId)?.screen;
    if (!screen) return;
    saveInactiveScreen(layerId, { ...screen, ...position });
    onSelectLayer(layerId);
  }

  /** The component's preview as an SVG image on the board, centred on (`x`, `y`). */
  async function placeComponentImage(component: DesignComponent, x: number, y: number) {
    if (!api) return;
    if (component.previewStatus !== 'ready' || !component.previewHtml) {
      toast.error(`“${component.name}” has no preview yet to place as an image.`);
      return;
    }
    const device = componentDevice(sections, component.id) ?? 'phone';
    const width = SCREEN_SIZES[device].width - SKETCH_PADDING * 2;
    try {
      const [image, { convertToExcalidrawElements, CaptureUpdateAction }] = await Promise.all([
        componentSvg(component.previewHtml, width),
        import('@excalidraw/excalidraw')
      ]);
      const { offsetLeft, offsetTop, scrollX, scrollY, zoom } = api.getAppState();
      const fileId = crypto.randomUUID() as FileId;
      api.addFiles([
        {
          id: fileId,
          dataURL: image.dataURL as DataURL,
          mimeType: 'image/svg+xml',
          created: Date.now()
        }
      ]);
      const [element] = tagUntagged(
        convertToExcalidrawElements([
          {
            type: 'image',
            fileId,
            x: (x - offsetLeft) / zoom.value - scrollX - image.width / 2,
            y: (y - offsetTop) / zoom.value - scrollY - image.height / 2,
            width: image.width,
            height: image.height
          }
        ]),
        drawingLayerRef.current
      );
      api.updateScene({
        elements: [...api.getSceneElementsIncludingDeleted(), element],
        appState: { selectedElementIds: { [element.id]: true } },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY
      });
    } catch {
      toast.error(`Couldn't place “${component.name}” as an image`);
    }
  }

  /** An AI render as an image filling its frame, above the elements it was rendered from. */
  async function placeFrameRender(frameId: string, render: FittedRender, prompt: string) {
    if (!api) return;
    const frame = api.getSceneElements().find((element) => element.id === frameId);
    if (frame?.type !== 'frame') {
      toast.error('The frame was removed before its render finished.');
      return;
    }
    const { convertToExcalidrawElements, CaptureUpdateAction } =
      await import('@excalidraw/excalidraw');
    const fileId = crypto.randomUUID() as FileId;
    api.addFiles([
      {
        id: fileId,
        dataURL: render.dataURL as DataURL,
        mimeType: render.mimeType,
        created: Date.now()
      }
    ]);
    const [element] = tagUntagged(
      convertToExcalidrawElements([
        {
          type: 'image',
          fileId,
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height,
          frameId: frame.id,
          customData: { aiRender: { prompt } satisfies AiRenderData }
        }
      ]),
      drawingLayerRef.current
    );
    api.updateScene({
      elements: [...api.getSceneElementsIncludingDeleted(), element],
      appState: { selectedElementIds: { [element.id]: true } },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY
    });
  }

  function handleComponentDrop(drop: BoardDrop, value: string) {
    const drag = parseNodeDrag(value);
    const component = drag && 'componentId' in drag ? componentsById.get(drag.componentId) : null;
    if (!component) return;
    if (drop.kind === 'screen') {
      const { layer, target } = drop;
      insertComponent(
        layer,
        component,
        target.parentId,
        target.kind === 'slot' ? target.index : undefined
      );
    } else {
      void placeComponentImage(component, drop.x, drop.y);
    }
  }

  /** Click-to-add: into the selected mockup, else onto the middle of the board as an image. */
  function addComponent(component: DesignComponent) {
    if (activeLayer?.screen && mockupSelected) {
      insertComponent(activeLayer, component, null);
      return;
    }
    const rect = boardRef.current?.getBoundingClientRect();
    if (rect) {
      void placeComponentImage(component, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  }

  useEffect(() => {
    const sectionId = section.id;
    function commit() {
      const snapshot = latestRef.current;
      if (!snapshot) return;
      latestRef.current = null;
      updateSectionCache(sectionId, (current) => ({
        ...current,
        files: snapshot.files,
        layers: current.layers.map((layer) =>
          snapshot.layers[layer.id] ? { ...layer, elements: snapshot.layers[layer.id] } : layer
        )
      }));
    }
    const unregister = registerCanvasCommit(commit);
    return () => {
      unregister();
      commit();
    };
  }, [section.id]);

  useEffect(() => {
    if (!api) return;
    const previous = drawingLayerRef.current;
    drawingLayerRef.current = drawingLayerId;
    const tagged = tagUntagged(api.getSceneElementsIncludingDeleted(), previous);
    api.updateScene({
      elements: toDisplay(tagged, activeLayerId),
      captureUpdate: SKIP_HISTORY
    });
  }, [api, activeLayerId, drawingLayerId]);

  useEffect(() => {
    if (!api) return;
    const known = new Set(layerIdsKey.split(','));
    const elements = api.getSceneElementsIncludingDeleted();
    const kept = elements.filter((element) => {
      const owner = layerOf(element);
      return !owner || known.has(owner);
    });
    if (kept.length === elements.length) return;
    api.updateScene({ elements: kept, captureUpdate: SKIP_HISTORY });
  }, [api, layerIdsKey]);

  return (
    <div className='relative h-full w-full overflow-hidden'>
      <HeaderPortal slotId={HEADER_ACTIONS_START_SLOT_ID}>
        <div className='flex items-center gap-2'>
          <HeaderIconButton
            label='Undo'
            icon={Icons.arrowBackUp}
            disabled={!history?.canUndo}
            onClick={history?.undo}
          />
          <HeaderIconButton
            label='Redo'
            icon={Icons.arrowForwardUp}
            disabled={!history?.canRedo}
            onClick={history?.redo}
          />
          <HeaderIconButton
            label='Keyboard shortcuts'
            icon={Icons.help}
            onClick={() => setShortcutsOpen(true)}
          />
          <CanvasExportMenu
            getScene={
              api
                ? () => ({ elements: undimmed(api.getSceneElements()), files: api.getFiles() })
                : null
            }
            fileName={section.title || 'design'}
          />
        </div>
      </HeaderPortal>
      <div ref={screensRef} className='absolute inset-0 z-0'>
        <ScreensFlow
          section={section}
          activeLayerId={activeLayerId}
          viewport={viewport ?? DEFAULT_VIEWPORT}
          interactive={false}
          movingScreen={screenMove.moving}
          activeScreenSelected={mockupSelected}
          onToggleLayout={onEditLayout}
          drawIntoLayout={drawIntoLayout.state}
          drawnOverLayerIds={drawIntoLayout.drawnOver}
          selectedNodeId={selectedNode?.id ?? null}
          editingPreviewId={editingPreview?.instanceId ?? null}
        />
      </div>
      <div
        ref={boardRef}
        className={cn('absolute inset-0 z-10', screenMove.cursorClassName)}
        onPointerDownCapture={handlePointerDown}
        onPointerUpCapture={handlePointerUp}
        onPointerCancelCapture={screenMove.cancel}
        onPointerMoveCapture={handlePointerMove}
        onDoubleClickCapture={handleDoubleClick}
        onPointerLeave={hover.clear}
        {...componentDrop.dropProps}
      >
        <Whiteboard
          initialScene={initialScene}
          onSceneChange={handleSceneChange}
          onApiReady={setApi}
          onHistoryChange={setHistory}
          onHelpRequest={() => setShortcutsOpen(true)}
          hideMainMenu
          toolbarItems={
            <>
              {mockupTool.toolbarItem}
              <ComponentsToolbarButton
                open={componentsOpen}
                onToggle={() => setComponentsOpen((open) => !open)}
              />
            </>
          }
          onDiagramFlowPrompt={generateMermaid}
          theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
          transparent
          camera={viewport ? toWhiteboardCamera(viewport) : undefined}
          onCameraChange={(camera) => {
            hover.clear();
            setCamera(section.id, fromWhiteboardCamera(camera));
          }}
        />
        {editingPreview ? (
          <PreviewLayoutOverlay
            key={editingPreview.instanceId}
            instanceId={editingPreview.instanceId}
            html={editingPreview.html}
            containerRef={boardRef}
            boardHasSelection={() =>
              Boolean(api && Object.keys(api.getAppState().selectedElementIds).length)
            }
            onChange={(html) => previewSaves.savePreview(editingPreview.componentId, html)}
            onSelectionChange={handlePreviewSelection}
            onOpenEditor={() => onEditComponent(editingPreview.instanceId)}
          />
        ) : null}
      </div>
      {hover.overlay}
      <FrameRenderPanel
        api={api}
        screensRef={screensRef}
        describeScreens={(layerIds) =>
          screenOutline(
            layerIds.flatMap((id) => section.layers.filter((layer) => layer.id === id)),
            componentsById
          )
        }
        onRendered={(frameId, render, prompt) => void placeFrameRender(frameId, render, prompt)}
      />
      {mockupTool.ghost}
      {componentDrop.indicator}
      {componentsOpen ? (
        <ComponentsPanel
          className='absolute top-3 right-3 z-20 max-h-[calc(100%-5rem)]'
          hint='Drop on a screen to insert it, or on the board as an image.'
          onAdd={addComponent}
          onClose={() => setComponentsOpen(false)}
        />
      ) : null}
      {activeLayer && screen && selectedNode ? (
        <PropertiesPanel
          className={cn(
            'absolute top-3 z-20 max-h-[calc(100%-5rem)]',
            componentsOpen ? 'right-[19.5rem]' : 'right-3'
          )}
          target={{ kind: 'node', node: selectedNode }}
          layer={activeLayer}
          screen={screen}
          screens={otherScreens}
          onScreenChange={screenSave.editScreen}
          onClose={() => setSelectedNodeId(null)}
          onEditComponent={onEditComponent}
        />
      ) : null}
      <SaveIndicator
        state={combineSaveStates(
          combineSaveStates(saveState, screenSave.state),
          previewSaves.state
        )}
      />
      <CanvasShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

interface HeaderIconButtonProps {
  label: string;
  icon: Icon;
  disabled?: boolean;
  onClick?: () => void;
}

function HeaderIconButton({
  label,
  icon: IconComponent,
  disabled,
  onClick
}: HeaderIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type='button'
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={headerIconButtonClassName(
              'disabled:pointer-events-none disabled:opacity-40'
            )}
          />
        }
      >
        <IconComponent stroke={1.5} />
      </TooltipTrigger>
      <TooltipContent side='bottom'>{label}</TooltipContent>
    </Tooltip>
  );
}

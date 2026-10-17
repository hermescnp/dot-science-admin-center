'use client';

import '@excalidraw/excalidraw/index.css';

import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  Excalidraw,
  getSceneVersion,
  TTDDialog
} from '@excalidraw/excalidraw';
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  NormalizedZoomValue
} from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject
} from 'react';
import { createPortal } from 'react-dom';

import { AiFrameTool } from './ai-frame-tool';
import { diagramFrameName, mermaidTitle, wrapInFrame } from './diagram-flow-frame';
import { PrimitiveFormsTool } from './primitive-forms-tool';
import { TOOLBAR_BUTTON_CLASS_NAME } from './toolbar-button';
import { ToolbarTooltips } from './toolbar-tooltips';

export interface WhiteboardScene {
  elements: readonly ExcalidrawElement[];
  files: BinaryFiles;
  appState?: Partial<Pick<AppState, 'viewBackgroundColor'>>;
}

/** Excalidraw viewport: `x`/`y` are its scrollX/scrollY (scene units), `zoom` its scale. */
export interface WhiteboardCamera {
  x: number;
  y: number;
  zoom: number;
}

export interface WhiteboardProps {
  initialScene?: WhiteboardScene | null;
  /** Fires only when elements or files change, not on pointer moves or selection. */
  onSceneChange?: (scene: WhiteboardScene) => void;
  theme?: 'light' | 'dark';
  /** Transparent canvas so the board can sit over other content (e.g. a graph). */
  transparent?: boolean;
  /** Controlled viewport, for syncing the board with an underlying canvas's camera. */
  camera?: WhiteboardCamera;
  onCameraChange?: (camera: WhiteboardCamera) => void;
  /** Read-only rendering without the editing UI. */
  viewModeEnabled?: boolean;
  onApiReady?: (api: ExcalidrawImperativeAPI) => void;
  /** Replaces Excalidraw's floating undo/redo buttons with host-rendered controls. */
  onHistoryChange?: (history: WhiteboardHistory) => void;
  /** Replaces Excalidraw's help button and `?` dialog with a host-rendered one. */
  onHelpRequest?: () => void;
  /** Hides Excalidraw's top-left file menu when the host provides its own export controls. */
  hideMainMenu?: boolean;
  /** Host tools appended to the shape toolbar, after the sticky note; style buttons with `TOOLBAR_BUTTON_CLASS_NAME`. */
  toolbarItems?: ReactNode;
  /** Writes Mermaid from a description; adds a "Text to diagram" tab to the Diagram Flow dialog. */
  onDiagramFlowPrompt?: (prompt: string) => Promise<string>;
  className?: string;
}

export interface WhiteboardHistory {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

const STICKY_SIZE = 200;

const STICKY_ICON = (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={1.75}
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M5 4h14a1 1 0 0 1 1 1v9l-6 6H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z' />
    <path d='M14 20v-5a1 1 0 0 1 1-1h5' />
  </svg>
);

const DIAGRAM_FLOW_ICON = (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={1.75}
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <rect x='8.5' y='3' width='7' height='5' rx='1' />
    <rect x='3' y='16' width='7' height='5' rx='1' />
    <rect x='14' y='16' width='7' height='5' rx='1' />
    <path d='M12 8v4M6.5 16v-2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2' />
  </svg>
);

/** Host tools trail the shape toolbar row. */
function appendToToolbar(wrapper: HTMLElement, node: HTMLElement) {
  wrapper.querySelector('.App-toolbar .App-toolbar__divider')?.parentElement?.append(node);
}

/** Primitive forms take the place of Excalidraw's (hidden) rectangle tool. */
function placeBeforeRectangle(wrapper: HTMLElement, node: HTMLElement) {
  wrapper
    .querySelector('.App-toolbar [data-testid="toolbar-rectangle"]')
    ?.closest('.ToolIcon')
    ?.before(node);
}

/** The AI frame tool comes right after the selection tool. */
function placeAfterSelection(wrapper: HTMLElement, node: HTMLElement) {
  wrapper
    .querySelector('.App-toolbar [data-testid="toolbar-selection"]')
    ?.closest('.ToolIcon')
    ?.after(node);
}

/**
 * Excalidraw has no API for custom toolbar tools, so this returns a node placed in its shape
 * toolbar row (re-attached whenever Excalidraw remounts the toolbar) to portal into.
 */
function useToolbarSlot(
  wrapperRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  className: string,
  place: (wrapper: HTMLElement, node: HTMLElement) => void
): HTMLElement | null {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !enabled) return;
    const node = document.createElement('div');
    node.className = className;
    node.style.display = 'contents';
    const attach = () => {
      if (!node.isConnected) place(wrapper, node);
    };
    attach();
    const observer = new MutationObserver(attach);
    observer.observe(wrapper, { childList: true, subtree: true });
    setSlot(node);
    return () => {
      observer.disconnect();
      node.remove();
      setSlot(null);
    };
  }, [wrapperRef, enabled, className, place]);

  return slot;
}

/**
 * Excalidraw's API exposes no undo/redo, so this drives its (hidden) history buttons and
 * mirrors their `disabled` state.
 */
function useHistoryBridge(
  wrapperRef: RefObject<HTMLDivElement | null>,
  onHistoryChange: ((history: WhiteboardHistory) => void) | undefined
) {
  const listenerRef = useRef(onHistoryChange);
  useLayoutEffect(() => {
    listenerRef.current = onHistoryChange;
  });
  const enabled = Boolean(onHistoryChange);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !enabled) return;
    const button = (action: 'undo' | 'redo') =>
      wrapper.querySelector<HTMLButtonElement>(`[data-testid='button-${action}']`);
    const history = {
      undo: () => button('undo')?.click(),
      redo: () => button('redo')?.click()
    };
    let last = '';
    const emit = () => {
      const canUndo = button('undo')?.disabled === false;
      const canRedo = button('redo')?.disabled === false;
      const key = `${canUndo}:${canRedo}`;
      if (key === last) return;
      last = key;
      listenerRef.current?.({ ...history, canUndo, canRedo });
    };
    emit();
    const observer = new MutationObserver(emit);
    observer.observe(wrapper, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled']
    });
    return () => observer.disconnect();
  }, [wrapperRef, enabled]);
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/** Captures `?` before Excalidraw's document-level shortcut handler opens its own dialog. */
function useHelpShortcut(onHelpRequest: (() => void) | undefined) {
  const listenerRef = useRef(onHelpRequest);
  useLayoutEffect(() => {
    listenerRef.current = onHelpRequest;
  });
  const enabled = Boolean(onHelpRequest);

  useEffect(() => {
    if (!enabled) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== '?' || isEditableTarget(event.target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      listenerRef.current?.();
    }
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled]);
}

function sceneSignature(elements: readonly ExcalidrawElement[], files: BinaryFiles) {
  return `${getSceneVersion(elements)}:${Object.keys(files).length}`;
}

export function Whiteboard({
  initialScene,
  onSceneChange,
  theme = 'light',
  transparent = false,
  camera,
  onCameraChange,
  viewModeEnabled = false,
  onApiReady,
  onHistoryChange,
  onHelpRequest,
  hideMainMenu = false,
  toolbarItems,
  onDiagramFlowPrompt,
  className
}: WhiteboardProps) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const toolbarSlot = useToolbarSlot(
    wrapperRef,
    !viewModeEnabled,
    'App-toolbar__host-tools',
    appendToToolbar
  );
  const primitivesSlot = useToolbarSlot(
    wrapperRef,
    !viewModeEnabled,
    'App-toolbar__primitives-slot',
    placeBeforeRectangle
  );
  const aiFrameSlot = useToolbarSlot(
    wrapperRef,
    !viewModeEnabled,
    'App-toolbar__ai-frame-slot',
    placeAfterSelection
  );
  useHistoryBridge(wrapperRef, onHistoryChange);
  useHelpShortcut(onHelpRequest);
  const signatureRef = useRef(
    initialScene ? sceneSignature(initialScene.elements, initialScene.files) : ''
  );
  const cameraRef = useRef<WhiteboardCamera | null>(camera ?? null);
  const callbacksRef = useRef({ onSceneChange, onCameraChange, onApiReady, onDiagramFlowPrompt });
  useLayoutEffect(() => {
    callbacksRef.current = { onSceneChange, onCameraChange, onApiReady, onDiagramFlowPrompt };
  });
  const diagramFlowAi = Boolean(onDiagramFlowPrompt);
  /** While the Diagram Flow dialog is open: the element ids before it opened and the AI prompt used. */
  const diagramFlowRef = useRef<{ before: Set<string>; prompt: string | null } | null>(null);

  useEffect(() => {
    if (api) callbacksRef.current.onApiReady?.(api);
  }, [api]);

  const [initialData] = useState(() => ({
    elements: initialScene?.elements ?? [],
    files: initialScene?.files ?? {},
    // Start at the controlled camera; mounting at the default would report it and overwrite it.
    appState: {
      ...initialScene?.appState,
      ...(transparent ? { viewBackgroundColor: 'transparent' } : {}),
      ...(camera
        ? {
            scrollX: camera.x,
            scrollY: camera.y,
            zoom: { value: camera.zoom as NormalizedZoomValue }
          }
        : {})
    },
    scrollToContent: !camera
  }));

  useEffect(() => {
    if (!api || !camera) return;
    const current = cameraRef.current;
    // Cameras round-trip through other coordinate systems, so allow float drift.
    if (
      current &&
      Math.abs(current.x - camera.x) < 1e-6 &&
      Math.abs(current.y - camera.y) < 1e-6 &&
      Math.abs(current.zoom - camera.zoom) < 1e-9
    ) {
      return;
    }
    cameraRef.current = camera;
    api.updateScene({
      appState: {
        scrollX: camera.x,
        scrollY: camera.y,
        zoom: { value: camera.zoom as NormalizedZoomValue }
      },
      captureUpdate: CaptureUpdateAction.NEVER
    });
  }, [api, camera]);

  function handleChange(
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles
  ) {
    const { onSceneChange: onScene, onCameraChange: onCamera } = callbacksRef.current;

    const signature = sceneSignature(elements, files);
    if (signature !== signatureRef.current) {
      signatureRef.current = signature;
      onScene?.({
        elements,
        files,
        appState: transparent ? {} : { viewBackgroundColor: appState.viewBackgroundColor }
      });
    }

    const next = { x: appState.scrollX, y: appState.scrollY, zoom: appState.zoom.value };
    const prev = cameraRef.current;
    if (!prev || prev.x !== next.x || prev.y !== next.y || prev.zoom !== next.zoom) {
      cameraRef.current = next;
      onCamera?.(next);
    }

    trackDiagramFlow(elements, appState);
  }

  /** Excalidraw inserts the diagram and closes the dialog; the new elements then get a frame. */
  function trackDiagramFlow(elements: readonly ExcalidrawElement[], appState: AppState) {
    const open = appState.openDialog?.name === 'ttd';
    if (open && !diagramFlowRef.current) {
      diagramFlowRef.current = {
        before: new Set(elements.map((element) => element.id)),
        prompt: null
      };
      return;
    }
    if (open || !diagramFlowRef.current) return;
    const { before, prompt } = diagramFlowRef.current;
    diagramFlowRef.current = null;
    const inserted = new Set(
      elements.filter((element) => !element.isDeleted && !before.has(element.id)).map((e) => e.id)
    );
    // Excalidraw stores the Mermaid definition right after closing the dialog.
    if (inserted.size) requestAnimationFrame(() => frameDiagram(inserted, prompt));
  }

  function frameDiagram(ids: ReadonlySet<string>, prompt: string | null) {
    if (!api) return;
    const { frame, elements } = wrapInFrame(
      api.getSceneElementsIncludingDeleted(),
      ids,
      diagramFrameName(prompt || mermaidTitle())
    );
    api.updateScene({
      elements,
      appState: { selectedElementIds: { [frame.id]: true } },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY
    });
  }

  function addStickyNote() {
    if (!api) return;
    const { scrollX, scrollY, zoom, width, height } = api.getAppState();
    const x = -scrollX + width / 2 / zoom.value - STICKY_SIZE / 2;
    const y = -scrollY + height / 2 / zoom.value - STICKY_SIZE / 2;
    const note = convertToExcalidrawElements([
      {
        type: 'rectangle',
        x,
        y,
        width: STICKY_SIZE,
        height: STICKY_SIZE,
        backgroundColor: '#ffec99',
        strokeColor: '#f08c00',
        fillStyle: 'solid',
        roundness: { type: 3 },
        label: { text: 'Note', fontSize: 20, strokeColor: '#1e1e1e' }
      }
    ]);
    api.updateScene({
      elements: [...api.getSceneElementsIncludingDeleted(), ...note],
      appState: { selectedElementIds: { [note[0].id]: true } },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY
    });
  }

  /** Excalidraw's Mermaid dialog, renamed "Diagram Flow" by the package patch. */
  function openDiagramFlow() {
    api?.updateScene({
      appState: { openDialog: { name: 'ttd', tab: diagramFlowAi ? 'text-to-diagram' : 'mermaid' } }
    });
  }

  async function generateDiagram(prompt: string) {
    if (diagramFlowRef.current) diagramFlowRef.current.prompt = prompt;
    try {
      const mermaid = await callbacksRef.current.onDiagramFlowPrompt?.(prompt);
      return { generatedResponse: mermaid };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Generation failed') };
    }
  }

  return (
    <div
      ref={wrapperRef}
      className={[
        'whiteboard',
        className,
        '[&_.default-sidebar-trigger]:hidden!',
        // Diagram flow has its own toolbar button: drop it and its "Generate" heading from "More tools".
        '[&_[data-testid=toolbar-embeddable]~[data-testid=toolbar-embeddable]]:hidden!',
        '[&_[data-testid=toolbar-embeddable]~div:has(+[data-testid=toolbar-embeddable])]:hidden!',
        onHistoryChange && '[&_.undo-redo-buttons]:hidden!',
        onHelpRequest && '[&_.help-icon]:hidden!',
        hideMainMenu && '[&_.main-menu-trigger]:hidden!'
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ height: '100%', width: '100%' }}
    >
      <Excalidraw
        excalidrawAPI={setApi}
        initialData={initialData}
        onChange={handleChange}
        theme={theme}
        viewModeEnabled={viewModeEnabled}
        zenModeEnabled={viewModeEnabled}
        UIOptions={{ canvasActions: { changeViewBackgroundColor: !transparent } }}
      >
        {diagramFlowAi ? <TTDDialog onTextSubmit={generateDiagram} /> : null}
      </Excalidraw>
      {toolbarSlot
        ? createPortal(
            <>
              <button
                type='button'
                onClick={addStickyNote}
                title='Sticky note'
                aria-label='Sticky note'
                className={TOOLBAR_BUTTON_CLASS_NAME}
              >
                <div className='ToolIcon__icon' aria-hidden='true'>
                  {STICKY_ICON}
                </div>
              </button>
              <button
                type='button'
                onClick={openDiagramFlow}
                title='Diagram flow'
                aria-label='Diagram flow'
                className={TOOLBAR_BUTTON_CLASS_NAME}
              >
                <div className='ToolIcon__icon' aria-hidden='true'>
                  {DIAGRAM_FLOW_ICON}
                </div>
              </button>
              {toolbarItems}
            </>,
            toolbarSlot
          )
        : null}
      {primitivesSlot ? createPortal(<PrimitiveFormsTool api={api} />, primitivesSlot) : null}
      {aiFrameSlot ? createPortal(<AiFrameTool api={api} />, aiFrameSlot) : null}
      {viewModeEnabled ? null : <ToolbarTooltips containerRef={wrapperRef} />}
    </div>
  );
}

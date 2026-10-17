'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type WheelEvent as ReactWheelEvent
} from 'react';
import {
  clampedStep,
  computeDragRect,
  contains,
  DRAG_THRESHOLD,
  HISTORY_LIMIT,
  MIN_SIZE,
  sameRect,
  snapTargets,
  type LayoutHandle as Handle,
  type LayoutPoint as Point,
  type LayoutRect as Rect
} from '../../lib/layout-drag';
import {
  applyPreviewElementGeometry,
  applyRenderedGeometry,
  findPreviewRoot,
  fitRenderedRoot,
  freezePreviewLayout,
  freezeRenderedPreview,
  isPreviewLayoutFrozen,
  measurePreviewElement,
  measurePreviewLayout,
  PREVIEW_ELEMENT_ATTRIBUTE,
  removePreviewElement,
  setPreviewRootHeight,
  setRenderedRootHeight,
  tagPreviewElements,
  type PreviewElementGeometry
} from '../../lib/preview-layout';
import { isTyping } from './canvas-navigation';
import { handleCursor, PreviewLayoutMarks, PreviewRootMarks } from './preview-layout-marks';

/** Elements can move down past the preview's end: the preview grows to hold them. */
const OPEN_HEIGHT = 1_000_000;

interface Frame {
  root: HTMLElement;
  /** The iframe's box on screen. */
  box: DOMRect;
  /** Screen pixels per frame pixel. */
  scale: number;
  width: number;
  height: number;
  /** The iframe's position in the overlay's container, in screen pixels. */
  offsetX: number;
  offsetY: number;
}

interface DragState {
  id: string;
  element: Element;
  handle: Handle | 'move';
  pointerId: number;
  startPoint: Point;
  started: boolean;
  startPage: Rect;
  startGeometry: PreviewElementGeometry;
  geometry: PreviewElementGeometry;
  bounds: Rect;
  targetsX: number[];
  targetsY: number[];
  /** Set when this drag froze the layout: every element's geometry, saved along with the move. */
  frozen: Record<string, PreviewElementGeometry> | null;
  /** Inline styles before the drag, restored if it is cancelled. */
  restore: Map<Element, string | null>;
  restoreLayout: string | null;
  /** Selected instead when the press ends without dragging. */
  clickSelects: Element | null;
}

/** Pulling the root's height handle. */
interface RootDragState {
  pointerId: number;
  startY: number;
  startHeight: number;
  height: number;
  restore: string | null;
}

interface DragView {
  page: Rect;
  guidesX: number[];
  guidesY: number[];
  handle: Handle | 'move';
}

function frameElement(instanceId: string) {
  return document.querySelector<HTMLIFrameElement>(
    `iframe[data-preview-frame="${CSS.escape(instanceId)}"]`
  );
}

function readFrame(instanceId: string, container: HTMLElement | null): Frame | null {
  const iframe = frameElement(instanceId);
  const doc = iframe?.contentDocument;
  const content = doc?.getElementById('wf-root');
  const root = content ? findPreviewRoot(content) : null;
  if (!iframe || !doc || !root || !container) return null;
  const width = doc.documentElement.clientWidth;
  if (!width) return null;
  const box = iframe.getBoundingClientRect();
  const containerBox = container.getBoundingClientRect();
  return {
    root,
    box,
    scale: box.width / width,
    width,
    height: doc.documentElement.clientHeight,
    offsetX: box.left - containerBox.left,
    offsetY: box.top - containerBox.top
  };
}

/** An element's box in frame pixels (the iframe's viewport). */
function pageRectOf(element: Element): Rect {
  const box = element.getBoundingClientRect();
  return { x: box.left, y: box.top, width: box.width, height: box.height };
}

function toPage(frame: Frame, event: { clientX: number; clientY: number }): Point {
  return {
    x: (event.clientX - frame.box.left) / frame.scale,
    y: (event.clientY - frame.box.top) / frame.scale
  };
}

function boundsOf(root: HTMLElement): Rect {
  const rect = pageRectOf(root);
  return { x: rect.x, y: rect.y, width: rect.width, height: OPEN_HEIGHT };
}

function taggedElements(root: HTMLElement) {
  return Array.from(root.querySelectorAll(`[${PREVIEW_ELEMENT_ATTRIBUTE}]`));
}

function elementById(root: HTMLElement, id: string | null) {
  return id
    ? (taggedElements(root).find(
        (element) => element.getAttribute(PREVIEW_ELEMENT_ATTRIBUTE) === id
      ) ?? null)
    : null;
}

function depthOf(element: Element, root: HTMLElement) {
  let depth = 0;
  for (let node = element.parentElement; node && node !== root; node = node.parentElement) {
    depth += 1;
  }
  return depth;
}

/** The innermost visible element under the point; among equals, the one painted last. */
function hitTest(root: HTMLElement, point: Point) {
  let best: Element | null = null;
  let bestDepth = -1;
  for (const element of taggedElements(root)) {
    const rect = pageRectOf(element);
    if (rect.width <= 0 || rect.height <= 0 || !contains(rect, point)) continue;
    const depth = depthOf(element, root);
    if (depth >= bestDepth) {
      best = element;
      bestDepth = depth;
    }
  }
  return best;
}

function parentElementOf(element: Element) {
  return element.parentElement?.closest(`[${PREVIEW_ELEMENT_ATTRIBUTE}]`) ?? null;
}

function describe(element: Element) {
  const name = element.localName;
  if (name === 'img' || name === 'svg' || name === 'hr') return name;
  const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  return text ? `${name} · ${text.length > 24 ? `${text.slice(0, 24)}…` : text}` : name;
}

interface PreviewLayoutOverlayProps {
  /** The component instance whose preview is edited; its frame carries this id. */
  instanceId: string;
  /** The component's preview HTML. */
  html: string;
  /** The element the overlay is positioned in. */
  containerRef: RefObject<HTMLElement | null>;
  /** Drawings selected on the board keep the keyboard for the board. */
  boardHasSelection: () => boolean;
  onChange: (html: string) => void;
  onSelectionChange: (selected: boolean) => void;
  /** Double click: open the component in the layout editor. */
  onOpenEditor: () => void;
}

/**
 * Layout editing laid over a component instance's preview, cover-editor style: hover to see
 * elements, click to select, drag to move, pull the handles to resize, with snapping guides. The
 * first edit freezes the preview into absolute positions; every edit is written back into the
 * component's preview HTML, so all its instances show it.
 */
export function PreviewLayoutOverlay({
  instanceId,
  html,
  containerRef,
  boardHasSelection,
  onChange,
  onSelectionChange,
  onOpenEditor
}: PreviewLayoutOverlayProps) {
  const tagged = useMemo(() => tagPreviewElements(html), [html]);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [, refresh] = useReducer((count: number) => count + 1, 0);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragView, setDragView] = useState<DragView | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const rootDragRef = useRef<RootDragState | null>(null);
  const [rootDragging, setRootDragging] = useState(false);
  const [rootHover, setRootHover] = useState(false);
  const originalRectsRef = useRef(new Map<string, Rect>());
  const pastRef = useRef<string[]>([]);
  const futureRef = useRef<string[]>([]);

  const latestRef = useRef({ tagged, selectedId, onChange, boardHasSelection });
  useEffect(() => {
    latestRef.current = { tagged, selectedId, onChange, boardHasSelection };
  });

  const readCurrentFrame = useCallback(
    () => readFrame(instanceId, containerRef.current),
    [instanceId, containerRef]
  );

  useEffect(() => {
    onSelectionChange(selectedId !== null);
  }, [onSelectionChange, selectedId]);
  useEffect(() => () => onSelectionChange(false), [onSelectionChange]);

  // The frame's content is replaced after each change: measure again once it is painted.
  useLayoutEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      refresh();
      second = requestAnimationFrame(refresh);
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [tagged]);

  // The preview moves with the board's camera, the screen's scroll and its own growth.
  useEffect(() => {
    let frameId = 0;
    let last = '';
    const tick = () => {
      const frame = readCurrentFrame();
      const key = frame
        ? [frame.offsetX, frame.offsetY, frame.box.width, frame.box.height, frame.height].join()
        : '';
      if (key !== last) {
        last = key;
        refresh();
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [readCurrentFrame]);

  const commit = useCallback((next: string) => {
    const current = latestRef.current.tagged;
    if (next === current) return;
    pastRef.current.push(current);
    if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
    futureRef.current = [];
    latestRef.current.onChange(next);
  }, []);

  const undo = useCallback(() => {
    const previous = pastRef.current.pop();
    if (previous === undefined) return;
    futureRef.current.push(latestRef.current.tagged);
    latestRef.current.onChange(previous);
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (next === undefined) return;
    pastRef.current.push(latestRef.current.tagged);
    latestRef.current.onChange(next);
  }, []);

  const select = useCallback((element: Element | null) => {
    const id = element?.getAttribute(PREVIEW_ELEMENT_ATTRIBUTE) ?? null;
    if (id && element && !originalRectsRef.current.has(id)) {
      originalRectsRef.current.set(id, pageRectOf(element));
    }
    setSelectedId(id);
  }, []);

  const releasePointer = useCallback((pointerId: number) => {
    if (overlayRef.current?.hasPointerCapture(pointerId)) {
      overlayRef.current.releasePointerCapture(pointerId);
    }
  }, []);

  /** Ends a height drag; the height is saved unless it is cancelled or unchanged. */
  const endRootDrag = useCallback(
    (save: boolean) => {
      const drag = rootDragRef.current;
      if (!drag) return;
      rootDragRef.current = null;
      releasePointer(drag.pointerId);
      setRootDragging(false);
      if (save && drag.height !== drag.startHeight) {
        commit(setPreviewRootHeight(latestRef.current.tagged, drag.height));
        return;
      }
      const root = readCurrentFrame()?.root;
      if (!root) return;
      if (drag.restore === null) root.removeAttribute('style');
      else root.setAttribute('style', drag.restore);
    },
    [commit, readCurrentFrame, releasePointer]
  );

  const cancelDrag = useCallback(() => {
    if (rootDragRef.current) {
      endRootDrag(false);
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (drag.started) {
      for (const [element, style] of drag.restore) {
        if (style === null) element.removeAttribute('style');
        else element.setAttribute('style', style);
      }
      const root = readCurrentFrame()?.root;
      if (root && drag.restoreLayout === null) root.removeAttribute('data-wf-layout');
    }
    releasePointer(drag.pointerId);
    setDragView(null);
  }, [endRootDrag, readCurrentFrame, releasePointer]);

  useEffect(() => () => cancelDrag(), [cancelDrag]);

  /** Freezes the layout if needed and records where the element and its snap targets start. */
  const beginDrag = useCallback(
    (drag: DragState) => {
      const frame = readCurrentFrame();
      if (!frame) return false;
      const { root } = frame;
      for (const element of [root, ...taggedElements(root)]) {
        drag.restore.set(element, element.getAttribute('style'));
      }
      drag.restoreLayout = root.getAttribute('data-wf-layout');
      if (!isPreviewLayoutFrozen(latestRef.current.tagged)) {
        drag.frozen = measurePreviewLayout(root);
        freezeRenderedPreview(root, drag.frozen);
      }
      const startGeometry = measurePreviewElement(drag.element);
      if (!startGeometry) return false;
      drag.startPage = pageRectOf(drag.element);
      drag.startGeometry = startGeometry;
      drag.geometry = startGeometry;
      drag.bounds = boundsOf(root);
      const others = taggedElements(root)
        .filter((other) => other !== drag.element && !drag.element.contains(other))
        .map(pageRectOf);
      Object.assign(drag, snapTargets(pageRectOf(root), others));
      drag.started = true;
      return true;
    },
    [readCurrentFrame]
  );

  const updateDrag = useCallback(
    (frame: Frame, drag: DragState, point: Point, event: ReactPointerEvent) => {
      const start = drag.startPage;
      const {
        rect: page,
        guidesX,
        guidesY
      } = computeDragRect({
        start,
        handle: drag.handle,
        dx: point.x - drag.startPoint.x,
        dy: point.y - drag.startPoint.y,
        targetsX: drag.targetsX,
        targetsY: drag.targetsY,
        bounds: drag.bounds,
        snap: !(event.metaKey || event.ctrlKey),
        keepRatio: event.shiftKey,
        fromCenter: event.altKey
      });
      const startRect = drag.startGeometry.rect;
      drag.geometry = {
        parentWidth: drag.startGeometry.parentWidth,
        rect: {
          x: startRect.x + (page.x - start.x),
          y: startRect.y + (page.y - start.y),
          width: Math.max(1, startRect.width + (page.width - start.width)),
          height: Math.max(1, startRect.height + (page.height - start.height))
        }
      };
      applyRenderedGeometry(drag.element, drag.geometry);
      fitRenderedRoot(frame.root, drag.element);
      setDragView({ page, guidesX, guidesY, handle: drag.handle });
    },
    []
  );

  const finishDrag = useCallback(() => {
    if (rootDragRef.current) {
      endRootDrag(true);
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    releasePointer(drag.pointerId);
    setDragView(null);
    if (!drag.started) {
      if (drag.clickSelects) select(drag.clickSelects);
      return;
    }
    const root = readCurrentFrame()?.root;
    if (!root) return;
    const html = latestRef.current.tagged;
    const next = drag.frozen
      ? freezePreviewLayout(html, { ...drag.frozen, [drag.id]: drag.geometry }, root.offsetHeight)
      : applyPreviewElementGeometry(html, drag.id, drag.geometry, root.offsetHeight);
    commit(next);
  }, [commit, endRootDrag, readCurrentFrame, releasePointer, select]);

  const nudge = useCallback(
    (dx: number, dy: number) => {
      const frame = readCurrentFrame();
      const id = latestRef.current.selectedId;
      const element = frame ? elementById(frame.root, id) : null;
      if (!frame || !id || !element) return;
      const step = clampedStep(pageRectOf(element), boundsOf(frame.root), dx, dy);
      if (!step.dx && !step.dy) return;
      const html = latestRef.current.tagged;
      const frozen = isPreviewLayoutFrozen(html) ? null : measurePreviewLayout(frame.root);
      if (frozen) freezeRenderedPreview(frame.root, frozen);
      const geometry = measurePreviewElement(element);
      if (!geometry) return;
      const moved = {
        ...geometry,
        rect: { ...geometry.rect, x: geometry.rect.x + step.dx, y: geometry.rect.y + step.dy }
      };
      applyRenderedGeometry(element, moved);
      const height = fitRenderedRoot(frame.root, element);
      commit(
        frozen
          ? freezePreviewLayout(html, { ...frozen, [id]: moved }, height)
          : applyPreviewElementGeometry(html, id, moved, height)
      );
    },
    [commit, readCurrentFrame]
  );

  /** Deleting freezes the layout first, so the remaining elements stay where they are. */
  const removeSelected = useCallback(() => {
    const frame = readCurrentFrame();
    const id = latestRef.current.selectedId;
    if (!frame || !id || !elementById(frame.root, id)) return;
    const html = latestRef.current.tagged;
    const base = isPreviewLayoutFrozen(html)
      ? html
      : freezePreviewLayout(html, measurePreviewLayout(frame.root), frame.root.offsetHeight);
    const next = removePreviewElement(base, id);
    if (next === base) return;
    originalRectsRef.current.delete(id);
    setSelectedId(null);
    setHoverId(null);
    commit(next);
  }, [commit, readCurrentFrame]);

  // Captured before the board's document-level shortcuts, while no drawing is selected.
  useEffect(() => {
    const dragging = () => dragRef.current !== null || rootDragRef.current !== null;
    function handleKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target) || latestRef.current.boardHasSelection()) return;
      const selected = latestRef.current.selectedId;
      const modifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (event.key === 'Escape') {
        if (!dragging() && !selected) return;
        event.preventDefault();
        event.stopPropagation();
        if (dragging()) cancelDrag();
        else setSelectedId(null);
      } else if (modifier && (key === 'z' || key === 'y')) {
        const isRedo = key === 'y' || event.shiftKey;
        if (!(isRedo ? futureRef.current : pastRef.current).length) return;
        event.preventDefault();
        event.stopPropagation();
        if (dragging()) return;
        if (isRedo) redo();
        else undo();
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && !modifier && selected) {
        event.preventDefault();
        event.stopPropagation();
        if (!dragging()) removeSelected();
      } else if (event.key.startsWith('Arrow') && selected) {
        event.preventDefault();
        event.stopPropagation();
        if (dragging()) return;
        const step = event.shiftKey ? 10 : 1;
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
        const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
        nudge(dx, dy);
      }
    }
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [cancelDrag, nudge, redo, removeSelected, undo]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || dragRef.current || rootDragRef.current) return;
    const frame = readCurrentFrame();
    if (!frame) return;
    const point = toPage(frame, event);
    if ((event.target as HTMLElement).closest('[data-root-handle]')) {
      event.preventDefault();
      event.stopPropagation();
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      const { root } = frame;
      const height = root.offsetHeight;
      event.currentTarget.setPointerCapture(event.pointerId);
      rootDragRef.current = {
        pointerId: event.pointerId,
        startY: point.y,
        startHeight: height,
        height,
        restore: root.getAttribute('style')
      };
      setRootDragging(true);
      setHoverId(null);
      return;
    }
    const handle = (event.target as HTMLElement)
      .closest('[data-handle]')
      ?.getAttribute('data-handle') as Handle | null;
    const selected = elementById(frame.root, selectedId);

    let element: Element | null;
    let clickSelects: Element | null = null;
    if (handle && selected) {
      element = selected;
    } else {
      const insideSelected = selected !== null && contains(pageRectOf(selected), point);
      const innermost = hitTest(frame.root, point);
      const base = insideSelected ? selected : innermost;
      element = event.altKey && base ? (parentElementOf(base) ?? base) : base;
      // A press inside the selection drags it; a plain click there picks the element beneath.
      if (insideSelected && !event.altKey && innermost && innermost !== selected) {
        clickSelects = innermost;
      }
    }
    event.preventDefault();
    event.stopPropagation();
    if (!element) {
      setSelectedId(null);
      return;
    }
    // preventDefault keeps focus where it was; a focused field would swallow Delete and the arrows.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    select(element);
    event.currentTarget.setPointerCapture(event.pointerId);
    const empty: Rect = { x: 0, y: 0, width: 0, height: 0 };
    const emptyGeometry = { rect: empty, parentWidth: 0 };
    dragRef.current = {
      id: element.getAttribute(PREVIEW_ELEMENT_ATTRIBUTE) ?? '',
      element,
      handle: handle ?? 'move',
      pointerId: event.pointerId,
      startPoint: point,
      started: false,
      startPage: empty,
      startGeometry: emptyGeometry,
      geometry: emptyGeometry,
      bounds: empty,
      targetsX: [],
      targetsY: [],
      frozen: null,
      restore: new Map(),
      restoreLayout: null,
      clickSelects
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const frame = readCurrentFrame();
    if (!frame) return;
    const point = toPage(frame, event);
    const rootDrag = rootDragRef.current;
    if (rootDrag) {
      if (event.pointerId !== rootDrag.pointerId) return;
      const height = Math.max(
        MIN_SIZE,
        Math.round(rootDrag.startHeight + point.y - rootDrag.startY)
      );
      if (height === rootDrag.height) return;
      rootDrag.height = height;
      setRenderedRootHeight(frame.root, height);
      refresh();
      return;
    }
    const drag = dragRef.current;
    if (!drag) {
      const overHandle = Boolean((event.target as HTMLElement).closest('[data-root-handle]'));
      setRootHover(overHandle);
      if (overHandle) {
        setHoverId(null);
        return;
      }
      const selected = elementById(frame.root, selectedId);
      const element =
        selected && contains(pageRectOf(selected), point) ? selected : hitTest(frame.root, point);
      setHoverId(element?.getAttribute(PREVIEW_ELEMENT_ATTRIBUTE) ?? null);
      return;
    }
    if (event.pointerId !== drag.pointerId) return;
    if (!drag.started) {
      const travelled =
        Math.hypot(point.x - drag.startPoint.x, point.y - drag.startPoint.y) * frame.scale;
      if (travelled < DRAG_THRESHOLD) return;
      if (!beginDrag(drag)) {
        cancelDrag();
        return;
      }
      setHoverId(null);
    }
    updateDrag(frame, drag, point, event);
  }

  function ownsPointer(pointerId: number) {
    return (dragRef.current ?? rootDragRef.current)?.pointerId === pointerId;
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (ownsPointer(event.pointerId)) finishDrag();
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (ownsPointer(event.pointerId)) cancelDrag();
  }

  // The overlay sits on the board, above its canvas: the wheel still pans and zooms the board.
  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    const canvas = containerRef.current?.querySelector('canvas.excalidraw__canvas.interactive');
    canvas?.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX: event.clientX,
        clientY: event.clientY,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey
      })
    );
  }

  const frame = readCurrentFrame();
  if (!frame) return null;
  const unit = 1 / frame.scale;
  const selectedElement = elementById(frame.root, selectedId);
  const selectedRect = dragView?.page ?? (selectedElement ? pageRectOf(selectedElement) : null);
  const hoverElement =
    !dragView && hoverId !== selectedId ? elementById(frame.root, hoverId) : null;
  const hoverRect = hoverElement ? pageRectOf(hoverElement) : null;
  const originalRect = selectedId ? originalRectsRef.current.get(selectedId) : undefined;
  const moved = Boolean(
    originalRect && selectedRect && !sameRect(originalRect, selectedRect, 'position')
  );
  const resized = Boolean(
    originalRect && selectedRect && !sameRect(originalRect, selectedRect, 'size')
  );
  const cursor = rootDragging
    ? 'ns-resize'
    : dragView
      ? dragView.handle === 'move'
        ? 'grabbing'
        : handleCursor(dragView.handle)
      : hoverId && hoverId === selectedId
        ? 'move'
        : hoverId
          ? 'pointer'
          : 'default';

  return (
    <div
      ref={overlayRef}
      data-preview-layout-overlay=''
      className='absolute'
      style={{
        left: frame.offsetX,
        top: frame.offsetY,
        width: frame.box.width,
        height: frame.box.height,
        zIndex: 30,
        cursor,
        touchAction: 'none',
        userSelect: 'none'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={() => {
        setHoverId(null);
        setRootHover(false);
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpenEditor();
      }}
      onWheel={handleWheel}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: frame.width,
          height: frame.height,
          transform: `scale(${frame.scale})`,
          transformOrigin: '0 0',
          pointerEvents: 'none'
        }}
      >
        <PreviewLayoutMarks
          unit={unit}
          frameWidth={frame.width}
          frameHeight={frame.height}
          hoverRect={hoverRect}
          originalRect={originalRect ?? null}
          selectedRect={selectedElement ? selectedRect : null}
          selectedLabel={selectedElement ? describe(selectedElement) : ''}
          dragging={Boolean(dragView)}
          guidesX={dragView?.guidesX ?? []}
          guidesY={dragView?.guidesY ?? []}
          moved={moved}
          resized={resized}
        />
        <PreviewRootMarks
          unit={unit}
          rootRect={pageRectOf(frame.root)}
          active={rootDragging || (rootHover && !dragView)}
          dragging={rootDragging || Boolean(dragView)}
        />
      </div>
    </div>
  );
}

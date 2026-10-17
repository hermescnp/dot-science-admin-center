'use client';

import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { DesignSection } from '../api/types';

/** A screen being dragged, at its preview position in scene coordinates. */
export interface MovingScreen {
  layerId: string;
  x: number;
  y: number;
}

interface Press {
  layerId: string;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  dragging: boolean;
}

const DRAG_SLOP = 4;
/** Band inside the device outline, in screen pixels at 100%, that grabs the screen. */
const FRAME_BAND = 12;
/** How close to a stroke, in screen pixels, a press counts as landing on a drawing. */
const STROKE_TOLERANCE = 8;

function inside(rect: DOMRect, x: number, y: number) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Whether the press at scene point (`x`, `y`) lands on a drawing the board would pick up. */
function hitsDrawing(elements: readonly ExcalidrawElement[], x: number, y: number, zoom: number) {
  const tolerance = STROKE_TOLERANCE / zoom;
  return elements.some((element) => {
    if (element.locked || element.type === 'frame' || element.type === 'magicframe') return false;
    const pad = tolerance + element.strokeWidth / 2;
    const left = element.x - pad;
    const top = element.y - pad;
    const right = element.x + element.width + pad;
    const bottom = element.y + element.height + pad;
    if (x < left || x > right || y < top || y > bottom) return false;
    if ('points' in element) {
      const { points } = element;
      return points.some(([ax, ay], index) => {
        const [bx, by] = points[index + 1] ?? points[index];
        return segmentDistance(x - element.x, y - element.y, ax, ay, bx, by) <= pad;
      });
    }
    const outlineOnly =
      (element.type === 'rectangle' || element.type === 'diamond' || element.type === 'ellipse') &&
      element.backgroundColor === 'transparent';
    if (!outlineOnly) return true;
    return x < left + 2 * pad || x > right - 2 * pad || y < top + 2 * pad || y > bottom - 2 * pad;
  });
}

interface ScreenMoveOptions {
  api: ExcalidrawImperativeAPI | null;
  /** The element holding the sketched screens, under the board. */
  screensRef: RefObject<HTMLElement | null>;
  section: DesignSection;
  activeLayerId: string | null;
  zoom: number;
  onMove: (layerId: string, position: { x: number; y: number }) => void;
}

/**
 * Drags a mockup screen by its title row or its device frame. The screens sit under the board,
 * so presses on the board are hit-tested against them; a press on a drawing stays the board's.
 */
export function useScreenMove({
  api,
  screensRef,
  section,
  activeLayerId,
  zoom,
  onMove
}: ScreenMoveOptions) {
  const pressRef = useRef<Press | null>(null);
  const [moving, setMoving] = useState<MovingScreen | null>(null);
  const [overHandle, setOverHandle] = useState(false);

  /** The layer whose screen handle is under (`x`, `y`); the active screen is drawn on top. */
  function screenHandleAt(x: number, y: number): string | null {
    const nodes = [
      ...(screensRef.current?.querySelectorAll<HTMLElement>('.react-flow__node') ?? [])
    ]
      .filter((node) => inside(node.getBoundingClientRect(), x, y))
      .sort(
        (a, b) => Number(b.dataset.id === activeLayerId) - Number(a.dataset.id === activeLayerId)
      );
    for (const node of nodes) {
      const header = node.querySelector<HTMLElement>('[data-screen-header]');
      if (header && inside(header.getBoundingClientRect(), x, y)) {
        const onButton = [...header.querySelectorAll('button')].some((button) =>
          inside(button.getBoundingClientRect(), x, y)
        );
        return onButton ? null : node.dataset.id!;
      }
      const device = node.querySelector<HTMLElement>('[data-screen-device]');
      const body = node.querySelector<HTMLElement>('[data-sketch-body]');
      if (!device || !body || !inside(device.getBoundingClientRect(), x, y)) continue;
      const rect = body.getBoundingClientRect();
      const band = FRAME_BAND * (rect.width / body.offsetWidth || 1);
      const content = new DOMRect(
        rect.left + band,
        rect.top + band,
        rect.width - 2 * band,
        rect.height - 2 * band
      );
      return inside(content, x, y) ? null : node.dataset.id!;
    }
    return null;
  }

  function handleAt(event: ReactPointerEvent): string | null {
    if (!api || !(event.target instanceof HTMLCanvasElement)) return null;
    const state = api.getAppState();
    if (state.activeTool.type !== 'selection' || state.editingTextElement) return null;
    const layerId = screenHandleAt(event.clientX, event.clientY);
    if (!layerId) return null;
    const scene = {
      x: (event.clientX - state.offsetLeft) / state.zoom.value - state.scrollX,
      y: (event.clientY - state.offsetTop) / state.zoom.value - state.scrollY
    };
    return hitsDrawing(api.getSceneElements(), scene.x, scene.y, state.zoom.value) ? null : layerId;
  }

  /** Hover: shows the grab cursor over a handle. */
  function hover(event: ReactPointerEvent) {
    setOverHandle(Boolean(handleAt(event)));
  }

  /** Takes the press when it lands on a screen handle; the board never sees it. */
  function pointerDown(event: ReactPointerEvent): boolean {
    if (event.button !== 0) return false;
    const layerId = handleAt(event);
    const screen = section.layers.find((layer) => layer.id === layerId)?.screen;
    if (!layerId || !screen) return false;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pressRef.current = {
      layerId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: screen.x,
      originY: screen.y,
      dragging: false
    };
    return true;
  }

  function positionOf(press: Press, event: ReactPointerEvent) {
    return {
      x: Math.round(press.originX + (event.clientX - press.startX) / zoom),
      y: Math.round(press.originY + (event.clientY - press.startY) / zoom)
    };
  }

  /** True while a press on a screen handle is in progress. */
  function pointerMove(event: ReactPointerEvent): boolean {
    const press = pressRef.current;
    if (!press || press.pointerId !== event.pointerId) return false;
    if (
      !press.dragging &&
      Math.hypot(event.clientX - press.startX, event.clientY - press.startY) > DRAG_SLOP
    ) {
      press.dragging = true;
    }
    if (press.dragging) setMoving({ layerId: press.layerId, ...positionOf(press, event) });
    return true;
  }

  /** `moved` after a drag, `click` after a press that didn't move, null when it wasn't ours. */
  function pointerUp(event: ReactPointerEvent): 'moved' | 'click' | null {
    const press = pressRef.current;
    if (!press || press.pointerId !== event.pointerId) return null;
    pressRef.current = null;
    setMoving(null);
    if (!press.dragging) return 'click';
    onMove(press.layerId, positionOf(press, event));
    return 'moved';
  }

  function cancel() {
    pressRef.current = null;
    setMoving(null);
  }

  const cursorClassName = moving
    ? '[&_canvas]:cursor-grabbing!'
    : overHandle
      ? '[&_canvas]:cursor-grab!'
      : undefined;

  return { moving, cursorClassName, hover, pointerDown, pointerMove, pointerUp, cancel };
}

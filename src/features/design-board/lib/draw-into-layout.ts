import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { UiNode } from '../api/types';
import { aiRenderOf } from './frame-capture';
import { layerOf } from './layered-elements';
import { findNode } from './node-tree';

export interface SceneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Camera {
  scrollX: number;
  scrollY: number;
  zoom: { value: number };
  offsetLeft: number;
  offsetTop: number;
}

/** Converts a viewport rect to scene coordinates for the board's current camera. */
export function domToScene(rect: DOMRect, camera: Camera): SceneRect {
  return {
    x: (rect.left - camera.offsetLeft) / camera.zoom.value - camera.scrollX,
    y: (rect.top - camera.offsetTop) / camera.zoom.value - camera.scrollY,
    width: rect.width / camera.zoom.value,
    height: rect.height / camera.zoom.value
  };
}

/** The device outline of `layerId`'s sketched screen. */
export function screenDeviceOf(root: HTMLElement | null, layerId: string): HTMLElement | null {
  return (
    root?.querySelector<HTMLElement>(
      `.react-flow__node[data-id="${layerId}"] [data-screen-device]`
    ) ?? null
  );
}

function boundsOf(element: ExcalidrawElement): SceneRect {
  if ('points' in element && element.points.length) {
    const xs = element.points.map(([x]) => x);
    const ys = element.points.map(([, y]) => y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    return {
      x: element.x + left,
      y: element.y + top,
      width: Math.max(...xs) - left,
      height: Math.max(...ys) - top
    };
  }
  return element;
}

function overlaps(a: SceneRect, b: SceneRect) {
  return (
    a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height
  );
}

/** A stroke, shape or text on the board, editable or faded on another layer. */
function isAnyDrawing(element: ExcalidrawElement) {
  return (
    !element.isDeleted &&
    element.type !== 'frame' &&
    element.type !== 'magicframe' &&
    !aiRenderOf(element)
  );
}

function isDrawing(element: ExcalidrawElement) {
  return isAnyDrawing(element) && !element.locked;
}

/**
 * The active layer's drawings over the screen's device outline, with the labels bound to them
 * and the rest of their groups, so applying them leaves nothing half-drawn behind. Untagged
 * elements were drawn since the last layer switch and belong to `layerId`.
 */
export function drawingsOverScreen(
  elements: readonly ExcalidrawElement[],
  screen: SceneRect,
  layerId: string
): ExcalidrawElement[] {
  const candidates = elements.filter(
    (element) => isDrawing(element) && (layerOf(element) ?? layerId) === layerId
  );
  const picked = new Set(
    candidates.filter((element) => overlaps(boundsOf(element), screen)).map((element) => element.id)
  );
  if (picked.size === 0) return [];

  const groups = new Set(
    candidates.flatMap((element) => (picked.has(element.id) ? element.groupIds : []))
  );
  let grew = true;
  while (grew) {
    grew = false;
    for (const element of candidates) {
      if (picked.has(element.id)) continue;
      const bound =
        (element.type === 'text' && element.containerId && picked.has(element.containerId)) ||
        element.groupIds.some((group) => groups.has(group)) ||
        element.boundElements?.some((item) => item.type === 'text' && picked.has(item.id));
      if (!bound) continue;
      picked.add(element.id);
      for (const group of element.groupIds) groups.add(group);
      grew = true;
    }
  }
  return candidates.filter((element) => picked.has(element.id));
}

/** How far inside a screen's outline a drawing must reach, so arrows ending at its edge don't count. */
const DRAWN_OVER_INSET = 4;

/**
 * The screens with anything drawn over them, on any layer: what an empty screen's placeholder
 * would sit under.
 */
export function screensWithDrawings(
  elements: readonly ExcalidrawElement[],
  screens: { layerId: string; rect: SceneRect }[]
): Set<string> {
  const drawings = elements.filter(isAnyDrawing).map(boundsOf);
  return new Set(
    screens
      .filter(({ rect }) => {
        const inner = {
          x: rect.x + DRAWN_OVER_INSET,
          y: rect.y + DRAWN_OVER_INSET,
          width: rect.width - 2 * DRAWN_OVER_INSET,
          height: rect.height - 2 * DRAWN_OVER_INSET
        };
        return drawings.some((bounds) => overlaps(bounds, inner));
      })
      .map(({ layerId }) => layerId)
  );
}

/**
 * Where each element of the mockup sits, as percentages of the device outline, so the model can
 * tell which existing element a stroke points at. Elements inside component instances are left
 * out: the instance is the unit that can move or go.
 */
export function describeMockupElements(device: HTMLElement, nodes: UiNode[]): string {
  const frame = device.getBoundingClientRect();
  if (!frame.width || !frame.height) return '';
  const percent = (value: number, size: number) =>
    Math.round(Math.min(1, Math.max(0, value / size)) * 100);
  return [...device.querySelectorAll<HTMLElement>('[data-node-id]')]
    .flatMap((element) => {
      const id = element.dataset.nodeId!;
      const node = id.includes('~') ? null : findNode(nodes, id);
      const rect = element.getBoundingClientRect();
      if (!node || !rect.width || !rect.height) return [];
      const left = percent(rect.left - frame.left, frame.width);
      const right = percent(rect.right - frame.left, frame.width);
      const top = percent(rect.top - frame.top, frame.height);
      const bottom = percent(rect.bottom - frame.top, frame.height);
      if (right <= left || bottom <= top) return [];
      return [
        `- ${node.id} (${node.type}${node.properties?.componentId ? ', component instance' : ''}) "${node.label.slice(0, 60)}": left ${left}–${right}%, top ${top}–${bottom}%`
      ];
    })
    .join('\n');
}
